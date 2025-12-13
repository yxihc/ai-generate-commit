import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AIProvider, AIModel } from "../types/config";
import { AIProviderAdapter } from "./types";

export class AzureOpenAIAdapter implements AIProviderAdapter {
  createModel(provider: AIProvider, modelId: string) {
    if (!provider.baseUrl) {
      throw new Error(
        "Azure OpenAI requires a baseUrl. Please provide your Azure OpenAI endpoint."
      );
    }

    const azureOpenai = createOpenAICompatible({
      name: "azure-openai",
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });
    return azureOpenai(modelId);
  }

  async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    if (!provider.baseUrl) {
      throw new Error("Cannot fetch models without a base URL.");
    }

    // Azure OpenAI 使用不同的端点格式: /openai/deployments?api-version=xxx
    const baseUrl = provider.baseUrl.replace(/\/$/, "");
    const url = `${baseUrl}/deployments?api-version=2024-02-01`;

    const response = await fetch(url, {
      headers: { "api-key": provider.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.model || m.id,
      }));
    }
    return [];
  }
}
