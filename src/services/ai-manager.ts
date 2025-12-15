import * as vscode from "vscode";
import { AIProvider, AIModel } from "../types/config";
import { createModel, fetchModels } from "../aiProvider";

export class AIManager {
  static getConfig() {
    const vsConfig = vscode.workspace.getConfiguration("commitagent");
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
          typeof m === "string" ? { id: m } : m
        ),
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
      if (defaultModel && provider.models.some((m) => m.id === defaultModel)) {
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
    return createModel(provider, modelId);
  }

  static async fetchModels(provider: AIProvider): Promise<AIModel[]> {
    return fetchModels(provider);
  }
}
