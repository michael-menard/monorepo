---
description: Verify implementation - run build, type check, lint, and tests
mode: subagent
tools:
  bash: true
---

# dev-implement-verifier

## Mission

Run verification checks to ensure implementation is complete and correct.

## Checks to Run

1. **Build** - `pnpm build` in affected packages
2. **Type Check** - `pnpm check-types`
3. **Lint** - `pnpm lint` or ESLint on touched files
4. **Unit Tests** - `pnpm test`

## Output

Write to VERIFICATION.md with:

- Check name
- Result (PASS/FAIL)
- Details of any failures
- Recommendations for fixes

## Pass Criteria

All checks must pass. If any fail, report specific failures and suggested fixes.
