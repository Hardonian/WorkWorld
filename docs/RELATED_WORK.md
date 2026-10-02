# WorkWorld — Related Work (M1)

Comparison compiled 2026-10-01 from the sources listed (retrieval date =
2026-10-01 unless noted). Claims about each system are bounded to what the cited
source states; no novelty superlatives are asserted. Where only a secondary
source was consulted, it is marked (2°).

| Work | What it measures / how | Grading | Environment | Gap relative to WorkWorld's question |
|------|-----------------------|---------|-------------|--------------------------------------|
| **GDPval** (OpenAI, announced 2025-09-25; openai.com/index/gdpval, evals.openai.com) | 1,320 occupational deliverable tasks (220 gold) across 44 occupations; expert-authored; deliverables are documents/spreadsheets/slides/etc. | Blinded expert pairwise comparison + rubrics; automated pairwise grader ≈66% agreement with experts (2°: marktechpost 2025-09-25) | Static task + reference files (one-shot deliverables) | No persistent business state: the deliverable is the work. WorkWorld tests whether state is *correct*, not whether the artifact reads well |
| **TheAgentCompany** (CMU, arXiv:2412.14161, 2024-12; github.com/TheAgentCompany) | 175 tasks in a simulated software company (GitLab, RocketChat, ownCloud, Plane); digital-worker tool use | Checkpoint scoring (S_full / S_partial), deterministic + LLM evaluators | Self-hosted multi-app company env | Consequential multi-app work is shared ground; WorkWorld adds financial-record invariants (double settlement, authorization) and human-rubric-vs-state separation |
| **WorkArena / WorkArena++** (ServiceNow, 2024; WorkArena++ NeurIPS 2024, arXiv:2407.05291) | Browser agents on ServiceNow knowledge work; WorkArena-L1: 19,912 instances / 33 atomic tasks (2°: github README); WorkArena++: 682 compositional tasks | Task success criteria + generated ground-truth traces | Remote ServiceNow instance via BrowserGym/AgentLab | UI-skill and planning emphasis; WorkWorld's core outcome is auditable business-state correctness across finance/ops documents |
| **τ-bench / τ²-bench** (Sierra/Princeton; sierra-research/tau2-bench; τ² = dual-control telecom, Dec-POMDP) | Tool-agent-user interaction under domain policy; simulated user; stateful DB comparison; domains airline/retail/telecom/banking_knowledge (375 tasks reported by 2° vendor page) | Database end-state vs expected state + policy adherence | Text/voice conversation + tools | Policy adherence + end-state checking is shared ground; WorkWorld adds mid-task requirement change, evidence artifacts, and human-retained-responsibility assistance |
| **Mechanize** (announced 2025-04; mechanize.work) | Virtual work environments + evals + training data for agent RL; currently software-engineering focus (e.g. GBA Eval); ~1 engineer-week per task with grader hardening (2°: runtimewire) | Deterministic exploit-resistant graders (stated emphasis) | Simulated workstations | Closest in spirit (environments + hardened graders); WorkWorld contributes the *training/assessment-for-humans* axis with inspectable evidence and rubric separation |
| **Forage** (theforage.com; employers docs) | Self-paced virtual job simulations (250+, 90+ employers); model answers; certificates | Model answers + self-comparison; explicitly **not** positioned as an assessment tool | Static task walkthroughs | Pre-career enablement, no persistent state or consequential actions; WorkWorld is consequential-state work with assessment evidence |
| **Workera** (workera.ai; Pearson acquisition announced 2026-09-29, PRNewswire) | Skills intelligence via calibrated assessments (Evidence-Centered Design), simulations, proctoring; Capability Score | Rubric-calibrated + human-in-loop verification (stated) | Assessment platform | Employers want defensible evidence; WorkWorld's inspectable action/artifact evidence + state checks is a candidate evidence layer, not a competing skills taxonomy |
| **Enterprise-Bench** (DevRev + Laude Institute, 2026-07-09; globenewswire; L1–L2 released) | Enterprise agent work under fragmented data/permission boundaries; precision/efficiency/safety axes; traces must be submitted | Independent LLM judge vs published criteria + trace audit | Harbor harness, synthetic enterprise data | Permission-boundary and audit-trace emphasis aligns with WorkWorld's authorization checks; WorkWorld adds financial invariants + human assessment records |
| **EnterpriseClawBench** (arXiv:2606.23654, 2026-06-22) | 852 tasks derived from real workplace agent sessions (2°: alphaxiv); multidimensional reporting (harness×model, artifacts, cost) | Semantic rubrics + hard rules | Recovered fixtures from session archive | Its finding — report harness×model, artifact quality, cost, not one score — is exactly WorkWorld's separation of state checks / rubric / cost accounting |
| **GBA-Bench** (Automation Anywhere, proprietary; 2°: vendor blog 2026) | Enterprise workflows from SOPs across 7 domains; dual metrics: task success + trajectory accuracy | Task success + trajectory accuracy | Proprietary enterprise fixtures | Proprietary; WorkWorld ships a public, reproducible harness with withheld policy variants |

## Contribution hypothesis (testable, not claimed as fact)

1. In persistent business-state work, **artifact-quality graders overstate
   competence**: the gap between rubric-quality and state-correctness pass rates
   is measurable and grows under unaccountable assistance (H1, RESEARCH_PROTOCOL.md).
2. **Deterministic outcome checks + separately recorded human rubrics** expose
   failure modes (polished-but-wrong, omitted updates, duplicate settlement,
   unauthorized purchase, impossible plans) that deliverable-only grading misses.
3. **Human-retained-responsibility assistance** (inspectable suggestions, explicit
   execution permissions, recorded handoffs) behaves differently from autonomous
   agent operation on the same state — a comparison WorkWorld makes first-class.

What we do **not** claim: being first or best; contamination resistance beyond
documented withholding; equivalence of human/agent conditions; any capability
result (none has run — BLOCKERS.md B2 / M5 fixtures only).

## Sources (retrieval 2026-10-01)

- https://openai.com/index/gdpval/ ; https://evals.openai.com/
- https://arxiv.org/abs/2412.14161 ; https://github.com/TheAgentCompany/TheAgentCompany
- https://www.servicenow.com/workflow/ai/introducing-workarena-benchmark.html ;
  https://arxiv.org/abs/2407.05291 ; https://github.com/ServiceNow/WorkArena
- https://github.com/sierra-research/tau2-bench ; https://sierra.ai/blog/benchmarking-ai-agents
- https://www.mechanize.work/announcing-mechanize-inc/ ; https://www.mechanize.work/
- https://www.theforage.com/ ; https://employers.theforage.com/post/what-is-a-virtual-work-experience
- https://www.workera.ai/ ; https://www.prnewswire.com/news-releases/pearson-acquires-workera-...-302891779.html
- https://www.globenewswire.com/news-release/2026/07/09/3324848/0/en/... (Enterprise-Bench)
- https://www.alphaxiv.org/abs/2606.23654 (EnterpriseClawBench)
- Secondary/vendor pages (2°) as marked above: marktechpost.com (2025-09-25),
  runtimewire.com (Mechanize), automationanywhere.com (GBA-Bench), github READMEs.
