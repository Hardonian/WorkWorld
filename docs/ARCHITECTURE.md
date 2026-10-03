# WorkWorld — Architecture

## Shape

Single Next.js 16 (App Router, TypeScript strict, Tailwind 4) application with a
**pure TypeScript domain core** that has zero imports from React/Next and runs
headlessly (vitest, tsx CLI runners). The UI, the agent loop, and the evaluation
runner all drive the **same** `EpisodeEngine` through one typed action interface.

```
src/domain/        pure domain core (types, events, actions, policy, scheduler,
                   invariants, observation, artifacts, engine) — no React/Next
src/scenarios/     scenario definitions (zod-validated), 6 episodes, withheld/
src/grading/       deterministic checks, rubric, report, baseline, negative controls
src/agents/        provider-neutral loop, adapters (OpenAI, Ollama OpenAI-compat, fixtures), assisted mode
src/server/        session handling, stores (memory/file/postgres), API route handlers
src/app/           Next.js UI (learner workspace, assessor view, admin)
src/schema/        zod schemas incl. TASK_STATE schema
db/                Supabase-compatible migrations + RLS policies
tests/             unit (domain/grading), db (RLS), e2e (Playwright)
scripts/           eval-runner, baseline, negative controls, release-gate, doctor, archive
docs/              durable records (brief, architecture, milestones, decisions, build log, blockers, research, release)
evidence/          machine-generated command output per milestone
```

## Domain boundaries

- **Scenario definition**: initial state, policy, available information, scheduled
  events, actions, terminal conditions, objectives. Versioned (`scenarioVersion`).
- **Episode**: a scenario instantiated with `seed` + `runId`.
- **Observation**: strictly what the participant/agent is authorized to see.
  No grader internals, no hidden keys, no privileged state, no future scheduled
  events unless the scenario explicitly surfaces a warning.
- **Action**: typed request (`type`, `payload`, `actor`, `idempotencyKey`,
  `expectedRevision`). Validated against permissions, state, and policy before
  any state change. One interface for UI and agents.
- **Transition**: `{ ok, state, events, errors, feedback }`. Rejected actions are
  recorded in the evidence log as attempts with reasons.
- **Evidence**: immutable event history + artifact history + scenario/policy/grader
  versions + state digests. Derived state is always reconstructible by replay.
- **Assessment**: deterministic checks (fatal vs nonfatal) plus a separately
  recorded human rubric. Never merged into a single concealable score.

## Persistence

Event-sourced: append-only event log per episode run; derived state by reduce.

| Mode   | Store            | Tenancy                                  |
|--------|------------------|------------------------------------------|
| demo   | `file` (JSONL) or `memory` | per-session opaque ID (httpOnly cookie)  |
| hosted (schema only) | Postgres/Supabase | RLS verified; application store/auth adapter not wired |

- Demo sessions are isolated by server-generated opaque session ID; client-supplied
  tenant/headers are never trusted. Demo flags cannot bypass hosted authorization.
- Hosted target: participant / assessor / org-admin roles with tenant + role
  enforced in RLS and application checks. Today only the database policy boundary
  is verified; hosted episode execution is disabled to prevent a demo-store fallback.
- State-changing demo actions use per-run process serialization plus revision and
  idempotency checks. Multi-instance transactional mutation remains a hosted-adapter requirement.
- Corrupt/incompatible state is detected (schema + version + digest check) and a
  recovery path is presented (restore checkpoint / restart episode), never silent repair.

## Money, quantities, time

- All money is **integer minor units** with an explicit currency (default CAD).
- Quantities are bounded integers with explicit units (each / case).
- **Logical time** drives scheduled events: an explicit clock in minutes, advanced
  by declared actions (`advance_time`) or agent steps per the episode's timing
  policy. Pausing to read never advances ten simulated business hours.
  Wall-clock duration is recorded separately as evidence (active work time).

## Agent integration

Provider-neutral `AgentAdapter` interface (`describe` + `decide`), with:

1. OpenAI API adapter (live; fails with `provider_unavailable` when no key).
2. OpenAI-compatible local adapter (Ollama at `OLLAMA_BASE_URL`; live on this host).
3. Deterministic fixture adapters (**fixtures, not models**) for offline contract tests.

Bounds: steps, elapsed time, tool calls, output length, retries, and spend.
A shared experiment budget (integer minor units) is checked **before** each paid
dispatch. Usage is recorded with pricing source/date or `unknown_cost`.

## Grading contract (summary)

Fatal state checks: authorization correctness, order/delivery/invoice consistency,
no duplicate settlement, exact balances, feasible commitments, required updates,
evidence preservation. Quality items (artifact polish, communication tone,
ambiguous judgment) live in the human rubric. A polished report can never offset a
fatal failure. Negative controls (6) must fail for the right reasons; a competent
scripted baseline must pass.

## Evaluation interface

`EpisodeEngine`: `reset(scenario, seed, runId)`, `observe()`, `step(action)`,
`advanceTime(minutes)`, `checkpoint()`, `restore(id)`, `grade()`, `replay(log)`.
Schemas in `src/domain/types.ts`; contract tests in `tests/`.
Recorded transitions are deterministic; fresh model responses are not — the run
manifest records which was used.

## Security posture

- No secrets in code/logs/exports; env-only config; `.env*` git-ignored.
- Spreadsheet artifacts: bounded safe formula grammar; CSV export sanitizes
  formula-leading characters (`= + - @` and control chars) — no untrusted formula
  execution, no shell/SQL/code execution as learner actions.
- All imports/paths/HTML/model outputs treated as data; size/rate limits on inputs.
- Stable, actionable error states; retries bounded and idempotent (a ledger change
  can never occur twice on retry).
