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
