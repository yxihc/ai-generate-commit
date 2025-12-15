import * as vscode from "vscode";

/**
 * 生成状态管理器 - 管理生成过程的状态和取消逻辑
 */
class GenerationStateManager {
  private _isGenerating = false;
  private _cancellationSource: vscode.CancellationTokenSource | null = null;

  get isGenerating(): boolean {
    return this._isGenerating;
  }

  get cancellationToken(): vscode.CancellationToken | undefined {
    return this._cancellationSource?.token;
  }

  /**
   * 开始生成，设置状态并创建取消令牌
   */
  start(): vscode.CancellationToken {
    this._isGenerating = true;
    this._cancellationSource = new vscode.CancellationTokenSource();
    vscode.commands.executeCommand(
      "setContext",
      "commitagent.isGenerating",
      true
    );
    return this._cancellationSource.token;
  }

  /**
   * 停止生成，触发取消
   */
  stop(): void {
    if (this._cancellationSource) {
      this._cancellationSource.cancel();
    }
  }

  /**
   * 重置状态（生成完成或取消后调用）
   */
  reset(): void {
    this._isGenerating = false;
    if (this._cancellationSource) {
      this._cancellationSource.dispose();
      this._cancellationSource = null;
    }
    vscode.commands.executeCommand(
      "setContext",
      "commitagent.isGenerating",
      false
    );
  }
}

export const GenerationState = new GenerationStateManager();
