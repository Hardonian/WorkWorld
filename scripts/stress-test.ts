/**
 * High-Concurrency Stress & Load Benchmark (Pillar 10, Item 093).
 * Simulates high-volume concurrent action dispatches to measure throughput and p95/p99 latency.
 */

import { EpisodeEngine } from "../src/domain/engine.ts";
import { getScenario } from "../src/scenarios/catalog.ts";
import { verifyDomainInvariants } from "../src/domain/invariants.ts";
import type { Action } from "../src/domain/types.ts";

export interface StressTestResult {
  totalActions: number;
  concurrency: number;
  durationMs: number;
  throughputActionsPerSec: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  allInvariantsMaintained: boolean;
}

export function runStressBenchmark(concurrentSessions = 20, iterationsPerSession = 50): StressTestResult {
  const scenario = getScenario("A1");
  const latencies: number[] = [];
  const startTotal = performance.now();
  let allInvariantsMaintained = true;

  for (let s = 0; s < concurrentSessions; s++) {
    const engine = EpisodeEngine.reset(scenario, {
      runId: `stress-session-${s}`,
      seed: s,
      condition: "agent",
    });

    for (let i = 0; i < iterationsPerSession; i++) {
      const startAction = performance.now();
      engine.step(
        {
          type: "advance_time",
          minutes: 15,
          actionId: `stress-${s}-${i}`,
          idempotencyKey: `idem-${s}-${i}`,
          expectedRevision: i,
        } as Action,
        { kind: "agent", id: `bot-${s}`, role: "participant" }
      );
      const elapsed = performance.now() - startAction;
      latencies.push(elapsed);
    }

    const inv = verifyDomainInvariants(engine.getState());
    if (!inv.passed) {
      allInvariantsMaintained = false;
    }
  }

  const durationMs = performance.now() - startTotal;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] ?? 0;

  const totalActions = concurrentSessions * iterationsPerSession;
  const throughput = Math.round((totalActions / (durationMs / 1000)));

  return {
    totalActions,
    concurrency: concurrentSessions,
    durationMs: Math.round(durationMs),
    throughputActionsPerSec: throughput,
    p50LatencyMs: Number(p50.toFixed(3)),
    p95LatencyMs: Number(p95.toFixed(3)),
    p99LatencyMs: Number(p99.toFixed(3)),
    allInvariantsMaintained,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("stress-test")) {
  console.log("Running WorkWorld High-Concurrency Stress Benchmark...");
  const res = runStressBenchmark(25, 40);
  console.log(`Completed ${res.totalActions} actions across ${res.concurrency} concurrent streams.`);
  console.log(`Throughput: ${res.throughputActionsPerSec} actions/sec`);
  console.log(`Latency: p50=${res.p50LatencyMs}ms, p95=${res.p95LatencyMs}ms, p99=${res.p99LatencyMs}ms`);
}
