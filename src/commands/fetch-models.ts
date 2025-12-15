import * as vscode from "vscode";
import { AIManager } from "../services/ai-manager";
import { AIProvider } from "../types/config";

interface ProviderQuickPickItem extends vscode.QuickPickItem {
  provider: AIProvider | null;
}

/**
 * 获取模型列表命令处理器
 */
export async function handleFetchModels(): Promise<void> {
  const selected = await selectProvider();
  if (!selected) return;

  const provider = selected.isNew
    ? await createTempProvider()
    : selected.provider;

  if (!provider) return;

  try {
    await fetchAndHandleModels(provider, !selected.isNew);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to fetch models: ${error.message}`);
  }
}

async function selectProvider(): Promise<{
  provider: AIProvider;
  isNew: boolean;
} | null> {
  const providers = AIManager.getProviders();
  const items: ProviderQuickPickItem[] = providers.map((p) => ({
    label: p.name,
    description: p.baseUrl,
    provider: p,
  }));

  items.push({
    label: "$(plus) New Provider",
    description: "Fetch from a new URL",
    provider: null,
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select a provider to fetch models for",
  });

  if (!selected) return null;

  return {
    provider: selected.provider!,
    isNew: selected.provider === null,
  };
}

async function createTempProvider(): Promise<AIProvider | null> {
  const baseUrl = await vscode.window.showInputBox({
    prompt: "Enter Base URL (e.g. https://api.openai.com/v1)",
    value: "https://",
  });
  if (!baseUrl) return null;

  const apiKey = await vscode.window.showInputBox({
    prompt: "Enter API Key",
    password: true,
  });
  if (!apiKey) return null;

  return {
    id: "temp",
    name: "Temp",
    type: "openai-compatible",
    apiKey,
    baseUrl,
    models: [],
  };
}

async function fetchAndHandleModels(
  provider: AIProvider,
  canUpdateConfig: boolean
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Fetching models...",
      cancellable: false,
    },
    async () => {
      const models = await AIManager.fetchModels(provider);
      if (models.length === 0) {
        vscode.window.showInformationMessage("No models found.");
        return;
      }

      const actions = ["Copy to Clipboard"];
      if (canUpdateConfig) {
        actions.push("Update Config");
      }

      const action = await vscode.window.showInformationMessage(
        `Found ${models.length} models.`,
        ...actions
      );

      if (action === "Copy to Clipboard") {
        await vscode.env.clipboard.writeText(JSON.stringify(models, null, 2));
        vscode.window.showInformationMessage("Models copied to clipboard.");
      } else if (action === "Update Config") {
        await updateProviderModels(provider, models);
      }
    }
  );
}

async function updateProviderModels(
  provider: AIProvider,
  models: { id: string }[]
): Promise<void> {
  const vsConfig = vscode.workspace.getConfiguration("commitagent");
  const config = vsConfig.get<any>("config") || {};
  const currentProviders = config.providers || [];
  const index = currentProviders.findIndex((p: any) => p.id === provider.id);

  if (index !== -1) {
    currentProviders[index].models = models.map((m) => m.id);
    await vsConfig.update(
      "config",
      { ...config, providers: currentProviders },
      vscode.ConfigurationTarget.Global
    );
    vscode.window.showInformationMessage(
      `Updated models for ${provider.name}.`
    );
  }
}
