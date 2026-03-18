---
description: Verify story implementation - run all verification checks and tests
---

# /qa-verify-story - QA Verification

Execute full QA verification for a story.

## Usage

```
/qa-verify-story {STORY_ID}
```

## CRITICAL: KB-Only Architecture

**Stories live EXCLUSIVELY in the KB database. There are NO story files on the filesystem.**

- **DO NOT** glob or search for story files (`.md`, `.yaml`) in any directory
- **DO** read story/artifacts via `kb_get_story` and `kb_read_artifact`
- **DO** update status via `kb_update_story_status({ story_id, state, phase })`

## Verification Steps

1. **Setup** - Validate preconditions via KB artifacts
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
