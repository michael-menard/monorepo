---
created: 2026-01-20
updated: 2026-02-17
version: 5.0.0
type: utility
---

/story-status [FEATURE_DIR] [STORY_ID] [--depth] [--deps-order]

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

| Argument       | Required | Description                                             |
| -------------- | -------- | ------------------------------------------------------- |
| `FEATURE_DIR`  | No       | Feature directory path                                  |
| `STORY_ID`     | No       | Story identifier (e.g., WISH-001)                       |
| `--depth`      | No       | Show in-depth epic view                                 |
| `--deps-order` | No       | Show stories grouped by dependency tiers as a work list |

---

## Data Source

### KB-First Routing

The KB is the authoritative source of truth for all story states. The routing logic is:

**Feature + Story ID mode:**

1. Call `kb_get_story` with `include_dependencies: true` using the normalized story ID
2. If the DB returns a result: use it directly — derive display label from the DB State Display Labels table below; also extract dependency info
3. If the DB returns null (KB unavailable): display `Story not found: {STORY_ID} (KB unavailable)`

**Feature-level queries (Feature Only, --depth, --deps-order):**

1. Call `kb_list_stories({ epic: "{feature}", limit: 100 })` to get all story states and metadata from KB
2. Paginate if result count equals limit (call again with `offset: 100`, etc.)
3. If KB is unavailable: display `Error: KB unavailable — cannot fetch story list`

**Note:** `stories.index.md` is no longer read or written. All status and metadata comes from the KB.

### DB State Display Labels

When a DB result is returned, map the `state` field to a human-readable display label:

| DB State (`state`)   | Display Label      |
| -------------------- | ------------------ |
| `backlog`            | backlog            |
| `ready`              | ready-to-work      |
| `in_progress`        | in-progress        |
| `ready_for_review`   | needs-code-review  |
| `ready_for_qa`       | ready-for-qa       |
| `in_qa`              | uat                |
| `completed`          | completed          |
| `blocked`            | BLOCKED            |
| `cancelled`          | superseded         |
| `failed_code_review` | failed-code-review |
| `failed_qa`          | failed-qa          |

**Note**: The KB is the sole authoritative source for story state. No directory fallback.

---

## Modes

### No Arguments

Show summary of all features in `plans/future/`

### Feature Only

Show summary of that feature (story counts by status)

### Feature + --depth

Show in-depth epic view:

1. Call `kb_list_stories({ epic: "{feature}", limit: 100 })` — paginate if needed
2. Parse all stories (ID, state, dependencies) from KB results
3. Check `_implementation/CHECKPOINT.md` for phase progress (filesystem, optional)
4. Build dependency graph
5. Generate swimlane visualization — map KB `state` to swimlane column using the table below

For output format, read: `.claude/agents/_reference/examples/story-status-output.md`

### Feature + --deps-order

Show stories as a dependency-ordered work list:

1. Call `kb_list_stories({ epic: "{feature}", limit: 100 })` — paginate if needed
2. Parse all stories (ID, title, state, phase, dependencies) from KB results
3. Build dependency graph from story dependency data returned by KB
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
2. Call `kb_get_story` with `include_dependencies: true`:
   ```
   result = kb_get_story({ story_id: STORY_ID, include_dependencies: true })
   ```
3. If result is non-null (DB hit):
   - Derive display label from the DB State Display Labels table above
   - Extract `requires` dependencies (where `storyId` = this story) from the dependencies array
   - Check if any required stories are not yet `completed` — these are **unresolved prerequisites**
   - Display single-story output (see Output Examples below)
4. If result is null (KB unavailable or story not found): display `Story not found: {STORY_ID}`

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

| KB State             | Emoji | Column      |
| -------------------- | ----- | ----------- |
| `backlog`            | ⏸️    | BACKLOG     |
| `backlog` (created)  | 🆕    | CREATED     |
| `in_progress` (elab) | 📝    | ELABORATION |
| `ready`              | ⏳    | READY       |
| `in_progress`        | 🚧    | IN-PROGRESS |
| `ready_for_review`   | 👀    | CODE-REVIEW |
| `failed_code_review` | 🔴    | REVIEW-FAIL |
| `ready_for_qa`       | 🔍    | READY-QA    |
| `failed_qa`          | ⚠️    | QA-FAIL     |
| `in_qa`              | ✅    | DONE        |
| `completed`          | ✅    | DONE        |

---

## Output Examples

See: `.claude/agents/_reference/examples/story-status-output.md`

Single story output format:

```
Story: WISH-001
Title: Example story title
Status: in-progress
Priority: P2
Depends On: none
```

With unresolved dependencies:

```
Story: CDBE-1010
Title: Valid Transitions Lookup Table
Status: backlog
Priority: P1
Depends On: CDBE-0010 (backlog), CDBE-1005 (backlog), CDBE-1006 (backlog)
  ^^^ 3 unresolved prerequisites — story cannot start
```

With all dependencies resolved:

```
Story: CDBE-1020
Title: Some downstream story
Status: ready-to-work
Priority: P2
Depends On: CDBE-1010 (completed) -- all resolved
```

---

## Telemetry

**Telemetry not applicable for this command.**

`story-status` is a read-only status check utility with no state transitions. It produces no workflow outputs and does not advance any story phase. Logging a telemetry record for every status query would generate noise without observability value. This exemption is documented explicitly per WINT-3070 AC-8.
