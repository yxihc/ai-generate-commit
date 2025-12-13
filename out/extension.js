"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const i18n_1 = require("./utils/i18n");
const git_1 = require("./utils/git");
const commit_1 = require("./services/commit");
const ai_manager_1 = require("./services/ai-manager");
const settings_panel_1 = require("./webview/settings-panel");
/**
 * 插件激活时调用的方法
 * @param context 扩展上下文，用于注册命令和释放资源
 */
function activate(context) {
    console.log((0, i18n_1.localize)("extension.activated", '恭喜，您的扩展 "ai-generate-commit" 已激活！'));
    // 注册命令 'ai-generate-commit.generate'
    const disposable = vscode.commands.registerCommand("ai-generate-commit.generate", async (...args) => {
        const git = (0, git_1.getGitAPI)();
        if (!git) {
            vscode.window.showErrorMessage((0, i18n_1.localize)("git.extension.not.found", "未找到 Git 扩展"));
            return;
        }
        const repo = (0, git_1.getSelectedRepository)(git, args);
        if (!repo) {
            vscode.window.showErrorMessage((0, i18n_1.localize)("git.repo.not.found", "未找到 Git 仓库"));
            return;
        }
        await (0, commit_1.generateCommitMessage)(repo);
    });
    // 注册命令 'ai-generate-commit.selectAndGenerate'
    const selectAndGenerateDisposable = vscode.commands.registerCommand("ai-generate-commit.selectAndGenerate", async (...args) => {
        const git = (0, git_1.getGitAPI)();
        if (!git) {
            vscode.window.showErrorMessage((0, i18n_1.localize)("git.extension.not.found", "未找到 Git 扩展"));
            return;
        }
        const repo = (0, git_1.getSelectedRepository)(git, args);
        if (!repo) {
            vscode.window.showErrorMessage((0, i18n_1.localize)("git.repo.not.found", "未找到 Git 仓库"));
            return;
        }
        const providers = ai_manager_1.AIManager.getProviders();
        if (providers.length === 0) {
            vscode.window.showErrorMessage((0, i18n_1.localize)("no.providers", "No AI providers configured."));
            return;
        }
        const items = [];
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
            placeHolder: (0, i18n_1.localize)("select.model", "Select AI Model"),
        });
        if (selected) {
            await (0, commit_1.generateCommitMessage)(repo, {
                providerId: selected.providerId,
                modelId: selected.modelId,
            });
        }
    });
    // 注册命令 'ai-generate-commit.fetchModels'
    const fetchModelsDisposable = vscode.commands.registerCommand("ai-generate-commit.fetchModels", async () => {
        const providers = ai_manager_1.AIManager.getProviders();
        const items = providers.map((p) => ({
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
        if (!selected)
            return;
        let provider = selected.provider;
        if (!provider) {
            const baseUrl = await vscode.window.showInputBox({
                prompt: "Enter Base URL (e.g. https://api.openai.com/v1)",
                value: "https://",
            });
            if (!baseUrl)
                return;
            const apiKey = await vscode.window.showInputBox({
                prompt: "Enter API Key",
                password: true,
            });
            if (!apiKey)
                return;
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
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Fetching models...",
                cancellable: false,
            }, async () => {
                const models = await ai_manager_1.AIManager.fetchModels(provider);
                if (models.length === 0) {
                    vscode.window.showInformationMessage("No models found.");
                    return;
                }
                const actions = ["Copy to Clipboard"];
                if (selected.provider) {
                    actions.push("Update Config");
                }
                const action = await vscode.window.showInformationMessage(`Found ${models.length} models.`, ...actions);
                if (action === "Copy to Clipboard") {
                    await vscode.env.clipboard.writeText(JSON.stringify(models, null, 2));
                    vscode.window.showInformationMessage("Models copied to clipboard.");
                }
                else if (action === "Update Config" && selected.provider) {
                    const vsConfig = vscode.workspace.getConfiguration("ai-generate-commit");
                    const config = vsConfig.get("config") || {};
                    const currentProviders = config.providers || [];
                    const index = currentProviders.findIndex((p) => p.id === selected.provider.id);
                    if (index !== -1) {
                        currentProviders[index].models = models.map((m) => m.id);
                        await vsConfig.update("config", { ...config, providers: currentProviders }, vscode.ConfigurationTarget.Global);
                        vscode.window.showInformationMessage(`Updated models for ${selected.provider.name}.`);
                    }
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch models: ${error.message}`);
        }
    });
    // 注册命令 'ai-generate-commit.configure'
    const configureDisposable = vscode.commands.registerCommand("ai-generate-commit.configure", () => {
        settings_panel_1.SettingsPanel.createOrShow(context.extensionUri);
    });
    context.subscriptions.push(disposable, selectAndGenerateDisposable, fetchModelsDisposable, configureDisposable);
}
/**
 * 插件停用时调用的方法
 */
function deactivate() { }
//# sourceMappingURL=extension.js.map