---
description: Fix issues in an existing story - applies fixes and re-verifies
---

# /dev-fix-story - Fix Story Issues

Apply fixes to a story that failed code review or has bugs.

## Usage

```
/dev-fix-story {FEATURE_DIR} {STORY_ID} [flags]
```

## Flags

| Flag                 | Default | Purpose               |
| -------------------- | ------- | --------------------- |
| `--max-iterations=N` | 3       | Max fix/verify loops  |
| `--force-continue`   | false   | Proceed with warnings |

## Workflow

1. **Setup** - Parse failure report, create FIX-CONTEXT.md
2. **Fix** - Apply fixes using backend/frontend coders
3. **Verification** - Run build, typecheck, lint, tests
4. **Documentation** - Update proof with fix evidence

## Example

```
/dev-fix-story plans/future/wishlist WISH-001
/dev-fix-story plans/future/wishlist WISH-001 --max-iterations=5
```
