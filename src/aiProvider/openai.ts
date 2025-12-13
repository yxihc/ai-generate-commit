import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AIProvider, AIModel } from "../types/config";
import { AIProviderAdapter } from "./types";

export class OpenAIAdapter implements AIProviderAdapter {
  createModel(provider: AIProvider, modelId: string) {
    if (provider.baseUrl) {
      const openaiCompatible = createOpenAICompatible({
        name: "openai",
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
      });
      return openaiCompatible(modelId);
    }

    const openai = createOpenAI({
      apiKey: provider.apiKey,
    });
    return openai(modelId);
  }

  async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    const baseUrl = provider.baseUrl || "https://api.openai.com/v1";
    const url = `${baseUrl.replace(/\/$/, "")}/models`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((m: any) => ({
        id: m.id,
        name: m.name || m.id,
        group: m.group,
      }));
    }
    return [];
  }
}
