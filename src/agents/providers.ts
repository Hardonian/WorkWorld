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
