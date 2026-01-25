---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
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

## Execution Steps

### 1. Locate Story File

Search within `{FEATURE_DIR}`:
1. `{FEATURE_DIR}/backlog/{STORY_ID}/`
2. `{FEATURE_DIR}/elaboration/{STORY_ID}/`
3. `{FEATURE_DIR}/ready-to-work/{STORY_ID}/`
4. `{FEATURE_DIR}/in-progress/{STORY_ID}/`
5. `{FEATURE_DIR}/UAT/{STORY_ID}/`

If not found: `UPDATE FAILED: Story not found`

### 2. Update Frontmatter

In `{STORY_ID}.md`:

```yaml
---
status: <NEW_STATUS>
updated_at: "<TIMESTAMP>"
---
```

### 3. Update Index (unless --no-index)

In `{FEATURE_DIR}/stories.index.md`:

1. Find section `## {STORY_ID}:`
2. Change `**Status:** <old>` to `**Status:** <NEW_STATUS>`
3. Update Progress Summary counts

### 4. Return Result

```yaml
feature_dir: {FEATURE_DIR}
story: {STORY_ID}
old_status: <previous>
new_status: <NEW_STATUS>
file_updated: {FEATURE_DIR}/<stage>/{STORY_ID}/{STORY_ID}.md
index_updated: true | false | skipped
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

# Mark UAT complete
/story-update plans/future/wishlist WISH-001 completed

# Frontmatter only (skip index)
/story-update plans/future/wishlist WISH-001 ready-for-qa --no-index
```
