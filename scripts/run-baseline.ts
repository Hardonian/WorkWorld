#!/usr/bin/env tsx
/**
 * Competent baseline evidence run (FIXTURE actor — not a model).
 * Usage: npm run baseline [-- --json out.json]
 */
import { writeFileSync } from "node:fs";
import { runBaseline } from "../src/grading/baseline.ts";
import { gradeEpisode } from "../src/grading/report.ts";
import { getScenario, listScenarios } from "../src/scenarios/catalog.ts";

const jsonIdx = process.argv.indexOf("--json");
const outPath = jsonIdx >= 0 ? process.argv[jsonIdx + 1] : null;

const results = [];
let failed = 0;

for (const scenario of listScenarios()) {
  const engine = runBaseline(scenario.id);
  const report = gradeEpisode(engine.getState(), getScenario(scenario.id));
  const failing = report.checks.filter((c) => !c.passed);
  if (failing.length > 0) failed += 1;
  results.push({
    scenarioId: scenario.id,
    outcome: report.outcome,
    t1: `${report.counts.t1Passed}/${report.counts.t1Total}`,
    failing: failing.map((c) => `${c.id}: ${c.detail}`),
    stateDigest: report.stateDigest,
  });
  console.log(
    `${scenario.id} ${report.outcome.toUpperCase()} T1 ${report.counts.t1Passed}/${report.counts.t1Total}` +
      (failing.length ? ` FAILED: ${failing.map((c) => c.id).join(", ")}` : ""),
  );
}

console.log(`\nbaseline: ${results.length - failed}/${results.length} episodes pass (fixture actor, not a model)`);
if (outPath) {
  writeFileSync(outPath, JSON.stringify({ kind: "baseline-fixture-run", results }, null, 2));
  console.log(`wrote ${outPath}`);
}
process.exit(failed === 0 ? 0 : 1);
