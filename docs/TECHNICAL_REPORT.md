# WorkWorld — Technical Report (harness validation)

**Status: harness-validation report + pending experiment protocol. This is NOT a
model-comparison paper.** No live-model trials and no human studies have run.

Candidate: commit `67b5e6f` (branch `main`, private repo Hardonian/WorkWorld);
later commits add release tooling — every evidence export records the exact
revision it was generated from.

## 1. Question

When does AI assistance improve completed operational work, and when does it
only improve the apparent quality of the output? The environment makes the two
measurable separately: deterministic state checks grade business correctness;
artifact/communication quality is a human rubric that cannot flip a fatal check.

## 2. Environment

A persistent small-business operations workspace (purchase/delivery,
invoice/reconciliation, customer/project recovery). Typed action contract shared
by UI, agents, and evaluator; event-sourced state with logical time; integer
minor units; append-only evidence. Six public episodes (2 per family), six
withheld policy/causal variants (private). Specs: docs/EPISODE_SPECS.md.

## 3. Grading

Ten checks (docs/GRADER_CONTRACT.md): authorization_correct, doc_consistency,
no_duplicate_settlement, balances_exact, feasible_commitments, requirements_met,
required_updates_done, evidence_preserved, budget_respected, help_policy (T1
where policy-determined). Four outcome categories kept distinct: proposed
actions, prevented harmful actions, committed critical errors, ordinary
incomplete work. Validation-pack cases WW-X01..X16 mapped with limitations in
docs/validation-pack/CASE_MAPPING.md (P0 all executed and passing).

## 4. Measured harness results (executed, revision-pinned)

| Run | Command | N | Result |
|-----|---------|---|--------|
| Competent scripted controls | `npm run baseline` | 6 episodes | 6/6 pass all T1 checks |
| Negative controls | `npm run negatives` | 6 controls | 6/6 fail exactly their declared checks (N1 requirements_met; N2 required_updates_done; N3 no_duplicate_settlement; N4 authorization_correct + requirements_met; N5 feasible_commitments; N6 help_policy) |
| Alternative compliant route | `tests/x-cases.test.ts` WW-X14 | 1 | passes alongside the reference route |
| Replay reproduction | `npm run eval -- --verify-manifest …` | 6 | 6/6 deterministic digests reproduce at pinned commit |
| Unit/integration/db | `npx vitest run` | 90 tests | 90/90 (incl. 12 real Postgres RLS tests, 2 orgs × 3 roles) |
| Browser workflows | `npx playwright test` | 8 | 8/8 (all six episodes completed through the UI) |
| Live local smoke (Ollama) | `scripts/smoke-ollama.ts` | 2 attempts | llama3.1:8b: timeout at bound (handled); gemma3:4b: advice-only decision. **Not capability evidence.** |

Denominators stated above; fixture runs are labeled fixtures everywhere.

## 5. Failure categories observed during construction

Root-caused and fixed: ledger AP sign inversion; cell-ref rendering off-by-one;
disjunctive sub-predicates over-counted; event-minute boundary (>= vs >);
double-settlement of one receipt via two invoices (WW-X01 — fixed at the
mutation boundary); aggregate-approval bypass via split orders (WW-X02 — fixed
at the mutation boundary); approval validity not re-checked at commit (WW-X04);
RLS policy subquery column shadowing; sheets could not add new cells (UI).

## 6. Reproducibility

```bash
npm ci && npm run db:up
npm run release-gate
npm run eval -- --adapter baseline --out eval-runs
npm run eval -- --verify-manifest eval-runs/manifest-<id>.json
```

Run manifests pin revision (incl. dirty-tree), scenario/policy/grader versions,
seeds, condition, agent config, budget provenance, bounds, terminal reasons,
raw failures. Evidence exports: evidence-exports/{m2-retroactive,m5,m7}/.

## 7. Known grader attacks and limits

Polished-but-wrong reports (rejected: checks read state), over-claiming notes
(notes are evidence, not state), formula injection (sanitized export),
retry-until-double-effect (idempotency), help-shifting (help policy), observation
leakage (filter tests). Limit: `feasible_commitments` is a lead-time lower bound,
not a full planner; `evidence_preserved` is a narrow structural property;
model-judge output is uncalibrated and unused in T1.

## 8. Pending (explicit)

- Practitioner review (materials/practitioner-review-packet.md) — pending.
- Human feasibility + 2×2 assistance/change experiment
  (docs/validation-pack/03_Measurement_Protocol.md adopted as the protocol) —
  pending governance approval and recruitment (never by an agent).
- Live-model comparison — externally blocked (docs/BLOCKERS.md B2).
- Hosted release — externally blocked (B1).
