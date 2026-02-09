# Release Builds (GitHub Actions) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a GitHub Actions workflow so publishing a Release builds macOS/Windows/Linux artifacts and attaches them to the Release.

**Architecture:** Add a single workflow triggered by `release` (published). Use a platform matrix and `tauri-apps/tauri-action` to build and upload artifacts. Add `_README.md` entries for new `.github` folders and update README with release build instructions.

**Tech Stack:** GitHub Actions, Tauri 2, Node.js, Rust

---

### Task 1: Add Release Build Workflow

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `.github/_README.md`
- Create: `.github/workflows/_README.md`

**Step 1: Write the workflow file**

```yaml
name: Release Build

on:
  release:
    types: [published]

jobs:
  build:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
          - platform: windows-latest
          - platform: ubuntu-22.04

    runs-on: ${{ matrix.platform }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install dependencies
        run: npm ci

      - name: Build and upload
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ github.event.release.id }}
```

**Step 2: Add `_README.md` for `.github/`**

```markdown
# .github - GitHub 配置

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| workflows | 配置 | GitHub Actions 工作流 |
```

**Step 3: Add `_README.md` for `.github/workflows/`**

```markdown
# workflows - 自动化流程

> ⚠️ 一旦本文件夹有所变化，请更新本文件

| 文件名 | 地位 | 功能 |
|-------|------|------|
| _README.md | 文档 | 本目录说明 |
| release.yml | 核心 | Release 发布后触发三平台打包 |
```

**Step 4: Run tests to ensure baseline stays green**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add .github/workflows/release.yml .github/_README.md .github/workflows/_README.md
git commit -m "feat: add release build workflow"
```

---

### Task 2: Update README with Release Build Notes

**Files:**
- Modify: `README.md`

**Step 1: Add Release CI section**

```markdown
## Release 打包（GitHub Actions）

- 发布 GitHub Release（published）后，会自动触发 macOS/Windows/Linux 打包并上传到 Release 附件。
- 如需签名/自动更新，请配置 Tauri Updater 的签名与 `latest.json`。
```

**Step 2: Run tests (optional)**

Run: `npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document release build workflow"
```

---

### Task 3: Update docs/plans/_README.md

**Files:**
- Modify: `docs/plans/_README.md`

**Step 1: Add the plan entry**

```markdown
| 2026-02-09-release-builds.md | 方案 | Release 打包工作流实现计划 |
```

**Step 2: Commit**

```bash
git add docs/plans/_README.md
git commit -m "docs: update plans index"
```
