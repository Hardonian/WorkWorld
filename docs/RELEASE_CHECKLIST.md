# WorkWorld — Release Checklist

Machine-checked gates run via `npm run release-gate` (exits 0 when all 10/10 required
technical gates pass cleanly with **current** evidence). Manual gates are reviewed.

## Machine-checked (required for LOCAL release)

- [x] `npm ci` clean install succeeds from lockfile
- [x] `npm run typecheck` exit 0 (0 errors across whole codebase)
- [x] `npm run lint` exit 0 (0 warnings, 0 errors)
- [x] `npm run build` exit 0 (Next.js 16 production build clean)
- [x] `npm test` exit 0 (211 unit/integration tests passed across 41 files)
- [x] `npm run baseline` — competent baseline passes every initial episode (6/6)
- [x] `npm run negatives` — all 6 negative controls fail for the right reasons (6/6)
- [x] `npm run eval -- --verify-manifest <path>` reproduces recorded tables (6/6 matches)
- [x] DB/RLS tests (Postgres): tenant/role isolation, forbidden mutations (12/12 verified)
- [x] `npm run test:e2e` — Playwright workspace workflows incl. refresh/resume (12/12 passed)
- [x] `npm run lint:scenarios` — Scenario catalog & DAG invariants verified (15/15 passed)
- [x] `npm run benchmark:stress` — High-concurrency stress test passed (15,000+ actions/sec)
- [x] `npm run doctor` — Environment, runtime, and dependency diagnostics green
- [x] No secrets in tracked files (archive secret scan clean)
- [x] TASK_STATE.json validates against schema (11 milestones, 2 blockers)
- [x] Archive builds from tracked files + checksum manifest; extraction verified

## Machine-checked (required for HOSTED release — separately reported)

- [x] Hosted configuration present and reachable (dedicated project
      gsssdavzyorvhtdolvaj.supabase.co; verified 2026-10-02)
- [x] RLS tests against the hosted project pass (12/12 via the `hosted-rls`
      release gate — machine-checked on every `npm run release-gate` with
      hosted env present)
- [x] Service-role key absent from client bundle/log/export scan (archive
      secret scan + gate output redaction; leak scan of evidence JSON clean)
- [x] Hosted application PostgresStore wired with optimistic concurrency
      and session claims propagation (`src/server/store-postgres.ts`)

## Manual gates

- [x] Browser inspection: screenshots of real interactions; console clean; no broken links
- [x] Accessibility spot-check: keyboard path, focus visible, contrast, labels
- [x] Claims review: every numeric claim tied to a source or run; maturity labels accurate
- [x] Privacy review: no participant data, no confidential material, exports redacted
- [x] Withheld material excluded from public archive and agent-facing fixtures
- [x] Rollback + backup/restore instructions verified on deployment target

## Externally blocked (must NOT be counted as passing)

- Live paid-model trials (BLOCKERS.md B2; local Ollama & fixtures available)
- External practitioner review (RESEARCH_PROTOCOL.md)
- Human-study governance approval
