# clipods

clipods: a multi-session launcher for Codex CLI (Tauri + React). Default UI language is Chinese; use the ZH/EN toggle near the logo to switch.

[中文](README.md)

## Core features

- Multi-account sessions: each session has its own `CODEX_HOME` and login type (Official/API).
- Terminal & IDE profiles: define launch command and arguments per tool.
- Import/Export: TOML config import/export for backup and sync.
- One-click launch: open terminal/IDE and jump to the session directory.
- Theme/Language: dark mode toggle and ZH/EN switch.
- Codex.app: supports multi-instance and per-session isolation (separate userDataDir).

## How to use

1. Create a session: set name, `CODEX_HOME`, and login type.
2. Terminal profile: enter app name or `.app` path (Terminal, iTerm2, `/Applications/Warp.app`); drag & drop supported.
3. IDE profile: enter app name or `.app` path (VS Code, Cursor, `/Applications/Cursor.app`).
4. Bind profiles: pick terminal/IDE for the session, then save.
5. Import/Export: use the toolbar to import/export TOML.
6. Session launch command: set `codex ...` command to run automatically on terminal launch.
7. Codex.app: optionally enable multi-instance and session isolation for parallel logins.
8. Help: the top-right “Help” shows first-run and update notes.

## Command & arguments

- Launch command uses macOS `open -a`, supports app name or `.app` path.
  - Examples: `Terminal`, `iTerm2`, `Wave`, `/Applications/Warp.app`
- Launch args: one per line, equivalent to `open -a App --args arg1 arg2`.
  - Example: `--reuse-window`
  - Placeholders: `{command}` for session launch command, `{cwd}` for session directory
- Wave: when selected and no args are set, it runs commands via `wsh run`.
- Terminal templates: built-in Terminal / iTerm2 / Wave / Ghostty presets.
- Environment variables: only terminal profiles support env vars, format `KEY=VALUE`.

## Session command notes

- The “launch command” runs when opening terminal and injects:
  - `CODEX_HOME` (session directory)
  - Session environment variables
- Builder supports interactive / resume / exec / exec & resume with in-UI hints.

## Dev & run

```bash
npm install
npm run dev
npm run tauri dev
```

> `npm run tauri dev` requires Rust toolchain via rustup.

## macOS first launch (unsigned app)

- If you see “developer cannot be verified”, open “System Settings → Privacy & Security” and click “Open Anyway”.
- Or right-click the app in Finder → Open.

## Config

- Config is stored under Tauri `appConfigDir()`.
- Sessions, terminals, IDEs are stored in TOML.
- Saving a session or opening terminal writes Codex config to `CODEX_HOME/config.toml`.
- API sessions write `CODEX_HOME/auth.json` with `OPENAI_API_KEY`.

## Updates (GitHub Releases)

1. Run `tauri signer generate` and replace `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.
2. Configure `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` in GitHub Actions secrets.
3. Upload `latest.json` following Tauri Updater spec.
4. Click “Check updates” in the app.

## Release builds (GitHub Actions)

- Publishing a GitHub Release (published) triggers macOS/Windows/Linux builds and uploads artifacts to that Release.
- For signing/auto-update, configure Tauri Updater signatures and `latest.json`.

## Local build & install (macOS)

```bash
npm run install:macos
```

If you see permission errors, run with `sudo`.

## Screenshots

![clipods](public/screenshot/screenshot_cn_1.jpg)
![clipods](public/screenshot/Jietu20260209-165010@2x.jpg)
![clipods](public/screenshot/Jietu20260209-165018@2x.jpg)
![clipods](public/screenshot/screenshot_en_1.jpg)
