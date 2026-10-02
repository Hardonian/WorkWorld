# WorkWorld — Build Log

Machine-generated observations are marked `[machine]`; written judgments are `[judgment]`.

## 2026-10-01 — M0 Discovery and bootstrap

- [machine] Host: WSL2 `HX370`, kernel 6.18.33.1, 16 cores, 30 GiB RAM, ~893 GiB free on `/`.
- [machine] Toolchain: node 26.7.0, npm 11.19.0, pnpm 12.4.2, python 3.14.7, git 2.43.0,
  docker 29.1.3 (daemon up, no containers), ollama 0.30.8 on 127.0.0.1:11434 with
  llama3.1:8b / gemma3:4b / mistral / llama3.2 / codellama.
- [machine] `codex --version` = codex-cli 0.140.0, `codex login status` = "Not logged in",
  no `~/.codex/auth.json`, no provider key in env → Codex unauthenticated.
- [judgment] Implement directly with the configured Hermes model (scope allows; a second
  coding agent is not a prerequisite). Recorded as D4.
- [machine] GitHub auth: `gh` authenticated as **Hardonian** (repo, workflow, gist scopes).
  `gh repo view Hardonian/WorkWorld` → 404 (name unused). `gh repo list` grep shows
  WorldForge / World26 / SawyerCore / commercial-architecture-simulator — no collision.
- [machine] No local `*workworld*` match under /home/scott (maxdepth 3).
- [machine] `npm install` exit 0; lockfile 8476 lines; esbuild 0.28.2, tsx 4.23.15,
  tsc 5.9.3 binaries verified executing. Two postinstall scripts (esbuild, unrs-resolver)
  held by npm `allowScripts` — tools verified working without them.
- [machine] `tsc --noEmit` exit 0. `GET http://localhost:3100/` → 200 with rendered `<h1>`;
  `GET /health` → `{"status":"ok","service":"workworld","mode":"demo",...}`.
- [machine] Evidence: `evidence/m0/environment.txt`, `evidence/m0/route-probe.txt`.
- [judgment] Architecture selection: single Next.js 16.3.8 package + pure domain core
  (D2), TS 5.9.3 (D3), event-sourced state (D6), demo file/memory store with opaque
  session (D8), Dockerized Postgres for RLS tests (D7), Ollama as live local
  OpenAI-compatible provider (D5).
- Name: "WorkWorld" is a working title; no trademark clearance claimed (D1).

## 2026-10-01 — M1 Task specification and related work

- [machine] Related work compiled from live retrieval 2026-10-01: GDPval (OpenAI,
  2025-09-25), TheAgentCompany (arXiv:2412.14161), WorkArena/WorkArena++
  (ServiceNow, NeurIPS 2024 / arXiv:2407.05291), τ²-bench (Sierra), Mechanize
  (2025-04), Forage, Workera (Pearson acquisition 2026-09-29), Enterprise-Bench
  (DevRev/Laude 2026-07-09), EnterpriseClawBench (arXiv:2606.23654). Secondary
  sources marked (2°). Table + contribution hypothesis: docs/RELATED_WORK.md.
- [machine] Authored: docs/EPISODE_SPECS.md (3 families, 6 episodes A1/A2/B1/B2/
  C1/C2; policy P1–P12; typed action set; scheduled events; terminal conditions;
  T1 outcome checks; T3 rubric), docs/GRADER_CONTRACT.md (check taxonomy, 8
  required state checks, 6 negative controls, split policy, determinism note,
  attack surfaces, claim limits).
- [machine] Withheld variants W1–W6 defined (policy/causal changes: threshold
  change, post-authorization price change, supplier insolvency, USD invoice,
  deadline collapse, duplicate payment-run pressure).
- [machine] Study materials drafted in materials/: practitioner-review packet,
  participant info + consent draft, human-feasibility protocol, assessor guide.
  All labeled pending; no approval or review claimed.
- [judgment] M1 gate met. Episodes remain practitioner-unvalidated (assumption
  #1 in EPISODE_SPECS §8). Research question and contribution are framed as
  hypotheses, not findings.

## 2026-10-01 — M2 State engine, persistence and adversarial grading

- [machine] Domain core implemented: typed actions (23 kinds), pure reducer with
  policy enforcement (P1–P12 mapped to codes), logical-time scheduler with
  9 scheduled-event kinds, double-entry ledger (minor units), safe spreadsheet
  grammar (SUM/AVG/MIN/MAX + arithmetic, bounded) with CSV formula-injection
  defense, EpisodeEngine (reset/observe/step/checkpoint/restore/replay + digests).
- [machine] Six episode definitions (A1/A2/B1/B2/C1/C2) zod-validated at load;
  withheld W1–W6 policy/causal variants in src/scenarios/withheld/.
- [machine] Persistence: FileStore (JSONL actions + digest-verified state.json)
  and MemoryStore; CorruptStateError carries an explicit recovery path.
- [machine] Evidence runs: `npm run baseline` → 6/6 episodes pass all T1 checks;
  `npm run negatives` → N1–N6 each fail exactly its expected check
  (evidence/m2/*.json). vitest 41/41 green; tsc clean.
- [machine] Defects found by the test suite and fixed at root cause:
  AP credit-balance sign inversion in applyTxn; cell-ref rendering off-by-one
  ('@1' vs 'A1') breaking ranges; disjunctive sub-predicates over-counted as
  individually required; event-minute boundary (>= vs >) on post-change evidence.
- [judgment] Baseline/negative runs are authored fixtures, not model behavior.
  feasible_commitments is a documented lead-time lower bound, not a planning proof.

## 2026-10-02 — M3 Complete human workspace

- [machine] Workspace UI built over the shared domain core: scenario picker with
  guided first episode, brief/checklist, inbox + compose (with commitment fields),
  supplier catalogs, order drafting/submit/approve/authorize/amend/cancel, delivery
  check-in, invoice match/approve/schedule/pay/dispute/flag-duplicate, ledger,
  ticket board with references + promises, spreadsheet editor (safe formulas, CSV
  export with injection defense, add-cell), work notes, help requests, submission
  and outcome-evidence panel.
- [machine] Session model: opaque httpOnly cookie + FileStore persistence;
  refresh/resume verified in Playwright. Rejections return stable actionable
  states (409 + reasons) and preserve work.
- [machine] `npx playwright test` → 8/8 passed: every episode (A1/A2/B1/B2/C1/C2)
  completed through the browser UI to PASS outcome evidence, plus no-session
  degradation and rejected-action recovery. vitest 41/41; tsc clean; `npm run build` clean.
- [machine] Real screenshots: evidence/m3/screenshots (home, brief, orders,
  delivery check-in, outcome evidence, mobile width).
- [judgment] Defects found by e2e at root cause: sheets couldn't add new cells
  (UX gap, fixed with add-cell control), ambiguous labels/selectors surfaced
  accessibility naming issues (aria-labels added to selects/inputs).
- Environment note: Hardonian/WorkWorld on GitHub unexpectedly existed PUBLIC at
  push time (created externally mid-session); per user decision it was switched
  to PRIVATE to match the authorized scope. Verified private afterwards.

## 2026-10-02 — M4 Agent and assisted modes

- [machine] Provider-neutral loop (src/agents/): observe→decide→step with explicit
  bounds (steps, elapsed, output chars, parse retries, per-call timeout), shared
  experiment budget checked BEFORE each paid dispatch, usage recorded with
  pricingSource "unknown_cost" unless a priced table is explicitly configured.
- [machine] Adapters: OpenAI Chat Completions (wire schema verified against the
  official API reference on 2026-10-02 — max_completion_tokens current,
  max_tokens deprecated; usage prompt/completion/total_tokens), Ollama
  OpenAI-compatible (live on this host), deterministic fixtures labeled
  kind:"fixture", live:false. Missing key => ProviderUnavailableError (tested).
- [machine] Fixture runs cover success, invalid tool output, partial output,
  timeout, provider error, budget stop (tests/agents.test.ts, 13 tests).
- [machine] Assisted mode: inspectable suggestions (raw + parsed + rationale),
  nothing executes without explicit human accept, advice vs executed actions
  recorded separately, handoffs recorded; /api/assist + workspace AssistantCard.
- [machine] Live smokes (unpaid local Ollama, NOT benchmark results):
  llama3.1:8b timed out at the 60s bound (handled cleanly); gemma3:4b completed
  a call but returned advice-only (terminalReason=no_action). Recorded in
  evidence/m4/.
- [judgment] Grader-leakage test asserts observations/prompts contain no grader
  internals or future schedule. OpenAI live trials remain externally blocked (B2).

## 2026-10-02 — Validation-pack integration + M5 evaluation runner

- [machine] Pack integration (commit 429d9a7): X01 cumulative-settlement guard
  (real defect: two invoices could double-settle one receipt — now blocked at
  approve/settle boundary), X02 aggregate authorization at the mutation boundary,
  X04 approval revocation + commit-time validity. P0 dev tests X01/X02/X04/X06/
  X08/X09/X13/X14 added (tests/x-cases.test.ts); 66 vitest green; negatives 6/6
  (N4 now authorization_correct + requirements_met with distinct categories).
- [machine] docs/validation-pack/ (SHA256SUMS verified) + CASE_MAPPING.md for all
  16 cases (P0 all PASS; X07/X11/X15 PARTIAL with stated limitations).
- [machine] M5: scripts/eval-runner.ts — manifests carry revision/dirty-tree,
  grader+scenario versions, seed, condition, agent config, budget provenance,
  bounds, terminal reasons, usage, digests; CSV + report generator; fixture vs
  stochastic separated. Replay verification: 6/6 deterministic runs reproduce at
  pinned commit 429d9a7. Baseline 6/6 pass; negatives+controls 12 runs (6/6).
- [machine] Evidence exports: evidence-exports/m5/ (26 files + zip) and
  m2-retroactive (explicitly labeled post-hoc). Exports contain no secrets or
  participant data.
- [judgment] No live-model trials (B2). No leaderboard from fixtures. Withheld
  W1-W6 excluded from exports; contamination-resistance not claimed from storage.

## 2026-10-02 — M6 Assessor workflow and hosted pilot boundaries

- [machine] Assessor workflow: /assessor workspace (evidence inspection: checks +
  action log + submission), criterion-level C1-C5 ratings + comments, attributable
  mandatory assessor identity, append-only audited revisions (originals never
  mutated — tested), portable report with deterministic and human sections kept
  separate. Model suggestions are a separate uncalibrated field by design.
- [machine] Hosted schema: db/migrations/0001_init.sql (Supabase-compatible
  roles/claims; RLS on all tables; append-only action history; assessments as
  revision rows). Tested on FRESH Dockerized Postgres 16 (scripts/db-up.sh):
  12/12 RLS tests — two orgs, participant/assessor/admin; participant isolation;
  assessor assigned-only; cross-tenant reads fail; forbidden mutations fail
  (incl. no in-place assessment updates); only admins manage memberships.
- [machine] Root-caused and fixed an RLS policy subtlety: unqualified `run_id` in
  policy subqueries resolved to the INNER table's column, silently weakening
  predicates. Policies now fully qualify outer columns (comment in migration).
- [machine] Hosted availability guard: hosted mode without configuration returns
  an explicit unavailable reason and never falls back to demo data (3 tests).
- [machine] vitest 84/84 (9 files incl. db), tsc clean, build clean, Playwright
  8/8 (one earlier run showed a single timing flake in workspace.spec — passed
  on rerun; recorded as observed-flaky-once).
- [judgment] Scope statement: RLS boundaries verified on local Postgres with
  Supabase-compatible roles. NOT verified against a hosted Supabase project —
  hosted release remains blocked (B1). Local release unaffected.

## 2026-10-02 — M7 Whole-product verification and hardening

- [machine] Checks at RC revision: eslint 0 problems (eslint pinned 9.39.5 for
  eslint-config-next's plugin tree compat — ESLint 10 crashes its react plugin),
  tsc clean, next build clean, vitest 89/89 (10 files: domain, grading, artifacts,
  store, agents, assessments, hosted-guard, sanitize, x-cases, db/RLS), Playwright
  8/8, npm audit (prod) 0 vulnerabilities.
- [machine] Adversarial coverage map: malformed/hostile input (tests/sanitize.test.ts
  5), concurrency at mutation boundary (X08), duplicate requests (X09), refresh
  during work + rejected-action recovery (e2e), stale state (X08), corrupt store
  state with recovery path (store tests), provider outage + timeout (agents tests),
  missing env/config (hosted-guard + provider-unavailable tests), withheld tasks
  (leak tests), forbidden cross-tenant reads/mutations (RLS tests), model-proposed
  unauthorized actions (loop tests + boundary rejection).
- [machine] UI inspection via local Playwright browser (browser tool blocks
  private addresses — recorded): 7 real screenshots incl. assessor workspace;
  console errors across home/workspace/assessor + full interaction flow: 0
  (WW_REQUIRE_CLEAN_CONSOLE=1 gate).
- [machine] Evidence export evidence-exports/m7/ + .zip.
- [judgment] One e2e timing flake observed once in an earlier run (passed on
  rerun and in every subsequent run) — recorded, not silenced.

## 2026-10-02 — M9 Research, pilot and recruitment materials

- [machine] docs/TECHNICAL_REPORT.md: harness-validation report grounded in
  executed runs (every table row has its command + N); explicitly not a
  model-comparison paper; failure-category section lists root-caused defects.
- [machine] materials/: business brief (buyer/pain/pilot as hypotheses, CAD
  3000-7500 pilot labeled a pricing experiment, kill criteria, no TAM/customers/
  revenue invented), demo script, real demo video capture (evidence/m8/demo.webm),
  outreach drafts (profile update, technical announcement, OpenAI methods note,
  upstream contribution proposal) — all DRAFTS, nothing sent or published.
- [machine] docs/RESEARCH_PROTOCOL.md updated: 2x2 (assistance x requirement
  change) design adopted from the validation pack as a protocol with
  preregistered estimand and secondary measures; feasibility target labeled a
  planning suggestion. Nothing has run.
- [judgment] buyer_validation.csv remains header-only per the pack's own
  contract. All external evidence (reviews, studies, pilots) plainly pending.

## 2026-10-02 — M8 + M10 Deployable release, final reconciliation

- [machine] Source archive: git-archive of tracked files at 311f07dc (227 files,
  withheld material export-ignored, secret scan, SHA256SUMS manifest, clean-dir
  extraction verification). Two self-inflicted verifier catches fixed at root:
  uncommitted .gitattributes; scanner regex matching its own literal.
- [machine] Clean-install proof: extract -> npm ci -> build -> start -> /health
  -> GET / 200 -> episode-start API (scripts/verify-clean-install.sh PASS).
  Root-caused: `next start -p 3100` hardcoded port ignored the smoke port
  (WW_PORT now configurable).
- [machine] Final release gate on final revision (evidence/release-gate/latest.json):
  lint, typecheck, tests (90), baseline (6/6), negatives (6/6), build,
  task-state, archive — 8/8 PASS. Local technical candidate: PASS.
  Hosted: blocked_external (B1). Research: harness validation only.
  Commercial: none.
- [machine] Deployment artifacts: Dockerfile + healthcheck, .env.example (no
  secrets), docs/OPERATIONS.md (backup/restore + rollback + limits + log
  redaction). Backup/restore scope: demo FileStore (append-only actions +
  digest-verified state + corruption recovery path — store tests); hosted uses
  managed tooling (not exercised — B1).
- [machine] Real demo video: evidence/m8/demo.webm (actual recording).
  Final evidence export: evidence-exports/m10-final/.
- [judgment] Dead code/obsolete docs reviewed; no known release-blocking defect
  hidden behind a flag. Remaining external dependencies with exact next actions
  listed in docs/BLOCKERS.md and RESUME.md. Not tagged as GA: a local release
  candidate only, accurately scoped.
