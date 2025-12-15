import * as vscode from "vscode";
import { AIManager } from "../services/ai-manager";
import { getWebviewContent } from "./html";
import { providerTypes } from "../types/config";

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.html = getWebviewContent(
      this._panel.webview,
      this._extensionUri
    );

    this._setWebviewMessageListener(this._panel.webview);
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it.
    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel._panel.reveal(column);
      return;
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      "aiGenerateCommitSettings",
      "AI Commit Settings",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "seeting-ui")],
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message: any) => {
        switch (message.command) {
          case "get-config":
            this._sendConfig(webview);
            break;
          case "save-config":
            try {
              await this._saveConfig(message.data);
              webview.postMessage({ command: "save-success" });
              vscode.window.showInformationMessage("Configuration saved!");
            } catch (error: any) {
              webview.postMessage({
                command: "save-error",
                error: error.message,
              });
              vscode.window.showErrorMessage(
                "Failed to save: " + error.message
              );
            }
            break;
          case "fetch-models":
            await this._fetchModels(webview, message.data, message.forManage);
            break;
        }
      },
      undefined,
      this._disposables
    );
  }

  private _sendConfig(webview: vscode.Webview) {
    const vsConfig = vscode.workspace.getConfiguration("ai-generate-commit");
    const config = vsConfig.get<any>("config") || {};
    // 获取 VS Code 界面语言
    const uiLanguage = vscode.env.language;

    webview.postMessage({
      command: "config-data",
      data: {
        providers: config.providers || [],
        defaultProviderName: config.defaultProviderName || "",
        defaultModel: config.defaultModel || "",
        language: config.language || "zh-CN",
        commitType: config.commitType || "",
        customPrompt: config.customPrompt || "",
        uiLanguage,
        providerTypes: [...providerTypes],
      },
    });
  }

  private async _saveConfig(data: any) {
    const vsConfig = vscode.workspace.getConfiguration("ai-generate-commit");
    await vsConfig.update(
      "config",
      {
        providers: data.providers,
        defaultProviderName: data.defaultProviderName,
        defaultModel: data.defaultModel,
        language: data.language,
        commitType: data.commitType,
        customPrompt: data.customPrompt,
      },
      vscode.ConfigurationTarget.Global
    );
  }

  private async _fetchModels(
    webview: vscode.Webview,
    provider: any,
    forManage?: boolean
  ) {
    try {
      const models = await AIManager.fetchModels(provider);
      webview.postMessage({
        command: "fetch-success",
        data: {
          providerId: provider.id,
          models: models,
          forManage: !!forManage,
        },
      });
      if (!forManage) {
        vscode.window.showInformationMessage(
          `Fetched ${models.length} models for ${provider.name}`
        );
      }
    } catch (error: any) {
      webview.postMessage({
        command: "fetch-error",
        data: { forManage: !!forManage },
        error: error.message,
      });
      vscode.window.showErrorMessage(
        `Failed to fetch models: ${error.message}`
      );
    }
  }
}
