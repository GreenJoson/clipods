# Task 1 Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the scaffold with repo standards by adding required headers and docs, introducing theme variables, and generating the npm lockfile.

**Architecture:** Keep changes confined to documentation, headers, and styling tokens. No behavioral changes beyond swapping hard-coded colors for theme variables and wiring the new theme stylesheet.

**Tech Stack:** Vite, React, TypeScript, Tauri, Rust, CSS.

---

### Task 1: Add required 3-line header comment blocks to code files

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.css`
- Modify: `src/vite-env.d.ts`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Modify: `src-tauri/build.rs`
- Modify: `src-tauri/src/main.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: Write the header comment block template**
Use a 3-line ASCII-only block with `@input`, `@output`, `@pos` fields at the top of each file. Keep it concise and accurate.

**Step 2: Insert the block into each file**
Place the comment block at the top of each listed file using the correct comment syntax (TS/TSX/CSS/HTML/Rust). Ensure existing content remains unchanged.

**Step 3: Quick verification**
Open each file to confirm the block is present and only appears once.

**Step 4: Commit**
Defer commit until all tasks are completed.

---

### Task 2: Introduce theme variables and replace hard-coded colors

**Files:**
- Create: `src/styles/theme.css`
- Modify: `src/App.css`
- Modify: `src/main.tsx`
- Modify: `src/styles/_README.md`

**Step 1: Create `theme.css`**
Define CSS variables for all colors currently hard-coded in `src/App.css` (including hover colors, shadows, and dark-mode overrides). Keep the palette semantic (e.g., `--color-text`, `--color-background`, `--color-accent`).

**Step 2: Wire the theme stylesheet**
Import `./styles/theme.css` in `src/main.tsx` before `App` usage so the variables are available globally.

**Step 3: Replace hex values in `App.css`**
Swap all color literals (hex/rgba) with `var(--...)` tokens from `theme.css`. Avoid any remaining hard-coded colors.

**Step 4: Update `src/styles/_README.md`**
Add `theme.css` to the table with a short description.

**Step 5: Commit**
Defer commit until all tasks are completed.

---

### Task 3: Add `_README.md` to folders that lack one

**Files (create):**
- `public/_README.md`
- `src/_README.md`
- `src/assets/_README.md`
- `src-tauri/_README.md`
- `src-tauri/src/_README.md`
- `src-tauri/capabilities/_README.md`
- `src-tauri/icons/_README.md`
- `.vscode/_README.md`

**Files (modify):**
- `docs/plans/_README.md`

**Step 1: Create `_README.md` files**
For each folder listed above, add the required table format documenting files in that folder. Keep entries concise and accurate.

**Step 2: Update `docs/plans/_README.md`**
Add the new plan file to the table.

**Step 3: Verify coverage**
Use `rg --files -g "_README.md"` and compare against the folder list to confirm coverage (excluding `.git`).

**Step 4: Commit**
Defer commit until all tasks are completed.

---

### Task 4: Update root README rule

**Files:**
- Modify: `README.md`

**Step 1: Add the structural-change rule**
Insert a bold statement that any structural change requires updating sub-docs.

**Step 2: Verify**
Re-open `README.md` and confirm the rule is clear and prominent.

**Step 3: Commit**
Defer commit until all tasks are completed.

---

### Task 5: Generate npm lockfile

**Files:**
- Create: `package-lock.json`

**Step 1: Install dependencies**
Run `npm install` in the repo root and confirm `package-lock.json` is generated.

**Step 2: Quick verification**
Confirm no package.json changes unless expected by npm.

**Step 3: Commit**
Defer commit until all tasks are completed.

---

### Task 6: Final verification and commit

**Files:**
- Modify: All files touched above

**Step 1: Review git status**
Run `git status -sb` to confirm expected changes only.

**Step 2: Optional sanity check**
If desired, run `npm run build` (not required by the task).

**Step 3: Commit**
Run:
```bash
git add README.md src/App.tsx src/main.tsx src/App.css src/vite-env.d.ts vite.config.ts index.html \
  src-tauri/build.rs src-tauri/src/main.rs src-tauri/src/lib.rs \
  src/styles/theme.css src/styles/_README.md \
  public/_README.md src/_README.md src/assets/_README.md src-tauri/_README.md \
  src-tauri/src/_README.md src-tauri/capabilities/_README.md src-tauri/icons/_README.md \
  .vscode/_README.md docs/plans/_README.md package-lock.json

git commit -m "chore: align scaffold with repo standards"
```

---
