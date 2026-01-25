---
created: 2026-01-24
updated: 2026-01-24
version: 2.0.0
type: utility-skill
permission_level: docs-only
---

# /index-update {FEATURE_DIR} {STORY_ID} [--status=X] [--clear-deps] [--add-dep=Y]

Update a story's entry in the feature's stories index file.

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | Yes | Feature directory (e.g., `plans/future/wishlist`) |
| `STORY_ID` | Yes | Story identifier (e.g., WISH-001) |
| `--status=X` | No | Set status to X |
| `--clear-deps` | No | Clear this story from all downstream dependencies |
| `--add-dep=Y` | No | Add Y to this story's Depends On |
| `--remove-dep=Y` | No | Remove Y from this story's Depends On |

## Index File Structure

File: `{FEATURE_DIR}/stories.index.md`

```markdown
# {PREFIX} Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| completed | 5 |
| in-progress | 2 |
| pending | 8 |

## Ready to Start
(Stories with no dependencies)

## {PREFIX}-001: Story Title

**Status:** pending
**Feature:** Feature name
**Depends On:** none | PREFIX-002, PREFIX-003

### Scope
...
```

## Execution Steps

### 1. Find Index File

Read `{FEATURE_DIR}/stories.index.md` and find entry matching `## {STORY_ID}:`.

If not found: `INDEX UPDATE FAILED: Story not in index`

### 2. Apply Updates

#### Update Status (--status=X)

```markdown
# Before
**Status:** pending

# After
**Status:** X
```

#### Clear Dependencies (--clear-deps)

Find ALL stories that list this STORY-ID in their Depends On:

```markdown
# Before (in STORY-002 entry)
**Depends On:** STORY-001, STORY-003

# After (if STORY-001 completed)
**Depends On:** STORY-003

# Or if was the only dependency:
**Depends On:** none
```

#### Add Dependency (--add-dep=Y)

```markdown
# Before
**Depends On:** none

# After
**Depends On:** Y

# Or if already has deps:
**Depends On:** STORY-001, Y
```

### 3. Update Progress Summary

Recalculate counts after any status change:

```markdown
| Status | Count |
|--------|-------|
| completed | 6 |    # +1 if story moved to completed
| in-progress | 1 |  # -1 if was in-progress
| pending | 8 |
```

### 4. Update Ready to Start Section

A story is READY if:
- Status is `pending` or `backlog` or `Draft`
- `**Depends On:**` is `none`

**Note:** Stories with status `Created`, `generated`, `In Elaboration`, or `elaboration` are NOT ready to start - they need elaboration first.

Rebuild the "Ready to Start" section with qualifying stories.

### 5. Return Result

```yaml
feature_dir: {FEATURE_DIR}
story: {STORY_ID}
index_file: {FEATURE_DIR}/stories.index.md
changes:
  status: { from: pending, to: completed }  # if changed
  deps_cleared_from: [STORY-002, STORY-003]  # if --clear-deps
  dep_added: STORY-005  # if --add-dep
  dep_removed: STORY-001  # if --remove-dep
progress_summary_updated: true
ready_to_start_updated: true
```

## Common Patterns

### Story Completed

```bash
/index-update plans/future/wishlist WISH-001 --status=completed --clear-deps
```

This:
1. Sets WISH-001 status to `completed`
2. Removes WISH-001 from all other stories' Depends On
3. Updates Progress Summary
4. Updates Ready to Start (newly unblocked stories appear)

### Story Blocked

```bash
/index-update plans/future/wishlist WISH-001 --status=BLOCKED
```

### Add New Dependency

```bash
/index-update plans/future/wishlist WISH-002 --add-dep=WISH-001
```

## Error Handling

| Error | Action |
|-------|--------|
| Story not in index | `INDEX UPDATE FAILED: Story not found in index` |
| Index file not found | `INDEX UPDATE FAILED: No index file found` |
| Invalid status | `INDEX UPDATE FAILED: Invalid status value` |
| Circular dependency | `INDEX UPDATE FAILED: Would create circular dependency` |

## Signal

- `INDEX UPDATE COMPLETE` - Changes applied
- `INDEX UPDATE FAILED: <reason>` - Could not update

## Valid Status Values

Story lifecycle statuses:

| Status | Meaning | Set By |
|--------|---------|--------|
| `Draft` | Initial placeholder, not yet generated | Manual/Bootstrap |
| `Pending` | Queued for generation | Manual |
| `Created` | Story file generated, ready for elaboration | `/pm-story generate` |
| `In Elaboration` | Elaboration in progress | `/elab-story` |
| `Ready for Review` | Elaboration complete, awaiting approval | `elab-completion-leader` |
| `Approved` | Approved, ready to implement | Manual |
| `In Progress` | Development underway | `/dev-implement-story` |
| `completed` / `Done` | Finished | `qa-verify-completion-leader` |
| `Blocked` | Waiting on external dependency | Manual |
| `superseded` | Replaced by split/followup stories | `/pm-story split` |

## Integration Points

Called by:
- `qa-verify-completion-leader` (on PASS: `--status=completed --clear-deps`)
- `pm-story-generation-leader` (on generate: `--status=Created`)
- `pm-story-split-leader` (original: `--status=superseded`)
- `pm-story-followup-leader` (new story: `--add-dep=PARENT`)
- `elab-completion-leader` (on PASS: `--status=Ready for Review`)
