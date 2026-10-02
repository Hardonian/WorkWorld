# Evaluation report (generated 2026-10-02T02:30:35.173Z)

**Scope:** deterministic fixture — replay-verifiable; NOT model results. Denominator: 6 runs (pass 6, fail 0).

**Candidate:** commit `429d9a757e56ed6a9094ceb4e1d1b196b3501a1f` on branch `main`; dirty files: 3.

**Agent:** `{"id":"scripted-baseline","kind":"fixture","live":false,"model":"fixture"}` · **grader version** 1.0.0 · **budget** {"limitMinor":0,"currency":"CAD","pricingSource":"unknown_cost"}

## Terminal reasons

| reason | runs |
|--------|------|
| submitted | 6 |

## Runs

| run | scenario | seed | outcome | T1 | failing checks | terminal |
|-----|----------|------|---------|----|----------------|----------|
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