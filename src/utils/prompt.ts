import * as vscode from "vscode";
import * as path from "path";
import { Logger } from "./logger";
import { FileUtils } from "./file";
import { RULE_DIR_NAMES, WORKSPACE_PROMPT_FILE } from "../app-config";
import { getDefaultPrompt } from "../prompt/sytem.prompt";
import { aicommitGeneratePrompt, CommitType } from "../prompt/aicommit.prompt";

export class PromptUtils {
  // ==================== 第一级：内置系统提示词 ====================
  /**
   * 获取内置提示词模板文件内容
   */
  private static getBuiltinPromptTemplate(language: string): string {
    const promptDir = path.join(__dirname, "../../prompt");
    const promptPath = path.join(promptDir, `${language}.md`);
    return FileUtils.readFile(promptPath) || "";
  }

  // ==================== 第二级：用户自定义提示词 ====================

  /**
   * 获取用户自定义提示词配置
   */
  private static getCustomPrompt(): string {
    const vsConfig = vscode.workspace.getConfiguration("commitagent");
    const config = vsConfig.get<any>("config") || {};
    return (config.customPrompt || "").trim();
  }

  // ==================== 第三级：工作区规则 ====================

  /**
   * 获取工作区规则目录下的所有 .md 文件内容
   */
  private static getWorkspaceRules(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return "";
    }

    const allContents: string[] = [];

    for (const folder of workspaceFolders) {
      for (const dirName of RULE_DIR_NAMES) {
        const rulesDir = path.join(folder.uri.fsPath, dirName);
        const contents = FileUtils.readFilesFromDir(rulesDir, ".md");
        allContents.push(...contents);
      }
    }

    return allContents.length > 0 ? `\n${allContents.join("\n")}\n` : "";
  }

  /**
   * 获取工作区 workspace.prompt.md 文件内容
   */
  public static getWorkspacePromptFile(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return "";
    }

    for (const folder of workspaceFolders) {
      for (const dirName of RULE_DIR_NAMES) {
        const promptPath = path.join(
          folder.uri.fsPath,
          dirName,
          WORKSPACE_PROMPT_FILE
        );
        const content = FileUtils.readFile(promptPath);
        if (content) {
          Logger.log(`Found ${WORKSPACE_PROMPT_FILE} in ${dirName}`);
          return content;
        }
      }
    }

    return "";
  }

  // ==================== 组合逻辑 ====================

  /**
   * 获取额外规则（工作区规则 > 自定义提示词）
   */
  private static getAdditionalRules(): string {
    // 1. 最高优先级：工作区 .commitagent-rules 目录
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
   * 获取用户配置的 commitType
   */
  private static getCommitType(): CommitType {
    const vsConfig = vscode.workspace.getConfiguration("commitagent");
    const config = vsConfig.get<any>("config") || {};
    const commitType = config.commitType || "";
    // 验证是否为有效的 CommitType
    if (
      commitType === "" ||
      commitType === "conventional" ||
      commitType === "gitmoji"
    ) {
      return commitType as CommitType;
    }
    return "";
  }

  /**
   * 获取纯系统提示词（不含 diff）
   */
  public static getFinllyPrompt(language: string): string {
    // 1. 最高优先级：工作区 .commitagent-rules 目录
    const workspaceRules = this.getWorkspaceRules();
    if (workspaceRules) {
      Logger.log("Using workspace rules as workspaceRules");
      return workspaceRules;
    }
    // 2. 次优先级：用户自定义提示词配置
    const customPrompt = this.getCustomPrompt();
    if (customPrompt) {
      Logger.log("Using custom prompt as customPrompt");
      return customPrompt;
    }
    // 3. 使用内置系统提示词（根据 commitType 生成）
    const commitType = this.getCommitType();

    if (!commitType) {
      return getDefaultPrompt(language);
    }
    const builtinPrompt = aicommitGeneratePrompt(language, 72, commitType);
    Logger.log(
      `Using builtin prompt with commitType: ${commitType || "default"}`
    );
    return builtinPrompt;
  }
}
