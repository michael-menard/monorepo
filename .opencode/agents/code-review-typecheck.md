---
description: Run TypeScript type checking
mode: subagent
tools:
  bash: true
---

# code-review-typecheck

## Mission

Run TypeScript type checking on the codebase.

## Running

```bash
pnpm check-types
# or
pnpm tsc --noEmit
```

## Output

Report in YAML format:

- File
- Line
- Error code
- Message

## Pass Criteria

No type errors.
