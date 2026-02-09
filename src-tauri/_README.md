# src-tauri - Tauri 后端与构建

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| Cargo.toml | 核心 | Rust 依赖与构建配置（含插件） |
| build.rs | 核心 | Tauri 构建脚本 |
| tauri.conf.json | 核心 | Tauri 应用配置（含托盘、Updater endpoint 与签名公钥） |
| capabilities | 配置 | 权限能力声明 |
| icons | 资源 | 应用图标资源 |
| icons_backup | 资源 | 图标备份 |
| src | 核心 | Rust 业务代码（含 Codex.app 启动指令） |
| .gitignore | 配置 | Tauri 子项目忽略规则 |
