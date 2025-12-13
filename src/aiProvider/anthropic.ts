import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AIProvider, AIModel } from "../types/config";
import { AIProviderAdapter } from "./types";

// Anthropic 官方支持的模型列表
const ANTHROPIC_MODELS: AIModel[] = [
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
];

export class AnthropicAdapter implements AIProviderAdapter {
  createModel(provider: AIProvider, modelId: string) {
    if (!provider.baseUrl) {
      throw new Error(
        "Anthropic native support not implemented yet. Please use openai-compatible type with a proxy or provide a baseUrl."
      );
    }

    const anthropicCompatible = createOpenAICompatible({
      name: "anthropic-compatible",
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });
    return anthropicCompatible(modelId);
  }

  async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    // Anthropic 没有公开的模型列表 API，返回预定义列表
    // 如果有 baseUrl（代理），尝试使用 OpenAI 兼容端点
    if (provider.baseUrl) {
      try {
        const url = `${provider.baseUrl.replace(/\/$/, "")}/models`;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          if (data.data && Array.isArray(data.data)) {
            return data.data.map((m: any) => ({
              id: m.id,
              name: m.name || m.id,
            }));
          }
        }
      } catch {
        // 回退到预定义列表
      }
    }

    return ANTHROPIC_MODELS;
  }
}
