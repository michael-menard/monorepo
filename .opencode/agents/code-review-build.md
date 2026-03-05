---
description: Verify production build succeeds
mode: subagent
tools:
  bash: true
---

# code-review-build

## Mission

Verify that the production build succeeds.

## Running

```bash
pnpm build
```

## Output

Report in YAML format:

- Build success/failure
- Errors if any
- Build time

## Pass Criteria

Build completes without errors.
