/**
 * Token Economics & Cost-Per-Correctness Metric (Pillar 8, Item 078).
 * Computes exact monetary inference costs and Cost-Per-Correct-Solution ($/Pass).
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface ModelPricing {
  modelName: string;
  costPerMillionPromptTokensUsd: number;
  costPerMillionCompletionTokensUsd: number;
}

export const STANDARD_MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": {
    modelName: "gpt-4o",
    costPerMillionPromptTokensUsd: 2.50,
    costPerMillionCompletionTokensUsd: 10.00,
  },
  "claude-3-5-sonnet": {
    modelName: "claude-3-5-sonnet",
    costPerMillionPromptTokensUsd: 3.00,
    costPerMillionCompletionTokensUsd: 15.00,
  },
  "gemini-1.5-pro": {
    modelName: "gemini-1.5-pro",
    costPerMillionPromptTokensUsd: 3.50,
    costPerMillionCompletionTokensUsd: 10.50,
  },
  "local-llama-3": {
    modelName: "local-llama-3",
    costPerMillionPromptTokensUsd: 0.0,
    costPerMillionCompletionTokensUsd: 0.0,
  },
};

export interface RunTokenEconomics {
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  outcome: "pass" | "fail";
  costPerPassUsd: number | null; // null if failed
}

export function calculateRunEconomics(
  modelKey: string,
  promptTokens: number,
  completionTokens: number,
  outcome: "pass" | "fail"
): RunTokenEconomics {
  const pricing = STANDARD_MODEL_PRICING[modelKey] ?? {
    modelName: modelKey,
    costPerMillionPromptTokensUsd: 3.0,
    costPerMillionCompletionTokensUsd: 12.0,
  };

  const promptCost = (promptTokens / 1_000_000) * pricing.costPerMillionPromptTokensUsd;
  const completionCost = (completionTokens / 1_000_000) * pricing.costPerMillionCompletionTokensUsd;
  const totalCostUsd = Number((promptCost + completionCost).toFixed(4));

  return {
    modelName: pricing.modelName,
    promptTokens,
    completionTokens,
    totalCostUsd,
    outcome,
    costPerPassUsd: outcome === "pass" ? totalCostUsd : null,
  };
}
