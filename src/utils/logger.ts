import * as vscode from "vscode";

// 发布时设置为 false 禁用日志
const DEBUG_MODE = false;

export class Logger {
  private static _outputChannel: vscode.OutputChannel;

  public static get outputChannel(): vscode.OutputChannel {
    if (!this._outputChannel) {
      this._outputChannel = vscode.window.createOutputChannel("CommitAgent");
    }
    return this._outputChannel;
  }

  public static log(message: string): void {
    if (!DEBUG_MODE) {
      return;
    }
    this.outputChannel.appendLine(
      `[${new Date().toLocaleTimeString()}] ${message}`
    );
  }

  public static show(): void {
    if (!DEBUG_MODE) {
      return;
    }
    this.outputChannel.show();
  }
}
