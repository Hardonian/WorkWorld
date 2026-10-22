import { describe, it, expect, afterEach } from "vitest";
import type { Client, PoolClient } from "pg";
import {
  HostedIdentityRequiredError,
  OrganizationMembershipRequiredError,
  PostgresStore,
} from "../src/server/store-postgres.ts";
import { hostedModeAvailable } from "../src/server/session.ts";
import { getStore, type RunMeta } from "../src/server/store.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { getScenario } from "../src/scenarios/catalog.ts";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ORG_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const RUN_META: RunMeta = {
  runId: "22222222-2222-2222-2222-222222222222",
  scenarioId: "A1",
  scenarioVersion: "1.0.0",
  condition: "human",
  seed: 42,
  createdAt: "2026-10-20T00:00:00.000Z",
  storeSchemaVersion: 1,
};

type QueryCall = { text: string; values: readonly unknown[] | undefined };
type QueryHandler = (text: string, values: readonly unknown[] | undefined) => Promise<{
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}>;

class StubbedPostgresStore extends PostgresStore {
  readonly calls: QueryCall[] = [];

  constructor(
    options: ConstructorParameters<typeof PostgresStore>[0],
    private readonly queryHandler: QueryHandler,
  ) {
    super(options);
  }

  override async withClient<T>(operation: (client: PoolClient | Client) => Promise<T>): Promise<T> {
    const client = {
      query: async (text: string, values?: readonly unknown[]) => {
        this.calls.push({ text, values });
        return this.queryHandler(text, values);
      },
    } as unknown as PoolClient;
    return operation(client);
  }
}

afterEach(() => {
  for (const key of [
    "WORKWORLD_MODE",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "WORKWORLD_HOSTED_STORE_WIRED",
  ]) {
    delete process.env[key];
  }
});

describe("PostgresStore Architecture & Interface (Tier 1, Blocker B3)", () => {
  it("instantiates cleanly with default or custom options", () => {
    const store = new PostgresStore({
      connectionString: "postgres://mock:mock@localhost:5432/mock_db",
      defaultOrgId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    });
    expect(store).toBeDefined();
    expect(typeof store.createRun).toBe("function");
    expect(typeof store.appendAction).toBe("function");
    expect(typeof store.saveState).toBe("function");
    expect(typeof store.loadState).toBe("function");
  });

  it("handles hostedModeAvailable toggle when WORKWORLD_HOSTED_STORE_WIRED is enabled", () => {
    process.env.WORKWORLD_MODE = "hosted";
    process.env.SUPABASE_URL = "https://mock.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
    process.env.DATABASE_URL = "postgres://mock:mock@localhost:5432/mock_db";
    process.env.WORKWORLD_HOSTED_STORE_WIRED = "true";

    const status = hostedModeAvailable();
    expect(status.available).toBe(true);
    expect(status.reason).toMatch(/configured and enabled/);

    // No service-role key is needed for request-time RLS-bound storage.
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("fails closed before opening a connection when hosted identity is absent", async () => {
    const store = new PostgresStore({
      connectionString: "postgres://unused:unused@127.0.0.1:1/unused",
      requireAuthenticatedIdentity: true,
    });

    await expect(store.createRun(RUN_META)).rejects.toBeInstanceOf(HostedIdentityRequiredError);
  });

  it("refuses the global unscoped store while hosted mode is selected", () => {
    process.env.WORKWORLD_MODE = "hosted";
    expect(() => getStore()).toThrow(/verified request identity/);
  });

  it("uses an existing participant membership and never bootstraps a hosted tenant", async () => {
    const store = new StubbedPostgresStore(
      {
        requireAuthenticatedIdentity: true,
        jwtClaims: { sub: USER_ID, role: "service_role" },
      },
      async (text) => {
        if (text.includes("from workworld.memberships")) {
          return { rows: [{ org_id: ORG_ID }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      },
    );

    await store.createRun(RUN_META);

    const sql = store.calls.map((call) => call.text).join("\n");
    expect(sql).toContain("from workworld.memberships");
    expect(sql).not.toContain("insert into workworld.orgs");
    expect(sql).not.toContain("insert into workworld.profiles");
    expect(sql).not.toContain("insert into workworld.memberships");

    const runInsert = store.calls.find((call) => call.text.includes("insert into workworld.episode_runs"));
    expect(runInsert?.values?.slice(0, 3)).toEqual([RUN_META.runId, ORG_ID, USER_ID]);
  });

  it("rejects an ambiguous hosted membership rather than choosing a default tenant", async () => {
    const store = new StubbedPostgresStore(
      {
        requireAuthenticatedIdentity: true,
        jwtClaims: { sub: USER_ID },
      },
      async (text) => {
        if (text.includes("from workworld.memberships")) {
          return {
            rows: [
              { org_id: ORG_ID },
              { org_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
            ],
            rowCount: 2,
          };
        }
        return { rows: [], rowCount: 1 };
      },
    );

    await expect(store.createRun(RUN_META)).rejects.toBeInstanceOf(OrganizationMembershipRequiredError);
    expect(store.calls.some((call) => call.text.includes("insert into workworld.episode_runs"))).toBe(false);
  });

  it("does not recreate a missing hosted run during a state write", async () => {
    const store = new StubbedPostgresStore(
      {
        requireAuthenticatedIdentity: true,
        jwtClaims: { sub: USER_ID },
      },
      async () => ({ rows: [], rowCount: 0 }),
    );
    const state = EpisodeEngine.reset(getScenario("A1"), {
      runId: RUN_META.runId,
      seed: RUN_META.seed,
      condition: RUN_META.condition,
    }).getState();

    await expect(store.saveState(RUN_META.runId, state)).rejects.toThrow(/was not found/);
    expect(store.calls.some((call) => call.text.includes("insert into workworld.episode_runs"))).toBe(false);
  });

  it("safely cleans up connection pools", async () => {
    const store = new PostgresStore();
    await expect(store.close()).resolves.not.toThrow();
  });

  it("preserves action serialization, actor identity, and outcome across JSONB reordering", async () => {
    let persisted: Record<string, unknown> = {};
    const store = new StubbedPostgresStore({}, async (text, values) => {
      if (text.includes("next_seq")) return { rows: [{ next_seq: "0" }], rowCount: 1 };
      if (text.includes("insert into workworld.run_actions")) {
        const parsed = JSON.parse(String(values?.[2]));
        persisted = { action_json: Object.fromEntries(Object.entries(parsed).sort(([a], [b]) => a.localeCompare(b))), actor_kind: values?.[3], outcome: values?.[4] };
      }
      if (text.includes("select action_json")) return { rows: [persisted], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    const action = { text: "preserve payload ordering", type: "add_work_note" as const, actionId: "a", idempotencyKey: "k", expectedRevision: 0 };
    const actor = { id: USER_ID, kind: "human" as const, role: "participant" as const };
    await store.appendAction(RUN_META.runId, { action, actor, outcome: "rejected" });
    const [loaded] = await store.loadActions(RUN_META.runId);
    expect(JSON.stringify(loaded?.action)).toBe(JSON.stringify(action));
    expect(loaded?.actor).toEqual(actor);
    expect(loaded?.outcome).toBe("rejected");
  });
});
