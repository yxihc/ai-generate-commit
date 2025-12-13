export interface AIModelCapabilities {
  vision?: boolean;
  web?: boolean;
  thinking?: boolean;
  tools?: boolean;
}

export interface AIModel {
  id: string;
  name?: string;
  group?: string;
  capabilities?: AIModelCapabilities;
}

export const providerTypes = ["openai", "azure-openai", "openai-compatible", "gemini", "anthropic"] as const;
export type ProviderType = typeof providerTypes[number];

export interface AIProvider {
  id: string;
  name: string;
  type: ProviderType;
  apiKey: string;
  baseUrl?: string;
  models: AIModel[];
  enabled?: boolean;
}

export interface AIConfig {
  providers: AIProvider[];
  defaultProviderName?: string;
  defaultModel?: string;
}
