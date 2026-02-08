---
created: 2026-01-20
updated: 2026-02-04
version: 4.0.0
type: utility
---

/story-status [FEATURE_DIR | INDEX_PATH] [STORY_ID] [--depth]

Check story status. Read-only utility command.

## Usage

```bash
/story-status                                        # Summary of all features
/story-status plans/future/wishlist                  # Feature summary
/story-status plans/future/wishlist WISH-001         # Single story
/story-status plans/future/wishlist --depth          # In-depth epic view
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | No | Feature directory path |
| `INDEX_PATH` | No | Direct path to stories.index.md |
| `STORY_ID` | No | Story identifier (e.g., WISH-001) |
| `--depth` | No | Show in-depth epic view |

---

## Modes

### No Arguments
Show summary of all features in `plans/future/`

### Feature Only
Show summary of that feature (story counts by status)

### Feature + --depth (or INDEX_PATH)
Show in-depth epic view:
1. Read `stories.index.md`
2. Parse all stories (ID, status, dependencies)
3. Check `_implementation/CHECKPOINT.md` for phase progress
4. Build dependency graph
5. Generate swimlane visualization

For output format, read: `.claude/agents/_reference/examples/story-status-output.md`

### Feature + Story ID
Show single story status:
1. Normalize ID to uppercase
2. Read `stories.index.md`
3. Find `## <STORY_ID>:` section
4. Extract Status, Feature, Depends On
5. Locate directory

---

## Implementation

### Phase Detection
Check `_implementation/CHECKPOINT.md`:
- Extract `phases_completed` array
- Extract `stage`
- Extract `code_review_verdict`

### Dependency Graph
- Build from "Depends On" fields
- Identify blocking chains
- Find ready-to-start stories (all deps satisfied)

### Swimlane Mapping

| Directory | Column |
|-----------|--------|
| `backlog/` | BACKLOG |
| `elaboration/` | ELABORATION |
| `ready-to-work/` | READY |
| `in-progress/` | IN-PROGRESS |
| `ready-for-qa/` | READY-QA |
| `UAT/` | IN-QA / DONE |
| `completed/` | DONE |

---

## Output Examples

See: `.claude/agents/_reference/examples/story-status-output.md`
