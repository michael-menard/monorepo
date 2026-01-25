---
created: 2026-01-20
updated: 2026-01-24
version: 2.0.0
type: utility
---

/story-status [FEATURE_DIR] [STORY_ID]

Check story status. Read-only utility command.

## Usage

```
/story-status                                    # Summary of all features
/story-status plans/future/wishlist              # Summary of wishlist feature
/story-status plans/future/wishlist WISH-001     # Single story status
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | No | Feature directory path |
| `STORY_ID` | No | Story identifier (e.g., WISH-001) |

- No arguments: Show summary of all features in `plans/future/`
- Feature dir only: Show summary of that feature
- Both arguments: Show single story status

## Single Story Lookup

When both FEATURE_DIR and STORY_ID provided:

1. Normalize ID to uppercase
2. Read `{FEATURE_DIR}/stories.index.md`
3. Search for `## <STORY_ID>:` section
4. Extract `**Status:**`, `**Feature:**`, `**Depends On:**` values
5. Locate actual directory

**Output format:**
```
Feature: plans/future/wishlist
Story: WISH-001
Status: in-progress
Location: plans/future/wishlist/in-progress/WISH-001/
Depends On: none
```

**If not found:**
- Check all stage directories within feature
- Report: "Story directory exists but not in index" or "Story not found"

## Feature Summary

When only FEATURE_DIR provided:

1. Read `{FEATURE_DIR}/stories.index.md`
2. Count stories by `**Status:**` value
3. Scan stage directories for actual locations

**Output format:**
```
=== plans/future/wishlist ===
Prefix: WISH

| Status        | Count |
|---------------|-------|
| pending       | 3     |
| in-progress   | 1     |
| completed     | 2     |

┌────────────────┬───────┬─────────────────────────────┐
│   Directory    │ Count │           Stories           │
├────────────────┼───────┼─────────────────────────────┤
│ backlog/       │ 2     │ WISH-003, WISH-004          │
├────────────────┼───────┼─────────────────────────────┤
│ in-progress/   │ 1     │ WISH-001                    │
├────────────────┼───────┼─────────────────────────────┤
│ UAT/           │ 0     │ —                           │
└────────────────┴───────┴─────────────────────────────┘

Total Stories: 6
```

## All Features Summary

When no arguments provided:

1. Scan `plans/future/` for feature directories
2. For each with `stories.index.md`:
   - Count stories by status
   - Show compact summary

**Output format:**
```
=== Feature Status Summary ===

| Feature    | Prefix | Total | Pending | In Progress | UAT | Done |
|------------|--------|-------|---------|-------------|-----|------|
| wishlist   | WISH   | 7     | 3       | 1           | 1   | 2    |
| auth       | AUTH   | 4     | 4       | 0           | 0   | 0    |
| sets       | SETS   | 5     | 2       | 2           | 0   | 1    |

Total Features: 3
Total Stories: 16
```

## Notes

- Feature directories discovered via `plans/future/*/stories.index.md`
- Status values are case-sensitive as stored
- Common statuses: pending, generated, in-progress, uat, completed, BLOCKED
- Story directories indicate workflow position; index status is authoritative
