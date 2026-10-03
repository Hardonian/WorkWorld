/**
 * Trajectory Replay Buffer and Fine-Tuning Dataset Exporter.
 * Converts simulation execution runs and agent decisions into standardized
 * supervised fine-tuning (SFT) and preference optimization (DPO) datasets.
 */
import type { LoopResult } from "./loop.ts";
import type { AgentDecision } from "./types.ts";

export interface SftConversation {
  id: string;
  scenarioId: string;
  outcome: "pass" | "fail";
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

export interface ShareGptConversation {
  id: string;
  conversations: Array<{
    from: "system" | "human" | "gpt";
    value: string;
  }>;
}

export interface DpoPreferencePair {
  id: string;
  scenarioId: string;
  prompt: string;
  chosen: string;
  rejected: string;
  margin: number;
}

export interface TrajectorySummary {
  runId: string;
  scenarioId: string;
  totalSteps: number;
  totalTokens: number;
  totalCostMinor: number;
  outcome: "pass" | "fail";
  t1Passed: number;
  t1Total: number;
  terminalReason: string;
}

/**
 * Summarize an agent execution trajectory.
 */
export function summarizeTrajectory(result: LoopResult): TrajectorySummary {
  const totalTokens = result.usages.reduce((sum, u) => sum + (u.totalTokens || 0), 0);
  const totalCostMinor = result.usages.reduce((sum, u) => sum + (u.costMinor || 0), 0);

  return {
    runId: result.state.runId ?? "run-anonymous",
    scenarioId: result.state.scenarioId,
    totalSteps: result.decisions.length,
    totalTokens,
    totalCostMinor,
    outcome: result.report.outcome,
    t1Passed: result.report.counts.t1Passed,
    t1Total: result.report.counts.t1Total,
    terminalReason: result.terminalReason,
  };
}

/**
 * Export agent decisions into OpenAI-compatible SFT format.
 */
export function exportToSft(result: LoopResult): SftConversation {
  const messages: SftConversation["messages"] = [
    {
      role: "system",
      content: `You are an operations coordinator at Northline Supply Co. executing scenario ${result.state.scenarioId}. Emit decisions with valid action payloads.`,
    },
  ];

  let stepNum = 1;
  for (const d of result.decisions) {
    if (!d) continue;
    messages.push({
      role: "user",
      content: `Step ${stepNum} observation and task prompt.`,
    });
    messages.push({
      role: "assistant",
      content: d.rawText,
    });
    stepNum++;
  }

  return {
    id: result.state.runId,
    scenarioId: result.state.scenarioId,
    outcome: result.report.outcome,
    messages,
  };
}

/**
 * Export agent decisions into ShareGPT format.
 */
export function exportToShareGpt(result: LoopResult): ShareGptConversation {
  const conversations: ShareGptConversation["conversations"] = [
    {
      from: "system",
      value: `You are an operations coordinator at Northline Supply Co. executing scenario ${result.state.scenarioId}.`,
    },
  ];

  let stepNum = 1;
  for (const d of result.decisions) {
    if (!d) continue;
    conversations.push({
      from: "human",
      value: `Step ${stepNum} task prompt.`,
    });
    conversations.push({
      from: "gpt",
      value: d.rawText,
    });
    stepNum++;
  }

  return {
    id: result.state.runId,
    conversations,
  };
}

/**
 * Construct a Direct Preference Optimization (DPO) pair from a winning (chosen)
 * and failing (rejected) run of the same scenario.
 */
export function constructDpoPair(
  chosen: LoopResult,
  rejected: LoopResult
): DpoPreferencePair | null {
  if (chosen.state.scenarioId !== rejected.state.scenarioId) {
    throw new Error(
      `Cannot construct DPO pair across different scenarios: ${chosen.state.scenarioId} vs ${rejected.state.scenarioId}`
    );
  }

  if (chosen.report.outcome !== "pass" || rejected.report.outcome !== "fail") {
    return null;
  }

  const prompt = `Execute operations scenario ${chosen.state.scenarioId} at Northline Supply Co.`;
  const chosenTrajectory = chosen.decisions.map((d: AgentDecision) => d.rawText).join("\n---\n");
  const rejectedTrajectory = rejected.decisions.map((d: AgentDecision) => d.rawText).join("\n---\n");

  const chosenT1Rate = chosen.report.counts.t1Total > 0
    ? chosen.report.counts.t1Passed / chosen.report.counts.t1Total
    : 1;
  const rejectedT1Rate = rejected.report.counts.t1Total > 0
    ? rejected.report.counts.t1Passed / rejected.report.counts.t1Total
    : 0;

  const chosenId = (chosen.state.runId ?? "chosen").slice(0, 6);
  const rejectedId = (rejected.state.runId ?? "rejected").slice(0, 6);

  return {
    id: `dpo-${chosen.state.scenarioId}-${chosenId}-vs-${rejectedId}`,
    scenarioId: chosen.state.scenarioId,
    prompt,
    chosen: chosenTrajectory,
    rejected: rejectedTrajectory,
    margin: Math.round((chosenT1Rate - rejectedT1Rate) * 100) / 100,
  };
}

/**
 * Serialize a collection of dataset items into standard JSONL format.
 */
export function serializeToJsonl<T>(items: T[]): string {
  return items.map((item) => JSON.stringify(item)).join("\n") + "\n";
}
