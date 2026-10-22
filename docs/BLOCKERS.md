# WorkWorld — Blockers

Precise launch gates, alternatives, and the evidence required to close them.

## B1. Infrastructure — closed

Supabase and Vercel are provisioned, production variables are configured, and
the hosted runtime has passed current live Postgres/RLS adapter checks for
concurrency, rollback, and exact replay. This closes the infrastructure
prerequisite only; it does not activate hosted participant workloads.

See [Enterprise readiness](ENTERPRISE_READINESS.md) for verification scope and
the pending cleanup of synthetic session-QA fixtures.

## B2. Live paid-model trials — externally blocked

- **What:** live paid-model trials through the OpenAI adapter.
- **Why:** no authorized `OPENAI_API_KEY` or experiment budget is configured.
- **Alternative:** local Ollama smoke runs and deterministic fixture adapters
  validate the integration contract without creating cost or provider claims.
- **Unblock:** provide an approved provider credential and an explicit spend cap.

## B3. Hosted acceptance — pending

The hosted application remains safely inactive until the following acceptance
path is complete:

1. Enroll confirmed Supabase Auth accounts and provision organization memberships.
2. Configure the production Site URL, exact callback redirects, and email template.
3. Complete a hosted browser walkthrough: sign in, create/resume/action/replay a
   run, record an assessor revision, and prove cross-tenant denial.
4. Preserve evidence, then enable `WORKWORLD_HOSTED_STORE_WIRED=true` and redeploy.

## B4. Enterprise operations and commercial scope — pending

Live billing, external integrations, raw evidence object storage, retention,
recovery drills, incident ownership, legal/commercial approval, and customer
acceptance remain intentionally outside the active workload path. Each requires
an owned service configuration and its own verification evidence.

## Closed previously

### B0. Codex CLI authentication

No longer required for delivery; repository work and release evidence can be
produced directly.
