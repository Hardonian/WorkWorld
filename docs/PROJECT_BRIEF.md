# WorkWorld — Project Brief

Status: active build (working title). Last updated: 2026-10-01.

## Product

WorkWorld is a runtime for **executable professional-work simulations**: persistent,
consequential work environments that humans, AI agents, and humans using AI can
operate under the same operational goals, with inspectable assessment evidence.

The first product is a **small-business operations apprenticeship**. One role
(operations coordinator at a small supply/trades business), one workspace
(inbox, supplier records, purchase orders, deliveries, invoices, ledger, ticket
board, spreadsheet artifacts, work notes), three scenario families, six
reviewed-by-code initial episodes.

Research question: **when does AI assistance improve completed work, and when
does it only improve the apparent quality of the output?** The evaluation design
separates artifact polish from business-state correctness: a convincing narrative
cannot conceal incorrect business state.

## Users

1. **Learner / participant** — completes episodes in the workspace (human-only mode).
2. **Agent operator** — runs an agent against the documented programmatic interface.
3. **Human-with-AI** — retains task responsibility while inspecting and accepting suggestions.
4. **Assessor** — inspects actions and artifacts, records rubric-based judgments.
5. **Evaluator** — runs the environment headlessly with pinned run manifests.
6. **Org admin** (hosted mode) — manages cohorts within one tenant.

## Commercial proposition

Practical operations training with inspectable assessment evidence. Credible for
an institutional or employer pilot. Produces reproducible evidence relevant to
frontier-agent evaluation and applied AI engineering. Recruitment, funding, and
adoption are pursued honestly — never fabricated. Pricing experiments (e.g. a
bounded six-week pilot) are experiments, not validated prices.

## Release scope (bounded)

- One role, one workspace, three scenario families, six initial episodes.
- Human-only, agent-only, and human-assisted modes over the same domain state,
  permitted actions, goals, and policy.
- Deterministic outcome grading + separately recorded human rubric.
- Documented programmatic evaluation interface (reset/observe/step/checkpoint/restore/grade).
- Credentials-free local demo with synthetic data and per-session isolation.
- Hosted cohort mode (Supabase/Postgres, RLS) — **separate and explicit**; enabled
  only when configuration is present. Missing configuration disables hosted paths
  safely (no silent fallback to demo data).
- Headless evaluation runner with pinned run manifests and report generation.
- Assessor workflow with attributable, auditable judgments.

## Non-goals

- No LMS replacement, no creator marketplace, no VR, no broad agent framework.
- No model pretraining; no new paid provider without explicit budget authorization.
- No Stripe/billing in this release (billing only if later explicitly included).
- No claim of being first or best. No unvalidated novelty or "verified skill" claims.
- No publication of withheld evaluation material in agent-facing artifacts.

## Assumptions (explicit, unvalidated until tested)

1. Practitioner validity is **pending**: all six episodes are authored and code-reviewed
   only. External practitioner review has not occurred.
2. Human-study governance (consent, ethics review) is **pending**; no participant
   data exists. All company data is synthetic.
3. Live-model experiment results are only meaningful with real providers and budget;
   fixture-agent runs validate the harness, not model capability.
4. Grader validity claims are bounded to the tested checks; a model-based judge is
   secondary and uncalibrated until compared with human assessment.
5. Timing equivalence across modes is documented, not perfect: human wall-clock
   reading time is not charged against the same budget as agent steps.
