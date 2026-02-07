# codex-launcher

Codex CLI 多会话启动器（Tauri + React）。

## 核心能力

- 多账号会话：每个会话绑定独立的 `CODEX_HOME` 与登录方式（官方/API）。
- 终端与 IDE 配置：为不同工具定义启动命令与参数。
- 导入/导出：支持配置文件 TOML 导入导出。
- 一键启动：直接打开终端/IDE，并定位到会话目录。

## 使用指南

1. 新建会话：设置名称、`CODEX_HOME` 与登录方式（官方 / API）。
2. 终端配置：添加终端命令（如 Terminal、iTerm2、Wave），可选参数与环境变量。
3. IDE 配置：添加 IDE 命令（如 VS Code、Cursor、Antigravity），可选启动参数。
4. 会话绑定：为会话选择终端/IDE 配置，保存后即可一键启动。
5. 导入导出：使用工具栏导入/导出 TOML，便于备份或多机同步。

## 开发与运行

```bash
npm install
npm run dev
npm run tauri dev
```

> `npm run tauri dev` 需要 Rust 工具链（已在本地通过 rustup 安装）。

## 配置说明

- 配置文件保存在系统应用配置目录（由 Tauri `appConfigDir()` 决定）。
- 会话、终端、IDE 配置统一由 TOML 存储与加载。

## Documentation Rules

- Any structural change (new/removed/moved files or folders) must update the relevant `_README.md` in each affected directory.
- Any change to functionality, architecture, or coding conventions must update the related sub-docs in the same change set.
