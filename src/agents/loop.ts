/**
 * Provider-neutral agent loop: observe → decide → step, with explicit bounds
 * (steps, elapsed time, tool calls, output length, retries) and a shared
 * experiment budget checked before each paid dispatch.
 */
import { randomUUID } from "node:crypto";
import { EpisodeEngine } from "../domain/engine.ts";
import type { Action, Actor, EpisodeState } from "../domain/types.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";
import { gradeEpisode, type AssessmentReport } from "../grading/report.ts";
import { buildMessages, parseDecision } from "./prompt.ts";
import {
  BudgetExceededError,
  ProviderError,
  ProviderUnavailableError,
  TimeoutError,
  type AgentAdapter,
  type AgentDecision,
  type LoopEvent,
  type ProviderUsage,
} from "./types.ts";
import type { BudgetLedger } from "./budget.ts";
import { sanitizeActionInput } from "../server/actions.ts";

export interface LoopBounds {
  maxSteps: number;
  maxElapsedMs: number;
  maxOutputChars: number;
  maxParseRetries: number;
  perCallTimeoutMs: number;
  maxCompletionTokens: number;
}

export const DEFAULT_BOUNDS: LoopBounds = {
  maxSteps: 40,
  maxElapsedMs: 10 * 60_000,
  maxOutputChars: 8000,
  maxParseRetries: 2,
  perCallTimeoutMs: 60_000,
  maxCompletionTokens: 1200,
};

export interface LoopResult {
  state: EpisodeState;
  report: AssessmentReport;
  events: LoopEvent[];
  usages: ProviderUsage[];
  terminalReason:
    | "submitted"
    | "bounds_steps"
    | "bounds_elapsed"
    | "provider_error"
    | "provider_unavailable"
    | "timeout"
    | "budget_stop"
    | "no_action";
  decisions: AgentDecision[];
}

export async function runAgentEpisode(opts: {
  scenario: ScenarioDefinition;
  adapter: AgentAdapter;
  budget: BudgetLedger;
  bounds?: Partial<LoopBounds>;
  seed?: number;
  runId?: string;
}): Promise<LoopResult> {
  const bounds = { ...DEFAULT_BOUNDS, ...opts.bounds };
  const engine = EpisodeEngine.reset(opts.scenario, {
    runId: opts.runId ?? `agent-${opts.scenario.id}-${randomUUID().slice(0, 8)}`,
    seed: opts.seed ?? 42,
    condition: "agent",
  });
  const actor: Actor = { id: opts.adapter.describe().id, kind: "agent", role: "participant" };
  const events: LoopEvent[] = [];
  const usages: ProviderUsage[] = [];
  const decisions: AgentDecision[] = [];
  const startedAt = Date.now();

  const push = (kind: LoopEvent["kind"], detail: string) =>
    events.push({ kind, atIso: new Date().toISOString(), detail });

  let terminalReason: LoopResult["terminalReason"] = "no_action";

  for (let step = 0; step < bounds.maxSteps; step++) {
    if (Date.now() - startedAt > bounds.maxElapsedMs) {
      terminalReason = "bounds_elapsed";
      push("bounds_stop", `elapsed bound ${bounds.maxElapsedMs}ms reached at step ${step}`);
      break;
    }
    const obs = engine.observe();
    if (obs.status !== "active") {
      terminalReason = "submitted";
      break;
    }
    push("observation", `step ${step}: day ${obs.day}, revision ${obs.revision}`);

    // Budget gate BEFORE dispatch (paid providers only).
    try {
      opts.budget.ensureHeadroom(null, opts.adapter.describe().kind !== "fixture" && opts.adapter.describe().kind !== "ollama-openai-compatible");
    } catch (e) {
      if (e instanceof BudgetExceededError) {
        terminalReason = "budget_stop";
        push("budget_stop", (e as Error).message);
        break;
      }
      throw e;
    }

    let decision: AgentDecision | null = null;
    let parseAttempts = 0;
    for (;;) {
      let response;
      try {
        response = await opts.adapter.decide({
          messages: buildMessages(obs),
          maxCompletionTokens: bounds.maxCompletionTokens,
          temperature: 0,
          timeoutMs: bounds.perCallTimeoutMs,
        });
      } catch (e) {
        if (e instanceof TimeoutError) {
          terminalReason = "timeout";
          push("provider_error", `timeout: ${(e as Error).message}`);
        } else if (e instanceof ProviderUnavailableError) {
          terminalReason = "provider_unavailable";
          push("provider_error", (e as Error).message);
        } else if (e instanceof ProviderError) {
          terminalReason = "provider_error";
          push("provider_error", (e as Error).message);
        } else {
          throw e;
        }
        break;
      }

      const text = response.text.slice(0, bounds.maxOutputChars);
      usages.push(response.usage);
      opts.budget.record(response.usage);
      const parsed = parseDecision(text, response.usage, response.provider, response.model);
      if (parsed.parseError && parseAttempts < bounds.maxParseRetries) {
        parseAttempts += 1;
        push("provider_error", `invalid tool output (attempt ${parseAttempts}): ${parsed.parseError}`);
        continue;
      }
      if (parsed.parseError) {
        terminalReason = "provider_error";
        push("provider_error", `unparseable decision after ${parseAttempts} retries`);
        decisions.push(parsed.decision);
        break;
      }
      decision = parsed.decision;
      decisions.push(decision);
      push("decision", decision.notes || "(no notes)");
      break;
    }
    if (!decision) break;

    if (decision.handoff) push("handoff", decision.handoff);
    if (!decision.action) {
      if (decision.advice) push("advice", decision.advice);
      terminalReason = "no_action";
      break;
    }

    let input;
    try {
      input = sanitizeActionInput(decision.action as unknown as Record<string, unknown>);
    } catch (e) {
      push("action_rejected", `invalid action payload: ${(e as Error).message}`);
      continue;
    }
    const action = {
      ...input,
      actionId: randomUUID(),
      idempotencyKey: randomUUID(),
      expectedRevision: engine.observe().revision,
    } as Action;
    const transition = engine.step(action, actor);
    if (transition.ok) {
      push("action_applied", `${action.type}: ${transition.feedback}`);
    } else {
      push(
        "action_rejected",
        `${action.type}: ${transition.errors.map((e) => `${e.code} ${e.message}`).join("; ")}`,
      );
    }
    if (action.type === "submit_work") {
      terminalReason = "submitted";
      break;
    }
  }

  if (terminalReason === "no_action" && engine.observe().status !== "active") {
    terminalReason = "submitted";
  }

  const state = engine.getState();
  return {
    state,
    report: gradeEpisode(state, opts.scenario),
    events,
    usages,
    terminalReason,
    decisions,
  };
}
