# Technical announcement (DRAFT — do not publish without separate authorization)

**WorkWorld: a persistent operations simulation that grades business state, not
report polish (technical candidate)**

Today I'm sharing the technical candidate for WorkWorld, a small-business
operations environment (orders, deliveries, invoices, double-entry ledger,
tickets, artifacts) that runs the same typed actions for humans, AI agents, and
humans with AI assistance.

What is actually built and verified (revision-pinned evidence exports):
- 6 episodes across purchasing, reconciliation, and recovery — plus withheld
  policy/causal variants for evaluation
- deterministic grading that keeps proposed actions, prevented harmful actions,
  committed critical errors, and incomplete work distinct
- negative controls that fail for declared reasons alongside competent controls
  (including an alternative compliant route), verified at the mutation boundary
- real Postgres RLS tests: two organizations, participant/assessor/admin roles
- reproducible run manifests + replay verification

What is NOT done: practitioner validation, human studies, live-model comparisons.
The central question — whether AI assistance improves correct completion and
recovery when requirements change, with measurable oversight and assessment
effort — is the pending experiment, with a pre-declared 2×2 protocol.

Repo: private during validation. Happy to talk to practitioners who train or
assess operations coordinators.
