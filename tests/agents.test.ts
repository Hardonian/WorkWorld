import { describe, it, expect, vi, afterEach } from "vitest";
import { runAgentEpisode } from "../src/agents/loop.ts";
import { suggest, executeAccepted, newAssistLog } from "../src/agents/assisted.ts";
import { BudgetLedger, loadBudgetConfig } from "../src/agents/budget.ts";
import { fixtureAdapter, decisionJson } from "../src/agents/adapters/fixtures.ts";
import {
  ChatCompletionsAdapter,
  makeOpenAIAdapter,
  makeOllamaAdapter,
} from "../src/agents/adapters/chat-completions.ts";
import { buildMessages, extractJson, parseDecision } from "../src/agents/prompt.ts";
import { ProviderUnavailableError, type AgentAdapter, type ProviderRequest, type ProviderResponse } from "../src/agents/types.ts";
import { getScenario } from "../src/scenarios/catalog.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import type { ActionInput } from "../src/domain/types.ts";

const zeroBudget = () => new BudgetLedger(loadBudgetConfig());

/** Fixture that behaves like a paid provider for budget gating. */
class PaidFixture implements AgentAdapter {
  calls = 0;
  describe() {
    return {
      id: "paid-fixture",
      kind: "openai" as const,
      live: true,
      model: "paid-fixture",
      endpoint: "in-process",
      streaming: false as const,
      rateLimitPolicy: "none",
      pricingSource: "unknown_cost",
      notes: "test fixture standing in for a paid provider",
    };
  }
  async decide(req: ProviderRequest): Promise<ProviderResponse> {
    void req;
    this.calls += 1;
    return {
      provider: "openai",
      model: "paid-fixture",
      text: decisionJson({ type: "advance_time", minutes: 60 }),
      usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20, costMinor: null, pricingSource: "unknown_cost" },
      latencyMs: 1,
    };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("agent loop (fixture runs — not model runs)", () => {
  it("completes an episode successfully through the public action contract", async () => {
    // Scripted A1-style run mirroring the competent baseline.
    const actions: ActionInput[] = [
      {
        type: "draft_purchase_order",
        poId: "PO-F1",
        supplierId: "SUP-KETTLE",
        lines: [
          { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
          { itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 },
          { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
        ],
        requestedDeliveryDay: 7,
        note: "restock",
      },
      { type: "submit_purchase_order", poId: "PO-F1" },
      { type: "request_approval", poId: "PO-F1" },
      { type: "advance_time", minutes: 1440 },
      { type: "authorize_purchase_order", poId: "PO-F1" },
      { type: "advance_time", minutes: 4320 },
      {
        type: "record_delivery",
        deliveryId: "DV:PO-F1",
        verifiedLines: [
          { itemId: "GLV-100", qty: 4 },
          { itemId: "SAF-220", qty: 6 },
          { itemId: "FST-550", qty: 12 },
        ],
        note: "checked",
      },
      {
        type: "update_ticket",
        ticketId: "TCK-101",
        status: "resolved",
        note: "done",
        reference: "PO-F1",
        commitment: null,
      },
      { type: "submit_work", summary: "restock complete" },
    ];
    const adapter = fixtureAdapter("fixture-success", {
      mode: "script",
      decisions: actions.map((a) => decisionJson(a)),
    });
    const result = await runAgentEpisode({
      scenario: getScenario("A1"),
      adapter,
      budget: zeroBudget(),
    });
    expect(result.terminalReason).toBe("submitted");
    expect(result.report.outcome).toBe("pass");
    expect(result.report.fatalFailures).toEqual([]);
  });

  it("handles invalid tool output: records it and terminates cleanly", async () => {
    const result = await runAgentEpisode({
      scenario: getScenario("A1"),
      adapter: fixtureAdapter("fixture-invalid", { mode: "invalid_tool_output" }),
      budget: zeroBudget(),
      bounds: { maxParseRetries: 1 },
    });
    expect(result.terminalReason).toBe("provider_error");
    expect(result.events.some((e) => e.kind === "provider_error" && /invalid tool output/.test(e.detail))).toBe(true);
    // State remains valid and gradeable (never crashes mid-run).
    expect(result.report.scenarioId).toBe("A1");
  });

  it("handles partial (truncated) model output", async () => {
    const result = await runAgentEpisode({
      scenario: getScenario("A1"),
      adapter: fixtureAdapter("fixture-partial", { mode: "partial_output" }),
      budget: zeroBudget(),
      bounds: { maxParseRetries: 1 },
    });
    expect(result.terminalReason).toBe("provider_error");
    expect(result.decisions.length).toBe(1); // recorded as evidence
  });

  it("handles provider timeout", async () => {
    const result = await runAgentEpisode({
      scenario: getScenario("A1"),
      adapter: fixtureAdapter("fixture-timeout", { mode: "timeout" }),
      budget: zeroBudget(),
    });
    expect(result.terminalReason).toBe("timeout");
    expect(result.events.some((e) => /timeout/.test(e.detail))).toBe(true);
  });

  it("handles provider error (outage)", async () => {
    const result = await runAgentEpisode({
      scenario: getScenario("A1"),
      adapter: fixtureAdapter("fixture-outage", { mode: "provider_error" }),
      budget: zeroBudget(),
    });
    expect(result.terminalReason).toBe("provider_error");
  });

  it("stops at the shared experiment budget BEFORE dispatching paid calls", async () => {
    const budget = new BudgetLedger({ currency: "CAD", limitMinor: 0, pricingSource: null, pricePerMillionTokens: {} });
    const paid = new PaidFixture();
    const result = await runAgentEpisode({ scenario: getScenario("A1"), adapter: paid, budget });
    expect(result.terminalReason).toBe("budget_stop");
    expect(paid.calls).toBe(0); // never dispatched
  });

  it("never exposes grader internals or hidden schedule to agents", () => {
    const engine = EpisodeEngine.reset(getScenario("A1"), { runId: "leak-test", seed: 1, condition: "agent" });
    const messages = buildMessages(engine.observe());
    const blob = JSON.stringify(messages);
    for (const secret of [
      "requirementPredicates",
      "requiredUpdates",
      "fireAtMinute",
      "scheduledEvents",
      "outcomeChecks",
      "negative-controls",
      "baseline",
    ]) {
      expect(blob, `leaked ${secret}`).not.toContain(secret);
    }
  });
});

describe("decision parsing", () => {
  it("extracts balanced JSON and rejects garbage", () => {
    expect(extractJson('noise {"action": null, "notes": "x"} trailing')).toEqual({ action: null, notes: "x" });
    expect(extractJson("no json at all")).toBeNull();
    expect(extractJson('{"action": {"a": "}}"}')).toBeNull(); // unbalanced
    const parsed = parseDecision('{"action": {"type":"add_work_note","text":"hi"}, "notes":"n"}', {
      promptTokens: 1,
      completionTokens: 1,
      totalTokens: 2,
      costMinor: null,
      pricingSource: "unknown_cost",
    }, "fixture", "fixture");
    expect(parsed.parseError).toBeNull();
    expect(parsed.decision.action).toEqual({ type: "add_work_note", text: "hi" });
    const bad = parseDecision("garbage", {
      promptTokens: 0, completionTokens: 0, totalTokens: 0, costMinor: 0, pricingSource: "fixture",
    }, "fixture", "fixture");
    expect(bad.parseError).toMatch(/invalid tool output/);
  });
});

describe("human-assisted mode", () => {
  it("keeps suggestions inspectable and executes only on accept, recorded as assisted", async () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "assist-1", seed: 1, condition: "assisted" });
    const log = newAssistLog();
    const adapter = fixtureAdapter("fixture-assist", {
      mode: "script",
      decisions: [decisionJson({ type: "add_work_note", text: "suggested note" } as ActionInput)],
    });
    const suggestion = await suggest(engine.getState(), scenario, adapter, zeroBudget(), log, {
      timeoutMs: 5000,
      maxCompletionTokens: 500,
      maxOutputChars: 4000,
    });

    // Inspectable: raw text + proposed action visible; nothing executed yet.
    expect(suggestion.proposedAction).toEqual({ type: "add_work_note", text: "suggested note" });
    expect(suggestion.accepted).toBeNull();
    expect(suggestion.executed).toBe(false);
    expect(engine.getState().workNotes).toHaveLength(0);

    const before = engine.getState();
    const outcome = executeAccepted(before, scenario, suggestion);
    expect(outcome.ok).toBe(true);
    expect(suggestion.executed).toBe(true);
    expect(outcome.state.workNotes).toHaveLength(1);
    const record = outcome.state.actionLog.at(-1)!;
    expect(record.actor.kind).toBe("assisted"); // executed action attributed to assisted actor
  });

  it("records advice separately and executes nothing for advice-only suggestions", async () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "assist-2", seed: 1, condition: "assisted" });
    const log = newAssistLog();
    const adapter = fixtureAdapter("fixture-advice", {
      mode: "script",
      decisions: [decisionJson(null, "I would compare suppliers first")],
    });
    const suggestion = await suggest(engine.getState(), scenario, adapter, zeroBudget(), log, {
      timeoutMs: 5000,
      maxCompletionTokens: 500,
      maxOutputChars: 4000,
    });
    expect(suggestion.proposedAction).toBeNull();
    expect(suggestion.decision.notes).toContain("compare suppliers");
    const outcome = executeAccepted(engine.getState(), scenario, suggestion);
    expect(outcome.ok).toBe(false);
    expect(outcome.feedback).toMatch(/advice only/);
  });
});

describe("real adapters (typed, compiled, protocol-tested)", () => {
  it("OpenAI adapter fails with a clear provider-unavailable reason without credentials", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const adapter = makeOpenAIAdapter(zeroBudget());
    expect(adapter.describe().kind).toBe("openai");
    expect(adapter.describe().live).toBe(true);
    await expect(
      adapter.decide({
        messages: [{ role: "user", content: "hi" }],
        maxCompletionTokens: 10,
        temperature: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toThrow(ProviderUnavailableError);
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  });

  it("OpenAI adapter sends the documented wire schema and parses usage", async () => {
    let captured: { url: string; body: Record<string, unknown> } | null = null;
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      captured = { url: String(url), body: JSON.parse(init.body) };
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"action": null, "notes": "ok"}' } }],
          usage: { prompt_tokens: 12, completion_tokens: 34, total_tokens: 46 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    const adapter = new ChatCompletionsAdapter(
      {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "test-key-not-real",
        model: "gpt-4o-mini",
        authMode: "openai",
        maxRetries: 0,
        minIntervalMs: 0,
      },
      zeroBudget(),
    );
    const res = await adapter.decide({
      messages: [{ role: "user", content: "hello" }],
      maxCompletionTokens: 256,
      temperature: 0,
      timeoutMs: 5000,
    });
    expect(captured!.url).toBe("https://api.openai.com/v1/chat/completions");
    expect(captured!.body.model).toBe("gpt-4o-mini");
    expect(captured!.body.max_completion_tokens).toBe(256);
    expect(captured!.body.stream).toBe(false);
    expect(res.usage.totalTokens).toBe(46);
    expect(res.usage.pricingSource).toBe("unknown_cost"); // honest: no invented price
  });

  it("Ollama adapter targets the local OpenAI-compatible endpoint", () => {
    const adapter = makeOllamaAdapter(zeroBudget());
    const d = adapter.describe();
    expect(d.kind).toBe("ollama-openai-compatible");
    expect(d.endpoint).toContain("/chat/completions");
    expect(d.streaming).toBe(false);
    expect(d.pricingSource).toContain("local");
  });
});
