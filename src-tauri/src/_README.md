# src - Tauri 后端源码

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| lib.rs | 核心 | 命令与启动逻辑（launcher、Wave/Ghostty 兼容启动与失败保活、IDE 环境变量临时脚本注入与新实例控制、Codex.app 启动、CODEX_HOME 归一化、配置/auth/AGENTS/global-state 写入、终端检测与更新插件） |
| main.rs | 核心 | Tauri 进程入口 |
