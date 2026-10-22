# WorkWorld

> **Stateful work simulations. Inspectable evidence. Honest release gates.**

[Open the live candidate](https://workworld-mauve.vercel.app) · [Explore the architecture](docs/ARCHITECTURE.md) · [Review enterprise readiness](docs/ENTERPRISE_READINESS.md)

WorkWorld is an evidence-first environment for testing how people and AI agents
handle operational work when the situation changes. It simulates the details
that make work real—orders, deliveries, invoices, inventory, reconciliations,
customer commitments, policy constraints, and recoveries—and grades the
**resulting business state**, not the polish of a narrative.

## Why WorkWorld

Most workflow demos reward a plausible answer. WorkWorld asks whether the work
was actually completed, safely and repeatably.

| Instead of | WorkWorld verifies |
| --- | --- |
| A polished status update | A valid state transition with the required evidence |
| A one-shot benchmark prompt | A persistent episode with scheduled changes and recovery paths |
| An opaque score | Deterministic checks, state digests, action history, and replay |
| A permissive demo environment | Typed actions, policy controls, idempotency, and tenant-aware persistence |

## What you can explore

- **Run realistic episodes** — purchasing, reconciliation, and project/customer recovery workflows.
- **Operate from a single workspace** — inbox, suppliers, POs, inventory, ledger, artifacts, and audit trail stay in sync.
- **Evaluate agents fairly** — human, assisted, and agent conditions use the same `EpisodeEngine` and grading contract.
- **Inspect the evidence** — replay runs, examine policy failures, export artifacts, and separate fatal state errors from human judgment.
- **Certify a bounded configuration** — prepare private, scoped evidence without exporting prompts, credentials, or customer data.

## Start locally

```bash
npm ci
npm run dev
```

Open [http://localhost:3100](http://localhost:3100), choose an episode, and
work through the changing operational state.

| Route | Purpose |
| --- | --- |
| `/` | Public Index and episode entry points |
| `/workspace` | Stateful simulation workspace |
| `/assessor` | Evidence inspection and attributable assessments |
| `/certify` | Private certification preflight |
| `/health` | Runtime health signal |

## Prove the candidate

Run the same checks used to create the local technical candidate:

```bash
npm run release-gate       # lint, types, scenarios, tests, baseline, stress, build, e2e, archive
npm run test:e2e           # browser journeys
npm run db:up && npm run db:test  # disposable local PostgreSQL RLS suite
npm audit --omit=dev       # production dependency audit
```

The release gate is intentionally honest about scope: a green local candidate
does not automatically mean hosted enterprise acceptance. See the
[release checklist](docs/RELEASE_CHECKLIST.md) and
[enterprise readiness record](docs/ENTERPRISE_READINESS.md) for the current
verification boundary.

## Architecture in one minute

```text
Scenario → EpisodeEngine → typed actions → business state → deterministic checks
                          ↘ evidence log + artifacts ↗ replay + assessment
```

- `src/domain/` — pure TypeScript simulation engine, policies, invariants, and artifacts
- `src/scenarios/` — versioned, schema-validated episode definitions
- `src/grading/` — deterministic checks, negative controls, reports, and replay
- `src/agents/` — provider-neutral agent loop with bounded budgets and fixtures
- `src/server/` — sessions, RLS-aware Postgres storage, certification, and API boundaries
- `src/app/` — Next.js workspace, public Index, assessor, and operational surfaces
- `db/` — Supabase-compatible migrations and row-level security policies

Read the full [architecture guide](docs/ARCHITECTURE.md) or the
[grader contract](docs/GRADER_CONTRACT.md) for the details.

## Hosted deployment, deliberately gated

The Vercel and Supabase foundations are provisioned, and the public candidate is
live. Hosted participant workloads remain disabled until Auth enrollment,
membership provisioning, redirect policy, and an authenticated browser
acceptance walkthrough are complete. This is a safety control—not a silent
fallback to demo data.

Follow the [hosted launch runbook](docs/HOSTED_LAUNCH.md) and
[enterprise readiness checklist](docs/ENTERPRISE_READINESS.md) before enabling
`WORKWORLD_HOSTED_STORE_WIRED=true`.

## Trust, privacy, and claims

- All bundled business data is synthetic; no participant or customer data is included.
- Deterministic fixtures validate the harness—they are **not** live-model results.
- No claim is made about employability, accreditation, hiring suitability, commercial traction, or production safety without matching evidence.
- Withheld evaluation material stays out of public archives and agent-facing fixtures.

## Documentation map

| Looking for | Read |
| --- | --- |
| Product scope and episodes | [Project brief](docs/PROJECT_BRIEF.md) · [Episode specs](docs/EPISODE_SPECS.md) |
| Evaluation and research limits | [Grader contract](docs/GRADER_CONTRACT.md) · [Technical report](docs/TECHNICAL_REPORT.md) · [Research protocol](docs/RESEARCH_PROTOCOL.md) |
| Operations and deployment | [Operations](docs/OPERATIONS.md) · [Hosted launch](docs/HOSTED_LAUNCH.md) · [Release checklist](docs/RELEASE_CHECKLIST.md) |
| Security and enterprise posture | [Enterprise readiness](docs/ENTERPRISE_READINESS.md) · [Blockers](docs/BLOCKERS.md) · [SOC 2 notes](docs/SOC2_COMPLIANCE.md) |
| Validation artifacts | [Validation pack](docs/validation-pack/README.md) · [`TASK_STATE.json`](TASK_STATE.json) |

---

Built for teams that need more than a confident answer: they need a result they
can inspect, replay, and trust within a clearly stated operating boundary.
