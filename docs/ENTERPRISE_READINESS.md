# WorkWorld hosted readiness — 2026-10-21

WorkWorld has a provisioned Supabase database and a GitHub-linked Vercel project. This is a gated technical candidate. It is not approved for enterprise production or paid service.

## Infrastructure completed

- Supabase project: `gsssdavzyorvhtdolvaj`, `workworld`, us-west-2.
- Vercel project: `workworld`, `prj_g7dC8dFH63EGsYLDCdJY25b4O0Du`, existing team `shardie-githubs-projects`.
- Applied the missing certification migration and the forward-only hosted runtime hardening migration. Core data remains in the private `workworld` schema with RLS.
- Created `workworld_runtime` without superuser, role creation, database creation, inherited privileges, or RLS bypass. Its credential is stored in the Vercel production environment.
- Verified the session pooler over TLS using the official Supabase root CA and hostname verification. Certificate fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
- Configured eight production variables, including a generated signing key. Preview deployments receive four configuration values and no production database credential or signing key.
- Kept `WORKWORLD_HOSTED_STORE_WIRED=false`. Deployment success does not count as approval to accept participant workloads.

## Code and security completed

- Cookie-backed password and invitation-only magic-link sign-in, sign-out, and authorization-code callback; private routes require verified claims.
- Request-scoped identities, transaction-local Postgres roles and claims, bounded connection pools, timeouts, and safe connection disposal after failed rollback.
- Run creation and mutations commit state and action evidence together. Database locks serialize different application workers.
- Durable, RLS-scoped assessment revisions and certification preflights replace hosted local-file or ephemeral success paths. Hosted assessor attribution comes from the verified user rather than a submitted name.
- Original action serialization and actor attribution survive JSONB storage, preserving exact replay. Rejected actions retain their forensic outcome.
- Certification organization and requester cannot be reassigned. Artifact metadata is append-only for authenticated identities.
- Fixed the forged Stripe signature acceptance. Timestamped HMAC verification now checks the signature and replay window. The unfinished billing adapter remains disabled in hosted mode.
- Hosted billing, Stripe/ATS webhooks, LTI, MCP, assistance, generated evaluation/forge routes, and fixture telemetry return explicit unavailable responses until their persistent implementations and provider validation are complete.
- API failures preserve a redacted incident identifier and return recoverable statuses. Readiness errors do not disclose connection details.
- CI now installs Chromium and uses a disposable PostgreSQL 17 service for RLS tests. The synthetic Cloudflare dispatcher was replaced with the real OpenNext compiler; Cloudflare verification is an optional separate target.

## Verification and its limits

`evidence/hosted/runtime-validation.json` records 12 checks against the real Supabase project: durable create/resume, cross-tenant denial, concurrent workers, atomic rollback, blocked role escalation, certification isolation, immutable certification scope, assessor persistence and isolation, cleared pooled claims, exact replay, and rejected-action evidence. These used synthetic SQL identities, not a real Supabase Auth browser session.

The local suite passed 244 tests and 17 Playwright journeys before the final release gate. Local database tests require a disposable database; never point `tests/db/rls.test.ts` at a shared project because its historical fixture setup deletes table contents. CI supplies a fresh service. The optional Cloudflare build was not validated for this Vercel deployment.

The two isolated QA organizations and three synthetic profiles created during live verification require cleanup. Supabase rejected the cleanup calls with `Invalid or expired requestState`; no broad deletion was attempted. Existing `Org A` / `Org B` fixtures were left untouched. The exact cleanup statements are in `deploy/supabase/cleanup-session-qa.sql`.

## Remaining launch gates

| Gate | Concrete action and evidence needed |
|---|---|
| Auth enrollment | Invite or create the intended operator/test accounts in Supabase Auth; confirm the email; configure the deployed Site URL and exact `/auth/callback` and `/auth/confirm` redirects; configure the magic-link email template to supply the token hash expected by `/auth/confirm`. Email authentication is enabled and email confirmation is required. No real Auth users were present during review. |
| Participant and assessor memberships | Use `npm run member:provision` with a server-only operator database connection. The script defaults to rollback; `--apply` commits. It requires an existing confirmed Auth user. Assign assessors to runs through the tenant's controlled administration process. |
| Authenticated hosted browser acceptance | Sign in, create a run, reload, act, check report/replay, record an assigned assessor revision, and verify another tenant cannot access it. Preserve the evidence, then enable `WORKWORLD_HOSTED_STORE_WIRED=true` and redeploy. |
| Supabase Auth policy | An owner must review public signup, redirect allowlists, SMTP delivery, password/MFA requirements, and any SSO provider. The connected database tools do not expose Auth administration; the local Supabase CLI has no management token. Public signup is currently enabled, but it grants no WorkWorld membership. |
| Paid billing | Replace the fixture checkout and in-memory subscription adapter with Stripe SDK/API checkout, tenant-admin authorization, real price IDs, durable event idempotency, subscriptions, entitlements, and tested cancellation/payment-failure handling. Credentials alone do not close this gate. |
| Enterprise integrations | Configure and validate each actual LTI platform registration, SSO identity provider, ATS webhook secret, and agent API identity. Complete their persistent state and replay/nonce checks before enabling routes. |
| Evidence object storage | Select and configure a private tenant-scoped bucket, encryption/KMS requirements, retention/deletion policy, and audited upload/download paths. Metadata persistence is implemented; raw artifact storage is not. |
| Recovery and incident operations | Confirm plan-level backup/PITR coverage, perform a restore drill, assign incident ownership, and connect alert delivery. A source backup script is not restore evidence. |
| Legal and commercial release | Approve privacy/retention terms, DPA and any jurisdiction requirements, support commitments, customer contracts, and substantiated product claims. No compliance certification or customer evidence is asserted. |
| Paid model trials | Supply the selected provider credential and an explicit experiment budget. No paid trial or new subscription was commissioned. |

## Operator verification

1. Run `npm ci` and `npm run release-gate` against a clean checkout. Provide `WW_TEST_PG_URL` only for a disposable database.
2. Inspect `evidence/release-gate/latest.json` and the live database evidence separately; local success does not activate hosted mode.
3. Review Vercel production environment presence without printing values. Preserve the separation from previews.
4. Probe `/health`, `/health/ready`, `/api/episodes`, `/api/billing/checkout`, and `/workspace`. An inactive hosted candidate should be live, not ready, deny anonymous runs, and reject unfinished integrations.
5. Complete the authenticated walkthrough before changing the activation flag.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side), [Postgres TLS](https://supabase.com/docs/guides/platform/ssl-enforcement), [connection options](https://supabase.com/docs/guides/database/connecting-to-postgres), [Vercel environment management](https://vercel.com/docs/environment-variables/managing-environment-variables), [Stripe signature verification](https://docs.stripe.com/webhooks/signature).

## Final verification reconciliation

GitHub CI [39708739701](https://github.com/Hardonian/WorkWorld/actions/runs/39708739701) passed all 11 gates against a fresh PostgreSQL 17 service. Its artifact is retained as `evidence/release-gate/latest.json`. A local rerun initially attached to another development server; the failed record is preserved separately. Browser verification now starts its own server on localhost:3219 and all 17 journeys pass. Eight deployment probes pass, including both sign-in surfaces, anonymous access denial, and intentionally unavailable hosted integrations. `evidence/hosted/verification-provenance.json` records the scopes and source references.
