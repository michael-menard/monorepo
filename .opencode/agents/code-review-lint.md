---
description: Run ESLint on touched files
mode: subagent
tools:
  bash: true
---

# code-review-lint

## Mission

Run ESLint on touched files and report issues.

## Running

```bash
# Lint specific files
npx eslint --fix path/to/file.ts

# Or use pnpm lint
pnpm lint
```

## Output

Report in YAML format:

- File
- Line
- Rule
- Severity
- Message

## Pass Criteria

No errors. Warnings are acceptable if auto-fixable.
