---
created: 2026-01-24
updated: 2026-02-18
version: 2.1.0
type: utility-skill
permission_level: setup
---

# /story-move {FEATURE_DIR} {STORY_ID} {TO_STAGE} [--update-status]

Move a story directory to a different workflow stage within a feature directory.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | Yes | Feature directory path (e.g., `plans/future/wishlist`) |
| `STORY_ID` | Yes | Story identifier (e.g., WISH-001) |
| `TO_STAGE` | Yes | Target stage directory |
| `--update-status` | No | Also update frontmatter status to match stage |

## Valid Stages

| Stage | Directory | Emoji | Typical Status |
|-------|-----------|-------|----------------|
| `backlog` | `{FEATURE_DIR}/backlog/` | ⏸️ | `backlog` |
| `created` | `{FEATURE_DIR}/created/` | 🆕 | `created` |
| `elaboration` | `{FEATURE_DIR}/elaboration/` | 📝 | `elaboration` |
| `ready-to-work` | `{FEATURE_DIR}/ready-to-work/` | ⏳ | `ready-to-work` |
| `in-progress` | `{FEATURE_DIR}/in-progress/` | 🚧 | `in-progress` |
| `needs-code-review` | `{FEATURE_DIR}/needs-code-review/` | 👀 | `needs-code-review` |
| `failed-code-review` | `{FEATURE_DIR}/failed-code-review/` | 🔴 | `failed-code-review` |
| `ready-for-qa` | `{FEATURE_DIR}/ready-for-qa/` | 🔍 | `ready-for-qa` |
| `failed-qa` | `{FEATURE_DIR}/failed-qa/` | ⚠️ | `failed-qa` |
| `UAT` | `{FEATURE_DIR}/UAT/` | ✅ | `uat` |

## Execution Steps

### 1. Locate Story

**DB-first lookup (WINT-1060)**: Before scanning the filesystem, attempt to find the story's current stage via the database:

```
result = shimGetStoryStatus({ storyId: STORY_ID })
```

- If `result` is non-null: the story is in the DB. Use `result.state` to determine the `FROM_STAGE` via reverse lookup from the `SWIM_LANE_TO_STATE` table in Step 2.5.
- If `result` is null (DB miss or DB error): fall back to directory scan below.

**Directory fallback** (when shimGetStoryStatus returns null):

Search all stage directories within `{FEATURE_DIR}` for `{STORY_ID}/`:
- `{FEATURE_DIR}/backlog/{STORY_ID}/`
- `{FEATURE_DIR}/created/{STORY_ID}/`
- `{FEATURE_DIR}/elaboration/{STORY_ID}/`
- `{FEATURE_DIR}/ready-to-work/{STORY_ID}/`
- `{FEATURE_DIR}/in-progress/{STORY_ID}/`
- `{FEATURE_DIR}/needs-code-review/{STORY_ID}/`
- `{FEATURE_DIR}/failed-code-review/{STORY_ID}/`
- `{FEATURE_DIR}/failed-qa/{STORY_ID}/`
- `{FEATURE_DIR}/ready-for-qa/{STORY_ID}/`
- `{FEATURE_DIR}/UAT/{STORY_ID}/`

If not found (neither DB nor directory): `MOVE FAILED: Story directory not found`

### 2. Validate Move

Check target doesn't already exist:
```
{FEATURE_DIR}/{TO_STAGE}/{STORY_ID}/
```

If exists: `MOVE FAILED: Story already exists in {TO_STAGE}`

### 2.5. DB Write via shimUpdateStoryStatus (WINT-1060)

**Guard clause (AC-7)**: If `--update-status` was provided, skip this step entirely — set `db_updated: skipped` and proceed to Step 3. The DB write will be handled by `/story-update` in Step 4 (no double-write).

**Independence from locate step (AC-10)**: If `shimGetStoryStatus` returned null during Step 1 (DB-miss or DB-error), still proceed with `shimUpdateStoryStatus` for mapped stages — the write path is independent of the read path. A DB read miss does not suppress the DB write attempt.

Look up `TO_STAGE` in the inline `SWIM_LANE_TO_STATE` table (sourced from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`):

| Swim-lane directory (TO_STAGE) | DB newState |
|-------------------------------|-------------|
| `backlog` | `backlog` |
| `created` | `backlog` |
| `elaboration` | `in_progress` |
| `ready-to-work` | `ready` |
| `in-progress` | `in_progress` |
| `needs-code-review` | `ready_for_review` |
| `failed-code-review` | `failed_code_review` |
| `ready-for-qa` | `ready_for_qa` |
| `failed-qa` | `failed_qa` |
| `UAT` | `in_qa` |

**Note**: `done` is in the `SWIM_LANE_TO_STATE` constant but is NOT a valid `TO_STAGE` target for `/story-move`.

**If TO_STAGE is in the table above:**

```
result = shimUpdateStoryStatus({
  storyId: STORY_ID,
  newState: <mapped_state>,
  triggeredBy: 'story-move',
})

if result is null:
  log warning via @repo/logger: "DB write failed for {STORY_ID}. Proceeding with directory mv."
  db_updated = false
else:
  db_updated = true
```

**If TO_STAGE is NOT in the table** (unlikely — all standard stages are now mapped):

```
log warning: "No DB state for stage '{TO_STAGE}'. Skipping DB write."
db_updated = skipped
```

Proceed with directory mv regardless of DB outcome — the move is never blocked by DB availability.

### 3. Execute Move

```bash
mv {FEATURE_DIR}/{FROM_STAGE}/{STORY_ID} {FEATURE_DIR}/{TO_STAGE}/{STORY_ID}
```

This step executes unconditionally regardless of DB outcome in Step 2.5 (AC-2).

### 4. Update Status (if --update-status)

If flag provided, also run:
```
/story-update {FEATURE_DIR} {STORY_ID} {STAGE_STATUS}
```

Where `STAGE_STATUS` is the typical status for that stage (see table above).

This updates both the story frontmatter and the index in one atomic step. The `/story-update` command handles its own DB write — no double-write occurs. `db_updated` is reported as `skipped` in the Step 5 return YAML when this delegation path is taken.

### 5. Log Telemetry (fire-and-forget — never blocks workflow)

```
/telemetry-log {STORY_ID} story-move execute success
```
If the call returns null or throws, log a warning and continue.

### 6. Return Result

```yaml
feature_dir: {FEATURE_DIR}
story: {STORY_ID}
from_stage: {FROM_STAGE}
to_stage: {TO_STAGE}
from_path: {FEATURE_DIR}/{FROM_STAGE}/{STORY_ID}/
to_path: {FEATURE_DIR}/{TO_STAGE}/{STORY_ID}/
status_updated: true | false
db_updated: true | false | skipped
# db_updated values:
#   true    - shimUpdateStoryStatus returned non-null (DB write succeeded)
#   false   - shimUpdateStoryStatus returned null (DB unavailable); mv proceeded
#   skipped - TO_STAGE has no DB state mapping (unmapped stage), OR --update-status was provided (DB write delegated to /story-update in Step 4)
```

## Stage Transition Flow

```
backlog → created → elaboration → ready-to-work → in-progress → needs-code-review → ready-for-qa → UAT
                                                        ↓                                  ↓
                                                failed-code-review              failed-qa
                                                        ↓                                  ↓
                                                  in-progress (return)         in-progress (return)
```

## Error Handling

| Error | Action |
|-------|--------|
| Feature dir not found | `MOVE FAILED: Feature directory not found` |
| Story not found | `MOVE FAILED: Story directory not found` |
| Already in target | `MOVE SKIPPED: Already in {TO_STAGE}` |
| Target exists | `MOVE FAILED: Story already exists in {TO_STAGE}` |
| Invalid stage | `MOVE FAILED: Invalid stage "{value}"` |
| Permission denied | `MOVE FAILED: Cannot write to {path}` |

## Signal

- `MOVE COMPLETE` - Story moved successfully
- `MOVE SKIPPED: <reason>` - No action needed
- `MOVE FAILED: <reason>` - Could not move

## Example Usage

```bash
# Move to in-progress for development
/story-move plans/future/wishlist WISH-001 in-progress

# Move to UAT and update status
/story-move plans/future/wishlist WISH-001 UAT --update-status

# Move to failed-qa after QA verification failure
/story-move plans/future/wishlist WISH-001 failed-qa --update-status
```

## Typical Workflow Integration

Setup leaders call this skill:

```markdown
# In dev-setup-leader:
1. /story-move {FEATURE_DIR} {STORY_ID} in-progress --update-status

# In dev-implement-story (Done):
1. /story-move {FEATURE_DIR} {STORY_ID} needs-code-review --update-status

# In dev-code-review (PASS):
1. /story-move {FEATURE_DIR} {STORY_ID} ready-for-qa --update-status

# In dev-code-review (FAIL):
1. /story-move {FEATURE_DIR} {STORY_ID} failed-code-review --update-status

# In dev-fix-story (after failed-code-review):
1. /story-move {FEATURE_DIR} {STORY_ID} in-progress --update-status

# In qa-verify-completion-leader (on PASS):
1. /story-move {FEATURE_DIR} {STORY_ID} UAT --update-status

# In qa-verify-completion-leader (on FAIL):
1. /story-move {FEATURE_DIR} {STORY_ID} failed-qa --update-status

# In dev-fix-story (after failed-qa):
1. /story-move {FEATURE_DIR} {STORY_ID} in-progress --update-status
```
