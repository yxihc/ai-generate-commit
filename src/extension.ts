import * as vscode from "vscode";
import { localize } from "./utils/i18n";
import { registerCommands } from "./commands";

/**
 * 插件激活时调用的方法
 */
export function activate(context: vscode.ExtensionContext) {
  console.log(
    localize(
      "extension.activated",
      '恭喜，您的扩展 "CommitAgent" 已激活！'
    )
  );

  const disposables = registerCommands(context);
  context.subscriptions.push(...disposables);
}

/**
 * 插件停用时调用的方法
 */
export function deactivate() {}
