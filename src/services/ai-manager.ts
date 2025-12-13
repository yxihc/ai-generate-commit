import * as vscode from "vscode";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { AIProvider, AIModel } from "../types/config";
import { Logger } from "../utils/logger";
import { localize } from "../utils/i18n";

export class AIManager {
  static getConfig() {
    const vsConfig = vscode.workspace.getConfiguration("ai-generate-commit");
    return vsConfig.get<any>("config") || {};
  }

  static getProviders(): AIProvider[] {
    const config = this.getConfig();
    const rawProviders = config.providers || [];

    // Normalize providers and filter disabled ones
    return rawProviders
      .filter((p: any) => p.enabled !== false)
      .map((p: any) => ({
        ...p,
        // Normalize models: convert string[] to AIModel[]
        models: (p.models || []).map((m: any) => 
          typeof m === 'string' ? { id: m } : m
        )
      }));
  }

  static getProvider(id: string): AIProvider | undefined {
    return this.getProviders().find((p) => p.id === id);
  }

  static getDefaultProvider(): AIProvider | undefined {
    const config = this.getConfig();
    const defaultName = config.defaultProviderName;
    const providers = this.getProviders();

    if (defaultName) {
      const provider = providers.find((p) => p.name === defaultName);
      if (provider) {
        return provider;
      }
    }

    // Fallback to first provider if exists
    if (providers.length > 0) {
      return providers[0];
    }
    return undefined;
  }

  static getDefaultModel(provider: AIProvider): string | undefined {
    const config = this.getConfig();
    // Only check defaultModel if the provider is the default provider
    if (config.defaultProviderName === provider.name) {
      const defaultModel = config.defaultModel;
      if (defaultModel && provider.models.some(m => m.id === defaultModel)) {
        return defaultModel;
      }
    }

    // Return first model
    if (provider.models.length > 0) {
      return provider.models[0].id;
    }
    return undefined;
  }

  static createModel(provider: AIProvider, modelId: string) {
    Logger.log(
      `Creating model for provider: ${provider.name} (${provider.type}), model: ${modelId}`
    );

    switch (provider.type) {
      case "openai":
      case "openai-compatible":
        if (provider.baseUrl) {
          const openaiCompatible = createOpenAICompatible({
            name: provider.type,
            apiKey: provider.apiKey,
            baseURL: provider.baseUrl,
          });
          return openaiCompatible(modelId);
        } else {
          const openai = createOpenAI({
            apiKey: provider.apiKey,
            // baseURL is optional for standard openai
          });
          return openai(modelId);
        }

      case "azure-openai":
        if (provider.baseUrl) {
          const azureOpenai = createOpenAICompatible({
            name: "azure-openai",
            apiKey: provider.apiKey,
            baseURL: provider.baseUrl,
          });
          return azureOpenai(modelId);
        }
        throw new Error(
          "Azure OpenAI requires a baseUrl. Please provide your Azure OpenAI endpoint."
        );

      // For others, we might need specific implementation or fallback to compatible
      case "gemini":
        // TODO: Implement Gemini specific provider or use compatible if URL provided
        if (provider.baseUrl) {
          const openaiCompatible = createOpenAICompatible({
            name: "gemini-compatible",
            apiKey: provider.apiKey,
            baseURL: provider.baseUrl,
          });
          return openaiCompatible(modelId);
        }
        throw new Error(
          "Gemini native support not implemented yet. Please use openai-compatible type with a proxy or provide a baseUrl."
        );

      case "anthropic":
        if (provider.baseUrl) {
          const openaiCompatible = createOpenAICompatible({
            name: "anthropic-compatible",
            apiKey: provider.apiKey,
            baseURL: provider.baseUrl,
          });
          return openaiCompatible(modelId);
        }
        throw new Error(
          "Anthropic native support not implemented yet. Please use openai-compatible type with a proxy or provide a baseUrl."
        );

      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  static async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    if (!provider.baseUrl) {
      throw new Error("Cannot fetch models without a base URL.");
    }

    try {
      // Try standard OpenAI models endpoint
      // It's usually GET /v1/models
      let url = provider.baseUrl;
      if (!url.endsWith("/")) {
        url += "/";
      }
      // Handle cases where baseUrl already includes /v1
      if (!url.includes("/models")) {
        url += "models";
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = (await response.json()) as any;
      if (data.data && Array.isArray(data.data)) {
        return data.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id, // Some providers like OpenRouter return name
          group: m.group, // Some providers might return group
        }));
      }
      return [];
    } catch (error: any) {
      Logger.log(`Error fetching models: ${error.message}`);
      throw error;
    }
  }
}
