---
created: 2026-01-24
updated: 2026-02-20
version: 3.0.0
type: utility-skill
permission_level: docs-only
---

# /story-update {FEATURE_DIR} {STORY_ID} {NEW_STATUS} [--no-index]

Update a story's status in frontmatter and DB. Index writes have been removed (KFMB-3020).

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | Yes | Feature directory (e.g., `plans/future/wishlist`) |
| `STORY_ID` | Yes | Story identifier (e.g., WISH-001) |
| `NEW_STATUS` | Yes | Target status value |
| `--no-index` | No | DEPRECATED — accepted as no-op for backward compatibility. Index writes have been removed (KFMB-3020). |

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

**KB-first (KSOT Phase 2)**: Try `kb_get_story({storyId: STORY_ID})` to get the story's current state. If found, use the state to determine which stage directory the story should be in. If KB is unavailable, fall back to directory scan.

<!-- KSOT-3010: Flat stories/ layout — no stage-based directories -->
**Directory fallback** — search within `{FEATURE_DIR}`:
1. `{FEATURE_DIR}/stories/{STORY_ID}/`

If not found via KB or directory: `UPDATE FAILED: Story not found`

### 2. Worktree Cleanup (if NEW_STATUS == 'completed')

Perform cleanup check per "Worktree Cleanup on Completed Transition" section above.

### 3a. DB Write via shimUpdateStoryStatus

Look up `NEW_STATUS` in the inline mapping table (sourced from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` and explicit decisions for DB-only states):

| Command status | DB newState | Action |
|----------------|-------------|--------|
| `backlog` | `backlog` | call shimUpdateStoryStatus |
| `created` | `backlog` | call shimUpdateStoryStatus |
| `elaboration` | `in_progress` | call shimUpdateStoryStatus |
| `ready-to-work` | `ready` | call shimUpdateStoryStatus |
| `in-progress` | `in_progress` | call shimUpdateStoryStatus |
| `needs-code-review` | `ready_for_review` | call shimUpdateStoryStatus |
| `failed-code-review` | `failed_code_review` | call shimUpdateStoryStatus |
| `ready-for-qa` | `ready_for_qa` | call shimUpdateStoryStatus |
| `failed-qa` | `failed_qa` | call shimUpdateStoryStatus |
| `uat` | `in_qa` | call shimUpdateStoryStatus |
| `completed` | `completed` | call shimUpdateStoryStatus |
| `BLOCKED` | `blocked` | call shimUpdateStoryStatus |
| `superseded` | `cancelled` | call shimUpdateStoryStatus |
| `needs-split` | `backlog` | call shimUpdateStoryStatus |

Every status has a DB mapping — no statuses are skipped.

```
result = shimUpdateStoryStatus({
  storyId: STORY_ID,
  newState: <mapped_state>,
  triggeredBy: 'story-update-command',
})

if result is null:
  emit WARNING: "WARNING: DB write failed for story '{STORY_ID}' — DB unavailable. Proceeding with filesystem update only."
  db_updated = false
else:
  db_updated = true
```

**Notes:**
- The DB write is never blocking — Step 3b (frontmatter update) proceeds regardless of DB outcome.
- The `--no-index` flag is accepted as a no-op for backward compatibility (KFMB-3020). Step 3a always executes for mapped statuses.

### 3b. Update Frontmatter (informational only)

Update frontmatter in `{STORY_ID}.md` for human readability. **Note (KSOT-2050)**: Frontmatter is informational — agents must use `kb_get_story` for authoritative state, not frontmatter.

```yaml
---
status: <NEW_STATUS>
updated_at: "<TIMESTAMP>"
---
```

### 4. Return Result

```yaml
feature_dir: {FEATURE_DIR}
story: {STORY_ID}
old_status: <previous>
new_status: <NEW_STATUS>
file_updated: {FEATURE_DIR}/<stage>/{STORY_ID}/{STORY_ID}.md
db_updated: true | false
# db_updated values:
#   true  - shimUpdateStoryStatus returned non-null (DB write succeeded)
#   false - shimUpdateStoryStatus returned null (DB unavailable) OR NEW_STATUS
#           was unmapped (no DB write attempted)
# Note: index_updated field removed (KFMB-3020) — stories.index.md is no longer updated.
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

## Signal

- `UPDATE COMPLETE` - Status updated successfully
- `UPDATE FAILED: <reason>` - Could not update

## Integration Test Scenarios

These scenarios require manual execution against a live `postgres-knowledgebase` MCP server.

> **ADR-005 compliance note**: Scenarios A, B, and F require a live `postgres-knowledgebase` MCP server with a real `core.stories` record for the test story. These cannot be verified with filesystem-only tooling.

| Scenario | Name | Precondition | Action | Expected Outcome |
|----------|------|--------------|--------|-----------------|
| **A** | Mapped status, DB available | Story exists in DB; `postgres-knowledgebase` reachable | `/story-update {FEATURE_DIR} {STORY_ID} in-progress` | `shimUpdateStoryStatus` called with `newState: in_progress`; returns non-null; `db_updated: true`; frontmatter updated to `in-progress` |
| **B** | DB unavailable, mapped status | Story exists in DB; `postgres-knowledgebase` unreachable (simulated) | `/story-update {FEATURE_DIR} {STORY_ID} in-progress` | `shimUpdateStoryStatus` called; returns null; WARNING emitted: `"WARNING: DB write failed for story '{STORY_ID}' — DB unavailable. Proceeding with filesystem update only."`; `db_updated: false`; frontmatter still updated |
| **C** | New story not yet in DB | Story directory exists on filesystem but no DB record; mapped status | `/story-update {FEATURE_DIR} {STORY_ID} ready-to-work` | `shimUpdateStoryStatus` called; returns null (story not found in DB); WARNING emitted; `db_updated: false`; frontmatter updated |
| **D** | Previously-unmapped status now mapped | Story in any state | `/story-update {FEATURE_DIR} {STORY_ID} needs-code-review` | `shimUpdateStoryStatus` called with `newState: ready_for_review`; returns non-null; `db_updated: true`; frontmatter updated to `needs-code-review` |
| **E** | Invalid transition | Story currently in `backlog` | `/story-update {FEATURE_DIR} {STORY_ID} uat` | `UPDATE FAILED: Cannot transition from backlog to uat`; no DB write; no file changes |
| **F** | `--no-index` accepted as no-op (KFMB-3020) | Story exists in DB; `postgres-knowledgebase` reachable | `/story-update {FEATURE_DIR} {STORY_ID} ready-for-qa --no-index` | `shimUpdateStoryStatus` called with `newState: ready_for_qa`; returns non-null; `db_updated: true`; frontmatter updated; `stories.index.md` NOT updated under ANY condition (index writes removed in KFMB-3020) |

## Example Usage

```bash
# Move story to in-progress
/story-update plans/future/wishlist WISH-001 in-progress

# Mark UAT complete (triggers worktree cleanup check)
/story-update plans/future/wishlist WISH-001 completed

# Update frontmatter only (DB + frontmatter, no index — index no longer maintained)
/story-update plans/future/wishlist WISH-001 ready-for-qa
```

## Version History

- **v4.0.0** (2026-03-09): KB-only status tracking — removed `stories.index.md` index update (Step 4) and `--no-index` flag. Status is now tracked exclusively in the KB. Execution order: locate → worktree cleanup → DB write → frontmatter → result.
- **v3.0.0** (2026-02-20): DB integration — breaking behavioral change. Adds Step 3a (DB write via `shimUpdateStoryStatus`) between worktree cleanup and frontmatter update. Agents consuming command output now receive `db_updated` field in result YAML. Execution order is now: locate → worktree cleanup → DB write → frontmatter → index → result. Introduced by WINT-1050.
- **v2.1.0** (2026-02-17): Worktree cleanup on completed transition (WINT-1150).
- **v2.0.0** (2026-01-24): Initial multi-step execution spec.
