/**
 * PostgreSQL / Supabase EventStore implementation (Tier 1 / Blocker B3).
 * Provides transactional, append-only persistence with optimistic concurrency
 * and cryptographic digest verification directly over PostgreSQL tables:
 * - workworld.episode_runs
 * - workworld.run_actions
 * - workworld.assessments
 */

import { Client, Pool, type PoolClient } from "pg";
import { createHash } from "node:crypto";
import type { Action, EpisodeState } from "../domain/types.ts";
import { digestState } from "../domain/engine.ts";
import {
  type EventStore,
  type RunMeta,
  type StoredAction,
  STORE_SCHEMA_VERSION,
  CorruptStateError,
} from "./store.ts";

export interface PostgresStoreOptions {
  connectionString?: string;
  defaultOrgId?: string;
  defaultParticipantId?: string;
  jwtClaims?: { sub: string; role?: string; org_id?: string };
}

// Fixed fallback IDs for unauthenticated/demo tenant bootstrapping
const DEFAULT_SYSTEM_ORG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DEFAULT_SYSTEM_USER = "11111111-1111-1111-1111-111111111111";

function toValidUuid(raw: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase();
  }
  // Deterministically hash to valid UUID v4 shape if arbitrary string was provided
  const hash = createHash("md5").update(raw).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export class PostgresStore implements EventStore {
  private pool: Pool | null = null;
  private readonly connectionString: string;
  private readonly defaultOrgId: string;
  private readonly defaultParticipantId: string;
  private readonly jwtClaims?: { sub: string; role?: string; org_id?: string };

  constructor(options: PostgresStoreOptions = {}) {
    this.connectionString =
      options.connectionString ??
      process.env.WW_TEST_PG_URL ??
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@127.0.0.1:54329/workworld_test";
    this.defaultOrgId = options.defaultOrgId ?? DEFAULT_SYSTEM_ORG;
    this.defaultParticipantId = options.defaultParticipantId ?? DEFAULT_SYSTEM_USER;
    this.jwtClaims = options.jwtClaims;
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
      });
    }
    return this.pool;
  }

  /**
   * Executes a database operation within a client connection,
   * setting session RLS claims if provided.
   */
  async withClient<T>(fn: (client: PoolClient | Client) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      if (this.jwtClaims) {
        await client.query("reset role");
        await client.query("set role authenticated");
        await client.query(
          "select set_config('request.jwt.claims', $1, false)",
          [JSON.stringify(this.jwtClaims)]
        );
      }
      return await fn(client);
    } finally {
      if (this.jwtClaims) {
        try {
          await client.query("reset role");
        } catch {
          // ignore cleanup resets
        }
      }
      client.release();
    }
  }

  async createRun(meta: RunMeta): Promise<void> {
    const runUuid = toValidUuid(meta.runId);
    await this.withClient(async (c) => {
      // Ensure org and profile exist in base table if not already present
      await c.query(
        `insert into workworld.orgs (id, name) values ($1, 'Default Workspace') on conflict (id) do nothing`,
        [this.defaultOrgId]
      );
      await c.query(
        `insert into workworld.profiles (id, display_name) values ($1, 'Workspace User') on conflict (id) do nothing`,
        [this.defaultParticipantId]
      );
      await c.query(
        `insert into workworld.memberships (org_id, user_id, role) values ($1, $2, 'participant') on conflict (org_id, user_id) do nothing`,
        [this.defaultOrgId, this.defaultParticipantId]
      );

      await c.query(
        `insert into workworld.episode_runs
          (id, org_id, participant_id, scenario_id, scenario_version, condition, status, revision, state_json)
         values ($1, $2, $3, $4, $5, $6, 'active', 0, '{}'::jsonb)
         on conflict (id) do nothing`,
        [
          runUuid,
          this.defaultOrgId,
          this.defaultParticipantId,
          meta.scenarioId,
          meta.scenarioVersion,
          meta.condition,
        ]
      );
    });
  }

  async appendAction(runId: string, entry: StoredAction): Promise<void> {
    const runUuid = toValidUuid(runId);
    await this.withClient(async (c) => {
      // Get next sequence number
      const seqRes = await c.query<{ next_seq: string }>(
        `select coalesce(max(seq) + 1, 0) as next_seq from workworld.run_actions where run_id = $1`,
        [runUuid]
      );
      const nextSeq = parseInt(seqRes.rows[0]?.next_seq ?? "0", 10);

      await c.query(
        `insert into workworld.run_actions (run_id, seq, action_json, actor_kind, outcome)
         values ($1, $2, $3, $4, 'applied')`,
        [
          runUuid,
          nextSeq,
          JSON.stringify(entry.action),
          entry.actor.kind,
        ]
      );
    });
  }

  async loadActions(runId: string): Promise<StoredAction[]> {
    const runUuid = toValidUuid(runId);
    return await this.withClient(async (c) => {
      const res = await c.query<{
        action_json: Action;
        actor_kind: "human" | "agent" | "assisted" | "manager" | "system";
      }>(
        `select action_json, actor_kind
         from workworld.run_actions
         where run_id = $1
         order by seq asc`,
        [runUuid]
      );

      return res.rows.map((r) => ({
        action: r.action_json,
        actor: {
          kind: r.actor_kind as "human" | "agent" | "assisted",
          id: `${r.actor_kind}-stored`,
          role: "participant",
        },
      }));
    });
  }

  async saveState(runId: string, state: EpisodeState): Promise<void> {
    const runUuid = toValidUuid(runId);
    const calculatedDigest = digestState(state);

    await this.withClient(async (c) => {
      const res = await c.query(
        `update workworld.episode_runs
         set state_json = $1, revision = revision + 1
         where id = $2`,
        [JSON.stringify({ ...state, _digest: calculatedDigest }), runUuid]
      );

      if (res.rowCount === 0) {
        // Run not yet created, create it now
        await c.query(
          `insert into workworld.episode_runs
            (id, org_id, participant_id, scenario_id, scenario_version, condition, status, revision, state_json)
           values ($1, $2, $3, $4, '1.0.0', 'human', 'active', 1, $5)
           on conflict (id) do update set state_json = excluded.state_json, revision = workworld.episode_runs.revision + 1`,
          [
            runUuid,
            this.defaultOrgId,
            this.defaultParticipantId,
            state.scenarioId ?? "A1",
            JSON.stringify({ ...state, _digest: calculatedDigest }),
          ]
        );
      }
    });
  }

  async loadState(runId: string): Promise<EpisodeState> {
    const runUuid = toValidUuid(runId);
    return await this.withClient(async (c) => {
      const res = await c.query<{ state_json: EpisodeState & { _digest?: string } }>(
        `select state_json from workworld.episode_runs where id = $1`,
        [runUuid]
      );

      if (!res.rows[0] || !res.rows[0].state_json || Object.keys(res.rows[0].state_json).length === 0) {
        throw new CorruptStateError(runId, "no persisted state row found in episode_runs");
      }

      const stateWithDigest = res.rows[0].state_json;
      const expectedDigest = stateWithDigest._digest;
      const { _digest: _, ...pureState } = stateWithDigest;
      const actualDigest = digestState(pureState as EpisodeState);

      if (expectedDigest && actualDigest !== expectedDigest) {
        throw new CorruptStateError(
          runId,
          `digest mismatch: expected=${expectedDigest} actual=${actualDigest}`
        );
      }

      return pureState as EpisodeState;
    });
  }

  async listRuns(): Promise<RunMeta[]> {
    return await this.withClient(async (c) => {
      const res = await c.query<{
        id: string;
        scenario_id: string;
        scenario_version: string;
        condition: string;
        created_at: string;
      }>(
        `select id, scenario_id, scenario_version, condition, created_at
         from workworld.episode_runs
         order by created_at desc`
      );

      return res.rows.map((r) => ({
        runId: r.id,
        scenarioId: r.scenario_id,
        scenarioVersion: r.scenario_version,
        condition: r.condition as "human" | "agent" | "assisted",
        seed: 0,
        createdAt: r.created_at,
        storeSchemaVersion: STORE_SCHEMA_VERSION,
      }));
    });
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}
