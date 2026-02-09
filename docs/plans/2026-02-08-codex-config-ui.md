# Codex Config UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal Codex config fields with an advanced TOML section and ensure the session data is persisted and written to `CODEX_HOME/config.toml`.

**Architecture:** Keep the base config generator authoritative for required keys and append a user-provided advanced TOML block. Persist this per session in the app TOML config and surface inputs in the session editor UI.

**Tech Stack:** React + TypeScript (frontend), Tauri (backend), TOML config serialization.

---

### Task 1: Extend Session Model + Types

**Files:**
- Modify: `src/types/config.ts`
- Modify: `src/models/session.ts`
- Test: `src/services/__tests__/configService.test.ts`

**Step 1: Add optional field to SessionConfig**

```ts
export interface SessionConfig {
  // ...
  extraConfigToml?: string;
}
```

**Step 2: Wire create/normalize to include extraConfigToml**

```ts
extraConfigToml: readStringOptional(value.extraConfigToml),
```

**Step 3: Update configService test**

Add `extraConfigToml` to the round-trip config and assert it survives serialization.

**Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

---

### Task 2: Update Codex Config Generation

**Files:**
- Modify: `src/services/codexConfig.ts`
- Test: `src/services/__tests__/codexConfig.test.ts`

**Step 1: Append advanced TOML block**

Append `extraConfigToml` (trimmed) at the end of generated config with a delimiter comment.

**Step 2: Update tests**

Add a test case to ensure custom TOML is appended verbatim.

**Step 3: Run tests**

Run: `npm test`
Expected: all tests pass

---

### Task 3: Update Session Editor UI

**Files:**
- Modify: `src/components/SessionEditor.tsx`
- Modify: `src/components/_README.md`

**Step 1: Add fields for OPENAI_ORGANIZATION / OPENAI_PROJECT**

Add inputs in the “常用环境变量” section, and include them in “快速写入” behavior.

**Step 2: Add advanced TOML textarea**

Add a textarea labeled “高级自定义 TOML（可选）” with helper text about appending to generated config.

**Step 3: Persist into session data**

Include `extraConfigToml` in `buildSession()` so it saves to config.

**Step 4: Run tests**

Run: `npm test`
Expected: all tests pass

---

### Task 4: Documentation Updates

**Files:**
- Modify: `README.md`
- Modify: `src/_README.md`

**Step 1: Update README**

Document advanced TOML append behavior and new optional env fields.

**Step 2: Update src/_README**

Note session editor now supports advanced TOML input.

---

### Task 5: Manual Verification

**Step 1: Run dev app**

Run: `npm run tauri dev`
Expected: Session editor shows new fields and advanced TOML input, saving writes `config.toml` under `CODEX_HOME`.

**Step 2: Confirm config file**

Open `~/.codex_api/config.toml` after saving session and confirm appended advanced TOML is present.
