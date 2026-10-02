# WorkWorld — Decisions

Concise decisions and rejected alternatives. Newest first.

## D12. Logical time is explicit, not wall-clock (2026-10-01)
Scheduled events fire on a logical minute clock advanced by declared actions.
Rejected: wall-clock scheduling (irreproducible across agent/human conditions;
a person reading slowly would lose the episode).

## D11. One action interface for UI and agents (2026-10-01)
`submitAction` typed union with idempotency key + expected revision.
Rejected: separate "agent API" (would let conditions diverge; the research
question requires the same permitted actions and policy).

## D10. Assessment keeps fatal state checks separate from quality rubric (2026-10-01)
Rejected: single weighted score (a polished artifact could conceal a fatal
business error — precisely the failure mode this product exists to detect).

## D9. Spreadsheet formulas: tiny safe grammar, sanitized export (2026-10-01)
Allow SUM/AVG/MIN/MAX + arithmetic over bounded cell refs; reject everything else.
CSV export neutralizes `= + - @` prefixes and control chars. Rejected: no formulas
at all (kills realism) and real formula engines (execution risk, size).

## D8. Demo persistence is server-side per-session (2026-10-01)
File/memory store keyed by opaque httpOnly session ID. Rejected: client-supplied
tenant headers (authorization bypass risk); pure localStorage (fragile, no evidence
immutability); silent fallback from hosted to demo data (forbidden).

## D7. Hosted tests run against Dockerized Postgres with Supabase-compatible roles (2026-10-01)
RLS is a Postgres feature; migrations under `db/migrations` mirror Supabase layout
and use the `authenticated` role + `request.jwt.claims`. Rejected: full local
Supabase stack (heavyweight for this host; CLI absent) and skipping DB tests
(gate requires real database tests). Hosted release stays blocked until an actual
hosted project is exercised.

## D6. Event-sourced state with replay-verified derivation (2026-10-01)
Append-only log + pure reduce. Rejected: mutable row state only (loses evidence
immutability and reconstructibility that the assessment product depends on).

## D5. Providers: OpenAI API adapter + Ollama OpenAI-compatible adapter + fixtures (2026-10-01)
This host runs Ollama with local models (verified 2026-10-01), satisfying the
"second actual configured provider/local OpenAI-compatible endpoint" requirement.
Fixture adapters are labeled as fixtures everywhere they surface. Live OpenAI runs
are externally blocked unless a key + budget exist.

## D4. Codex CLI present but unauthenticated → implemented directly (2026-10-01)
`codex login status` = "Not logged in"; no auth.json; no key in env. Per scope,
no second coding agent is a prerequisite. Hermes (this model) implements directly.

## D3. TypeScript 5.9.3, not 7.0.2 (2026-10-01)
TS 7 is the newest major; the release target is boring compatibility with
Next/Vitest/Playwright tooling. Rejected: chasing newest compiler major mid-release.

## D2. Single package, not a workspace monorepo (2026-10-01)
Domain purity is enforced by module boundaries + import-lint rule instead of
package separation. Rejected: pnpm workspace (extra release/install surface for a
team of one; the archive must install and verify cleanly from a single lockfile).

## D1. Repository: Hardonian/workworld at /home/scott/repos/workworld (2026-10-01)
Name check: no local clone, no GitHub `WorkWorld` repo (verified via `gh repo view`
404 and `gh repo list` search 2026-10-01). Similar-name discovery: WorldForge
(different product: simulation OS) and World26 (planetary simulator) exist — no
collision, but "WorkWorld" is a **working title**; no trademark clearance claimed.
Provisional alternative if confusion emerges: **OpsDojo**.
