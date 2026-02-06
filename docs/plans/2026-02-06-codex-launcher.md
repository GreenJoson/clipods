# Codex Multi-Session Launcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a macOS Tauri GUI launcher that isolates Codex CLI sessions (ChatGPT/API), supports multiple accounts, import/export, tray, and IDE/terminal launchers.

**Architecture:** Tauri 2 desktop app with React + TS frontend. Local config stored in app config dir as TOML, managed by a config service and model layer. Backend commands (Rust) handle terminal/IDE launching and OS-specific operations; UI uses block/component structure and theme variables for styling.

**Tech Stack:** Tauri 2, React, TypeScript, Vite, Rust, TOML config, Vitest, @tauri-apps/plugin-shell/dialog/fs.

---

### Task 1: Scaffold the Tauri app and base structure

**Files:**
- Create: `package.json` (via scaffold)
- Create: `src-tauri/` (via scaffold)
- Create: `src/` (via scaffold)

**Step 1: Run scaffold command**
Run: `npm create tauri-app@latest codex-launcher -- --template react-ts`
Expected: New project at `codex-launcher/` with Vite + Tauri 2 setup.

**Step 2: Initialize base folders**
Create: `src/services`, `src/models`, `src/components`, `src/blocks`, `src/hooks`, `src/types`, `src/styles`, `src/utils`, `docs`, `docs/plans`.

**Step 3: Add folder _README.md files**
Create `_README.md` in each newly created folder per spec.

**Step 4: Commit**
Run: `git add . && git commit -m "chore: scaffold tauri launcher"`

---

### Task 2: Add theme system and typography

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/main.tsx`
- Modify: `src/index.css`
- Create: `src/styles/_README.md`

**Step 1: Write theme variables**
Add CSS variables (color, spacing, radius, shadow) and a gradient background base.

**Step 2: Wire fonts and base styles**
Import display + body fonts; apply base layout and motion helpers.

**Step 3: Manual check**
Run: `npm install && npm run dev` and confirm the app loads with the base theme.

**Step 4: Commit**
Run: `git add . && git commit -m "feat: add theme system"`

---

### Task 3: Define config models and TOML IO service (with tests)

**Files:**
- Create: `src/types/config.ts`
- Create: `src/models/session.ts`
- Create: `src/services/configService.ts`
- Create: `src/utils/paths.ts`
- Create: `src/utils/toml.ts`
- Create: `src/services/__tests__/configService.test.ts`

**Step 1: Write failing test for config round-trip**
Use Vitest to assert that a sample config can be serialized and parsed without loss.

**Step 2: Run test to verify failure**
Run: `npm run test -- configService`
Expected: FAIL with missing module/functions.

**Step 3: Implement config types + service**
Define interfaces for sessions, terminals, IDE profiles; implement load/save with TOML.

**Step 4: Run test to verify pass**
Run: `npm run test -- configService`
Expected: PASS.

**Step 5: Commit**
Run: `git add . && git commit -m "feat: add config models and TOML service"`

---

### Task 4: Tauri backend commands for launchers + tray

**Files:**
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json5` (or TOML if supported)

**Step 1: Add plugins**
Enable shell, fs, and dialog plugins.

**Step 2: Implement Rust commands**
Add commands: `launch_terminal`, `launch_ide`, `ensure_codex_home` (mkdir), `reveal_path`.

**Step 3: Manual check**
Run: `npm run tauri dev` and verify commands can be invoked via `tauri.invoke`.

**Step 4: Commit**
Run: `git add . && git commit -m "feat: add tauri launch commands and tray"`

---

### Task 5: Build UI blocks + components (session list, import/export)

**Files:**
- Create: `src/blocks/SessionBoard.tsx`
- Create: `src/components/SessionCard.tsx`
- Create: `src/components/Toolbar.tsx`
- Create: `src/components/SegmentTabs.tsx`
- Create: `src/components/EmptyState.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

**Step 1: Implement UI skeleton**
Top navigation with segmented tabs, action buttons, search, and list layout.

**Step 2: Wire data**
Load config, render cards; add buttons for launch, login, export/import.

**Step 3: Add motion + hover states**
Staggered reveal, hover lift, gentle focus rings.

**Step 4: Manual check**
Run: `npm run dev` and verify layout matches provided style direction.

**Step 5: Commit**
Run: `git add . && git commit -m "feat: build launcher UI"`

---

### Task 6: Add session editor and profile management

**Files:**
- Create: `src/components/SessionEditor.tsx`
- Create: `src/components/Modal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/services/configService.ts`

**Step 1: Add modal editor**
Create/edit sessions with login type, CODEX_HOME, terminal/IDE profile.

**Step 2: Persist config**
Save updates via config service.

**Step 3: Manual check**
Create a new session and verify it persists after reload.

**Step 4: Commit**
Run: `git add . && git commit -m "feat: add session editor"`

---

### Task 7: Add README + per-folder _README updates

**Files:**
- Create: `README.md`
- Modify/Create: `_README.md` in each folder touched

**Step 1: Document usage**
Explain session isolation, CODEX_HOME handling, terminal/IDE profiles, import/export.

**Step 2: Verify headers**
Ensure each code file has required 3-line header comment.

**Step 3: Commit**
Run: `git add . && git commit -m "docs: add launcher documentation"`
