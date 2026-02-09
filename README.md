# clipods

clipods：Codex CLI 多会话启动器（Tauri + React）。

## 核心能力

- 多账号会话：每个会话绑定独立的 `CODEX_HOME` 与登录方式（官方/API）。
- 终端与 IDE 配置：为不同工具定义启动命令与参数。
- 导入/导出：支持配置文件 TOML 导入导出。
- 一键启动：直接打开终端/IDE，并定位到会话目录。

## 使用指南

1. 新建会话：设置名称、`CODEX_HOME` 与登录方式（官方 / API）。
2. 终端配置：输入应用名称或 `.app` 路径（如 Terminal、iTerm2、`/Applications/Warp.app`），支持拖拽 `.app` 进输入框；可选参数与环境变量。
3. IDE 配置：输入应用名称或 `.app` 路径（如 VS Code、Cursor、`/Applications/Cursor.app`），可选启动参数。
4. 会话绑定：为会话选择终端/IDE 配置，保存后即可一键启动。
5. 导入导出：使用工具栏导入/导出 TOML，便于备份或多机同步。
6. 会话启动命令：在会话里填写 `codex ...` 启动命令，打开终端时自动执行。
7. 帮助入口：右上角“帮助”可查看首次启动与更新说明。

## 命令与参数说明

- 启动命令：使用 macOS `open -a`，支持**应用名**或**.app 路径**。
  - 例：`Terminal` / `iTerm2` / `Wave` / `/Applications/Warp.app`
- 启动参数：每行一个参数，等价于 `open -a 应用 --args 参数1 参数2`。
  - 例：`--reuse-window`
  - 占位符：`{command}` 表示会话启动命令，`{cwd}` 表示会话目录
- Wave：当终端为 Wave 且未填写启动参数时，会自动通过 `wsh run` 执行会话命令。
- 终端模板：内置 Terminal / iTerm2 / Wave 预设，选择后自动填充名称与启动命令。
- 环境变量：仅终端配置支持，格式 `KEY=VALUE`，每行一项。

## 会话命令说明

- 会话的“启动命令”会在打开终端时执行，并自动注入：
  - `CODEX_HOME`（对应会话目录）
  - 会话环境变量（每行 `KEY=VALUE`）
- 命令快捷生成支持交互/恢复/一次性执行/执行并恢复，并在界面显示说明与示例。
- 示例：
  - `codex --dangerously-bypass-approvals-and-sandbox`
  - `codex --dangerously-bypass-approvals-and-sandbox resume 019b8051-e853-7ac1-a58a-4b686e139b1c`

## 开发与运行

```bash
npm install
npm run dev
npm run tauri dev
```

> `npm run tauri dev` 需要 Rust 工具链（已在本地通过 rustup 安装）。

## macOS 首次启动说明（未签名）

- 第一次打开若提示“无法验证开发者”，请进入“系统设置 → 隐私与安全”，在提示旁点击“仍要打开”。
- 或在 Finder 中右键 App → 打开，再确认一次即可。

## 配置说明

- 配置文件保存在系统应用配置目录（由 Tauri `appConfigDir()` 决定）。
- 会话、终端、IDE 配置统一由 TOML 存储与加载。
- 保存会话/打开终端时，会在该会话的 `CODEX_HOME/config.toml` 写入 Codex CLI 配置，用于固定登录方式与模型相关设置，避免再次弹窗询问。
- 会话支持填写 `OPENAI_ORGANIZATION` / `OPENAI_PROJECT`，并可追加“高级自定义 TOML”（追加到会话配置末尾）。
- API 登录会话会写入 `CODEX_HOME/auth.json`（仅包含 `OPENAI_API_KEY`），以匹配中转/自定义 provider 的用法。

## 更新配置（GitHub Releases）

1. 生成更新签名并替换 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`。
2. 按 Tauri Updater 规范生成 `latest.json` 并上传到 GitHub Release。
3. 应用内点击“检查更新”即可从 GitHub 获取更新。

## Release 打包（GitHub Actions）

- 发布 GitHub Release（published）后，会自动触发 macOS/Windows/Linux 打包并上传到 Release 附件。
- 如需签名/自动更新，请配置 Tauri Updater 的签名与 `latest.json`。

## 截图

![clipods](public/screenshot/screenshot_cn_1.jpg)
![clipods](public/screenshot/Jietu20260209-165010@2x.jpg)
![clipods](public/screenshot/Jietu20260209-165018@2x.jpg)
![clipods](public/screenshot/screenshot_en_1.jpg)

## Documentation Rules

- Any structural change (new/removed/moved files or folders) must update the relevant `_README.md` in each affected directory.
- Any change to functionality, architecture, or coding conventions must update the related sub-docs in the same change set.

## English

clipods: a multi-session launcher for Codex CLI (Tauri + React). Default UI language is Chinese; use the ZH/EN toggle near the logo to switch.

### Core features

- Multi-account sessions: each session has its own `CODEX_HOME` and login type (Official/API).
- Terminal & IDE profiles: define launch command and arguments per tool.
- Import/Export: TOML config import/export for backup and sync.
- One-click launch: open terminal/IDE and jump to the session directory.
- Theme/Language: dark mode toggle and ZH/EN switch.

### How to use

1. Create a session: set name, `CODEX_HOME`, and login type.
2. Terminal profile: enter app name or `.app` path (Terminal, iTerm2, `/Applications/Warp.app`); drag & drop supported.
3. IDE profile: enter app name or `.app` path (VS Code, Cursor, `/Applications/Cursor.app`).
4. Bind profiles: pick terminal/IDE for the session, then save.
5. Import/Export: use the toolbar to import/export TOML.
6. Session launch command: set `codex ...` command to run automatically on terminal launch.
7. Help: the top-right “Help” shows first-run and update notes.

### Command & arguments

- Launch command uses macOS `open -a`, supports app name or `.app` path.
  - Examples: `Terminal`, `iTerm2`, `Wave`, `/Applications/Warp.app`
- Launch args: one per line, equivalent to `open -a App --args arg1 arg2`.
  - Example: `--reuse-window`
  - Placeholders: `{command}` for session launch command, `{cwd}` for session directory
- Wave: when selected and no args are set, it runs commands via `wsh run`.
- Terminal templates: built-in Terminal / iTerm2 / Wave presets.
- Environment variables: only terminal profiles support env vars, format `KEY=VALUE`.

### Session command notes

- The “launch command” runs when opening terminal and injects:
  - `CODEX_HOME` (session directory)
  - Session environment variables
- Builder supports interactive / resume / exec / exec & resume with in-UI hints.

### Dev & run

```bash
npm install
npm run dev
npm run tauri dev
```

> `npm run tauri dev` requires Rust toolchain via rustup.

### macOS first launch (unsigned app)

- If you see “developer cannot be verified”, open “System Settings → Privacy & Security” and click “Open Anyway”.
- Or right-click the app in Finder → Open.

### Config

- Config is stored under Tauri `appConfigDir()`.
- Sessions, terminals, IDEs are stored in TOML.
- Saving a session or opening terminal writes Codex config to `CODEX_HOME/config.toml`.
- API sessions write `CODEX_HOME/auth.json` with `OPENAI_API_KEY`.

### Updates (GitHub Releases)

1. Generate an updater signature and replace `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.
2. Upload `latest.json` following Tauri Updater spec.
3. Click “Check updates” in the app.

### Release builds (GitHub Actions)

- Publishing a GitHub Release (published) triggers macOS/Windows/Linux builds and uploads artifacts to that Release.
- For signing/auto-update, configure Tauri Updater signatures and `latest.json`.

### Screenshots

![clipods](public/screenshot/screenshot_cn_1.jpg)
![clipods](public/screenshot/Jietu20260209-165010@2x.jpg)
![clipods](public/screenshot/Jietu20260209-165018@2x.jpg)
![clipods](public/screenshot/screenshot_en_1.jpg)
