import { NextResponse } from "next/server";
import { currentState } from "../../../server/session.ts";
import { getScenario } from "../../../scenarios/catalog.ts";
import { suggest, newAssistLog, type AssistLog } from "../../../agents/assisted.ts";
import { loadBudgetConfig, BudgetLedger } from "../../../agents/budget.ts";
import { makeOllamaAdapter, makeOpenAIAdapter } from "../../../agents/adapters/chat-completions.ts";
import type { AgentAdapter } from "../../../agents/types.ts";

export const dynamic = "force-dynamic";

/**
 * Human-assisted mode endpoint: returns an INSPECTABLE suggestion.
 * Nothing executes here — the human explicitly applies the suggestion by
 * submitting its proposed action through /api/actions.
 */
const logs = new Map<string, AssistLog>();

function pickAdapter(): { adapter: AgentAdapter; budget: BudgetLedger } {
  const budget = new BudgetLedger(loadBudgetConfig());
  // Prefer the local unpaid endpoint for assisted suggestions; OpenAI only if
  // explicitly configured (missing key => adapter reports provider_unavailable).
  const provider = process.env.WORKWORLD_ASSIST_PROVIDER ?? "ollama";
  return {
    adapter: provider === "openai" ? makeOpenAIAdapter(budget) : makeOllamaAdapter(budget),
    budget,
  };
}

export async function POST() {
  const state = await currentState();
  if (!state) {
    return NextResponse.json({ error: "no active episode" }, { status: 404 });
  }
  const scenario = getScenario(state.scenarioId);
  const log = logs.get(state.runId) ?? newAssistLog();
  logs.set(state.runId, log);
  const { adapter, budget } = pickAdapter();
  try {
    const suggestion = await suggest(state, scenario, adapter, budget, log, {
      timeoutMs: 45_000,
      maxCompletionTokens: 800,
      maxOutputChars: 6000,
    });
    return NextResponse.json({
      suggestion: {
        id: suggestion.id,
        proposedAction: suggestion.proposedAction,
        notes: suggestion.decision.notes,
        advice: suggestion.decision.advice,
        handoff: suggestion.decision.handoff,
        parseError: suggestion.parseError,
        usage: suggestion.decision.usage,
        provider: suggestion.decision.provider,
        model: suggestion.decision.model,
        fixture: adapter.describe().kind === "fixture",
      },
      assistLog: {
        suggestions: log.suggestions.length,
        handoffs: log.handoffs,
      },
    });
  } catch (e) {
    const message = (e as Error).message;
    const unavailable = /unavailable|budget/i.test(message);
    return NextResponse.json(
      { error: message, code: unavailable ? "PROVIDER_UNAVAILABLE" : "PROVIDER_ERROR" },
      { status: unavailable ? 503 : 502 },
    );
  }
}
