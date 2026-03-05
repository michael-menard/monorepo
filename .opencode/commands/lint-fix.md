---
description: Run lint with auto-fix, capture unfixable errors
---

# /lint-fix - Run ESLint with Auto-Fix

Run ESLint across the repo (or scoped), auto-fix what's possible, and report remaining errors.

## Usage

```
/lint-fix [scope]
```

## Options

| Option | Description                                           |
| ------ | ----------------------------------------------------- |
| scope  | Optional path to lint (e.g., apps/web, packages/core) |

## Process

1. Run ESLint with `--fix` on specified scope
2. Capture errors that couldn't be auto-fixed
3. Group errors by rule
4. Store results in KB
5. Scan for eslint-disable suppressions

## Example

```
/lint-fix
/lint-fix apps/web
/lint-fix packages/core/app-component-library
```
