import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "./logger";

export class PromptUtils {
  private static getWorkspaceRules(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return "";
    }

    let rulesContent = "";
    const ruleDirNames = [
      ".ai-generate-commit-rules",
      ".ai-genrate-commit-rules",
    ];

    for (const folder of workspaceFolders) {
      for (const dirName of ruleDirNames) {
        const rulesDir = path.join(folder.uri.fsPath, dirName);
        if (fs.existsSync(rulesDir) && fs.statSync(rulesDir).isDirectory()) {
          try {
            const files = fs.readdirSync(rulesDir);
            const mdFiles = files.filter((file) => file.endsWith(".md"));

            for (const file of mdFiles) {
              const filePath = path.join(rulesDir, file);
              const content = fs.readFileSync(filePath, "utf-8");
              if (content.trim()) {
                rulesContent += `\n${content.trim()}\n`;
              }
            }
          } catch (error) {
            Logger.log(`Error reading rules from ${rulesDir}: ${error}`);
          }
        }
      }
    }

    return rulesContent;
  }

  /**
   * 获取用户自定义提示词配置
   */
  private static getCustomPrompt(): string {
    const vsConfig = vscode.workspace.getConfiguration("ai-generate-commit");
    const config = vsConfig.get<any>("config") || {};
    return (config.customPrompt || "").trim();
  }

  /**
   * 获取系统内置提示词模板
   */
  private static getSystemPrompt(language: string): string {
    try {
      const promptDir = path.join(__dirname, "../../prompt");
      const promptPath = path.join(promptDir, `${language}.md`);

      if (fs.existsSync(promptPath)) {
        return fs.readFileSync(promptPath, "utf-8");
      }
    } catch (error) {
      Logger.log(
        `Error reading prompt file for language ${language}: ${error}`
      );
    }

    // Fallback default prompt
    return `You are a helpful assistant that generates conventional commit messages based on git diffs.
Please generate a commit message for the following diff.
The commit message should follow the Conventional Commits specification.
Only return the commit message, no other text.

Diff:
\${diff}`;
  }

  /**
   * 获取额外规则（工作区规则 > 自定义提示词）
   */
  private static getAdditionalRules(): string {
    // 1. 最高优先级：工作区 .ai-generate-commit-rules 目录
    const workspaceRules = this.getWorkspaceRules();
    if (workspaceRules) {
      Logger.log("Using workspace rules as additional instructions");
      return workspaceRules;
    }

    // 2. 次优先级：用户自定义提示词配置
    const customPrompt = this.getCustomPrompt();
    if (customPrompt) {
      Logger.log("Using custom prompt as additional instructions");
      return customPrompt;
    }

    return "";
  }

  /**
   * 获取完整提示词
   * 系统提示词始终使用内置模板，工作区规则/自定义提示词作为额外指令附加
   */
  public static getPrompt(language: string, diff: string): string {
    const systemPrompt = this.getSystemPrompt(language);
    const additionalRules = this.getAdditionalRules();

    let finalPrompt = systemPrompt;

    // 如果有额外规则，附加到系统提示词中
    if (additionalRules) {
      finalPrompt = `${systemPrompt}\n\n## Additional Rules\n${additionalRules}`;
    }

    Logger.log(`Using system prompt for language: ${language}`);
    if (additionalRules) {
      Logger.log("Additional rules applied");
    }

    return finalPrompt.replace("${diff}", diff);
  }
}
