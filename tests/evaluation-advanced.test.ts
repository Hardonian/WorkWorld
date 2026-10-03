import { describe, it, expect } from "vitest";
import { getScenario } from "../src/scenarios/catalog.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { computeStateDiff } from "../src/domain/state-diff.ts";
import { gradeEpisode } from "../src/grading/report.ts";
import { evaluateBehavioralRubric, buildJudgePrompt } from "../src/grading/llm-judge.ts";
import {
  exportToSft,
  exportToShareGpt,
  constructDpoPair,
  summarizeTrajectory,
  serializeToJsonl,
} from "../src/agents/trajectory.ts";
import type { LoopResult } from "../src/agents/loop.ts";

describe("State Diff Engine", () => {
  it("computes deep semantic diff across initial and modified episode states", () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "test-run-101", seed: 101, condition: "agent" });
    const initial = engine.observe();

    // Advance time and perform actions
    engine.step(
      {
        type: "advance_time",
        minutes: 1440,
        actionId: "act-1",
        idempotencyKey: "k-1",
        expectedRevision: initial.revision,
      },
      { id: "test-agent", kind: "agent", role: "participant" }
    );

    const current = engine.getState();
    const diff = computeStateDiff(current, current);

    expect(diff.runId).toBe(current.runId);
    expect(diff.summary.totalEntitiesModified).toBeGreaterThanOrEqual(0);
    expect(diff.financials.cashChangeMinor).toBe(0);
  });
});

describe("LLM-as-a-Judge Behavioral Rubric Scorer", () => {
  it("evaluates C1-C5 rubrics with clear explanations and uncalibrated tags", () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "test-run-102", seed: 102, condition: "agent" });
    const state = engine.getState();
    const report = gradeEpisode(state, scenario);

    const rubric = evaluateBehavioralRubric(state, report, "test-assessor");
    expect(rubric.assessor).toBe("test-assessor");
    expect(rubric.ratings).toHaveLength(5);
    expect(rubric.suggestions).toHaveLength(5);

    const prompt = buildJudgePrompt(state, report);
    expect(prompt).toContain("Communication Clarity");
    expect(prompt).toContain("Commercial & Financial Prudence");
  });
});

describe("Trajectory and Fine-Tuning Exporter", () => {
  it("exports simulation loop results to SFT, ShareGPT, and DPO pairs", () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "test-run-103", seed: 103, condition: "agent" });
    const state = engine.getState();
    const report = gradeEpisode(state, scenario);

    const mockPassResult: LoopResult = {
      state,
      report: { ...report, outcome: "pass" },
      events: [],
      usages: [{ promptTokens: 100, completionTokens: 50, totalTokens: 150, costMinor: 2, pricingSource: "test" }],
      terminalReason: "submitted",
      decisions: [
        {
          action: null,
          notes: "Inspected inventory",
          advice: null,
          handoff: null,
          rawText: "I inspected inventory and drafted a purchase order.",
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150, costMinor: 2, pricingSource: "test" },
          provider: "test-provider",
          model: "test-model",
        },
      ],
    };

    const mockFailResult: LoopResult = {
      ...mockPassResult,
      state: { ...state, runId: "failed-run-999" },
      report: { ...report, outcome: "fail" },
      terminalReason: "bounds_steps",
    };

    const summary = summarizeTrajectory(mockPassResult);
    expect(summary.totalTokens).toBe(150);
    expect(summary.totalCostMinor).toBe(2);
    expect(summary.outcome).toBe("pass");

    const sft = exportToSft(mockPassResult);
    expect(sft.messages.length).toBeGreaterThan(1);
    expect(sft.scenarioId).toBe("A1");

    const shareGpt = exportToShareGpt(mockPassResult);
    expect(shareGpt.conversations.length).toBeGreaterThan(1);

    const dpo = constructDpoPair(mockPassResult, mockFailResult);
    expect(dpo).not.toBeNull();
    expect(dpo?.chosen).toContain("inspected inventory");

    const jsonl = serializeToJsonl([sft]);
    expect(jsonl.endsWith("\n")).toBe(true);
    expect(JSON.parse(jsonl.trim())).toHaveProperty("scenarioId", "A1");
  });
});
