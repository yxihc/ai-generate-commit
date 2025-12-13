import * as vscode from "vscode";
import { localize } from "./utils/i18n";
import { getGitAPI, getSelectedRepository } from "./utils/git";
import { generateCommitMessage } from "./services/commit";
import { AIManager } from "./services/ai-manager";
import { SettingsPanel } from "./webview/settings-panel";

interface ModelQuickPickItem extends vscode.QuickPickItem {
  providerId: string;
  modelId: string;
}

/**
 * 插件激活时调用的方法
 * @param context 扩展上下文，用于注册命令和释放资源
 */
export function activate(context: vscode.ExtensionContext) {
  console.log(
    localize(
      "extension.activated",
      '恭喜，您的扩展 "ai-generate-commit" 已激活！'
    )
  );

  // 注册命令 'ai-generate-commit.generate'
  const disposable = vscode.commands.registerCommand(
    "ai-generate-commit.generate",
    async (...args: any[]) => {
      const git = getGitAPI();
      if (!git) {
        vscode.window.showErrorMessage(
          localize("git.extension.not.found", "未找到 Git 扩展")
        );
        return;
      }

      const repo = getSelectedRepository(git, args);
      if (!repo) {
        vscode.window.showErrorMessage(
          localize("git.repo.not.found", "未找到 Git 仓库")
        );
        return;
      }

      await generateCommitMessage(repo);
    }
  );

  // 注册命令 'ai-generate-commit.selectAndGenerate'
  const selectAndGenerateDisposable = vscode.commands.registerCommand(
    "ai-generate-commit.selectAndGenerate",
    async (...args: any[]) => {
      const git = getGitAPI();
      if (!git) {
        vscode.window.showErrorMessage(
          localize("git.extension.not.found", "未找到 Git 扩展")
        );
        return;
      }

      const repo = getSelectedRepository(git, args);
      if (!repo) {
        vscode.window.showErrorMessage(
          localize("git.repo.not.found", "未找到 Git 仓库")
        );
        return;
      }

      const providers = AIManager.getProviders();
      if (providers.length === 0) {
        vscode.window.showErrorMessage(
          localize("no.providers", "No AI providers configured.")
        );
        return;
      }

      const items: ModelQuickPickItem[] = [];
      for (const provider of providers) {
        items.push({
          label: provider.name,
          kind: vscode.QuickPickItemKind.Separator,
          providerId: provider.id,
          modelId: "",
        });
        for (const model of provider.models) {
          items.push({
            label: model.name || model.id,
            description: provider.name,
            providerId: provider.id,
            modelId: model.id,
          });
        }
      }

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: localize("select.model", "Select AI Model"),
      });

      if (selected) {
        await generateCommitMessage(repo, {
          providerId: selected.providerId,
          modelId: selected.modelId,
        });
      }
    }
  );

  // 注册命令 'ai-generate-commit.fetchModels'
  const fetchModelsDisposable = vscode.commands.registerCommand(
    "ai-generate-commit.fetchModels",
    async () => {
      const providers = AIManager.getProviders();
      const items = providers.map((p) => ({
        label: p.name,
        description: p.baseUrl,
        provider: p,
      }));
      items.push({
        label: "$(plus) New Provider",
        description: "Fetch from a new URL",
        provider: null as any,
      });

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a provider to fetch models for",
      });
      if (!selected) return;

      let provider = selected.provider;
      if (!provider) {
        const baseUrl = await vscode.window.showInputBox({
          prompt: "Enter Base URL (e.g. https://api.openai.com/v1)",
          value: "https://",
        });
        if (!baseUrl) return;
        const apiKey = await vscode.window.showInputBox({
          prompt: "Enter API Key",
          password: true,
        });
        if (!apiKey) return;

        provider = {
          id: "temp",
          name: "Temp",
          type: "openai-compatible",
          apiKey,
          baseUrl,
          models: [],
        };
      }

      try {
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
            if (selected.provider) {
              actions.push("Update Config");
            }

            const action = await vscode.window.showInformationMessage(
              `Found ${models.length} models.`,
              ...actions
            );

            if (action === "Copy to Clipboard") {
              await vscode.env.clipboard.writeText(
                JSON.stringify(models, null, 2)
              );
              vscode.window.showInformationMessage(
                "Models copied to clipboard."
              );
            } else if (action === "Update Config" && selected.provider) {
              const vsConfig =
                vscode.workspace.getConfiguration("ai-generate-commit");
              const config = vsConfig.get<any>("config") || {};
              const currentProviders = config.providers || [];
              const index = currentProviders.findIndex(
                (p: any) => p.id === selected.provider.id
              );
              if (index !== -1) {
                currentProviders[index].models = models.map((m: any) => m.id);
                await vsConfig.update(
                  "config",
                  { ...config, providers: currentProviders },
                  vscode.ConfigurationTarget.Global
                );
                vscode.window.showInformationMessage(
                  `Updated models for ${selected.provider.name}.`
                );
              }
            }
          }
        );
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Failed to fetch models: ${error.message}`
        );
      }
    }
  );

  // 注册命令 'ai-generate-commit.configure'
  const configureDisposable = vscode.commands.registerCommand(
    "ai-generate-commit.configure",
    () => {
      SettingsPanel.createOrShow(context.extensionUri);
    }
  );

  context.subscriptions.push(
    disposable,
    selectAndGenerateDisposable,
    fetchModelsDisposable,
    configureDisposable
  );
}

/**
 * 插件停用时调用的方法
 */
export function deactivate() {}
