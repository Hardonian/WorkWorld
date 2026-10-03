# WorkWorld

> I am building WorkWorld to test whether people and AI agents complete business
> workflows correctly when requirements change. The first slice models purchasing,
> reconciliation and customer/project recovery. The evaluation is designed to
> distinguish a convincing report from correct operational state, with separate
> measurement of human oversight and assessment effort. Practitioner validation
> and comparative results are still pending.

Executable professional-work simulations: a persistent small-business operations
environment (inbox, suppliers, purchase orders, deliveries, invoices, ledger,
tickets, spreadsheet artifacts) where humans, AI agents, and humans using AI
work under the same goals and policy — graded on **business state**, not the
polish of the report.

## Status (readiness states are kept distinct)

| Dimension | State |
|-----------|-------|
| Local technical candidate | verified automated suite (including real Postgres RLS), 8 original browser e2e journeys, lint/typecheck/build gate |
| Hosted candidate | **not wired** — hosted Supabase RLS is verified, but app auth and the Postgres EventStore adapter are not integrated; hosted execution refuses to fall back to demo storage |
| Research evidence | **harness validation only** — no live-model comparison, no human study |
| Commercial evidence | **none** — protocols only; no customers, pilots, or revenue |

Episodes are authored and code-reviewed but **practitioner-unvalidated**. Nothing
here is verified skill, employability, accreditation, or hiring suitability.

## Quick start (credentials-free, synthetic data)

```bash
npm ci
npm run dev          # http://localhost:3100
```

- `/` — pick an episode (guided start: "Week-14 restock")
- `/workspace` — the learner workspace (per-session state survives refresh)
- `/assessor` — evidence inspection + attributable rubric judgments
- `/health` — health endpoint

## Verification

```bash
npm run lint           # eslint (0 problems)
npm run typecheck      # tsc --noEmit
npm test               # vitest: domain, grading, agents, assessments, sanitize, x-cases
npm run db:up && npm run db:test   # real Postgres RLS tests (Docker)
npm run baseline       # competent scripted control: 6/6 episodes pass
npm run negatives      # 6 negative controls fail for the right reasons
npm run eval -- --adapter baseline            # run manifests + report
npm run eval -- --verify-manifest eval-runs/manifest-<id>.json   # replay check
npx playwright test    # browser workflows (needs dev server or auto-start)
npm run release-gate   # full gate; nonzero exit on missing evidence
```

## Evaluation interface

`EpisodeEngine`: `reset / observe / step / checkpoint / restore / replay`, with
`gradeEpisode` for deterministic assessment. Fixture adapters are labeled
`kind: "fixture", live: false` — they validate the harness and are **not model
results**. Live adapters: OpenAI Chat Completions and an OpenAI-compatible local
endpoint (Ollama). Paid trials require an explicit budget (docs/BLOCKERS.md B2).

## Documentation

- `docs/PROJECT_BRIEF.md` · `docs/ARCHITECTURE.md` · `docs/EPISODE_SPECS.md`
- `docs/GRADER_CONTRACT.md` (checks, categories, claim limits)
- `docs/RELATED_WORK.md` (GDPval, WorkArena++, TheAgentCompany, τ²-bench,
  EnterpriseOps-Gym, OccuBench, Mechanize, Forage, Workera — with source dates)
- `docs/validation-pack/` (independent acceptance cases + CASE_MAPPING.md)
- `docs/OPERATIONS.md` (startup, backup/restore, rollback, limits)
- `docs/RELEASE_CHECKLIST.md` · `TASK_STATE.json` (authoritative milestone state)

## Privacy and claims

All company data is synthetic. No participant data exists. Exports are redacted
operational evidence. Withheld evaluation variants live outside the public
archive; this is **not** a claim of contamination resistance.
