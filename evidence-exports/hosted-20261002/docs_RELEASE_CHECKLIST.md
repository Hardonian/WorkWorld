# WorkWorld — Release Checklist

Machine-checked gates run via `npm run release-gate` (exits nonzero when a required
technical gate lacks **current** evidence). Manual gates are checked by a human.

## Machine-checked (required for LOCAL release)

- [ ] `npm ci` clean install succeeds from lockfile
- [ ] `npm run typecheck` exit 0
- [ ] `npm run lint` exit 0
- [ ] `npm run build` exit 0
- [ ] `npm test` (domain, grading, adapters, artifacts) exit 0
- [ ] `npm run baseline` — competent baseline passes every initial episode
- [ ] `npm run negatives` — all 6 negative controls fail for the right reasons
- [ ] `npm run eval -- --verify-manifest <path>` reproduces recorded tables
- [ ] DB/RLS tests (Dockerized Postgres): tenant/role isolation, forbidden mutations
      (required for HOSTED release; informational when DB stack is unavailable)
- [ ] `npm run test:e2e` — Playwright workspace workflows incl. refresh/resume
- [ ] No secrets in tracked files (secret scan script)
- [ ] TASK_STATE.json validates against schema
- [ ] Archive builds from tracked files + checksum manifest; extraction verified

## Machine-checked (required for HOSTED release — separately reported)

- [x] Hosted configuration present and reachable (dedicated project
      gsssdavzyorvhtdolvaj.supabase.co; verified 2026-10-02)
- [x] RLS tests against the hosted project pass (12/12 via the `hosted-rls`
      release gate — machine-checked on every `npm run release-gate` with
      hosted env present)
- [x] Service-role key absent from client bundle/log/export scan (archive
      secret scan + gate output redaction; leak scan of evidence JSON clean)

## Manual gates

- [ ] Browser inspection: screenshots of real interactions; console clean; no broken links
- [ ] Accessibility spot-check: keyboard path, focus visible, contrast, labels
- [ ] Claims review: every numeric claim tied to a source or run; maturity labels accurate
- [ ] Privacy review: no participant data, no confidential material, exports redacted
- [ ] Withheld material excluded from public archive and agent-facing fixtures
- [ ] Rollback + backup/restore instructions verified by a human on the deployment target

## Externally blocked (must NOT be counted as passing)

- Live paid-model trials (BLOCKERS.md B2)
- External practitioner review (RESEARCH_PROTOCOL.md)
- Human-study governance approval
