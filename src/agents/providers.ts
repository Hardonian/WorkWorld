/**
 * Multi-Provider Adapter Hub (Pillar 4, Item 037).
 * Unified interface supporting OpenAI, Anthropic Claude, Google Gemini, and Local Ollama.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export type ModelProvider = "openai" | "anthropic" | "gemini" | "ollama";

export interface ProviderConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface UnifiedMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface UnifiedCompletionResponse {
  provider: ModelProvider;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export function formatPromptForProvider(
  messages: UnifiedMessage[],
  config: ProviderConfig
): Record<string, unknown> {
  switch (config.provider) {
    case "openai":
    case "ollama":
      return {
        model: config.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: config.temperature ?? 0.2,
      };

    case "anthropic": {
      const systemMessage = messages.find((m) => m.role === "system")?.content || "";
      const nonSystem = messages.filter((m) => m.role !== "system");
      return {
        model: config.model,
        system: systemMessage,
        messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: config.maxTokens ?? 2048,
      };
    }

    case "gemini":
      return {
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      };
  }
}

export interface ModelPricing {
  promptCostPerMillion: number;
  completionCostPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "claude-3-7-sonnet-20250219": { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0 },
  "claude-3-5-sonnet-20241022": { promptCostPerMillion: 3.0, completionCostPerMillion: 15.0 },
  "gpt-4.5-preview": { promptCostPerMillion: 75.0, completionCostPerMillion: 150.0 },
  "gpt-4o": { promptCostPerMillion: 2.5, completionCostPerMillion: 10.0 },
  "gemini-2.5-pro": { promptCostPerMillion: 1.25, completionCostPerMillion: 5.0 },
  "gemini-2.5-flash": { promptCostPerMillion: 0.15, completionCostPerMillion: 0.6 },
  "deepseek-r1": { promptCostPerMillion: 0.55, completionCostPerMillion: 2.19 },
  "deepseek-v3": { promptCostPerMillion: 0.14, completionCostPerMillion: 0.28 },
  "ollama-local": { promptCostPerMillion: 0.0, completionCostPerMillion: 0.0 },
};

export function calculateRunCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): { promptCost: number; completionCost: number; totalCost: number } {
  const pricing = MODEL_PRICING[model] ?? { promptCostPerMillion: 2.0, completionCostPerMillion: 8.0 };
  const promptCost = (promptTokens / 1_000_000) * pricing.promptCostPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionCostPerMillion;
  return {
    promptCost: Number(promptCost.toFixed(6)),
    completionCost: Number(completionCost.toFixed(6)),
    totalCost: Number((promptCost + completionCost).toFixed(6)),
  };
}

export async function executeProviderCompletion(
  messages: UnifiedMessage[],
  config: ProviderConfig,
  customFetch: typeof fetch = fetch
): Promise<UnifiedCompletionResponse> {
  const startTime = Date.now();

  // If in local/test environment or no API key provided, generate deterministic simulation response
  if (!config.apiKey && config.provider !== "ollama") {
    const elapsed = Date.now() - startTime;
    return {
      provider: config.provider,
      model: config.model,
      content: JSON.stringify({
        thought: "Simulated offline evaluation response from multi-provider harness.",
        action: { type: "advance_time", minutes: 15 },
      }),
      usage: {
        promptTokens: messages.reduce((acc, m) => acc + m.content.length / 4, 0),
        completionTokens: 35,
        totalTokens: messages.reduce((acc, m) => acc + m.content.length / 4, 0) + 35,
      },
      latencyMs: elapsed,
    };
  }

  // Live HTTP dispatch
  const payload = formatPromptForProvider(messages, config);
  let endpoint = config.baseUrl;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (config.provider === "openai") {
    endpoint = endpoint ?? "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  } else if (config.provider === "anthropic") {
    endpoint = endpoint ?? "https://api.anthropic.com/v1/messages";
    headers["x-api-key"] = config.apiKey ?? "";
    headers["anthropic-version"] = "2023-06-01";
  } else if (config.provider === "gemini") {
    endpoint = endpoint ?? `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
  } else if (config.provider === "ollama") {
    endpoint = endpoint ?? "http://localhost:11434/api/chat";
  }

  const res = await customFetch(endpoint!, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as Record<string, unknown>;
  const elapsed = Date.now() - startTime;

  let text = "";
  if (config.provider === "openai" || config.provider === "ollama") {
    interface Choice { message?: { content?: string } }
    const choices = data.choices as Choice[] | undefined;
    text = choices?.[0]?.message?.content ?? "";
  } else if (config.provider === "anthropic") {
    interface Part { text?: string }
    const content = data.content as Part[] | undefined;
    text = content?.[0]?.text ?? "";
  } else if (config.provider === "gemini") {
    interface Candidate { content?: { parts?: { text?: string }[] } }
    const cands = data.candidates as Candidate[] | undefined;
    text = cands?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  return {
    provider: config.provider,
    model: config.model,
    content: text,
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    },
    latencyMs: elapsed,
  };
}

