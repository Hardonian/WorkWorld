/**
 * Provider-neutral agent interfaces. Provider-specific schemas, streaming and
 * rate-limit behavior are explicit in each adapter's describe() output.
 */
import type { ActionInput } from "../domain/types.ts";
import type { Observation } from "../domain/observation.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** integer minor units of the declared currency, or null when unknown */
  costMinor: number | null;
  /** explicit pricing provenance, or "unknown_cost" */
  pricingSource: string;
}

export interface ProviderRequest {
  messages: ChatMessage[];
  maxCompletionTokens: number;
  temperature: number;
  timeoutMs: number;
}

export interface ProviderResponse {
  provider: string;
  model: string;
  text: string;
  usage: ProviderUsage;
  /** latency observed by the loop, for run manifests */
  latencyMs: number;
}

export interface AdapterDescription {
  id: string;
  kind: "openai" | "ollama-openai-compatible" | "fixture";
  live: boolean;
  model: string;
  endpoint: string;
  streaming: false;
  rateLimitPolicy: string;
  pricingSource: string;
  notes: string;
}

export interface AgentAdapter {
  describe(): AdapterDescription;
  /** One model call. Throws ProviderUnavailableError / ProviderError / TimeoutError. */
  decide(req: ProviderRequest): Promise<ProviderResponse>;
}

export class ProviderUnavailableError extends Error {
  constructor(provider: string, reason: string) {
    super(`provider ${provider} unavailable: ${reason}`);
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

/** What an agent (or assistant suggestion) proposes. */
export interface AgentDecision {
  action: ActionInput | null;
  notes: string;
  advice: string | null;
  handoff: string | null;
  rawText: string;
  usage: ProviderUsage;
  provider: string;
  model: string;
}

export interface LoopEvent {
  kind:
    | "observation"
    | "decision"
    | "action_applied"
    | "action_rejected"
    | "advice"
    | "handoff"
    | "provider_error"
    | "budget_stop"
    | "bounds_stop"
    | "submitted";
  atIso: string;
  detail: string;
}

export type { Observation };
