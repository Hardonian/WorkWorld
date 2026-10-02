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

## B1. Hosted (Supabase) release — EXTERNALLY BLOCKED (open)
- What: verification against a real hosted Supabase/Postgres project and hosted release.
- Cause: no hosted Supabase project/URL/keys configured; supabase CLI not installed.
- Failed attempts: `which psql pg_ctl supabase` → absent (discovery, 2026-10-01).
- Alternative executed: RLS policies and migrations are tested against a real
  Dockerized Postgres with Supabase-compatible roles/claims (`db/`, `tests/db/`).
  Hosted paths remain disabled with an explicit unavailable state when config is absent.
- Unblock: a hosted project URL + anon key + service-role key (server-side), then
  run `npm run db:test` against it and the M6 hosted gate.

## Closed

### B0. Codex CLI unauthenticated — CLOSED by direct implementation
- `codex login status` = "Not logged in"; no auth.json. Implemented directly (D4).
  Unblock only if the user wants Codex in the loop later (`codex login`).
