# Changelog

All notable changes to this project are documented in this file.

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
