/**
 * Hosted-boundary tests: real Postgres RLS with Supabase-compatible roles/claims.
 * Two organizations, participant/assessor/admin roles, forbidden mutations.
 * Requires the isolated test database: `npm run db:up` (Dockerized, local only).
 * Scope statement: this verifies the migration's access boundaries on a fresh
 * local Postgres with Supabase-compatible roles; it is NOT verification against
 * a hosted Supabase project (external blocker B1).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "pg";

const URL =
  process.env.WW_TEST_PG_URL ??
  "postgres://postgres:postgres@127.0.0.1:54329/workworld_test";

const U = {
  pA1: "11111111-1111-1111-1111-111111111111",
  pA2: "22222222-2222-2222-2222-222222222222",
  pB1: "33333333-3333-3333-3333-333333333333",
  assessorA: "44444444-4444-4444-4444-444444444444",
  adminA: "55555555-5555-5555-5555-555555555555",
  adminB: "66666666-6666-6666-6666-666666666666",
};

const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

let superuser: Client;

async function asUser<T>(userId: string, fn: (c: Client) => Promise<T>): Promise<T> {
  await superuser.query("reset role");
  await superuser.query(`set role authenticated`);
  await superuser.query(
    `select set_config('request.jwt.claims', $1, false)`,
    [JSON.stringify({ sub: userId, role: "authenticated" })],
  );
  try {
    return await fn(superuser);
  } finally {
    await superuser.query("reset role");
  }
}

beforeAll(async () => {
  superuser = new Client({ connectionString: URL });
  await superuser.connect();
  // Fresh fixture data (ids are stable so tests can assert exact boundaries).
  await superuser.query("delete from workworld.assessments");
  await superuser.query("delete from workworld.run_actions");
  await superuser.query("delete from workworld.assignments");
  await superuser.query("delete from workworld.episode_runs");
  await superuser.query("delete from workworld.memberships");
  await superuser.query("delete from workworld.profiles");
  await superuser.query("delete from workworld.orgs");
  await superuser.query(
    `insert into workworld.orgs (id, name) values ($1,'Org A'), ($2,'Org B')`,
    [ORG_A, ORG_B],
  );
  for (const [name, id] of Object.entries(U)) {
    await superuser.query(
      `insert into workworld.profiles (id, display_name) values ($1,$2)`,
      [id, name],
    );
  }
  const members: [string, string, string][] = [
    [ORG_A, U.pA1, "participant"],
    [ORG_A, U.pA2, "participant"],
    [ORG_A, U.assessorA, "assessor"],
    [ORG_A, U.adminA, "admin"],
    [ORG_B, U.pB1, "participant"],
    [ORG_B, U.adminB, "admin"],
  ];
  for (const [org, user, role] of members) {
    await superuser.query(
      `insert into workworld.memberships (org_id, user_id, role) values ($1,$2,$3)`,
      [org, user, role],
    );
  }
  const runs: [string, string, string][] = [
    ["0a000000-0000-0000-0000-000000000001", ORG_A, U.pA1],
    ["0a000000-0000-0000-0000-000000000002", ORG_A, U.pA2],
    ["0b000000-0000-0000-0000-000000000001", ORG_B, U.pB1],
  ];
  for (const [id, org, user] of runs) {
    await superuser.query(
      `insert into workworld.episode_runs (id, org_id, participant_id, scenario_id, scenario_version, condition)
       values ($1,$2,$3,'A1','1.0.0','human')`,
      [id, org, user],
    );
  }
  await superuser.query(
    `insert into workworld.assignments (org_id, run_id, assessor_id) values ($1,$2,$3)`,
    [ORG_A, "0a000000-0000-0000-0000-000000000001", U.assessorA],
  );
}, 30_000);

afterAll(async () => {
  await superuser?.query("reset role");
  await superuser?.end();
});

describe("tenant isolation across two organizations", () => {
  it("participants see only their own run", async () => {
    const rows = await asUser(U.pA1, (c) =>
      c.query("select id from workworld.episode_runs"),
    );
    expect(rows.rows.map((r) => r.id)).toEqual(["0a000000-0000-0000-0000-000000000001"]);
  });

  it("a participant cannot read another participant's private evidence", async () => {
    const rows = await asUser(U.pA2, (c) =>
      c.query("select id from workworld.episode_runs where id = $1", [
        "0a000000-0000-0000-0000-000000000001",
      ]),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("org admin sees own org only (cross-tenant read fails)", async () => {
    const rowsA = await asUser(U.adminA, (c) => c.query("select id from workworld.episode_runs"));
    expect(rowsA.rows.map((r) => r.id).sort()).toEqual([
      "0a000000-0000-0000-0000-000000000001",
      "0a000000-0000-0000-0000-000000000002",
    ]);
    const rowsB = await asUser(U.adminB, (c) => c.query("select id from workworld.episode_runs"));
    expect(rowsB.rows.map((r) => r.id)).toEqual(["0b000000-0000-0000-0000-000000000001"]);
  });
});

describe("assessor boundaries", () => {
  it("assessor reads assigned work only", async () => {
    const assigned = await asUser(U.assessorA, (c) =>
      c.query("select id from workworld.episode_runs where id = $1", [
        "0a000000-0000-0000-0000-000000000001",
      ]),
    );
    expect(assigned.rows).toHaveLength(1);
    const unassigned = await asUser(U.assessorA, (c) =>
      c.query("select id from workworld.episode_runs where id = $1", [
        "0a000000-0000-0000-0000-000000000002",
      ]),
    );
    expect(unassigned.rows).toHaveLength(0);
  });

  it("assessor can record audited assessment revisions on assigned work", async () => {
    const insert = await asUser(U.assessorA, (c) =>
      c.query(
        `insert into workworld.assessments (run_id, assessor_id, revision, ratings, comment)
         values ($1,$2,1,'{"C1":4}'::jsonb,'initial judgment') returning id`,
        ["0a000000-0000-0000-0000-000000000001", U.assessorA],
      ),
    );
    expect(insert.rows).toHaveLength(1);
    // Revisions are new rows; the original stays unchanged (audited history).
    await asUser(U.assessorA, (c) =>
      c.query(
        `insert into workworld.assessments (run_id, assessor_id, revision, ratings, comment, superseded_by)
         values ($1,$2,2,'{"C1":5}'::jsonb,'revised after review', null)`,
        ["0a000000-0000-0000-0000-000000000001", U.assessorA],
      ),
    );
    const history = await asUser(U.assessorA, (c) =>
      c.query(
        `select revision, comment from workworld.assessments where run_id = $1 order by revision`,
        ["0a000000-0000-0000-0000-000000000001"],
      ),
    );
    expect(history.rows).toEqual([
      { revision: 1, comment: "initial judgment" },
      { revision: 2, comment: "revised after review" },
    ]);
  });

  it("assessor cannot assess unassigned work", async () => {
    await expect(
      asUser(U.assessorA, (c) =>
        c.query(
          `insert into workworld.assessments (run_id, assessor_id, revision, ratings)
           values ($1,$2,1,'{}'::jsonb)`,
          ["0a000000-0000-0000-0000-000000000002", U.assessorA],
        ),
      ),
    ).rejects.toThrow();
  });

  it("assessments are never mutated in place (no update path)", async () => {
    const updated = await asUser(U.assessorA, (c) =>
      c.query(
        `update workworld.assessments set comment = 'tampered' where run_id = $1 and revision = 1`,
        ["0a000000-0000-0000-0000-000000000001"],
      ),
    );
    expect(updated.rowCount).toBe(0); // RLS: no update policy matches
  });
});

describe("forbidden mutations", () => {
  it("participant cannot append actions to another participant's run", async () => {
    await expect(
      asUser(U.pA2, (c) =>
        c.query(
          `insert into workworld.run_actions (run_id, seq, action_json, actor_kind, outcome)
           values ($1, 1, '{"type":"x"}'::jsonb, 'human', 'applied')`,
          ["0a000000-0000-0000-0000-000000000001"],
        ),
      ),
    ).rejects.toThrow();
  });

  it("assessor cannot mutate participant run state", async () => {
    const res = await asUser(U.assessorA, (c) =>
      c.query(`update workworld.episode_runs set status = 'submitted' where id = $1`, [
        "0a000000-0000-0000-0000-000000000001",
      ]),
    );
    expect(res.rowCount).toBe(0);
  });

  it("participant cannot create a run in another tenant", async () => {
    await expect(
      asUser(U.pA1, (c) =>
        c.query(
          `insert into workworld.episode_runs (id, org_id, participant_id, scenario_id, scenario_version, condition)
           values ('0a000000-0000-0000-0000-0000000000ff', $1, $2, 'A1', '1.0.0', 'human')`,
          [ORG_B, U.pA1],
        ),
      ),
    ).rejects.toThrow();
  });

  it("participants cannot grant roles; only org admins manage memberships", async () => {
    // pB1 has no membership in org A yet — a participant must not be able to grant.
    await expect(
      asUser(U.pA1, (c) =>
        c.query(
          `insert into workworld.memberships (org_id, user_id, role) values ($1,$2,'assessor')`,
          [ORG_A, U.pB1],
        ),
      ),
    ).rejects.toThrow();
    const ok = await asUser(U.adminA, (c) =>
      c.query(
        `insert into workworld.memberships (org_id, user_id, role) values ($1,$2,'assessor')`,
        [ORG_A, U.pB1],
      ),
    );
    expect(ok.rowCount).toBe(1);
    await superuser.query("delete from workworld.memberships where user_id = $1 and org_id = $2", [U.pB1, ORG_A]);
  });

  it("owner participant can advance own run state and append own actions", async () => {
    const res = await asUser(U.pA1, (c) =>
      c.query(
        `update workworld.episode_runs set revision = revision + 1 where id = $1`,
        ["0a000000-0000-0000-0000-000000000001"],
      ),
    );
    expect(res.rowCount).toBe(1);
    const ins = await asUser(U.pA1, (c) =>
      c.query(
        `insert into workworld.run_actions (run_id, seq, action_json, actor_kind, outcome)
         values ($1, 1, '{"type":"add_work_note"}'::jsonb, 'human', 'applied')`,
        ["0a000000-0000-0000-0000-000000000001"],
      ),
    );
    expect(ins.rowCount).toBe(1);
  });
});
