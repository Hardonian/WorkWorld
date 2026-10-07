# WorkWorld — Resume Handoff

Last updated: 2026-10-07 (M0–M10 all complete — Production Release Candidate; 100/100 productization items across 10 strategic pillars verified).

- Repo: `https://github.com/Hardonian/workworld` (PRIVATE), branch `main`.
  Candidate revision: `fd07f77b` (latest fully gated release candidate).
- State: **M0–M10 all passed**. Release gate 8/8 PASS (`evidence/release-gate/latest.json`).
  Archive: `dist/workworld-source-fd07f77b.tar.gz` + SHA256SUMS.
  2026-10-07 re-verification: gate 8/8, 211 unit/integration tests across 41 files, Playwright e2e 12/12 — green.
- Verification commands:
  - Full release gate: `npm run release-gate` (8/8 gates PASS)
  - Full unit & integration suite: `npm test` (211 passed across 41 files)
  - End-to-end browser workflows: `npm run test:e2e` (12/12 Playwright tests green)
  - Deterministic evaluation baseline: `npm run baseline` (6/6 episodes pass)
  - Negative controls: `npm run negatives` (6/6 invariant violations caught)
  - Scenario catalog & DAG invariants: `npm run lint:scenarios` (15/15 scenarios pass)
  - High-concurrency stress test: `npm run benchmark:stress` (15,000+ actions/sec)
  - Environment diagnostics: `npm run doctor`
  - Manifest replay: `npm run eval -- --adapter baseline` + `--verify-manifest <path>`
  - Database backup snapshot CLI: `npm run db:backup`
  - Production build: `npm run build`
- Local URL: `http://localhost:3100` (start with `npm run dev` or production `npm start`).
- Edge Deployment: Cloudflare OpenNext wired (`npm run deploy:edge`).
- External blockers with exact next actions:
  - **B2 paid providers**: provide an authorized OpenAI API key + explicit spend cap for live LLM dispatches. (Local Ollama and deterministic fixture adapters are fully operational).
  - **human governance**: ethics/consent approval before live participant human studies (drafts in `materials/` and `docs/ETHICS.md`).
- Hosted database & application execution (B1 & B3) CLOSED:
  - Dedicated Supabase project `gsssdavzyorvhtdolvaj.supabase.co` with 12/12 RLS tests verified.
  - Transactional `PostgresStore` wired with optimistic revision locks and RLS session claim propagation (`tests/store-postgres.test.ts`).
- Durable records: `TASK_STATE.json` (authoritative; `npm run validate:task-state`), `docs/PRODUCTIZATION_ROADMAP.md`, `docs/BUILD_LOG.md`, `docs/BLOCKERS.md`, `docs/TECHNICAL_REPORT.md`.
- Resume rule: reread this file + `TASK_STATE.json` + `git status`; all milestone layers are complete and release candidate is verified green.
