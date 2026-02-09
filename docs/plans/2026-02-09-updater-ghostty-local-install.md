# Updater + Ghostty + Local Install Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Ghostty terminal template, make updater reliably check GitHub Releases, and document a local macOS build/install flow.

**Architecture:** Update the terminal template list and detection in `ProfileEditor`, add new i18n strings, adjust Tauri updater configuration + release workflow signing, and document local build/install steps in README. Keep changes incremental and consistent with existing UI/CLI patterns.

**Tech Stack:** React + Tauri v2 + GitHub Actions + npm scripts

---

### Task 1: Add Ghostty terminal template

**Files:**
- Modify: `src/components/ProfileEditor.tsx`
- Modify: `src/i18n.tsx`
- Modify: `src/components/_README.md`
- Modify: `src/_README.md`

**Step 1: Update terminal template detection + list**

```ts
const detectTerminalTemplate = (command: string): string => {
  const normalized = command.toLowerCase();
  if (normalized.includes("ghostty")) {
    return "ghostty";
  }
  if (normalized.includes("wave")) {
    return "wave";
  }
  if (normalized.includes("iterm")) {
    return "iterm2";
  }
  if (normalized.includes("terminal")) {
    return "terminal";
  }
  return "custom";
};

const terminalTemplates: TerminalTemplate[] = [
  { id: "custom", ... },
  { id: "terminal", ... },
  { id: "iterm2", ... },
  { id: "wave", ... },
  {
    id: "ghostty",
    label: t("profileEditor.template.ghostty"),
    name: "Ghostty",
    command: "Ghostty",
    args: ["-e", "{command}"],
  },
];
```

**Step 2: Add i18n strings**

```ts
"profileEditor.template.ghostty": "Ghostty",
```

Add for both zh + en sections.

**Step 3: Update README entries**

```md
| ProfileEditor.tsx | 核心 | 终端与 IDE 配置编辑弹窗（含 Ghostty/Wave/iTerm/Terminal 模板与应用安装检测） |
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ProfileEditor.tsx src/i18n.tsx src/components/_README.md src/_README.md
git commit -m "feat: add Ghostty terminal template"
```

---

### Task 2: Fix updater to rely on GitHub Releases + signing

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `.github/workflows/release.yml`
- Modify: `src-tauri/_README.md`

**Step 1: Ensure updater config matches GitHub Releases**

```json
"bundle": {
  "createUpdaterArtifacts": true,
  ...
},
"plugins": {
  "updater": {
    "pubkey": "REPLACE_WITH_PUBLIC_KEY",
    "endpoints": [
      "https://github.com/GreenJoson/clipods/releases/latest/download/latest.json"
    ]
  }
}
```

**Step 2: Add signing secrets to GitHub Actions**

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

**Step 3: Document updater notes in Tauri README**

```md
| tauri.conf.json | 核心 | Tauri 应用配置（含托盘、Updater endpoint 与签名公钥） |
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add src-tauri/tauri.conf.json .github/workflows/release.yml src-tauri/_README.md
git commit -m "chore: wire updater signing for releases"
```

---

### Task 3: Document local macOS build + install

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `_README.md`

**Step 1: Add npm script**

```json
"scripts": {
  "install:macos": "npm run tauri build && ditto src-tauri/target/release/bundle/macos/clipods.app /Applications/clipods.app"
}
```

**Step 2: Update README (ZH + EN)**

```md
## 本地打包与安装（macOS）

```bash
npm run install:macos
```

如提示权限不足，请使用 `sudo`。

## Local Build & Install (macOS)

```bash
npm run install:macos
```

If you see permission errors, run with `sudo`.
```

Also add an “Updater signing” note describing `tauri signer generate` and replacing `pubkey`.

**Step 3: Update root _README**

```md
| package.json | 核心 | npm 脚本（含本地安装命令） |
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json README.md _README.md
git commit -m "docs: add local install instructions"
```

---

### Task 4: Update plans index

**Files:**
- Modify: `docs/plans/_README.md`

**Step 1: Add entry**

```md
| 2026-02-09-updater-ghostty-local-install.md | 方案 | Updater/终端模板/本地安装补充 |
```

**Step 2: Commit**

```bash
git add docs/plans/_README.md
git commit -m "docs: update plans index"
```

