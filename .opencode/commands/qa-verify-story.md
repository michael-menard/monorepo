---
description: Verify story implementation - run all verification checks and tests
---

# /qa-verify-story - QA Verification

Execute full QA verification for a story.

## Usage

```
/qa-verify-story {STORY_ID}
```

## Verification Steps

1. **Setup** - Validate preconditions, move story to QA directory
2. **Verification** - Execute all verification checks:
   - Build verification
   - TypeScript type checking
   - ESLint validation
   - Unit tests
   - E2E tests (if UI story)
   - Manual testing checklist from AC
3. **Completion** - Update status based on verdict

## Pass Criteria

| Check      | Required               |
| ---------- | ---------------------- |
| Build      | Pass                   |
| TypeCheck  | Pass                   |
| Lint       | Pass (or auto-fixable) |
| Unit Tests | Pass                   |
| E2E Tests  | Pass (if applicable)   |
| Manual AC  | Verified               |

## Example

```
/qa-verify-story WISH-001
```
