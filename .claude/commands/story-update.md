---
created: 2026-01-24
updated: 2026-02-17
version: 2.1.0
type: utility-skill
permission_level: docs-only
---

# /story-update {FEATURE_DIR} {STORY_ID} {NEW_STATUS} [--no-index]

Update a story's status in both frontmatter and index.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | Yes | Feature directory (e.g., `plans/future/wishlist`) |
| `STORY_ID` | Yes | Story identifier (e.g., WISH-001) |
| `NEW_STATUS` | Yes | Target status value |
| `--no-index` | No | Skip index update (frontmatter only) |

## Valid Status Values

```
backlog → elaboration → ready-to-work → in-progress → ready-for-qa → uat → completed
                                                   ↘ needs-work → (back to in-progress)
                   ↘ needs-split → (split via /pm-story split)
                   ↘ BLOCKED → (manual resolution)
```

| Status | Meaning |
|--------|---------|
| `backlog` | Story generated, not yet elaborated |
| `elaboration` | In elaboration phase |
| `ready-to-work` | Elaboration passed, ready for dev |
| `in-progress` | Dev actively working |
| `ready-for-qa` | Code complete, awaiting QA |
| `uat` | QA passed, in user acceptance |
| `completed` | All phases complete |
| `needs-work` | QA failed, returned to dev |
| `needs-split` | Story too large, needs splitting |
| `BLOCKED` | Cannot proceed, needs resolution |
| `superseded` | Replaced by other stories |

## Worktree Cleanup on Completed Transition (WINT-1150)

**Applies to**: `uat → completed` transition ONLY.

**Scope constraint**: This check only runs when transitioning to `completed` from `uat`.
Direct admin overrides (e.g., forcing `in-progress → completed`) do not trigger this check.

When `NEW_STATUS == 'completed'`, perform the following BEFORE updating the story status:

### Step A: Look up active worktree
```
Call: worktree_get_by_story({storyId: STORY_ID})
```

### Step B: Branch on result
- If `null` → skip silently, continue with status update (no worktree to clean up)
- If active worktree found → proceed to Step C

### Step C: Invoke wt-finish and handle result
```
Invoke: /wt:finish {branchName} {worktreePath}
```
- On success:
  - Call `worktree_mark_complete({worktreeId: record.id, status: 'merged'})`
- On any failure (any error or non-success):
  - Call `worktree_mark_complete({worktreeId: record.id, status: 'abandoned', metadata: {cleanup_deferred: true, reason: 'unknown'}})`
  - Emit WARNING: `"WARNING: Worktree '{branchName}' at '{worktreePath}' was not cleaned up. Reason: unknown. Action: Run /wt:finish {STORY_ID} when ready."`

**Continue status transition regardless of outcome** — story completion is never blocked by worktree cleanup.

### Note on MCP Tool Access

The MCP tools (`worktree_get_by_story`, `worktree_mark_complete`) are called by the executing agent reading this command. The `docs-only` permission constraint on this file applies to filesystem writes, not MCP tool access. The executing agent must have `worktree_get_by_story` and `worktree_mark_complete` tools available. If MCP tools are unavailable, emit a note instructing the user to manually run `/wt:finish {STORY_ID}`.

## Execution Steps

### 1. Locate Story File

Search within `{FEATURE_DIR}`:
1. `{FEATURE_DIR}/backlog/{STORY_ID}/`
2. `{FEATURE_DIR}/elaboration/{STORY_ID}/`
3. `{FEATURE_DIR}/ready-to-work/{STORY_ID}/`
4. `{FEATURE_DIR}/in-progress/{STORY_ID}/`
5. `{FEATURE_DIR}/UAT/{STORY_ID}/`

If not found: `UPDATE FAILED: Story not found`

### 2. Worktree Cleanup (if NEW_STATUS == 'completed')

Perform cleanup check per "Worktree Cleanup on Completed Transition" section above.

### 3. Update Frontmatter

In `{STORY_ID}.md`:

```yaml
---
status: <NEW_STATUS>
updated_at: "<TIMESTAMP>"
---
```

### 4. Update Index (unless --no-index)

In `{FEATURE_DIR}/stories.index.md`:

1. Find section `## {STORY_ID}:`
2. Change `**Status:** <old>` to `**Status:** <NEW_STATUS>`
3. Update Progress Summary counts

### 5. Return Result

```yaml
feature_dir: {FEATURE_DIR}
story: {STORY_ID}
old_status: <previous>
new_status: <NEW_STATUS>
file_updated: {FEATURE_DIR}/<stage>/{STORY_ID}/{STORY_ID}.md
index_updated: true | false | skipped
worktree_cleanup: completed | deferred | skipped | not_found  # only when NEW_STATUS == 'completed'
```

## Status Transition Rules

| Current Status | Valid Next Statuses |
|----------------|---------------------|
| `backlog` | `elaboration`, `BLOCKED` |
| `elaboration` | `ready-to-work`, `needs-split`, `BLOCKED` |
| `ready-to-work` | `in-progress`, `BLOCKED` |
| `in-progress` | `ready-for-qa`, `BLOCKED` |
| `ready-for-qa` | `uat`, `needs-work` |
| `uat` | `completed` |
| `needs-work` | `in-progress` |
| `needs-split` | `superseded` (after split complete) |

**Force transitions** with `--force` flag (not recommended).

## Error Handling

| Error | Action |
|-------|--------|
| Feature dir not found | `UPDATE FAILED: Feature directory not found` |
| Story not found | `UPDATE FAILED: Story not found` |
| Invalid status value | `UPDATE FAILED: Invalid status "{value}"` |
| Invalid transition | `UPDATE FAILED: Cannot transition from {old} to {new}` |
| Index entry missing | `UPDATE WARNING: Index entry not found, frontmatter updated only` |

## Signal

- `UPDATE COMPLETE` - Status updated successfully
- `UPDATE FAILED: <reason>` - Could not update

## Example Usage

```bash
# Move story to in-progress
/story-update plans/future/wishlist WISH-001 in-progress

# Mark UAT complete (triggers worktree cleanup check)
/story-update plans/future/wishlist WISH-001 completed

# Frontmatter only (skip index)
/story-update plans/future/wishlist WISH-001 ready-for-qa --no-index
```
