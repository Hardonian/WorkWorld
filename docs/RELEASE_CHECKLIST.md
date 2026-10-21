# WorkWorld — Release Checklist

Machine-checked gates run via `npm run release-gate` (exits 0 when all 11/11 required
technical gates pass cleanly with **current** evidence). Manual gates are reviewed.

## Machine-checked (required for LOCAL release)

- [x] `npm ci` clean install succeeds from lockfile
- [x] `npm run typecheck` exit 0 (0 errors across whole codebase)
- [x] `npm run lint` exit 0 (0 warnings, 0 errors)
- [x] `npm run build` exit 0 (Next.js 16 production build clean)
- [x] `npm test` exit 0 (the current unit/integration suite)
- [x] `npm run baseline` — competent baseline passes every initial episode (6/6)
- [x] `npm run negatives` — all 6 negative controls fail for the right reasons (6/6)
- [x] `npm run eval -- --verify-manifest <path>` reproduces recorded tables (6/6 matches)
- [x] DB/RLS tests (Postgres): tenant/role isolation, forbidden mutations (12/12 verified)
- [x] `npm run test:e2e` — Playwright public, workspace, API, and launch-readiness flows
- [x] `npm run lint:scenarios` — Scenario catalog & DAG invariants verified (15/15 passed)
- [x] `npm run benchmark:stress` — high-concurrency stress test completes and records its measured result
- [x] `npm run doctor` — Environment, runtime, and dependency diagnostics green
- [x] No secrets in tracked files (archive secret scan clean)
- [x] TASK_STATE.json validates against schema (11 milestones, 2 blockers)
- [x] Archive builds from tracked files + checksum manifest; extraction verified

## Machine-checked (required for HOSTED release — separately reported)

The current `evidence/release-gate/latest.json` is the authority for a launch
candidate. It reports `hosted: blocked_external` when no hosted configuration
is available; a historical tenant test is not a current production approval.

- [ ] Hosted runtime configuration present and reachable: URL, browser
      publishable key, server database URL, service-role key, signing key, and
      explicit hosted-mode flags.
- [ ] RLS suite passes against a supplied non-production hosted tenant
      (`WW_TEST_PG_URL`; run `npm run release-gate -- --require-hosted`).
- [ ] Service-role key absent from client bundle, logs, and exported evidence.
- [ ] Authenticated browser-to-Postgres episode flow is exercised end to end
      with a real user, membership, and RLS claims.

## Manual gates

- [x] Browser inspection: screenshots of real interactions; console clean; no broken links
- [x] Accessibility spot-check: keyboard path, focus visible, contrast, labels
- [x] Claims review: every numeric claim tied to a source or run; maturity labels accurate
- [x] Privacy review: no participant data, no confidential material, exports redacted
- [x] Withheld material excluded from public archive and agent-facing fixtures
- [ ] Rollback + backup/restore exercised on the selected hosted deployment target

## Externally blocked (must NOT be counted as passing)

- Live paid-model trials (BLOCKERS.md B2; local Ollama & fixtures available)
- External practitioner review (RESEARCH_PROTOCOL.md)
- Human-study governance approval
