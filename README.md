# codex-launcher

Codex CLI 多会话启动器（Tauri + React）。

## 核心能力

- 多账号会话：每个会话绑定独立的 `CODEX_HOME` 与登录方式（官方/API）。
- 终端与 IDE 配置：为不同工具定义启动命令与参数。
- 导入/导出：支持配置文件 TOML 导入导出。
- 一键启动：直接打开终端/IDE，并定位到会话目录。

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
