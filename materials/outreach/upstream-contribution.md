# Upstream contribution proposal (DRAFT — do not open without separate authorization)

**Target:** ServiceNow/EnterpriseOps-Gym (or TheAgentCompany) — whichever
maintainer is receptive.

**Finding (real, reproduced):** cross-document settlement invariants are not
enforced by per-document rules. Concretely: a system that allows "one settlement
per invoice" permits one receipt to be paid twice via two invoices (duplicate
payable under a new display id). Our reproducible test (WW-X01 in
docs/validation-pack/CASE_MAPPING.md) shows the failure and the minimal fix:
cumulative-approved/settled guards per receipt evaluated at the mutation
boundary, with all-or-nothing payment-run pre-checks.

**Proposal:** a small adversarial fixture set (duplicate payable under new
display id; split orders crossing aggregate limits; approval revoked before
commit; conflicting concurrent settlement; post-commit retry) with the four
outcome categories (proposed / prevented / committed / incomplete) as a
contribution to the benchmark's task suite or grader-test corpus.

**Scope:** fixture code + tests only; no benchmark restructuring. We would credit
their framework and follow their contribution process exactly.
