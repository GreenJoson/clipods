# Add Theme System and Typography Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a theme variable system and typography wiring with base styles for the app.

**Architecture:** Centralize visual tokens in `src/styles/theme.css` and load it from the app entrypoint. Use `src/index.css` for global base styles and motion helpers, and update documentation files for any affected folders.

**Tech Stack:** Vite, React, TypeScript, CSS

---

### Task 1: Extend theme variables

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/styles/_README.md`

**Step 1: Update theme tokens**

```css
:root {
  --color-bg: #f7f7f2;
  --color-text: #1a1a1a;
}
```

**Step 2: Document styles folder changes**

```md
| theme.css | Core | Global design tokens and theme variables |
```

### Task 2: Wire fonts and base styles

**Files:**
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Modify: `README.md`
- Modify: `src/_README.md`

**Step 1: Add font imports and base styles**

```css
@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap");

body {
  font-family: var(--font-body, "Inter", sans-serif);
}
```

**Step 2: Ensure theme file is loaded**

```ts
import "./styles/theme.css";
```

**Step 3: Update documentation for touched folders**

```md
| index.css | Core | Global base styles and font wiring |
```

**Step 4: Manual check**

Run: `npm install && npm run dev`
Expected: Vite dev server starts and app loads with base theme styles.

### Task 3: Final commit

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/index.css`
- Modify: `src/main.tsx`
- Modify: `src/styles/_README.md`
- Modify: `src/_README.md`
- Modify: `README.md`

**Step 1: Commit with required message**

```bash
git add .
git commit -m "feat: add theme system"
```
