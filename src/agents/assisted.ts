/**
 * Human-assisted mode: the human retains task responsibility.
 * - suggestions are inspectable (raw model output + parsed action + notes)
 * - advice and executed actions are recorded separately
 * - requested handoffs are recorded
 * - execution permissions are explicit: NOTHING executes without accept
 */
import { randomUUID } from "node:crypto";
import type { EpisodeState, Actor, Action } from "../domain/types.ts";
import { applyAction } from "../domain/reducer.ts";
import type { Observation } from "../domain/observation.ts";
import { buildObservation } from "../domain/observation.ts";
import { buildMessages, parseDecision } from "./prompt.ts";
import type { AgentAdapter, AgentDecision, ProviderUsage } from "./types.ts";
import type { BudgetLedger } from "./budget.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";

export interface Suggestion {
  id: string;
  createdAtIso: string;
  decision: AgentDecision;
  /** exactly what would run if the human accepts (already sanitized shape) */
  proposedAction: Record<string, unknown> | null;
  accepted: boolean | null;
  executed: boolean;
  parseError: string | null;
}

export interface AssistLog {
  suggestions: Suggestion[];
  handoffs: string[];
  usages: ProviderUsage[];
}

export function newAssistLog(): AssistLog {
  return { suggestions: [], handoffs: [], usages: [] };
}

/**
 * Produce an inspectable suggestion. Never executes anything — the human (or
 * the caller on their explicit accept) does.
 */
export async function suggest(
  state: EpisodeState,
  scenario: ScenarioDefinition,
  adapter: AgentAdapter,
  budget: BudgetLedger,
  log: AssistLog,
  bounds: { timeoutMs: number; maxCompletionTokens: number; maxOutputChars: number },
): Promise<Suggestion> {
  const obs: Observation = buildObservation(state, scenario);
  budget.ensureHeadroom(null, adapter.describe().kind === "openai");
  const response = await adapter.decide({
    messages: buildMessages(obs),
    maxCompletionTokens: bounds.maxCompletionTokens,
    temperature: 0,
    timeoutMs: bounds.timeoutMs,
  });
  budget.record(response.usage);
  log.usages.push(response.usage);
  const text = response.text.slice(0, bounds.maxOutputChars);
  const parsed = parseDecision(text, response.usage, response.provider, response.model);
  const suggestion: Suggestion = {
    id: randomUUID(),
    createdAtIso: new Date().toISOString(),
    decision: parsed.decision,
    proposedAction: parsed.decision.action
      ? (parsed.decision.action as unknown as Record<string, unknown>)
      : null,
    accepted: null,
    executed: false,
    parseError: parsed.parseError,
  };
  if (parsed.decision.handoff) log.handoffs.push(parsed.decision.handoff);
  log.suggestions.push(suggestion);
  return suggestion;
}

/**
 * Execute an accepted suggestion against the shared domain core, with the
 * actor kind recorded as "assisted". Returns the new state or a rejection.
 */
export function executeAccepted(
  state: EpisodeState,
  scenario: ScenarioDefinition,
  suggestion: Suggestion,
): { ok: boolean; feedback: string; state: EpisodeState; errors: { code: string; message: string }[] } {
  suggestion.accepted = true;
  if (!suggestion.proposedAction) {
    return {
      ok: false,
      feedback: "Nothing to execute: the suggestion contained advice only (recorded separately).",
      state,
      errors: [{ code: "PAYLOAD_INVALID", message: "suggestion has no action" }],
    };
  }
  const actor: Actor = { id: "participant+assistant", kind: "assisted", role: "participant" };
  const action = {
    ...suggestion.proposedAction,
    actionId: randomUUID(),
    idempotencyKey: randomUUID(),
    expectedRevision: state.revision,
  } as Action;
  suggestion.executed = true;
  const t = applyAction(state, action, actor, scenario);
  return {
    ok: t.ok,
    feedback: t.feedback,
    state: t.state,
    errors: t.errors.map((e) => ({ code: e.code, message: e.message })),
  };
}
