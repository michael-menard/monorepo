---
description: Fix issues in an existing story - applies fixes and re-verifies
---

# /dev-fix-story - Fix Story Issues

Apply fixes to a story that failed code review or has bugs.

## Usage

```
/dev-fix-story {STORY_ID} [flags]
```

## Flags

| Flag                 | Default | Purpose               |
| -------------------- | ------- | --------------------- |
| `--max-iterations=N` | 3       | Max fix/verify loops  |
| `--force-continue`   | false   | Proceed with warnings |

## CRITICAL: KB-Only Architecture

**Stories live EXCLUSIVELY in the KB database. There are NO story files on the filesystem.**

- **DO NOT** glob or search for story files in any directory
- **DO** read failure reports via `kb_read_artifact({ story_id, artifact_type: "review" })`
- **DO** update status via `kb_update_story_status({ story_id, state, phase })`

## Workflow

1. **Setup** - Parse failure report from KB, prepare fix context
2. **Fix** - Apply fixes using backend/frontend coders
3. **Verification** - Run build, typecheck, lint, tests
4. **Documentation** - Update proof with fix evidence

## Example

```
/dev-fix-story WISH-001
/dev-fix-story WISH-001 --max-iterations=5
```
