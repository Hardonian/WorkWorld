/**
 * OpenAI Chat Completions adapter — the documented wire schema verified against
 * the official API reference on 2026-10-02 (POST /v1/chat/completions;
 * max_completion_tokens is current, max_tokens deprecated; usage reports
 * prompt_tokens / completion_tokens / total_tokens). Streaming is NOT used by
 * the loop (streaming: false is explicit in describe()); non-streaming keeps
 * token accounting exact per call.
 */
import {
  ProviderError,
  ProviderUnavailableError,
  TimeoutError,
  type AgentAdapter,
  type AdapterDescription,
  type ProviderRequest,
  type ProviderResponse,
} from "../types.ts";
import type { BudgetLedger } from "../budget.ts";

export interface ChatCompletionsConfig {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  /** "openai" for api.openai.com (key required), "local" for OpenAI-compatible (no key) */
  authMode: "openai" | "local";
  maxRetries: number;
  minIntervalMs: number;
}

interface WireUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

interface WireResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  usage?: WireUsage;
  error?: { message?: string };
}

let lastCallAt = 0;

export class ChatCompletionsAdapter implements AgentAdapter {
  constructor(
    private readonly cfg: ChatCompletionsConfig,
    private readonly budget: BudgetLedger,
  ) {}

  describe(): AdapterDescription {
    return {
      id: `${this.cfg.authMode === "openai" ? "openai" : "ollama"}:${this.cfg.model}`,
      kind: this.cfg.authMode === "openai" ? "openai" : "ollama-openai-compatible",
      live: true,
      model: this.cfg.model,
      endpoint: `${this.cfg.baseUrl}/chat/completions`,
      streaming: false,
      rateLimitPolicy: `min interval ${this.cfg.minIntervalMs}ms; bounded retries (${this.cfg.maxRetries}) honoring Retry-After on 429`,
      pricingSource:
        this.cfg.authMode === "openai" ? "unknown_cost unless WORKWORLD_PRICING_JSON set" : "local endpoint — no metered cost",
      notes:
        "Wire schema: model, messages, max_completion_tokens, temperature; " +
        "usage.prompt_tokens/completion_tokens/total_tokens (official API reference, retrieved 2026-10-02).",
    };
  }

  async decide(req: ProviderRequest): Promise<ProviderResponse> {
    if (this.cfg.authMode === "openai" && !this.cfg.apiKey) {
      throw new ProviderUnavailableError(
        "openai",
        "OPENAI_API_KEY is not configured (externally blocked; see docs/BLOCKERS.md B2)",
      );
    }
    const body = JSON.stringify({
      model: this.cfg.model,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      max_completion_tokens: req.maxCompletionTokens,
      temperature: req.temperature,
      stream: false,
    });

    let attempt = 0;
    for (;;) {
      // Client-side rate limit: explicit minimum interval between calls.
      const since = Date.now() - lastCallAt;
      if (since < this.cfg.minIntervalMs) {
        await new Promise((r) => setTimeout(r, this.cfg.minIntervalMs - since));
      }
      lastCallAt = Date.now();
      const started = Date.now();
      let res: Response;
      try {
        res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(this.cfg.apiKey ? { authorization: `Bearer ${this.cfg.apiKey}` } : {}),
          },
          body,
          signal: AbortSignal.timeout(req.timeoutMs),
        });
      } catch (e) {
        if ((e as Error).name === "TimeoutError" || (e as Error).name === "AbortError") {
          throw new TimeoutError(`call timed out after ${req.timeoutMs}ms`);
        }
        if (attempt < this.cfg.maxRetries) {
          attempt += 1;
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw new ProviderError(`network failure: ${(e as Error).message}`);
      }

      if (res.status === 429 || res.status >= 500) {
        if (attempt < this.cfg.maxRetries) {
          attempt += 1;
          const retryAfter = Number(res.headers.get("retry-after") ?? "1");
          await new Promise((r) => setTimeout(r, Math.min(retryAfter, 30) * 1000));
          continue;
        }
        throw new ProviderError(`provider returned ${res.status} after ${attempt} retries`);
      }
      if (!res.ok) {
        const text = await res.text();
        throw new ProviderError(`provider returned ${res.status}: ${text.slice(0, 300)}`);
      }

      const json = (await res.json()) as WireResponse;
      const text = json.choices?.[0]?.message?.content ?? "";
      const usage = this.budget.price(
        this.cfg.model,
        json.usage?.prompt_tokens ?? 0,
        json.usage?.completion_tokens ?? 0,
      );
      return {
        provider: this.cfg.authMode === "openai" ? "openai" : "ollama-openai-compatible",
        model: this.cfg.model,
        text,
        usage,
        latencyMs: Date.now() - started,
      };
    }
  }
}

/** OpenAI adapter factory. Missing credentials => clear provider-unavailable. */
export function makeOpenAIAdapter(budget: BudgetLedger, model?: string): AgentAdapter {
  return new ChatCompletionsAdapter(
    {
      baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY ?? null,
      model: model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      authMode: "openai",
      maxRetries: 2,
      minIntervalMs: 250,
    },
    budget,
  );
}

/** Local OpenAI-compatible adapter (Ollama). Unpaid, existing hardware. */
export function makeOllamaAdapter(budget: BudgetLedger, model?: string): AgentAdapter {
  return new ChatCompletionsAdapter(
    {
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
      apiKey: null,
      model: model ?? process.env.OLLAMA_MODEL ?? "llama3.1:8b",
      authMode: "local",
      maxRetries: 1,
      minIntervalMs: 0,
    },
    budget,
  );
}
