import { LanguageModel } from "ai";
import { AIProvider, AIModel } from "../types/config";

/**
 * AI 提供商适配器接口
 */
export interface AIProviderAdapter {
  /**
   * 创建语言模型实例
   */
  createModel(provider: AIProvider, modelId: string): LanguageModel;

  /**
   * 获取可用模型列表
   */
  fetchModels(provider: AIProvider): Promise<AIModel[]>;
}
