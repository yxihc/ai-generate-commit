import { ProviderType, AIProvider, AIModel } from "../types/config";
import { AIProviderAdapter } from "./types";
import { OpenAIAdapter } from "./openai";
import { OpenAICompatibleAdapter } from "./openai-compatible";
import { AzureOpenAIAdapter } from "./azure-openai";
import { GeminiAdapter } from "./gemini";
import { AnthropicAdapter } from "./anthropic";
import { Logger } from "../utils/logger";

export * from "./types";

const adapters: Record<ProviderType, AIProviderAdapter> = {
  openai: new OpenAIAdapter(),
  "openai-compatible": new OpenAICompatibleAdapter(),
  "azure-openai": new AzureOpenAIAdapter(),
  gemini: new GeminiAdapter(),
  anthropic: new AnthropicAdapter(),
};

/**
 * 根据提供商类型获取适配器
 */
export function getAdapter(type: ProviderType): AIProviderAdapter {
  const adapter = adapters[type];
  if (!adapter) {
    throw new Error(`Unsupported provider type: ${type}`);
  }
  return adapter;
}

/**
 * 创建模型实例
 */
export function createModel(provider: AIProvider, modelId: string) {
  Logger.log(
    `Creating model for provider: ${provider.name} (${provider.type}), model: ${modelId}`
  );
  const adapter = getAdapter(provider.type);
  return adapter.createModel(provider, modelId);
}

/**
 * 获取模型列表
 */
export async function fetchModels(provider: AIProvider): Promise<AIModel[]> {
  try {
    const adapter = getAdapter(provider.type);
    return await adapter.fetchModels(provider);
  } catch (error: any) {
    Logger.log(`Error fetching models: ${error.message}`);
    throw error;
  }
}
