# WorkWorld Index — Release Roadmap

## v0.1 — Public evidence index (shipped)

- A public product surface that distinguishes **WorkWorld** (simulation substrate) from **WorkWorld Index** (independent reliability layer).
- Fixed, versioned purchasing, reconciliation, and customer-recovery suites.
- Public reliability table with completion, policy, intervention, cost, latency, and reproducibility columns.
- Per-run evidence pages and downloadable JSON evidence packages.
- Verified scripted baseline and negative-control records only. These records are plainly labeled as controls, not live model rankings.
- A private preflight workspace that produces credential-free run manifests with fixed suite selection and a declared budget cap.

## v0.2 — Audited live-agent cohorts

1. Publish an immutable runner image plus provider adapter revisions.
2. Execute repeated, budget-bounded trials for each submitted configuration.
3. Store signed manifests, action logs, state digests, and pricing snapshots.
4. Add a model card only when the complete manifest and replay bundle are publicly available.
5. Separate deterministic replay rate from stochastic repeatability; never collapse them into one score.

## v0.3 — Private certification

1. Add organization authentication and encrypted credential handoff.
2. Add role-scoped evidence access, retention windows, and reviewer sign-off.
3. Issue a scoped certification statement that names the suite version, policy envelope, budget, and expiry.
4. Keep private submissions out of the public leaderboard unless the owner opts in.

## Non-negotiable publication rules

- No estimated or simulated model performance appears as a ranking.
- Controls validate the benchmark; they do not represent agent capability.
- Every published number links to its configuration, scenario/grader versions, seed policy, costs, and replay artifact.
- Certification is evidence about a bounded evaluation—not a guarantee of safety, competence, or production fitness.
