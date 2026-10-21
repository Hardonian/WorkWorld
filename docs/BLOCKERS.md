# WorkWorld — Blockers

Precise blockers, failed attempts, alternatives, and what unblocks them.

## B2. Live OpenAI provider runs — EXTERNALLY BLOCKED (open)
- What: running paid live-model trials through the OpenAI API adapter.
- Cause: no `OPENAI_API_KEY` configured in this environment and no authorized
  paid experiment budget declared. Scope forbids inventing a budget or key.
- Failed attempts: none attempted (no credential to try; probing is not useful).
- Alternative executed: local Ollama OpenAI-compatible endpoint is live and used
  for local live-model smoke runs (unpaid, existing hardware). Deterministic
  fixture adapters cover offline contract verification.
- Unblock: user provides an authorized key + explicit spend cap, or authorizes a
  different already-paid provider. The runner already enforces a budget check
  before every paid dispatch.

## B3. Hosted application path — IMPLEMENTED, END-TO-END VERIFICATION PENDING
- What: authenticated application traffic using the hosted Postgres/Supabase
  episode and assessment tables end to end.
- Current evidence: `PostgresStore` implements the EventStore contract with
  optimistic concurrency, RLS session claims, and digest verification. Unit
  tests do not substitute for a real browser session, a provisioned membership,
  and a live database boundary.
- Unblock: provision the controlled test tenant, authenticate a real test user,
  exercise start/resume/action/replay under RLS, then retain the resulting
  release-gate evidence before enabling `WORKWORLD_HOSTED_STORE_WIRED=true` in
  a production deployment.

## B1. Hosted Supabase database boundary — EXTERNALLY BLOCKED (current launch)
- What: verification against a real hosted Supabase/Postgres project at the
  database/RLS boundary for the current release candidate.
- Current state: the latest release evidence reports
  `hosted: blocked_external (no hosted configuration; B1)`. No Supabase URL,
  database connection, or production signing configuration is available in the
  current environment.
- Historical note: a dedicated tenant may have been tested on 2026-10-02. That
  observation is useful background, but it is not current evidence and must not
  be represented as a live production approval.
- Unblock: an owner supplies a non-production session-mode Postgres URL as
  `WW_TEST_PG_URL`, all hosted runtime values in the hosting platform, and runs
  `npm run release-gate -- --require-hosted`. The gate preserves redacted
  evidence and fails if either the RLS suite or runtime configuration is absent.
- Remaining hosted caveats: backup/restore, object storage/KMS, and app-level
  authenticated smoke testing remain operator-owned launch work.

## Closed (previously)

### B0. Codex CLI unauthenticated — CLOSED by direct implementation
- `codex login status` = "Not logged in"; no auth.json. Implemented directly (D4).
  Unblock only if the user wants Codex in the loop later (`codex login`).
