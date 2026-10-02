# WorkWorld — Business Brief (technical candidate + validation plan)

Status honesty: this is a **technical candidate with a validation plan**. There
is no buyer pain evidence, delivery-hours evidence, paid demand, or reuse
evidence yet. Nothing here is traction. A demo video cannot establish commercial
traction.

## Buyer and pain (hypotheses to test, not findings)

- **Buyer:** operations managers at 20–200 person suppliers/distributors; L&D
  leads at community colleges running operations certificates; employer training
  budgets for junior operations/coordinator hires.
- **Pain hypothesis (to validate in interviews):** junior hires learn purchasing
  discipline (approval limits, three-way match, duplicate handling) by making
  real, expensive mistakes; current training is shadowing + slide decks with no
  inspectable evidence of competence.
- **Offer hypothesis:** a bounded apprenticeship with inspectable assessment
  evidence that shows whether a learner keeps business state correct under
  disruption — not just whether their write-up reads well.

## Paid-pilot hypothesis (pricing EXPERIMENT — not a validated price)

CAD 3,000–7,500 for a bounded six-week pilot (docs/validation-pack/04 proposes
the interview and unit-economics method). Pilot shape: 1 role, 3 scenario
families, a real cohort, assessor workflow in use, pre-agreed success criteria
and kill criteria.

## Delivery economics (planning estimates, labeled as such)

- Authoring cost observed so far: 6 episodes + graders built inside one build
  session; realistic per-episode authoring with practitioner review is unknown
  until reviews happen (Mechanize reports ~one engineer-week per hardened task —
  2° source; treat as a planning reference only).
- Recurring support: cohort setup, assessor training, incident handling —
  unmeasured.
- Expansion path (unproven): more roles (AP clerk, dispatcher), tenant cohorts,
  assessor marketplaces — none built; no LMS/billing in scope.

## Competitor comparison (from docs/RELATED_WORK.md)

| Alternative | What they cover | Gap this candidate tests |
|-------------|-----------------|--------------------------|
| GDPval | deliverable quality vs experts | persistent business-state correctness + assistance conditions |
| WorkArena++ / EnterpriseOps-Gym | enterprise browser/planning envs | human conditions + oversight/assessment-effort measurement |
| TheAgentCompany | simulated company, agent tasks | human-with-AI retained responsibility as first-class condition |
| τ²-bench | dual-control simulated users | real human participants (pending) + auditable assessment |
| OccuBench | professional sim + fault injection | typed deterministic state + assessment validity |
| Forage | job simulations for enablement | consequential state + inspectable assessment evidence |
| Workera | calibrated skills assessment | workflow recovery under requirement change |
| Mechanize | environments + hardened graders for labs | training/assessment-for-humans axis |

We do not claim any competitor lacks a capability based on website silence.

## Risks

Assessment validity unproven; episode realism unvalidated; grader may be
attackable in ways not yet found; market may not pay for simulation training;
incumbents (Forage/Workera/Pearson) have distribution; AI-assist tooling may make
the training obsolete fast.

## Evidence still needed (in order)

1. Two practitioner reviews of episodes/policies (packet ready).
2. Usability feasibility (5–8 consenting participants, governance first).
3. 5 buyer interviews (guide in docs/validation-pack/04; tracker
   buyer_validation.csv stays empty until real interviews happen).
4. One paid pilot at the experiment price — only after 1–3.

## Kill criteria (pre-declared)

Practitioners rate episodes unrealistic (<3/5) after revision round → stop or
re-author; buyers see no training pain in 5 interviews → stop; pilot buyers won't
pay ≥ CAD 3,000 → narrow to free institutional research use.
