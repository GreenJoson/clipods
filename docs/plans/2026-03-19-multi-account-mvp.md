# Multi-Account MVP Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reusable Codex auth accounts and let each session bind one account for launch-time auth switching.

**Architecture:** Introduce a first-class `accounts` collection in app config, keep session-local auth fields as backward-compatible fallback, and resolve an effective auth projection before writing `config.toml` / `auth.json` or launching a session. The UI gains an account management tab plus session-level account binding, while pure service helpers own most of the merge logic.

**Tech Stack:** React 19, TypeScript, Vite, Tauri 2, Vitest

---

### Task 1: Add Config Account Model

**Files:**
- Modify: `src/types/config.ts`
- Modify: `src/models/session.ts`
- Modify: `src/services/configService.ts`
- Test: `src/models/session.test.ts`
- Test: `src/services/__tests__/configService.test.ts`

**Step 1: Write failing tests**

Add coverage for:
- parsing `accounts` from config
- ignoring invalid account entries
- round-tripping `boundAccountId`
- preserving legacy configs without `accounts`

**Step 2: Run tests to verify failure**

Run: `npm test -- configService session`

Expected: failures for missing account fields / parsing behavior

**Step 3: Write minimal implementation**

Implement:
- `AuthAccount` config type
- `AppConfig.accounts`
- `SessionConfig.boundAccountId`
- config normalization and serialization support

**Step 4: Run tests to verify pass**

Run: `npm test -- configService session`

Expected: all related tests pass

### Task 2: Add Pure Account Binding Service

**Files:**
- Create: `src/services/accountBinding.ts`
- Test: `src/services/__tests__/accountBinding.test.ts`

**Step 1: Write failing tests**

Cover:
- session-only ChatGPT behavior
- session-only API behavior
- bound ChatGPT account projection
- bound API account projection

**Step 2: Run tests to verify failure**

Run: `npm test -- accountBinding`

Expected: module/test failures before implementation

**Step 3: Write minimal implementation**

Expose helpers that resolve:
- effective login method
- env merged with bound account credentials
- auth.json payload to write

**Step 4: Run tests to verify pass**

Run: `npm test -- accountBinding`

Expected: account binding tests pass

### Task 3: Add Account Management UI

**Files:**
- Create: `src/components/AccountCard.tsx`
- Create: `src/components/AccountEditor.tsx`
- Create: `src/blocks/AccountBoard.tsx`
- Modify: `src/i18n.tsx`
- Modify: `src/components/_README.md`
- Modify: `src/blocks/_README.md`

**Step 1: Build UI primitives**

Add:
- account list card
- account editor modal for ChatGPT JSON / API key
- empty state / list board for accounts

**Step 2: Wire text and labels**

Add i18n keys for:
- accounts tab
- account fields
- create/edit/delete states
- session binding copy

**Step 3: Verify**

Run: `npm run build`

Expected: compile success with new components and translations

### Task 4: Integrate App Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/components/SessionEditor.tsx`
- Modify: `src/components/SessionCard.tsx`
- Modify: `src/blocks/SessionBoard.tsx`

**Step 1: Add account state and CRUD**

Implement:
- config persistence for accounts
- account tab rendering
- account create/edit/delete actions

**Step 2: Add session binding**

Implement:
- bind/unbind account in session editor
- show bound account summary in session UI

**Step 3: Apply launch/auth projection**

Before writing config or launching:
- resolve effective auth with binding helper
- write bound ChatGPT `auth.json` or API `auth.json`
- keep existing session behavior when no account bound

**Step 4: Verify**

Run: `npm test`
Run: `npm run build`

Expected: tests pass and build succeeds

### Task 5: Update Docs

**Files:**
- Modify: `README.md`
- Modify: `_README.md`
- Modify: `src/_README.md`
- Modify touched folder `_README.md` files

**Step 1: Document the feature**

Describe:
- reusable accounts
- session binding
- backward compatibility with legacy session auth

**Step 2: Verify**

Run: `npm run build`

Expected: docs updated with no code regression
