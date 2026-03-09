---
created: 2026-01-20
updated: 2026-02-17
version: 5.0.0
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

## Data Source

### DB-First Routing (Feature + Story ID Mode Only)

For **Feature + Story ID** mode, the database is the primary source of truth. The routing logic is:

1. Call `story_get_status` MCP tool (wraps `shimGetStoryStatus`) with the normalized story ID
2. If the DB returns a result: use it directly — derive display label from the DB State Display Labels table below
3. If the DB returns null (DB unavailable, connection error, or story not yet migrated): fall back to directory scan (existing logic)
4. If directory scan also finds nothing: display `Story not found: {STORY_ID}`

**Migration window context**: During the Phase 1 migration window, some stories may not yet exist in the database. The directory fallback ensures these stories remain visible via filesystem state. The DB is authoritative for all stories that have been written to it.

**Feature-level queries**: For Feature Only and Feature + --depth modes, try `kb_list_stories` first to get story states from KB. Fall back to `stories.index.md` if KB is unavailable. Story metadata (titles, descriptions, dependencies) may still come from `stories.index.md` until fully migrated to KB.

### DB State Display Labels

When a DB result is returned, map the `state` field to a human-readable display label:

| DB State (`state`) | Display Label |
|--------------------|---------------|
| `backlog` | backlog |
| `ready` | ready-to-work |
| `in_progress` | in-progress |
| `ready_for_review` | needs-code-review |
| `ready_for_qa` | ready-for-qa |
| `in_qa` | uat |
| `completed` | completed |
| `blocked` | BLOCKED |
| `cancelled` | superseded |
| `failed_code_review` | failed-code-review |
| `failed_qa` | failed-qa |

**Note**: All workflow states now have DB equivalents. The KB is the authoritative source for story state (KSOT Phase 2). Directory fallback is retained for robustness.

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
1. Normalize STORY_ID to uppercase
2. Call `story_get_status` MCP tool:
   ```
   result = story_get_status({ storyId: STORY_ID })
   ```
3. If result is non-null (DB hit):
   - Derive display label from the DB State Display Labels table above
   - Display single-story output (see Output Examples below)
4. If result is null (DB miss or tool unavailable):
   - Fall back to directory scan:
     - Read `stories.index.md`
     - Find `## <STORY_ID>:` section
     - Extract Status, Feature, Depends On
     - Locate directory
5. If directory scan also finds nothing: display `Story not found: {STORY_ID}`

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

<!-- KSOT-3010: Stories live in flat {FEATURE_DIR}/stories/{STORY_ID}/ directory.
     Swimlane column is derived from KB state, not directory name. -->

| KB State | Emoji | Column |
|----------|-------|--------|
| `backlog` | ⏸️ | BACKLOG |
| `backlog` (created) | 🆕 | CREATED |
| `in_progress` (elab) | 📝 | ELABORATION |
| `ready` | ⏳ | READY |
| `in_progress` | 🚧 | IN-PROGRESS |
| `ready_for_review` | 👀 | CODE-REVIEW |
| `failed_code_review` | 🔴 | REVIEW-FAIL |
| `ready_for_qa` | 🔍 | READY-QA |
| `failed_qa` | ⚠️ | QA-FAIL |
| `in_qa` | ✅ | DONE |
| `completed` | ✅ | DONE |

---

## Output Examples

See: `.claude/agents/_reference/examples/story-status-output.md`

Single story output format:
```
Feature: plans/future/wishlist
Story: WISH-001
Status: in-progress
Location: plans/future/wishlist/stories/WISH-001/
Depends On: none
```

---

## Telemetry

**Telemetry not applicable for this command.**

`story-status` is a read-only status check utility with no state transitions. It produces no workflow outputs and does not advance any story phase. Logging a telemetry record for every status query would generate noise without observability value. This exemption is documented explicitly per WINT-3070 AC-8.
