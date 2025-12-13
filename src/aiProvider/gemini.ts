import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AIProvider, AIModel } from "../types/config";
import { AIProviderAdapter } from "./types";

export class GeminiAdapter implements AIProviderAdapter {
  createModel(provider: AIProvider, modelId: string) {
    if (!provider.baseUrl) {
      throw new Error(
        "Gemini native support not implemented yet. Please use openai-compatible type with a proxy or provide a baseUrl."
      );
    }

    const geminiCompatible = createOpenAICompatible({
      name: "gemini-compatible",
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
    });
    return geminiCompatible(modelId);
  }

  async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    // Gemini 原生 API: https://generativelanguage.googleapis.com/v1beta/models
    const baseUrl =
      provider.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
    const url = `${baseUrl.replace(/\/$/, "")}/models?key=${provider.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (data.models && Array.isArray(data.models)) {
      return data.models.map((m: any) => ({
        id: m.name?.replace("models/", "") || m.name,
        name: m.displayName || m.name,
      }));
    }
    return [];
  }
}
