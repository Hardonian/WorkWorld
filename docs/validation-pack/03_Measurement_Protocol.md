# Proposed measurement protocol

Status: protocol draft; no participants recruited, no live providers run, no study approval obtained, no effect measured. This specifies a later experiment. It does not block Hermes's technical release candidate.

## Stage A: validate the measurement instrument

Run the competent scripted controls and intentionally wrong controls before comparing models. Confirm that each criterion has a declared policy and actual state evidence. A competent alternative route must pass, not just the reference transcript. Run the adversarial suite through the shared action interface and test real concurrency at the authoritative persistence boundary.

Ask two relevant operations practitioners to independently inspect the task policies and plausible outcomes. Resolve genuine ambiguity in the specification before collecting confirmatory results. Record disagreements, revisions and what remained unresolved. Two reviewers provide early content-validity feedback, not occupational validation or accreditation.

Then use a small usability feasibility exercise, suggested 5–8 consenting participants, to find interface confusion, timing defects, inaccessible actions and misleading instructions. This is a planning suggestion, not a power calculation. Their practice/exploration episodes should not be reused as fresh confirmatory data.

## Stage B: a focused assistance and change experiment

Proposed primary outcome: successful terminal operational state, with all critical invariants intact, within a declared work budget. Report incomplete work and fatal committed errors separately. The primary assistance definition is suggestions to a human who approves/actions changes; do not mix autonomous execution into that condition without a separately specified study.

Use a 2 × 2 design:

| Condition | Assistance | Requirement change |
| --- | --- | --- |
| H0 | Human-only | No consequential change |
| H1 | Human-only | Prespecified consequential change |
| A0 | Human with the configured assistant | No consequential change |
| A1 | Human with the configured assistant | Prespecified consequential change |

Randomize people at the participant level to one cell to reduce tool-learning and assistance carryover. Each person can complete one episode from each of the three families in randomized order, using distinct cases from the training/tutorial material. If a paired/crossover design is later chosen to reduce recruitment burden, document carryover, variant equivalence and washout limitations before running it.

Proposed feasibility target: 40 participants, 10 per cell, with up to three episodes each. This is a feasibility target, not a claim that 40 is powered to detect the effect. Episodes within a person are correlated; 120 episode records are not 120 independent people. A confirmatory sample size must be chosen from a meaningful minimum effect and an appropriate power/design analysis after feasibility observations, with qualified methods review.

Hold constant the task goals, available operational information, authority and submission criteria. Define the change trigger before the study. Prefer a controlled logical milestone that is reachable under all conditions; record whether the trigger was reached. If someone never reaches it, do not silently exclude their failure. Avoid using real wall-clock time to expose slow readers to extra business events. Record active work time, wall-clock time and simulated environment time separately.

Primary estimand to preregister: whether assistance changes correct completion specifically under the consequential-change condition. One useful secondary contrast is the difference in assistance effects between changed and unchanged conditions. Define sign, denominators, exclusions and analysis before looking at outcomes. Do not declare a causal human-assistance effect from an unrandomized model-only run.

## Agent-only evaluation is a separate track

Run the current configured live agent with the same observable facts, domain actions, budgets and terminal criteria. Pin the adapter, prompts, provider/model identifier, relevant options and code/scenario/grader versions. Record stochastic reruns as repeated observations, not independent occupations. Do not combine fixture agents, human runs and live model runs into a single performance rate.

If the UI-based human condition and API-based agent condition differ in information presentation, tool latency or action access, publish those differences. A comparable operational goal does not establish perfect experimental equivalence.

## Secondary measures

- Committed critical errors per participant and episode; separately, prevented harmful actions.
- Recovery after the prespecified change, using declared terminal criteria and a fixed post-change budget.
- Oversight effort: active human review/correction time and attributable handoffs, not simply number of messages.
- Assessment effort: observed assessor active minutes from evidence opening to recorded judgment.
- Artifact quality from a blinded rubric where practical, reported separately from operational correctness.
- Human confidence before submission versus actual correctness, without calling calibration a hiring score.
- Live inference usage and cost where measurable; unknown costs remain unknown. Include human oversight and assessment costs when making economic comparisons.

For a persuasive-output gap, independently rate de-identified artifacts without revealing final state, then compare the declared communication-quality category with actual operational success. Predeclare the quality threshold before data collection. Report the full cross-tabulation. Do not label an assessor's liking or model-judge score as ground truth.

## Assessment validity and blinding

Have two assessors independently score an overlap sample before reconciliation. Preserve initial ratings, agreement/disagreement and criterion-level resolution. When reporting agreement, choose a measure appropriate to ordinal/binary data and its prevalence; provide raw agreement and uncertainty, not only a flattering coefficient. Assessors should not see assignment/model identity where avoidable, but document residual clues and the limits of blinding.

Measure effort against a clear comparator: the assessor's current method for reviewing equivalent work. A before/after classroom cohort differs from randomized assignment; report it as a pilot observation with confounding, not a causal productivity effect.

## Required run data

Use pseudonymous participant IDs. Keep identity/consent mappings separately controlled. Required fields: study/protocol version, recruitment cohort, randomized cell, episode/template ID, scenario/policy/grader versions, code revision, environment seed, assistant configuration, budgets, start/end timestamps, event trigger reached, actions and terminal state, completion/invariant outcomes, handoffs, observed time/cost, assessor identity and rubric version, missing-data reason and consent scope.

Record interface and provider failures explicitly. Prespecify handling of outages, withdrawals and invalid episodes. Publish totals recruited, assigned, attempted, completed and analyzed for each cell. Do not remove frustrating sessions simply because they worsen a result.

## Release and data boundaries

Before recruitment, establish responsible study oversight, participant information, compensation if any, voluntary withdrawal and actual data-retention/access policy appropriate to the institution or setting. No implication of an approved academic study or validated employment assessment. A learner's consent to a pilot is not consent to publish their work or train models on their trajectory.

The public demo should use synthetic examples. Keep actual human trajectories, identifiers and genuine held-out answers out of source archives. Aggregate release requires privacy review and any relevant permissions. Release replay manifests and appropriately redacted evidence only within consent and data policy.

Until these stages run, the publishable result is a harness-validation note, not a claim that AI improves human skill or that WorkWorld measures employability.
