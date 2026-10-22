# WorkWorld Index — Hosted Launch Runbook

This repository is locally release-gated. A hosted production launch remains an operator action because it requires an owned Supabase project, production secrets, a domain, and a legal retention decision.

## 1. Provision and configure

1. Create the Supabase project and set `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the hosting platform—not in Git. `SUPABASE_URL` and `SUPABASE_ANON_KEY` remain backwards-compatible runtime fallbacks, but new deployments should use the publishable variables.
2. Set the server-only `DATABASE_URL` and a 32+-character `WORKWORLD_CERTIFICATION_SIGNING_KEY` in the hosting platform. A `SUPABASE_SERVICE_ROLE_KEY` is optional for isolated administrative jobs; never use it on RLS-bound request paths.
3. Configure approved Auth providers and redirect URLs. For invitation-only email sign-in, set the Supabase Site URL to the production domain and allow `https://<domain>/auth/confirm` as an Auth redirect URL. The app uses cookie-backed SSR sessions and a Next.js `proxy.ts` refresh boundary; protect private routes by checking verified claims server-side.
4. Apply migrations in order, including `0004_index_certification.sql`. The new certification tables live in the private `workworld` schema, retain metadata and artifact digests only, and have RLS enabled.

Before contacting any external service, run the local-only configuration and migration check:

```text
npm run hosted:check
npm run hosted:check:strict
```

The first command reports missing prerequisites without failing a local shell. The strict command exits non-zero until required configuration and the committed migration SHA-256 manifest are valid. Neither command prints credential values or connects to a network service.

## 2. Verify the tenant boundary

Run the database/RLS suite using a non-production test tenant:

```text
WW_TEST_PG_URL=<test-project-postgres-url> npm run db:test
```

Then set `WORKWORLD_MODE=hosted` and `WORKWORLD_HOSTED_STORE_WIRED=true` only after authenticated storage operations are proven. Do not use `user_metadata` for authorization; membership and RLS policies are the authorization boundary.

## 3. Artifact and certification operations

- Store raw manifests and action logs in encrypted object storage under an organization-scoped key. Persist only the object key and SHA-256 digest in `workworld.certification_artifacts`.
- Never collect provider keys, prompts, or customer data through the preflight endpoint.
- A certificate is eligible only if every named control has a replayable manifest, state digest, scope, expiry, and server-side signature.
- Keep public publication opt-in. A private certification must not create a leaderboard row.

## 4. Pilot and ROI protocol

For each design partner, capture a human baseline, agent completion rate, intervention minutes, incidents prevented, model costs, and the business cost of each incident. Feed those measured values into `/roi`; the planning model is not a savings claim.

## Launch blockers that require an owner

- Supabase project credentials and Auth-provider configuration.
- A tested Postgres connection with RLS identities propagated from authenticated sessions into the EventStore.
- Object-storage/KMS choice, retention schedule, and data-processing agreements.
- Design-partner agents, approved spend caps, and consent to publish any live result.
- Domain, deployment account, and incident/on-call ownership.

Supabase recommends cookie-backed SSR clients for Next.js and stresses that Data API permissions and RLS are separate controls; this runbook keeps the private `workworld` schema out of the browser-facing data surface. [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side), [Supabase Data API security guide](https://supabase.com/docs/guides/api/securing-your-api)
