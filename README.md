# clipods

clipods：Codex CLI 多会话启动器（Tauri + React）。

[English](README.en.md)
[更新日志](CHANGELOG.md)

## 核心能力

- 多账号会话：每个会话绑定独立的 `CODEX_HOME` 与登录方式（官方/API）。
- 可复用账号池：支持保存 Codex ChatGPT `auth.json`、Codex API Key，以及 Claude API 凭据，并按会话一键绑定切换。
- 终端与 IDE 配置：为不同工具定义启动命令与参数。
- 导入/导出：支持配置文件 TOML 导入导出。
- 一键启动：直接打开终端/IDE，并定位到会话目录（IDE 启动优先按 `launchCommand --cd` 打开项目目录，并注入会话级 `CODEX_HOME` 与环境变量）。
- Codex.app：支持多开与多会话隔离（独立 userDataDir），便于并行登录/切换。
- 会话内切换：可在会话卡片直接切换终端/IDE 配置，并自动记忆为该会话默认配置。
- 运行时自愈：启动前自动补齐会话目录中的 `AGENTS.md` 与 `.codex-global-state.json`（避免部分实例缺少实时过程提示）。

## 0.2.10 更新重点

- 账号页改成更短、更紧凑的横向卡片，减少大面积空白。
- 类型徽章、能力标签和编辑/删除操作重新编排，更适合快速浏览多个账号。
- 同步版本到 `package.json` / `Cargo.toml` / `tauri.conf.json`（统一 `0.2.10`）。

## 0.2.5 更新重点

- API 会话自动补齐协作能力配置（`features.collab/unified_exec/...`），减少“只回最终结果、不显示实时过程”的问题。
- 若会话高级 TOML 已自定义 `[features]`，不再重复注入，避免配置冲突。
- 点击“打开 IDE”会优先解析 `launchCommand --cd` 并打开该项目目录，不再默认打开 `CODEX_HOME`。
- 同步版本到 `package.json` / `Cargo.toml` / `tauri.conf.json`（统一 `0.2.5`）。

## 0.2.4 更新重点

- 会话卡片支持 IDE 快速切换并自动记忆。
- 会话内快速切换能力覆盖终端与 IDE。
- IDE 启动注入会话级 `CODEX_HOME` 与环境变量，降低跨会话串用风险。
- 同步版本到 `package.json` / `Cargo.toml` / `tauri.conf.json`（统一 `0.2.4`）。

## 0.2.3 更新重点

- 修复 Ghostty 终端对复合命令的执行兼容：统一走 shell 包装执行。
- 兼容历史 Ghostty 参数（`-e {command}`）并在 shell 不可用时自动回退。
- 同步版本到 `package.json` / `Cargo.toml` / `tauri.conf.json`（统一 `0.2.3`）。

## 0.2.2 更新重点

- 新增会话运行时默认文件自愈：`AGENTS.md`、`.codex-global-state.json`。
- 保持 `Codex.app` 多开隔离链路完整：`CODEX_HOME` + `userDataDir` 组合启动。
- 同步版本到 `package.json` / `Cargo.toml` / `tauri.conf.json`（统一 `0.2.2`）。

## 多开/隔离排障（Codex.app）

当你发现“一个实例有实时过程，另一个实例没有”时，按下面顺序检查：

1. 每个会话必须有独立 `CODEX_HOME`，且不要复用历史污染目录。
2. `Codex.app` 多开时建议显式配置独立 `userDataDir`。
3. 检查会话目录是否存在这些文件：
   - `AGENTS.md`
   - `.codex-global-state.json`
   - `config.toml`
   - API 登录场景下还应有 `auth.json`
4. 在会话卡片确认启动参数包含 `--user-data-dir <路径>`。
5. 若仅老实例异常：新建干净 `CODEX_HOME` 绑定到该会话，再次启动验证。

常用自检命令（示例）：

```bash
ls -la <CODEX_HOME>
cat <CODEX_HOME>/.codex-global-state.json
```

## 使用指南

1. 新建账号：先在“账号”页保存可复用凭据。Codex 支持 ChatGPT `auth.json` / API，Claude 支持 API 凭据复用。
2. 新建会话：设置名称、`CODEX_HOME` / `CLAUDE_HOME`、客户端与登录方式（官方 / API）。
3. 会话绑定账号：在会话编辑器里选择“复用账号”，启动前会自动把认证投影到该会话目录。
4. 终端配置：输入应用名称或 `.app` 路径（如 Terminal、iTerm2、`/Applications/Warp.app`），支持拖拽 `.app` 进输入框；可选参数与环境变量。
5. IDE 配置：输入应用名称或 `.app` 路径（如 VS Code、Cursor、`/Applications/Cursor.app`），可选启动参数。
6. 导入导出：使用工具栏导入/导出 TOML，便于备份或多机同步。
7. 会话启动命令：在会话里填写 `codex ...` / `claude ...` 启动命令，打开终端时自动执行。
8. Codex.app：可选开启多开与多会话隔离，适合同时登录多个账号。
9. 帮助入口：右上角“帮助”可查看首次启动与更新说明。
10. 官方登录：未绑定账号的 Codex/Claude 会话点击“官方登录”会优先拉起终端执行登录链路（`codex` / `claude login`），若失败回退浏览器登录页。

## 命令与参数说明

- 启动命令：使用 macOS `open -a`，支持**应用名**或**.app 路径**。
  - 例：`Terminal` / `iTerm2` / `Wave` / `/Applications/Warp.app`
- 启动参数：每行一个参数，等价于 `open -a 应用 --args 参数1 参数2`。
  - 例：`--reuse-window`
  - 占位符：`{command}` 表示会话启动命令，`{cwd}` 表示会话目录
- Wave：当终端为 Wave 且未填写启动参数时，会自动通过 `wsh run` 执行会话命令。
- Ghostty：默认通过 shell 包装执行会话命令，兼容 `cd/export/codex ...` 复合命令。
- 终端模板：内置 Terminal / iTerm2 / Wave / Ghostty 预设，选择后自动填充名称与启动命令。
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
- 若会话绑定了可复用账号，启动前会优先把账号认证投影到目标 `CODEX_HOME/auth.json` 或 Claude `ANTHROPIC_*` 环境变量。
- 会话支持填写 `OPENAI_ORGANIZATION` / `OPENAI_PROJECT`，并可追加“高级自定义 TOML”（追加到会话配置末尾）。
- API 登录会话会写入 `CODEX_HOME/auth.json`（仅包含 `OPENAI_API_KEY`），以匹配中转/自定义 provider 的用法。

## 安全说明（API Key）

- `auth.json` 仅用于本地会话登录，不应提交到 Git 仓库或共享目录。
- 建议将会话目录权限设为当前用户可读写（避免多人机器泄漏）。
- 若怀疑泄漏，请立即轮换 `OPENAI_API_KEY` 并更新会话配置。

## 本地打包与安装（macOS）

```bash
npm run install:macos
```

如提示权限不足，请使用 `sudo`。

## Release 签名与更新

- `npm run install:macos` 是本地未签名安装路径，适合本机验证。
- GitHub Release 构建使用工作流签名（需配置 `TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`）。
- 自动更新依赖 `latest.json` 与 `tauri.conf.json` 中的 `updater.endpoints`、`updater.pubkey` 一致。

## 截图

![clipods](public/screenshot/screenshot_cn_1.jpg)
![clipods](public/screenshot/Jietu20260209-165010@2x.jpg)
![clipods](public/screenshot/Jietu20260209-165018@2x.jpg)

## Documentation Rules

- Any structural change (new/removed/moved files or folders) must update the relevant `_README.md` in each affected directory.
- Any change to functionality, architecture, or coding conventions must update the related sub-docs in the same change set.
