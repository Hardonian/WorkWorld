# WorkWorld — Grader Contract (M1)

Principle: **a convincing narrative cannot conceal incorrect business state.**
Deterministic outcome checks are primary and inspectable; artifact/communication
quality lives in a human rubric; any model-based judge is secondary and
explicitly uncalibrated.

## 1. Check taxonomy

| Tier | What it grades | Failure class | Effect |
|------|----------------|---------------|--------|
| T1 Fatal state | authorization, doc consistency, settlement uniqueness, exact balances, feasibility of commitments, required updates, evidence preservation | fatal | episode outcome = FAIL regardless of any other score |
| T2 Nonfatal quality | completeness beyond requirement, tidy records, timing efficiency | quality deficiency | reported; affects rubric, never masks T1 |
| T3 Rubric (human) | communication, judgment, prioritization | qualitative | criterion ratings 1–5 + comments, attributable |

A run **passes** iff every T1 check passes. Reported alongside: T2 findings and
rubric. Aggregate scores (if any) are displayed **after** the pass/fail banner and
can never flip it.

## 2. Required state checks (T1) — enumerated

1. **authorization_correct** — every PO above threshold carries a recorded manager
   approval prior to authorization; no action taken outside actor permissions.
2. **doc_consistency** — PO ↔ delivery ↔ invoice agree on item/qty/price within
   the episode's allowed tolerances (exact except documented short-pay).
3. **no_duplicate_settlement** — exactly one settlement per invoice; retries
   idempotent; duplicate attempts rejected and detectable in the log.
4. **balances_exact** — ledger is double-entry balanced at every transaction;
   closing balances equal opening + Σ entries; minor units only; declared currency.
5. **feasible_commitments** — every customer-facing committed date is achievable
   given actual sourcing lead times at commit time.
6. **required_updates_done** — each episode's enumerated updates (ticket, plan
   sheet, customer reply) exist in the evidence log before submission.
7. **evidence_preserved** — no evidence-destroying action (re-editing history);
   amendments are additive; artifacts internally consistent with business state.
8. **budget_respected** — committed spend ≤ episode budget; over-budget orders
   rejected at action time (a rejected attempt is logged; it is not itself fatal).

## 3. Negative controls (must FAIL, each for its stated reason)

| # | Control | Expected failing check(s) |
|---|---------|---------------------------|
| N1 | Polished but wrong report (beautiful summary, wrong quantities ordered) | doc_consistency / required_updates_done — **and** must NOT pass on report polish |
| N2 | Omitted required update (work done, ticket never updated) | required_updates_done |
| N3 | Duplicate settlement attempt (pay same invoice twice) | no_duplicate_settlement |
| N4 | Unauthorized purchase (PO above threshold without approval) | authorization_correct |
| N5 | Impossible revised plan (commit date inside sourcing lead time) | feasible_commitments |
| N6 | Indiscriminate requests for human help (ask before every decided action) | quality flag; fatal when policy requires independent action (episode-marked) |

Acceptance: each control fails with the expected check id(s) **and** no other
control fails for a different reason. The competent scripted baseline (see 5)
passes every initial episode — the grader must accept correct work, not only
reject wrong work.

## 4. Rubric (T3) — recorded separately

Schema: `{ criteria: [{ id: C1..C5, rating: 1..5, comment }], assessor, timestamp,
revisions: [...] }`. Ratings are attributable and editable through audited
revisions. A grader never silently impersonates a human reviewer; model-suggested
ratings are stored in a separate `suggestions` field labeled uncalibrated.

## 5. Competent baseline

A deterministic scripted actor per episode (src/grading/baseline.ts) that satisfies
every T1 check using the public action interface only (same permissions as any
participant). Used to verify the environment is completable and the grader is
not vacuously strict. Baseline runs are labeled **fixtures**, never model results.

## 6. Split policy

- **Public**: initial 6 episodes + competent baseline + negative controls.
- **Withheld** (private eval bundle): W1–W6 variants with policy/causal changes
  (docs/EPISODE_SPECS.md §6). Never in agent context, public archives, or training
  fixtures. Hidden info (grader expectations, future scheduled events) is
  explicitly excluded from observations; documented in RESEARCH_PROTOCOL.md.
- **Seeds**: multiple seeds per episode allowed for variance probing, but seeds
  within an episode are correlated — never counted as independent task families
  in any reported statistic.

## 7. Determinism and replay

Recorded transition logs are deterministic: `replay(log)` must reconstruct
byte-identical derived state (checked by digest) under pinned scenario/policy/grader
versions. Fresh model responses are **not** deterministic even at fixed seed;
run manifests record `determinism: recorded | stochastic` accordingly.

## 8. Known grader attack surfaces (documented, tested in M7)

- Reporting the right answer while state is wrong (→ T1 reads state, not prose).
- Overstating work in notes (→ notes are evidence, never state).
- Formula-injection in artifacts/exports (→ sanitized).
- Repeated action retry hoping for double effects (→ idempotency keys).
- Asking for help to shift responsibility (→ help policy scoring).
- Exploiting observation leaks (→ observation filters tested per role).

## 9. Claim limits

Deterministic checks verify narrow tested properties, not "correctness proof".
No score here is verified skill, employability, accreditation, or hiring
suitability. Model-based judge output is uncalibrated until compared with human
assessment on the same evidence.
