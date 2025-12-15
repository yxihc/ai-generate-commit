import * as vscode from "vscode";
import { Repository } from "../types/git";
import { localize } from "../utils/i18n";
import { getDiff } from "../utils/git";
import { Logger } from "../utils/logger";
import { generateCommitMessageStream } from "./generation";
import { GenerationState } from "./generation-state";

/**
 * 处理生成提交信息的逻辑
 * @param repo Git 仓库实例
 * @param options 可选的生成选项（指定提供商和模型）
 */
export async function generateCommitMessage(
  repo: Repository,
  options?: { providerId?: string; modelId?: string }
): Promise<void> {
  // 如果正在生成中，不重复执行
  if (GenerationState.isGenerating) {
    return;
  }

  // 开始生成，获取取消令牌
  const cancellationToken = GenerationState.start();

  // 在源代码管理 (Source Control) 面板显示进度条
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.SourceControl,
      title: localize("ai.processing", "AI 正在处理..."),
    },
    async (progress) => {
      try {
        // 第一阶段：读取输入
        progress.report({
          message: localize("reading.input", "正在读取输入..."),
        });

        // 获取 diff 信息
        const { staged, working } = await getDiff(repo);

        // 显示输出面板并记录日志
        Logger.show();
        Logger.log("=== Start Generating Commit Message ===");
        Logger.log(`Staged Diff Length: ${staged.length}`);
        Logger.log(`Working Diff Length: ${working.length}`);

        if (staged) {
          Logger.log("Staged Diff Content:");
          Logger.log(staged);
        }

        if (working) {
          Logger.log("Working Diff Content:");
          Logger.log(working);
        }

        const diffToProcess = `${working} ${staged}`;

        if (!diffToProcess) {
          Logger.log("No changes detected.");
          vscode.window.showInformationMessage(
            localize("no.changes", "No changes detected.")
          );
          return;
        }

        // 第二阶段：生成提交信息
        progress.report({
          message: localize("generating.commit", "正在生成提交信息..."),
        });

        let accumulatedMessage = "";

        // 如果输入框不为空，先保留原有内容并添加换行
        // if (currentText.trim()) {
        //   accumulatedMessage = `${currentText}\n\n`;
        //   repo.inputBox.value = accumulatedMessage;
        // }

        await generateCommitMessageStream(
          diffToProcess,
          (chunk) => {
            accumulatedMessage += chunk;
            repo.inputBox.value = accumulatedMessage;
          },
          options,
          cancellationToken
        );

        Logger.log("Generated Commit Message:");
        Logger.log(accumulatedMessage);
      } catch (error: any) {
        // 用户取消时不显示错误
        if (error instanceof vscode.CancellationError) {
          Logger.log("Generation cancelled by user.");
          return;
        }
        Logger.log(`Error: ${error.message}`);
        vscode.window.showErrorMessage(error.message);
      } finally {
        // 无论成功、失败还是取消，都重置状态
        GenerationState.reset();
      }
    }
  );
}
