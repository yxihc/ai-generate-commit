import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  const htmlPath = vscode.Uri.joinPath(
    extensionUri,
    "seeting-ui",
    "settings.html"
  );
  let htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");

  const vuePath = vscode.Uri.joinPath(extensionUri, "seeting-ui", "vue.js");
  const vueUri = webview.asWebviewUri(vuePath);

  htmlContent = htmlContent.replace("{{vueUri}}", vueUri.toString());

  return htmlContent;
}
