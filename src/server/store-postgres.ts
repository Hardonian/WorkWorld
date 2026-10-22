/**
 * PostgreSQL / Supabase EventStore implementation (Tier 1 / Blocker B3).
 * Provides transactional, append-only persistence with optimistic concurrency
 * and cryptographic digest verification directly over PostgreSQL tables:
 * - workworld.episode_runs
 * - workworld.run_actions
 * - workworld.assessments
 */

import { Client, Pool, type PoolClient, type PoolConfig } from "pg";
import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Action, Actor, EpisodeState } from "../domain/types.ts";
import { digestState } from "../domain/engine.ts";
import type { CertificationPreflight } from "./certification-preflight.ts";
import {
  type EventStore,
  type RunMeta,
  type StoredAction,
  STORE_SCHEMA_VERSION,
  CorruptStateError,
} from "./store.ts";

export interface PostgresStoreOptions {
  connectionString?: string;
  /** Reuse a process-owned pool for request-scoped stores. The caller owns its lifecycle. */
  pool?: Pool;
  defaultOrgId?: string;
  defaultParticipantId?: string;
  jwtClaims?: { sub: string; role?: string; org_id?: string };
  /**
   * Hosted stores must be bound to an authenticated Supabase identity. When
   * enabled, default tenant bootstrapping is disabled and an existing
   * participant membership is required before a run can be created.
   */
  requireAuthenticatedIdentity?: boolean;
  /** Optional, server-selected organization context for multi-org users. */
  organizationId?: string;
}

// Fixed fallback IDs for unauthenticated/demo tenant bootstrapping
const DEFAULT_SYSTEM_ORG = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const DEFAULT_SYSTEM_USER = "11111111-1111-1111-1111-111111111111";

function isUuid(raw: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
}

function toValidUuid(raw: string): string {
  if (isUuid(raw)) {
    return raw.toLowerCase();
  }
  // Deterministically hash to valid UUID v4 shape if arbitrary string was provided
  const hash = createHash("md5").update(raw).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function resolveConnectionString(connectionString?: string): string {
  return (
    connectionString ??
    process.env.WW_TEST_PG_URL ??
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@127.0.0.1:54329/workworld_test"
  );
}

export function postgresConnectionOptions(connectionString: string): PoolConfig {
  const ca = process.env.WORKWORLD_DB_CA_CERT;
  if (!ca && process.env.WORKWORLD_MODE !== "hosted") return { connectionString };
  const url = new URL(connectionString);
  // pg connection-string SSL parameters override an explicit CA object.
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) url.searchParams.delete(key);
  return { connectionString: url.toString(), ssl: { ...(ca ? { ca } : {}), rejectUnauthorized: true } };
}

export class HostedIdentityRequiredError extends Error {
  constructor() {
    super("hosted EventStore requires a verified authenticated identity");
    this.name = "HostedIdentityRequiredError";
  }
}

export class OrganizationMembershipRequiredError extends Error {
  constructor(reason: string) {
    super(`hosted EventStore requires an existing participant membership: ${reason}`);
    this.name = "OrganizationMembershipRequiredError";
  }
}

export class PostgresStore implements EventStore {
  private readonly transaction = new AsyncLocalStorage<PoolClient | Client>();
  private pool: Pool | null = null;
  private readonly ownsPool: boolean;
  private readonly connectionString: string;
  private readonly defaultOrgId: string;
  private readonly defaultParticipantId: string;
  private readonly jwtClaims?: { sub: string; role?: string; org_id?: string };
  private readonly requireAuthenticatedIdentity: boolean;
  private readonly organizationId?: string;

  constructor(options: PostgresStoreOptions = {}) {
    this.connectionString = resolveConnectionString(options.connectionString);
    this.pool = options.pool ?? null;
    this.ownsPool = !options.pool;
    this.defaultOrgId = options.defaultOrgId ?? DEFAULT_SYSTEM_ORG;
    this.defaultParticipantId = options.defaultParticipantId ?? DEFAULT_SYSTEM_USER;
    this.jwtClaims = options.jwtClaims;
    this.requireAuthenticatedIdentity = options.requireAuthenticatedIdentity ?? false;
    this.organizationId = options.organizationId;
  }

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        ...postgresConnectionOptions(this.connectionString),
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5_000,
        statement_timeout: 15_000,
      });
    }
    return this.pool;
  }

  /** A low-privilege readiness probe; it deliberately reads no tenant data. */
  static async checkConnection(connectionString?: string): Promise<void> {
    const pool = new Pool({
      ...postgresConnectionOptions(resolveConnectionString(connectionString)),
      max: 1,
      connectionTimeoutMillis: 5_000,
    });
    try {
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("set local role authenticated");
        // Validate the migrated schema and grants, without reading tenant rows.
        await client.query("select id, state_json, revision from workworld.episode_runs limit 0");
        await client.query("select id, org_id, requested_by from workworld.certification_preflights limit 0");
        await client.query("select id, preflight_id from workworld.certification_artifacts limit 0");
        await client.query("rollback");
      } finally { client.release(); }
    } finally {
      await pool.end();
    }
  }

  private authenticatedUserId(): string {
    const userId = this.jwtClaims?.sub;
    if (!userId || !isUuid(userId)) throw new HostedIdentityRequiredError();
    return userId.toLowerCase();
  }

  private activeClaims(): { sub: string; role?: string; org_id?: string } | undefined {
    if (!this.requireAuthenticatedIdentity) return this.jwtClaims;
    // The SQL connection is intentionally constrained to the authenticated
    // role. Never propagate an arbitrary role supplied to this constructor.
    return { sub: this.authenticatedUserId(), role: "authenticated" };
  }

  private async resolveOrganizationId(c: PoolClient | Client, participantId: string): Promise<string> {
    const memberships = await c.query<{ org_id: string }>(
      `select org_id
       from workworld.memberships
       where user_id = $1 and role = 'participant'
       order by org_id asc`,
      [participantId],
    );
    const orgIds = memberships.rows.map((row) => row.org_id.toLowerCase());

    if (this.organizationId) {
      if (!isUuid(this.organizationId)) {
        throw new OrganizationMembershipRequiredError("organization context is invalid");
      }
      const selected = this.organizationId.toLowerCase();
      if (!orgIds.includes(selected)) {
        throw new OrganizationMembershipRequiredError("selected organization is not a participant membership");
      }
      return selected;
    }

    if (orgIds.length === 0) {
      throw new OrganizationMembershipRequiredError("no participant membership was found");
    }
    if (orgIds.length > 1) {
      throw new OrganizationMembershipRequiredError("organization context is ambiguous; select an organization explicitly");
    }
    return orgIds[0]!;
  }

  /**
   * Executes a database operation within a client connection,
   * setting session RLS claims if provided.
   */
  async withClient<T>(fn: (client: PoolClient | Client) => Promise<T>): Promise<T> {
    const active = this.transaction.getStore();
    if (active) return fn(active);
    const claims = this.activeClaims();
    const client = await this.getPool().connect();
    let discard = false;
    try {
      await client.query("begin");
      if (claims) {
        await client.query("set local role authenticated");
        await client.query(
          "select set_config('request.jwt.claims', $1, true)",
          [JSON.stringify(claims)]
        );
      }
      const result = await this.transaction.run(client, () => fn(client));
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      // Transaction-local roles and claims are cleared on commit/rollback.
      // A connection whose cleanup failed must never return to the pool.
      client.release(discard);
    }
  }

  async withRunTransaction<T>(runId: string | null, operation: (store: EventStore) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      if (runId) {
        // Assessors cannot UPDATE participant rows; an advisory lock also
        // serializes their append-only judgments without widening RLS access.
        await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [toValidUuid(runId)]);
        await client.query("select id from workworld.episode_runs where id = $1 for update", [toValidUuid(runId)]);
      }
      return operation(this);
    });
  }

  async createRun(meta: RunMeta): Promise<void> {
    const runUuid = toValidUuid(meta.runId);
    await this.withClient(async (c) => {
      const participantId = this.requireAuthenticatedIdentity
        ? this.authenticatedUserId()
        : this.defaultParticipantId;
      const orgId = this.requireAuthenticatedIdentity
        ? await this.resolveOrganizationId(c, participantId)
        : this.defaultOrgId;

      if (!this.requireAuthenticatedIdentity) {
        // Demo/local Postgres mode remains self-contained. Hosted mode never
        // creates organizations, profiles, or memberships at request time.
        await c.query(
          `insert into workworld.orgs (id, name) values ($1, 'Default Workspace') on conflict (id) do nothing`,
          [orgId]
        );
        await c.query(
          `insert into workworld.profiles (id, display_name) values ($1, 'Workspace User') on conflict (id) do nothing`,
          [participantId]
        );
        await c.query(
          `insert into workworld.memberships (org_id, user_id, role) values ($1, $2, 'participant') on conflict (org_id, user_id) do nothing`,
          [orgId, participantId]
        );
      }

      await c.query(
        `insert into workworld.episode_runs
          (id, org_id, participant_id, scenario_id, scenario_version, condition, status, revision, state_json)
         values ($1, $2, $3, $4, $5, $6, 'active', 0, '{}'::jsonb)
         on conflict (id) do nothing`,
        [
          runUuid,
          orgId,
          participantId,
          meta.scenarioId,
          meta.scenarioVersion,
          meta.condition,
        ]
      );
    });
  }

  async saveCertificationPreflight(preflight: CertificationPreflight): Promise<void> {
    const userId = this.authenticatedUserId();
    await this.withClient(async (client) => {
      const orgId = await this.resolveOrganizationId(client, userId);
      await client.query(`insert into workworld.certification_preflights
        (id, org_id, requested_by, agent_name, adapter, suite_version, max_budget_usd, configuration_digest)
        values ($1,$2,$3,$4,$5,$6,$7,$8)`, [preflight.id.replace(/^preflight_/, ""), orgId, userId, preflight.agentName, preflight.adapter, preflight.suiteVersion, preflight.maxBudgetUsd, preflight.configurationDigest]);
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
         values ($1, $2, $3, $4, $5)`,
        [
          runUuid,
          nextSeq,
          // JSONB reorders object keys. Retain the original serialization for
          // historical payload digests and deterministic action replay.
          JSON.stringify({ ...entry.action, _actor: entry.actor, _serializedAction: JSON.stringify(entry.action) }),
          entry.actor.kind,
          entry.outcome ?? "applied",
        ]
      );
    });
  }

  async loadActions(runId: string): Promise<StoredAction[]> {
    const runUuid = toValidUuid(runId);
    return await this.withClient(async (c) => {
      const res = await c.query<{
        action_json: Action & { _actor?: Actor; _serializedAction?: string };
        actor_kind: "human" | "agent" | "assisted" | "manager" | "system";
        outcome: "applied" | "rejected" | "replayed";
      }>(
        `select action_json, actor_kind, outcome
         from workworld.run_actions
         where run_id = $1
         order by seq asc`,
        [runUuid]
      );

      return res.rows.map((r) => {
        const { _actor, _serializedAction, ...action } = r.action_json;
        return {
          action: _serializedAction ? JSON.parse(_serializedAction) as Action : action as Action,
          actor: _actor ?? { kind: r.actor_kind as "human" | "agent" | "assisted", id: "participant", role: "participant" },
          outcome: r.outcome,
        };
      });
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
        if (this.requireAuthenticatedIdentity) {
          throw new Error(`hosted run ${runId} was not found or is not writable by the authenticated participant`);
        }
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
      if (this.requireAuthenticatedIdentity && !expectedDigest) throw new CorruptStateError(runId, "persisted state digest is missing");
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
    if (this.pool && this.ownsPool) {
      await this.pool.end();
    }
    this.pool = null;
  }
}

const hostedPools = new Map<string, Pool>();

function hostedPool(connectionString: string): Pool {
  let pool = hostedPools.get(connectionString);
  if (!pool) {
    pool = new Pool({ ...postgresConnectionOptions(connectionString), max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000, statement_timeout: 15_000, allowExitOnIdle: true });
    // pg emits idle connection errors separately from rejected queries.
    pool.on("error", () => console.error("WorkWorld database pool connection lost"));
    hostedPools.set(connectionString, pool);
  }
  return pool;
}

/**
 * Create a request-scoped, RLS-bound hosted store. The shared pool is only a
 * transport optimization; identity and claims remain immutable per instance.
 */
export function createAuthenticatedPostgresStore(
  userId: string,
  organizationId?: string,
): PostgresStore {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("hosted EventStore requires DATABASE_URL");
  }
  return new PostgresStore({
    connectionString,
    pool: hostedPool(connectionString),
    jwtClaims: { sub: userId, role: "authenticated" },
    requireAuthenticatedIdentity: true,
    organizationId,
  });
}
