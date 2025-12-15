"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const i18n_1 = require("./utils/i18n");
const commands_1 = require("./commands");
/**
 * 插件激活时调用的方法
 */
function activate(context) {
    console.log((0, i18n_1.localize)("extension.activated", '恭喜，您的扩展 "CommitAgent" 已激活！'));
    const disposables = (0, commands_1.registerCommands)(context);
    context.subscriptions.push(...disposables);
}
/**
 * 插件停用时调用的方法
 */
function deactivate() { }
//# sourceMappingURL=extension.js.map