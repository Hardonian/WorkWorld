/**
 * Headless evaluation runner with reproducible run manifests.
 *
 * Usage:
 *   npx tsx scripts/eval-runner.ts --adapter baseline [--scenarios A1,B1] [--out eval-runs]
 *   npx tsx scripts/eval-runner.ts --adapter negatives [--out eval-runs]
 *   npx tsx scripts/eval-runner.ts --adapter ollama --scenarios A1 --seeds 42 [--max-steps 8]
 *   npx tsx scripts/eval-runner.ts --verify-manifest eval-runs/manifest-<id>.json
 *
 * Every run records: code revision, scenario/grader versions, seed, condition,
 * agent configuration, provider/model, budget, bounds, raw results, terminal
 * reason, usage and state digest. Fixture runs are deterministic and replay-
 * verifiable; live model runs are marked stochastic and never claimed to be.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runAgentEpisode } from "../src/agents/loop.ts";
import { BudgetLedger, loadBudgetConfig } from "../src/agents/budget.ts";
import { fixtureAdapter } from "../src/agents/adapters/fixtures.ts";
import { makeOllamaAdapter, makeOpenAIAdapter } from "../src/agents/adapters/chat-completions.ts";
import type { AgentAdapter } from "../src/agents/types.ts";
import { getScenario, listScenarios } from "../src/scenarios/catalog.ts";
import { runBaseline } from "../src/grading/baseline.ts";
import { gradeEpisode } from "../src/grading/report.ts";
import { runNegativeControls } from "../src/grading/negative-controls.ts";
import { digestState } from "../src/domain/engine.ts";

const MANIFEST_VERSION = 1;
const GRADER_VERSION = "1.0.0";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function gitInfo(): { commit: string; branch: string; dirtyFiles: string[] } {
  try {
    const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain", { encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map((l) => l.slice(3));
    return { commit, branch, dirtyFiles: dirty };
  } catch {
    return { commit: "unknown", branch: "unknown", dirtyFiles: [] };
  }
}

interface RunRecord {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  seed: number;
  terminalReason: string;
  outcome: "pass" | "fail";
  t1Passed: number;
  t1Total: number;
  failingChecks: string[];
  usageTokens: number;
  usageCostMinor: number | null;
  wallClockMs: number;
  stateDigest: string;
  determinism: "deterministic-fixture" | "stochastic-model";
  actionsJsonlPath: string | null;
}

function runBaselineSuite(outDir: string): RunRecord[] {
  const records: RunRecord[] = [];
  for (const scenario of listScenarios()) {
    const engine = runBaseline(scenario.id);
    const state = engine.getState();
    const report = gradeEpisode(state, scenario);
    const actionsPath = join(outDir, `actions-baseline-${scenario.id}.jsonl`);
    writeFileSync(
      actionsPath,
      state.actionLog.map((a) => JSON.stringify({ type: a.type, outcome: a.outcome, atMinute: a.atMinute })).join("\n"),
    );
    records.push({
      runId: `baseline-${scenario.id}`,
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      seed: 42,
      terminalReason: state.status === "submitted" ? "submitted" : state.status,
      outcome: report.outcome,
      t1Passed: report.counts.t1Passed,
      t1Total: report.counts.t1Total,
      failingChecks: report.checks.filter((c) => !c.passed).map((c) => c.id),
      usageTokens: 0,
      usageCostMinor: 0,
      wallClockMs: 0,
      stateDigest: digestState(state),
      determinism: "deterministic-fixture",
      actionsJsonlPath: actionsPath,
    });
  }
  return records;
}

function runNegativeSuite(outDir: string): RunRecord[] {
  return runNegativeControls().map((r) => {
    const actionsPath = join(outDir, `actions-neg-${r.id}.jsonl`);
    writeFileSync(
      actionsPath,
      JSON.stringify({ expectedFailing: r.expectedFailing, actualFailing: r.actualFailing }) + "\n",
    );
    return {
      runId: `neg-${r.id}`,
      scenarioId: r.report.scenarioId,
      scenarioVersion: r.report.scenarioVersion,
      seed: 42,
      terminalReason: "submitted",
      outcome: r.report.outcome,
      t1Passed: r.report.counts.t1Passed,
      t1Total: r.report.counts.t1Total,
      failingChecks: r.actualFailing,
      usageTokens: 0,
      usageCostMinor: 0,
      wallClockMs: 0,
      stateDigest: r.report.stateDigest,
      determinism: "deterministic-fixture" as const,
      actionsJsonlPath: actionsPath,
    };
  });
}

async function runLive(
  adapter: AgentAdapter,
  scenarioIds: string[],
  seeds: number[],
  outDir: string,
  maxSteps: number,
): Promise<RunRecord[]> {
  const budget = new BudgetLedger(loadBudgetConfig());
  const records: RunRecord[] = [];
  for (const id of scenarioIds) {
    const scenario = getScenario(id);
    for (const seed of seeds) {
      const runId = `${adapter.describe().id.replace(/[^a-z0-9:-]/gi, "_")}-${id}-s${seed}-${randomUUID().slice(0, 6)}`;
      const result = await runAgentEpisode({
        scenario,
        adapter,
        budget,
        seed,
        runId,
        bounds: { maxSteps, maxElapsedMs: 480_000, perCallTimeoutMs: 180_000 },
      });
      const actionsPath = join(outDir, `actions-${runId}.jsonl`);
      writeFileSync(
        actionsPath,
        result.events.map((e) => JSON.stringify(e)).join("\n"),
      );
      records.push({
        runId,
        scenarioId: id,
        scenarioVersion: scenario.version,
        seed,
        terminalReason: result.terminalReason,
        outcome: result.report.outcome,
        t1Passed: result.report.counts.t1Passed,
        t1Total: result.report.counts.t1Total,
        failingChecks: result.report.checks.filter((c) => !c.passed).map((c) => c.id),
        usageTokens: result.usages.reduce((a, u) => a + u.totalTokens, 0),
        usageCostMinor: result.usages.some((u) => u.costMinor !== null)
          ? result.usages.reduce((a, u) => a + (u.costMinor ?? 0), 0)
          : null,
        wallClockMs: 0,
        stateDigest: digestState(result.state),
        determinism: "stochastic-model",
        actionsJsonlPath: actionsPath,
      });
    }
  }
  return records;
}

async function main() {
  const outDir = arg("out", "eval-runs")!;
  mkdirSync(outDir, { recursive: true });

  if (arg("verify-manifest")) {
    verifyManifest(arg("verify-manifest")!);
    return;
  }

  const adapterName = arg("adapter", "baseline")!;
  const seeds = (arg("seeds", "42") ?? "42").split(",").map(Number);
  const scenarioIds = (arg("scenarios") ?? listScenarios().map((s) => s.id).join(",")).split(",");
  const maxSteps = Number(arg("max-steps", "24"));

  let runs: RunRecord[] = [];
  let adapterDesc: Record<string, unknown>;
  let determinismNote: string;

  if (adapterName === "baseline") {
    runs = runBaselineSuite(outDir);
    adapterDesc = { id: "scripted-baseline", kind: "fixture", live: false, model: "fixture" };
    determinismNote = "deterministic fixture — replay-verifiable; NOT model results";
  } else if (adapterName === "negatives") {
    runs = runNegativeSuite(outDir);
    adapterDesc = { id: "scripted-negative-controls", kind: "fixture", live: false, model: "fixture" };
    determinismNote = "deterministic fixture — replay-verifiable; NOT model results";
  } else if (adapterName === "negatives-with-controls") {
    runs = [...runNegativeSuite(outDir), ...runBaselineSuite(outDir)];
    adapterDesc = { id: "scripted-negative-controls+competent-controls", kind: "fixture", live: false, model: "fixture" };
    determinismNote = "deterministic fixture — each negative control paired with competent controls; NOT model results";
  } else {
    const budget = new BudgetLedger(loadBudgetConfig());
    const adapter =
      adapterName === "ollama"
        ? makeOllamaAdapter(budget)
        : adapterName === "openai"
          ? makeOpenAIAdapter(budget)
          : fixtureAdapter("invalid", { mode: "invalid_tool_output" });
    adapterDesc = adapter.describe() as unknown as Record<string, unknown>;
    determinismNote =
      adapter.describe().kind === "fixture"
        ? "deterministic fixture"
        : "stochastic model responses — same seed does not guarantee same actions";
    runs = await runLive(adapter, scenarioIds, seeds, outDir, maxSteps);
  }

  const git = gitInfo();
  const manifest = {
    manifestVersion: MANIFEST_VERSION,
    createdAt: new Date().toISOString(),
    codeRevision: git,
    environment: { node: process.version, platform: process.platform },
    graderVersion: GRADER_VERSION,
    scenarioVersions: runs.map((r) => ({ id: r.scenarioId, version: r.scenarioVersion })),
    condition: "agent",
    agent: adapterDesc,
    determinismNote,
    budget: {
      limitMinor: loadBudgetConfig().limitMinor,
      currency: loadBudgetConfig().currency,
      pricingSource: loadBudgetConfig().pricingSource ?? "unknown_cost",
    },
    bounds: { maxSteps },
    seeds,
    runs,
    totals: {
      runCount: runs.length,
      passed: runs.filter((r) => r.outcome === "pass").length,
      failed: runs.filter((r) => r.outcome === "fail").length,
      totalTokens: runs.reduce((a, r) => a + r.usageTokens, 0),
    },
  };

  const manifestPath = join(outDir, `manifest-${adapterName}-${Date.now()}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  writeReport(manifest, join(outDir, `report-${adapterName}.md`));
  writeCsv(runs, join(outDir, `results-${adapterName}.csv`));
  console.log(`manifest: ${manifestPath}`);
  console.log(`runs: ${manifest.totals.runCount} (pass ${manifest.totals.passed}, fail ${manifest.totals.failed})`);
  console.log(`determinism: ${determinismNote}`);
}

function verifyManifest(path: string): void {
  const manifest = JSON.parse(readFileSync(path, "utf8")) as {
    determinismNote: string;
    runs: RunRecord[];
    codeRevision: { commit: string; dirtyFiles: string[] };
  };
  const git = gitInfo();
  console.log(`manifest commit: ${manifest.codeRevision.commit}`);
  console.log(`current commit:  ${git.commit}`);
  if (manifest.codeRevision.commit !== git.commit) {
    console.log("REVISION MISMATCH — digests may legitimately differ across revisions");
  }
  let checked = 0;
  let matched = 0;
  for (const run of manifest.runs) {
    if (run.determinism !== "deterministic-fixture") {
      console.log(`SKIP (stochastic) ${run.runId}`);
      continue;
    }
    checked += 1;
    if (run.runId.startsWith("baseline-")) {
      const engine = runBaseline(run.scenarioId);
      const digest = digestState(engine.getState());
      const ok = digest === run.stateDigest;
      if (ok) matched += 1;
      console.log(`${ok ? "MATCH" : "DIFF "} ${run.runId} ${ok ? "" : `(${digest} != ${run.stateDigest})`}`);
    } else {
      console.log(`SKIP (control script not replayable via baseline) ${run.runId}`);
    }
  }
  console.log(`replay verification: ${matched}/${checked} deterministic runs reproduced`);
  if (checked > 0 && matched !== checked) process.exit(1);
}

function writeCsv(runs: RunRecord[], path: string): void {
  const header =
    "runId,scenarioId,scenarioVersion,seed,terminalReason,outcome,t1Passed,t1Total,failingChecks,usageTokens,usageCostMinor,determinism";
  const lines = runs.map((r) =>
    [
      r.runId,
      r.scenarioId,
      r.scenarioVersion,
      r.seed,
      r.terminalReason,
      r.outcome,
      r.t1Passed,
      r.t1Total,
      `"${r.failingChecks.join(" ")}"`,
      r.usageTokens,
      r.usageCostMinor ?? "unknown_cost",
      r.determinism,
    ].join(","),
  );
  writeFileSync(path, [header, ...lines].join("\n") + "\n");
}

function writeReport(manifest: Record<string, unknown>, path: string): void {
  const runs = manifest.runs as RunRecord[];
  const totals = manifest.totals as { runCount: number; passed: number; failed: number };
  const byTerminal = new Map<string, number>();
  for (const r of runs) byTerminal.set(r.terminalReason, (byTerminal.get(r.terminalReason) ?? 0) + 1);
  const report = [
    `# Evaluation report (generated ${manifest.createdAt})`,
    "",
    `**Scope:** ${(manifest.determinismNote as string) ?? ""}. Denominator: ${totals.runCount} runs (pass ${totals.passed}, fail ${totals.failed}).`,
    "",
    `**Candidate:** commit \`${(manifest.codeRevision as { commit: string }).commit}\` on branch \`${(manifest.codeRevision as { branch: string }).branch}\`; dirty files: ${(manifest.codeRevision as { dirtyFiles: string[] }).dirtyFiles.length}.`,
    "",
    `**Agent:** \`${JSON.stringify(manifest.agent)}\` · **grader version** ${manifest.graderVersion} · **budget** ${JSON.stringify(manifest.budget)}`,
    "",
    "## Terminal reasons",
    "",
    "| reason | runs |",
    "|--------|------|",
    ...[...byTerminal.entries()].map(([k, v]) => `| ${k} | ${v} |`),
    "",
    "## Runs",
    "",
    "| run | scenario | seed | outcome | T1 | failing checks | terminal |",
    "|-----|----------|------|---------|----|----------------|----------|",
    ...runs.map(
      (r) =>
        `| ${r.runId} | ${r.scenarioId} | ${r.seed} | ${r.outcome} | ${r.t1Passed}/${r.t1Total} | ${r.failingChecks.join(", ") || "—"} | ${r.terminalReason} |`,
    ),
    "",
    "## Claim limits",
    "",
    "- Fixture runs validate the harness; they are not model-capability evidence.",
    "- Stochastic model runs (if any) are single trials per seed unless stated; seeds within an episode are correlated and are never counted as independent task families.",
    "- No leaderboard is published from fixture agents or invented participants.",
  ].join("\n");
  writeFileSync(path, report);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
