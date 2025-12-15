import * as vscode from "vscode";
import { handleGenerate } from "./generate";
import { handleSelectAndGenerate } from "./select-and-generate";
import { handleFetchModels } from "./fetch-models";
import { SettingsPanel } from "../webview/settings-panel";
import { GenerationState } from "../services/generation-state";

interface CommandDefinition {
  id: string;
  handler: (...args: any[]) => Promise<void> | void;
}

/**
 * 注册所有命令
 */
export function registerCommands(
  context: vscode.ExtensionContext
): vscode.Disposable[] {
  const commands: CommandDefinition[] = [
    {
      id: "commitagent.generate",
      handler: handleGenerate,
    },
    {
      id: "commitagent.stopGenerate",
      handler: () => GenerationState.stop(),
    },
    {
      id: "commitagent.selectAndGenerate",
      handler: handleSelectAndGenerate,
    },
    {
      id: "commitagent.fetchModels",
      handler: handleFetchModels,
    },
    {
      id: "commitagent.configure",
      handler: () => SettingsPanel.createOrShow(context.extensionUri),
    },
  ];

  return commands.map((cmd) =>
    vscode.commands.registerCommand(cmd.id, cmd.handler)
  );
}
