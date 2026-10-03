/**
 * In-Browser WebLLM Runner Configuration & Helper (Pillar 4, Item 038).
 * Enables running local open-weights models (e.g. Llama-3-8B-Instruct, Qwen2.5) directly
 * inside the browser via WebGPU for credential-free, offline evaluation.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface WebLlmModelConfig {
  modelId: string;
  modelUrl: string;
  vramRequiredMb: number;
  quantization: "q4f16_1" | "q4f32_1" | "q8f16_1";
}

export const RECOMMENDED_WEBLLM_MODELS: Record<string, WebLlmModelConfig> = {
  "Llama-3.2-3B-Instruct": {
    modelId: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    modelUrl: "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",
    vramRequiredMb: 2400,
    quantization: "q4f16_1",
  },
  "Qwen2.5-3B-Instruct": {
    modelId: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    modelUrl: "https://huggingface.co/mlc-ai/Qwen2.5-3B-Instruct-q4f16_1-MLC",
    vramRequiredMb: 2200,
    quantization: "q4f16_1",
  },
};

export function checkWebGpuSupport(): { supported: boolean; details: string } {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return { supported: true, details: "WebGPU is available in current browser environment." };
  }
  return { supported: false, details: "WebGPU is not detected. Falling back to server-side inference." };
}

export function buildLocalAgentPrompt(role: string, contextSummary: string): string {
  return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an autonomous operations apprentice for ${role}.
Always format responses strictly as executable WorkWorld tool calls.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Current State: ${contextSummary}
Execute your next operational step.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;
}
