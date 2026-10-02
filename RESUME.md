# WorkWorld — Resume Handoff

Last updated: 2026-10-02 (M10 complete — local release candidate; resume-day re-verification done).

- Repo: `https://github.com/Hardonian/workworld` (PRIVATE), branch `main`.
  Candidate revision: `2e2cd1a5` (last fully gated revision before this update);
  the final checkpoint commit follows this update.
- State: **M0–M10 all passed** for the LOCAL technical candidate. Final release
  gate 8/8 (evidence/release-gate/latest.json). Archive:
  `dist/workworld-source-2e2cd1a5.tar.gz` + SHA256SUMS. Evidence exports:
  `evidence-exports/{m2-retroactive,m5,m7,m10-final}/` + zips.
  2026-10-02 re-verification: gate 8/8, 90 tests (12/12 RLS), e2e 8/8 — green.
- Verification commands: `npm run release-gate` (full gate),
  `npm test` (90 tests incl. real Postgres RLS via `npm run db:up`),
  `npx playwright test` (8 e2e), `npm run baseline` / `npm run negatives`,
  `npm run eval -- --adapter baseline` + `--verify-manifest`,
  `bash scripts/verify-clean-install.sh`.
- Local URL: `http://localhost:3100` (dev server from this session; restart with
  `npm run dev`). No hosted preview exists.
- External blockers with exact next actions:
  - **B2 paid providers**: provide an authorized key + explicit spend cap; the
    runner budget-checks before every paid dispatch.
  - **human governance**: ethics/consent approval before any participant work
    (materials/ drafts); practitioner reviewers invited by the user only.
- Hosted (B1) CLOSED 2026-10-02: dedicated project `gsssdavzyorvhtdolvaj.supabase.co`,
  12/12 RLS verified remotely via the `hosted-rls` release gate. Credentials in
  `.env.local` (gitignored) + operator secrets file. To re-verify with hosted
  checks: `set -a; source ~/.hermes/secrets/supabase.env; set +a; npm run release-gate`
  (expect `hosted: VERIFIED`). Hosted schema changes: `node scripts/apply-migrations.mjs`
  (session-mode URL required).
- Durable records: `TASK_STATE.json` (authoritative; `npm run validate:task-state`),
  `docs/BUILD_LOG.md`, `docs/BLOCKERS.md`, `docs/TECHNICAL_REPORT.md`.
- Resume rule: reread this file + TASK_STATE.json + git status; validate evidence
  against the recorded revision; continue from the first unmet gate. Do not
  re-scaffold. Never claim hosted readiness, study results, or traction that do
  not exist.
