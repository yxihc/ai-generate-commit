# 项目结构

```
src/
├── extension.ts          # 入口文件，命令注册
├── services/
│   ├── ai-manager.ts     # 提供商/模型管理，LLM 客户端创建
│   ├── commit.ts         # 提交信息生成编排
│   └── generation.ts     # 流式文本生成逻辑
├── types/
│   ├── config.ts         # AIProvider、AIModel、AIConfig 接口定义
│   └── git.ts            # Git 扩展类型定义
├── utils/
│   ├── git.ts            # Git API 辅助函数，diff 获取
│   ├── i18n.ts           # 本地化配置
│   ├── logger.ts         # 输出通道日志
│   └── prompt.ts         # 提示词模板加载
└── webview/
    ├── html.ts           # Webview HTML 生成
    ├── settings-panel.ts # 设置面板控制器
    └── settings.html     # 设置界面模板

prompt/                   # 按语言区分的提示词模板
seeting-ui/                    # Webview 资源（Vue.js、HTML）
```

## 关键模式
- services 处理业务逻辑，utils 提供辅助函数
- types 单独放在一个目录
- Webview 设置面板使用 Vue.js
- 配置存储在 VS Code 工作区设置中，前缀为 `ai-generate-commit.*`
