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

## B3. Hosted acceptance — ACCOUNT ENROLLMENT AND BROWSER VERIFICATION PENDING

<<<<<<< HEAD
## B1. Hosted Supabase database boundary — VERIFICATION PENDING (current launch)
- What: verification against a real hosted Supabase/Postgres project at the
  database/RLS boundary for the current release candidate.
- Current state: the Vercel production project is connected and deployed with
  the required hosted runtime variable names. Public health, security headers,
  and the invitation-only sign-in surface are live. Hosted EventStore activation
  remains deliberately disabled because the current deployment has not yet
  completed the non-production RLS suite or an authenticated, provisioned-member
  episode flow.
- Historical note: a dedicated tenant may have been tested on 2026-10-02. That
  observation is useful background, but it is not current evidence and must not
  be represented as a live production approval.
- Unblock: supply a non-production session-mode Postgres URL as `WW_TEST_PG_URL`,
  run `npm run release-gate -- --require-hosted`, provision a test user and
  membership, then verify start/resume/action/replay under the hosted flag. The
  gate preserves redacted evidence and fails if either the RLS suite or runtime
  configuration is absent.
- Remaining hosted caveats: backup/restore, object storage/KMS, and app-level
  authenticated smoke testing remain operator-owned launch work.
=======
Supabase and Vercel are provisioned and production variables are configured. Twelve current live Postgres adapter/RLS checks pass, including concurrency, rollback, and exact replay. Cookie sign-in and durable assessment/certification paths are implemented. The activation flag remains false until confirmed Auth accounts, memberships, redirect configuration, and an authenticated browser walkthrough are complete.

## B1. Infrastructure — PROVISIONED; FULL ENTERPRISE LAUNCH REMAINS GATED

The current Supabase database is reachable over verified TLS through a dedicated RLS-bound runtime role. Missing certification and security migrations are applied. Vercel is linked to GitHub, with production credentials excluded from previews. This closes the former missing-infrastructure prerequisite; it does not close Auth enrollment, storage/retention, recovery, commercial billing, or enterprise integration work.

See [ENTERPRISE_READINESS.md](ENTERPRISE_READINESS.md) for evidence, exact remaining gates, and the pending cleanup of session QA fixtures after Supabase's cleanup confirmation error.
>>>>>>> 09b4eacea222943b909332f791122bb92d906dca

## Closed (previously)

### B0. Codex CLI unauthenticated — CLOSED by direct implementation
- `codex login status` = "Not logged in"; no auth.json. Implemented directly (D4).
  Unblock only if the user wants Codex in the loop later (`codex login`).
