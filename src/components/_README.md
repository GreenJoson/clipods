# components - 目录说明

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| AccountCard.tsx | 核心 | 可复用账号短卡片（区分 ChatGPT/API，展示绑定能力并提供紧凑编辑/删除入口） |
| AccountEditor.tsx | 核心 | 可复用账号编辑弹窗（支持 Codex ChatGPT `auth.json`、Codex API、Claude API 凭据） |
| EmptyState.tsx | 基础 | 空状态提示组件 |
| Modal.tsx | 基础 | 通用弹窗容器（支持紧凑样式与多语言关闭） |
| ProfileCard.tsx | 核心 | 终端与 IDE 配置展示（支持多语言标签） |
| ProfileEditor.tsx | 核心 | 终端与 IDE 配置编辑弹窗（支持 .app 拖拽、Ghostty/Wave/iTerm/Terminal 模板、Ghostty 复合命令 zsh -lc 兼容与应用安装检测） |
| ProfileToolbar.tsx | 核心 | 终端与 IDE 配置工具栏（含多语言搜索提示） |
| SegmentTabs.tsx | 基础 | 顶部分段导航组件 |
| SessionCard.tsx | 核心 | 会话卡片展示与操作（含绑定账号摘要、客户端/终端/IDE 快速切换记忆、官方登录入口、Codex.app 参数与项目路径） |
| SessionEditor.tsx | 核心 | 会话创建与编辑弹窗（含 Codex/Claude 客户端切换、复用账号绑定、动态 HOME 文案、Codex/Claude 分流命令构建器〔Claude 对齐官方参数子集〕、Claude `settings.json` / `claude.json` 可选写入、Codex.app 设置、环境变量快捷填充/恢复与高级 TOML） |
| Toolbar.tsx | 核心 | 搜索与快捷操作栏（含多语言文案） |
