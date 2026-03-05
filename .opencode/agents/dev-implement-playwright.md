---
description: Run Playwright E2E tests and capture results
mode: subagent
tools:
  bash: true
---

# dev-implement-playwright

## Mission

Run Playwright E2E tests and capture video/results.

## Requirements

- Must run in LIVE mode (not headless for visual tests)
- Tests must pass for story completion

## Running Tests

```bash
cd apps/web/playwright
npx playwright test
```

## Output

Write to VERIFICATION.md with:

- Test results (passed/failed)
- Failed test details
- Video/screenshots if available
- Recommendations

## Pass Criteria

- e2e_tests.status == "pass" OR "exempt"
- e2e_tests.mode == "live"
- e2e_tests.results.passed > 0
