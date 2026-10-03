# WorkWorld — Operations

## Startup (local)

```bash
npm ci
cp .env.example .env.local    # optional; demo mode needs no configuration
npm run dev                    # http://localhost:3100
# production:
npm run build && npm start
```

Liveness: `GET /health` returns service/mode/time (no secrets). Readiness:
`GET /health/ready` verifies the configured demo store and returns `503` when
hosted mode is selected because that application path is intentionally disabled.

## Modes

| Mode | Config | Behavior |
|------|--------|----------|
| demo (default) | none | per-session state in `var/demo-data` (FileStore) or memory |
| hosted | reserved | Database schema/RLS is verified, but app auth + Postgres EventStore are not wired; **all hosted episode starts are refused** — never falls back to demo data |

## Data, backup, restore

- Demo runs: `var/demo-data/<runId>/{meta.json,actions.jsonl,state.json}`.
  **Backup:** copy `var/demo-data` (append-only history + digest-verified state).
  **Restore:** copy back; `loadState` verifies digests and refuses corrupt
  snapshots with an explicit recovery path (checkpoint / replay / restart).
- Hosted database boundary: use the managed project's backup tooling. Migrations are versioned in
  `db/migrations/` and apply to a **fresh** database:
  `bash scripts/db-up.sh` (test stack) or `node scripts/apply-migrations.mjs`
  (hosted — requires `WW_TEST_PG_URL`/`DATABASE_URL` in session mode, :5432;
  the script refuses transaction-pooler URLs because session GUCs are required
  by RLS). Hosted verification: `npm run db:test` with `WW_TEST_PG_URL` set,
  or `npm run release-gate` with hosted env (runs the `hosted-rls` gate).
- **Rollback (hosted schema):** `drop schema workworld cascade;` restores the
  prior database state; application code is rolled back by redeploying the prior
  git revision. Migrations are forward-only and additive in 0001.
- Container rollback: `docker run` the prior image tag; state lives in the
  mounted `var/` volume and is version-checked on load.

## Container

```bash
docker build -t workworld:0.1.0 .
docker run -p 3100:3100 -v workworld-data:/app/var workworld:0.1.0
```

## Limits and safety

- Action payloads are whitelisted/bounded at the API boundary (sizes, integer
  ranges); requests are state-serialized per run with revision + idempotency
  checks (no double effects on retry).
- Logs record operational metadata only. No API keys, tokens, or participant
  identifiers are logged; session ids are opaque UUIDs.
- Spreadsheet export neutralizes formula-injection (`= + - @`, control chars).
- Agent dispatch: bounded steps/time/output/retries; paid calls gated by the
  shared experiment budget **before** dispatch.

## Release gate

```bash
npm run release-gate
```

Runs lint, typecheck, tests, baseline, negatives, build and archive checks;
exits nonzero when a required technical gate lacks current evidence. Hosted
database-boundary readiness is reported separately. Application-hosted readiness
stays blocked until authenticated identity and the Postgres EventStore are wired
and exercised end to end.
