/**
 * Deterministic FIXTURE adapters for offline contract verification.
 * These are NOT models. Every fixture is labeled kind: "fixture", live: false.
 */
import {
  ProviderError,
  TimeoutError,
  type AgentAdapter,
  type AdapterDescription,
  type ProviderRequest,
  type ProviderResponse,
} from "../types.ts";
import type { ActionInput } from "../../domain/types.ts";

export type FixtureBehavior =
  | { mode: "script"; decisions: (string | null)[]; cursor?: number }
  | { mode: "invalid_tool_output" }
  | { mode: "partial_output" }
  | { mode: "timeout" }
  | { mode: "provider_error" };

function describeFixture(id: string, notes: string): AdapterDescription {
  return {
    id,
    kind: "fixture",
    live: false,
    model: "fixture",
    endpoint: "in-process",
    streaming: false,
    rateLimitPolicy: "none (deterministic fixture)",
    pricingSource: "fixture — zero cost",
    notes: `FIXTURE, not a model. ${notes}`,
  };
}

export class FixtureAdapter implements AgentAdapter {
  private cursor = 0;

  constructor(
    private readonly id: string,
    private readonly behavior: FixtureBehavior,
  ) {}

  describe(): AdapterDescription {
    const notes =
      this.behavior.mode === "script"
        ? "emits a fixed decision sequence"
        : `exercises loop failure handling: ${this.behavior.mode}`;
    return describeFixture(this.id, notes);
  }

  async decide(_req: ProviderRequest): Promise<ProviderResponse> {
    const base = {
      provider: "fixture",
      model: "fixture",
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costMinor: 0,
        pricingSource: "fixture — zero cost",
      },
      latencyMs: 0,
    };
    switch (this.behavior.mode) {
      case "script": {
        const raw = this.behavior.decisions[this.cursor] ?? null;
        this.cursor += 1;
        return { ...base, text: raw ?? '{"action": null, "advice": "done"}' };
      }
      case "invalid_tool_output":
        return { ...base, text: "I think we should probably order the gloves! (no structured action)" };
      case "partial_output":
        return { ...base, text: '{"action": {"type": "advance_time", "minu' }; // truncated mid-payload
      case "timeout":
        throw new TimeoutError("fixture timeout after configured budget");
      case "provider_error":
        throw new ProviderError("fixture provider error (simulated outage)");
    }
  }
}

export function fixtureAdapter(id: string, behavior: FixtureBehavior): AgentAdapter {
  return new FixtureAdapter(id, behavior);
}

/** Helper: wrap typed action payloads as fixture JSON decisions. */
export function decisionJson(action: ActionInput | null, notes = ""): string {
  return JSON.stringify({ action, notes, advice: null, handoff: null });
}
