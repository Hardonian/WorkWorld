# WorkWorld — Milestones

States: pending | in_progress | passed | failed | blocked_external.
Authoritative machine-readable state: `TASK_STATE.json` (validated against schema).
Gate evidence lives in `evidence/<milestone>/` and `docs/BUILD_LOG.md`.

| ID | Milestone | State | Gate (short) |
|----|-----------|-------|--------------|
| M0 | Discovery and bootstrap | passed | repo+branch correct, lockfile install, real local route responds |
| M1 | Task specification and related work | passed | 6 episode specs, grader contract, split policy, related-work table with dates, unvalidated assumptions listed |
| M2 | State engine, persistence, adversarial grading | passed | 6 runnable episodes, baseline passes, 6 negative controls fail correctly, invariants + retry/stale tests pass, checkpoint/restore/replay verified |
| M3 | Complete human workspace | passed | every episode completable via UI, shared domain core, refresh/resume works, Playwright covers workflows |
| M4 | Agent and assisted modes | passed | 2 real adapters + fixtures compile with protocol tests; failure-mode fixtures pass; assisted mode works; no grader leakage |
| M5 | Evaluation runner and reproducible evidence | passed | pinned manifests reproduce tables; baseline + negatives run; denominators stated; withheld material excluded from fixtures |
| M6 | Assessor workflow and hosted pilot boundaries | passed | assessor flow works; real DB/RLS tests prove isolation for 2 orgs + roles; hosted unconfigured => safe unavailable |
| M7 | Whole-product verification and hardening | passed | lint/typecheck/build/domain/db/e2e/a11y/deps pass on RC revision; adversarial inputs verified; UI inspected with real screenshots |
| M8 | Deployable release and operational closure | passed | clean-install + archive + checksums + backup/restore + rollback + local/hosted readiness separated |
| M9 | Research, pilot and recruitment materials | passed | technical report from real runs; review/pilot/business drafts complete and labeled pending |
| M10 | Final reconciliation and handoff | passed | final gate green on final revision; claims match behavior; resumable state |

## Notes on maturity

- Episodes are **practitioner-unvalidated** until external reviewers assess them.
- Human-study governance is **pending**; no human participant data exists.
- Live-model results (if any) come only from actually configured providers within
  budget; fixture runs validate the harness, not model capability.
- Hosted mode is **unverified against a real hosted project** and blocked for hosted
  release until exercised; the credentials-free local release is unaffected.
