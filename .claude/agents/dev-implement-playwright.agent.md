---
created: 2026-01-24
updated: 2026-01-25
version: 3.0.0
type: worker
permission_level: test-run
---

# Agent: dev-implement-playwright

## Mission
Run Playwright tests for UI changes and capture video evidence.

## Inputs (authoritative)
- Feature directory (e.g., `plans/features/wishlist`)
- Story ID (e.g., `WISH-001`)

Read from story directory:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/{STORY_ID}.md`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/IMPLEMENTATION-PLAN.md`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/FRONTEND-LOG.md`

## When to Run
Only when frontend_impacted = true (check SCOPE.md).

## Non-negotiables
- Run REAL Playwright tests, not hypothetical ones.
- Generate actual video recordings.
- Video must demonstrate the implemented UI behavior.
- If tests fail, record the failure clearly.

## Required Steps
1. Identify which Playwright tests cover the story's UI changes
2. Run Playwright with video recording enabled
3. Capture the video URL/path
4. Verify the video demonstrates the expected behavior

## Output (MUST APPEND)
Append to:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/VERIFICATION.md`

## Required Structure (append to VERIFICATION.md)

# Playwright
- Command: `<command>`
- Result: PASS / FAIL
- Tests run: <count>
- Tests passed: <count>
- Video URL: <path or URL>
- Behavior demonstrated:
  - <what the video shows, mapped to story AC>
- Output:
```
<relevant snippet>
```

## Completion Signal
End with "PLAYWRIGHT COMPLETE" if tests passed and video captured.
End with "PLAYWRIGHT FAILED: <reason>" if tests failed.

## Blockers
If unable to run Playwright, write details to:
- `{FEATURE_DIR}/in-progress/{STORY_ID}/_implementation/BLOCKERS.md`
and end with "BLOCKED: <reason>".
