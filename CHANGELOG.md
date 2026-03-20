# Changelog

All notable changes to this project are documented in this file.

## 0.2.10 - 2026-03-20

### Changed

- 账号列表改为更紧凑的短卡片布局，减少留白并收敛操作区宽高。
- 账号卡片状态标签与类型徽章重新整理为更适合列表浏览的横向信息结构。
- Unified app version to `0.2.10` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.9 - 2026-03-02

### Added

- Claude 会话新增可选配置写入：
  - `settings.json`（支持自动生成或 JSON 覆盖）
  - `claude.json`（支持开关与 JSON 覆盖）
- 新增 `claudeConfig` 生成服务与对应测试覆盖。

### Changed

- 保存会话、打开终端、打开 IDE、登录时，Claude 会话会自动尝试写入上述配置文件。
- 相关状态提示与中英文文案补全（含 Claude 配置写入失败提示）。
- Codex API 默认 feature 注入迁移到 `features.multi_agent`，移除旧的 `collab/collaboration_modes/steer` 注入，避免新版 CLI 弃用告警。
- Unified app version to `0.2.9` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.8 - 2026-03-01

### Added

- Session-level client switch: `Codex CLI` / `Claude Code`.
- Session card now displays active client type.

### Changed

- Runtime behavior now branches by client type to avoid applying Codex-only config/auth writes to Claude sessions.
- Unified app version to `0.2.8` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.5 - 2026-02-10

### Fixed

- API login session now gets default collaboration features in generated `config.toml` to avoid non-realtime behavior (with conflict guard when user already defines `[features]` in advanced TOML).
- IDE launch now opens the project path parsed from session `launchCommand --cd` instead of opening `CODEX_HOME`.

### Added

- Session model parser for extracting project path from `launchCommand`.
- Test coverage for API default feature injection and project-path parsing.

### Changed

- Unified app version to `0.2.5` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.4 - 2026-02-10

### Added

- Session card now supports quick IDE profile switching with immediate persistence.

### Changed

- Session quick-switch now covers both terminal and IDE profiles.
- IDE launch now injects session-level `CODEX_HOME` and environment variables for isolation.
- Unified app version to `0.2.4` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.3 - 2026-02-10

### Fixed

- Ghostty terminal launch now supports composite commands reliably by using shell wrapping.
- Added backend compatibility for legacy Ghostty args (`-e {command}`) and invalid shell fallback.

### Added

- Ghostty launch compatibility tests in Rust unit tests.

### Changed

- Unified app version to `0.2.3` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

## 0.2.2 - 2026-02-09

### Added

- Runtime defaults self-heal for each session `CODEX_HOME`:
  - `AGENTS.md`
  - `.codex-global-state.json`
- Documentation for Codex.app multi-instance troubleshooting.
- Security notes for `auth.json` and API key handling.

### Changed

- Unified app version to `0.2.2` in:
  - `package.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`

### Notes

- Local `npm run install:macos` is for unsigned local installation.
- Signed Release builds require:
- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
