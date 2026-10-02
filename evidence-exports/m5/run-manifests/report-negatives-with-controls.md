# Evaluation report (generated 2026-10-02T02:30:35.621Z)

**Scope:** deterministic fixture — each negative control paired with competent controls; NOT model results. Denominator: 12 runs (pass 6, fail 6).

**Candidate:** commit `429d9a757e56ed6a9094ceb4e1d1b196b3501a1f` on branch `main`; dirty files: 3.

**Agent:** `{"id":"scripted-negative-controls+competent-controls","kind":"fixture","live":false,"model":"fixture"}` · **grader version** 1.0.0 · **budget** {"limitMinor":0,"currency":"CAD","pricingSource":"unknown_cost"}

## Terminal reasons

| reason | runs |
|--------|------|
| submitted | 12 |

## Runs

| run | scenario | seed | outcome | T1 | failing checks | terminal |
|-----|----------|------|---------|----|----------------|----------|
| neg-N1 | A1 | 42 | fail | 8/9 | requirements_met | submitted |
| neg-N2 | A1 | 42 | fail | 8/9 | required_updates_done | submitted |
| neg-N3 | B2 | 42 | fail | 9/10 | no_duplicate_settlement | submitted |
| neg-N4 | A1 | 42 | fail | 7/9 | authorization_correct, requirements_met | submitted |
| neg-N5 | C1 | 42 | fail | 8/9 | feasible_commitments | submitted |
| neg-N6 | B2 | 42 | fail | 9/10 | help_policy | submitted |
| baseline-A1 | A1 | 42 | pass | 9/9 | — | submitted |
| baseline-A2 | A2 | 42 | pass | 9/9 | — | submitted |
| baseline-B1 | B1 | 42 | pass | 9/9 | — | submitted |
| baseline-B2 | B2 | 42 | pass | 10/10 | — | submitted |
| baseline-C1 | C1 | 42 | pass | 9/9 | — | submitted |
| baseline-C2 | C2 | 42 | pass | 9/9 | — | submitted |

## Claim limits

- Fixture runs validate the harness; they are not model-capability evidence.
- Stochastic model runs (if any) are single trials per seed unless stated; seeds within an episode are correlated and are never counted as independent task families.
- No leaderboard is published from fixture agents or invented participants.