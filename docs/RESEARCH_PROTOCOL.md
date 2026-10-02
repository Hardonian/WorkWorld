# WorkWorld — Research Protocol

Status: **protocol draft; no human study has run; no live-model comparison has run.**
Everything here is planned methodology, not results.

## Hypotheses

- **H1 (core).** AI assistance raises *apparent* work quality more reliably than it
  raises *business-state correctness*. The gap between artifact-quality rubric scores
  and deterministic outcome-check pass rates grows when assistance is unaccountable.
- **H2.** Human-retained-responsibility assistance (inspectable suggestions, explicit
  execution permissions) closes more of the correctness gap than autonomous agent runs,
  at some cost in active work time.
- **H3.** Deterministic outcome checks detect failure modes that artifact graders miss
  (polished-but-wrong reports, omitted updates, duplicate settlement, unauthorized
  purchases, impossible plans).

## Conditions (documented, not perfectly equivalent)

| Condition | Actor | Timing | Interface |
|-----------|-------|--------|-----------|
| human-only | human | logical clock advances only via explicit actions; wall-clock recorded separately | browser UI |
| agent-only | agent | logical clock advanced per episode timing policy; step budget bounds | programmatic API |
| human-assisted | human + agent | human timing; suggestions logged separately from executed actions | browser UI + suggestion panel |

Interface and timing differences are documented in ARCHITECTURE.md and each run
manifest. We do **not** claim the conditions are perfectly equivalent.

## Splits and withheld material

- Public: 6 initial episodes (2 per family) — practitioner-unvalidated.
- Withheld (`src/scenarios/withheld/`, excluded from public/agent-facing archives):
  policy/causal variants (changed approval threshold, price change after order,
  supplier insolvency, currency mix, lead-time collapse). Hidden information is
  explicit: grader keys and withheld states never enter observations or fixtures.
- Contamination claim limit: withholding reduces obvious leakage; it is **not**
  proof of contamination resistance.

## Graders

1. Deterministic outcome checks (fatal + nonfatal) — primary, inspectable.
2. Human rubric (criterion ratings + comments) — required for quality/communication.
3. Model-based judge — secondary, explicitly **uncalibrated** until compared with
  human assessment on the same evidence. Never labeled verified skill.

## Negative controls (must fail for the right reasons)

1. Polished but wrong report. 2. Omitted required update. 3. Duplicate settlement
attempt. 4. Unauthorized purchase. 5. Impossible revised plan. 6. Indiscriminate
requests for human help. Plus a competent scripted baseline that must pass.

## Validity limits (explicit)

- Six authored episodes are a **harness and design** sample, not a capability sample.
  Seeds within one episode are correlated and must never be counted as independent
  task families. Uncertainty estimates will state denominators and trial counts.
- No claims about employability, accreditation, hiring suitability, or business forecasting.
- External practitioner review: **pending** (no reviewer has assessed the episodes).
- Human feasibility study: **pending** (governance/consent materials drafted, unapproved).
- Live-model runs: **pending/externally blocked** (see BLOCKERS.md B2).

## Materials to accompany any study (drafts in `materials/`)

Participant information + consent draft, human feasibility protocol, assessor guide,
practitioner-review packet, pilot proposal. Synthetic company data only by default.
Any participant trajectory reuse requires separate actual permission.
