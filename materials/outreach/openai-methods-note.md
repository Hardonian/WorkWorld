# OpenAI-relevant contribution: methods note (DRAFT — review first)

## Title

Grading operational state instead of deliverable polish: a replayable harness
for assistance-under-change experiments

## Summary (short methods note)

Deliverable-quality evaluations (e.g. GDPval-style expert comparison) measure
whether an output reads well. Operational work also fails in ways documents do
not: double settlement, unauthorized purchase, impossible commitments, omitted
record updates. WorkWorld contributes a replayable harness where those failures
are first-class: an event-sourced business environment with a typed action
contract shared by human UI and agent loop, deterministic outcome checks with
four distinct outcome categories, and negative/competent control suites that
verify the grader discriminates state, not prose.

## Replayable result package

- `evidence-exports/m7.zip` — candidate identity, exact commands + outputs,
  case mapping (WW-X01..X16), run manifests with terminal reasons, screenshots.
- `npm run release-gate` reproduces the checks; `npm run eval -- --verify-manifest`
  reproduces recorded digests at the pinned revision.

## Specific reproducible failure analysis

WW-X01 (two invoices, one receipt): the naive per-invoice rule "one settlement
per invoice" passes while one delivery is paid twice. The harness caught this;
the fix is a cumulative-per-receipt guard at the approve/settle mutation
boundary (tests/x-cases.test.ts reproduces both the failure and the fix). This
class — invariant that crosses documents — is where deliverable graders are
blind.

## Honest limits

No model-comparison results exist. Fixture runs validate the harness only.
GDPval's industry-expert interest route will be evaluated after practitioner
review; nothing here implies submission acceptance or recruitment.
