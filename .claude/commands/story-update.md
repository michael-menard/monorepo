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
backlog → created → elaboration → ready-to-work → in-progress → needs-code-review → ready-for-qa → uat → completed
                                                        ↘ failed-code-review → in-progress
                                                                                               ↘ failed-qa → in-progress
                   ↘ needs-split → (split via /pm-story split)
                   ↘ BLOCKED → (manual resolution)
```

| Status | Emoji | Meaning | Set By |
|--------|-------|---------|--------|
| `backlog` | ⏸️ | Story queued, not yet created | Manual |
| `created` | 🆕 | Story file generated, awaiting elaboration | `/pm-story generate` |
| `elaboration` | 📝 | In elaboration phase | `/elab-story` |
| `ready-to-work` | ⏳ | Elaboration passed, ready for dev | `elab-completion-leader` |
| `in-progress` | 🚧 | Dev actively working | `/dev-implement-story` |
| `needs-code-review` | 👀 | Implementation complete, awaiting code review | `/dev-implement-story` (Done) |
| `failed-code-review` | 🔴 | Code review failed, needs rework | `/dev-code-review` (FAIL) |
| `ready-for-qa` | 🔍 | Code reviewed and approved, awaiting QA | `/dev-code-review` (PASS) |
| `failed-qa` | ⚠️ | QA failed, needs rework | `qa-verify-completion-leader` (FAIL) |
| `uat` | ✅ | QA passed, UAT verified | `qa-verify-completion-leader` (PASS) |
| `completed` | ✅ | All phases complete, manually signed off | Manual |
| `needs-split` | — | Story too large, needs splitting | Manual |
| `BLOCKED` | — | Cannot proceed, needs resolution | Manual |
| `superseded` | — | Replaced by other stories | `/pm-story split` |

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
2. `{FEATURE_DIR}/created/{STORY_ID}/`
3. `{FEATURE_DIR}/elaboration/{STORY_ID}/`
4. `{FEATURE_DIR}/ready-to-work/{STORY_ID}/`
5. `{FEATURE_DIR}/in-progress/{STORY_ID}/`
6. `{FEATURE_DIR}/needs-code-review/{STORY_ID}/`
7. `{FEATURE_DIR}/failed-code-review/{STORY_ID}/`
8. `{FEATURE_DIR}/failed-qa/{STORY_ID}/`
9. `{FEATURE_DIR}/ready-for-qa/{STORY_ID}/`
10. `{FEATURE_DIR}/UAT/{STORY_ID}/`

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
| `backlog` | `created`, `elaboration`, `BLOCKED` |
| `created` | `elaboration`, `BLOCKED` |
| `elaboration` | `ready-to-work`, `needs-split`, `BLOCKED` |
| `ready-to-work` | `in-progress`, `BLOCKED` |
| `in-progress` | `needs-code-review`, `BLOCKED` |
| `needs-code-review` | `ready-for-qa`, `failed-code-review` |
| `failed-code-review` | `in-progress` |
| `ready-for-qa` | `uat`, `failed-qa` |
| `failed-qa` | `in-progress` |
| `uat` | `completed` |
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
