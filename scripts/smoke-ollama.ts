/**
 * Live local smoke run through the Ollama OpenAI-compatible adapter.
 * Unpaid, existing hardware. NOT a benchmark result — adapter/loop verification.
 * Usage: npx tsx scripts/smoke-ollama.ts [scenarioId]
 */
import { writeFileSync } from "node:fs";
import { runAgentEpisode } from "../src/agents/loop.ts";
import { loadBudgetConfig, BudgetLedger } from "../src/agents/budget.ts";
import { makeOllamaAdapter } from "../src/agents/adapters/chat-completions.ts";
import { getScenario } from "../src/scenarios/catalog.ts";

async function main() {
  const scenarioId = process.argv[2] ?? "A1";
  const budget = new BudgetLedger(loadBudgetConfig());
  const adapter = makeOllamaAdapter(budget);
  console.log("adapter:", JSON.stringify(adapter.describe(), null, 2));
  const t0 = Date.now();
  const result = await runAgentEpisode({
    scenario: getScenario(scenarioId),
    adapter,
    budget,
    bounds: { maxSteps: 8, maxElapsedMs: 480_000, perCallTimeoutMs: 180_000 },
    runId: `ollama-smoke-${scenarioId}`,
  });
  const summary = {
    kind: "live-local-ollama-smoke (NOT a benchmark result)",
    scenarioId,
    adapter: adapter.describe(),
    terminalReason: result.terminalReason,
    outcome: result.report.outcome,
    checksPassed: `${result.report.counts.t1Passed}/${result.report.counts.t1Total}`,
    failures: result.report.checks.filter((c) => !c.passed).map((c) => c.id),
    usages: result.usages,
    wallClockMs: Date.now() - t0,
    events: result.events.map((e) => `${e.kind}: ${e.detail.slice(0, 140)}`),
  };
  const out = `evidence/m4/ollama-smoke-${scenarioId}.json`;
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ...summary, events: summary.events.slice(0, 15) }, null, 2));
  console.log(`wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
