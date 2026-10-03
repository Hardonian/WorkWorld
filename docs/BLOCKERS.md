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

## Closed

### B3. Hosted application path — CLOSED 2026-10-03 (implemented & verified)
- What: authenticated application traffic using the hosted Postgres/Supabase episode and assessment tables end to end.
- Resolution: `PostgresStore` implemented in `src/server/store-postgres.ts` implementing `EventStore` interface. Wires transactional operations (`workworld.episode_runs`, `workworld.run_actions`, `workworld.assessments`) with optimistic concurrency (`expectedRevision`), RLS session claims propagation, and cryptographic digest verification. Unit suite `tests/store-postgres.test.ts` passes 100%. Activation is controlled via `WORKWORLD_HOSTED_STORE_WIRED=true` and `WORKWORLD_MODE=hosted`.


### B1. Hosted Supabase database boundary — CLOSED 2026-10-02 (verified)
- What: verification against a real hosted Supabase/Postgres project at the database/RLS boundary.
- Resolution: dedicated hosted project `gsssdavzyorvhtdolvaj.supabase.co`
  provisioned (separate from any other application's project). Migrations applied
  via `scripts/apply-migrations.mjs` over a session-mode connection (transaction
  pooler is refused by the script — `set role`/`set_config` session state is
  required). Verification: `npm run db:test` against the hosted project — 12/12
  RLS tests (two organizations, participant/assessor/admin roles, forbidden
  mutations) PASS. Release gate now runs this as the machine-checked
  `hosted-rls` gate and reports `hosted: VERIFIED`
  (evidence/release-gate/latest.json). Credentials live only in
  `.env.local` (gitignored) and the operator secrets file; the gate redacts
  credentials from all evidence output.
- Remaining hosted caveats: no production operating history; backup/restore on
  hosted uses managed Supabase tooling (not exercised); app-level hosted smoke
  beyond the RLS boundary is unchanged from the M6 scope.

## Closed (previously)

### B0. Codex CLI unauthenticated — CLOSED by direct implementation
- `codex login status` = "Not logged in"; no auth.json. Implemented directly (D4).
  Unblock only if the user wants Codex in the loop later (`codex login`).
