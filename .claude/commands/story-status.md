---
created: 2026-01-20
updated: 2026-02-04
version: 4.0.0
type: utility
---

/story-status [FEATURE_DIR | INDEX_PATH] [STORY_ID] [--depth] [--deps-order]

Check story status. Read-only utility command.

## Usage

```bash
/story-status                                        # Summary of all features
/story-status plans/future/wishlist                  # Feature summary
/story-status plans/future/wishlist WISH-001         # Single story
/story-status plans/future/wishlist --depth          # In-depth epic view
/story-status plans/future/wishlist --deps-order     # Work list ordered by dependency tiers
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | No | Feature directory path |
| `INDEX_PATH` | No | Direct path to stories.index.md |
| `STORY_ID` | No | Story identifier (e.g., WISH-001) |
| `--depth` | No | Show in-depth epic view |
| `--deps-order` | No | Show stories grouped by dependency tiers as a work list |

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

### Feature + --deps-order
Show stories as a dependency-ordered work list:
1. Read `stories.index.md`
2. Parse all stories (ID, title, status, phase, dependencies)
3. Build dependency graph from "Depends On" and "Blocks" fields
4. Assign each story to a **tier** based on dependency depth:
   - **Tier 0**: No dependencies (can start immediately)
   - **Tier 1**: All dependencies are Tier 0 stories
   - **Tier 2**: At least one dependency is a Tier 1 story
   - ...continue for deeper chains
5. Within each tier, group stories by phase
6. Show what each story blocks (downstream dependents)
7. Show deferred stories separately at the end
8. Show critical chains (longest dependency paths)
9. Show summary metrics (total, per-tier counts, max parallelism, longest chain)

Exclude stories with status `completed` from tier groups (show in a completed summary instead).

For output format, read: `.claude/agents/_reference/examples/story-status-output.md` (deps-order section)

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
