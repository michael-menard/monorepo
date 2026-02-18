---
name: wt-status
version: 2.0.0
description: Show comprehensive status of git worktrees and database-tracked story worktrees, including orphaned and untracked detection.
---

# /wt:status - Show Worktree Status

## Description

Show comprehensive status of the current worktree and all worktrees, including both git-level worktree state and database-tracked story worktrees (active, orphaned, and untracked detection).

## Usage

```
/wt:status
```

## What It Does

This slash command:
1. Shows git-level worktree status (current location, uncommitted changes, sync status)
2. Queries `worktree_list_active` MCP tool for database-tracked story worktrees
3. Cross-references DB records against git worktrees to detect orphaned and untracked entries
4. Renders a unified view of both sources

## Section 1: Git Worktrees

### Information Displayed

- **Current worktree location** — Where you are now
- **All worktrees and their states** — Overview of all worktrees
- **Uncommitted changes** — Files modified, staged, untracked
- **Branches ahead/behind origin** — Sync status with remote

### How to Collect

Use Bash tool to run git status commands:

```bash
git worktree list
git status
git log --oneline -5
```

## Section 2: Database-Tracked Worktrees

### How to Collect

Call the `worktree_list_active` MCP tool:

```
worktree_list_active({ limit: 50, offset: 0 })
```

### Null-Check Resilience

The `worktree_list_active` call must handle null/error responses gracefully:

```
result = worktree_list_active({ limit: 50, offset: 0 })

if result is null or tool call throws an error:
  Print: "WARNING: DB worktree data unavailable (worktree_list_active MCP tool error). Showing git-level view only."
  Return (show git section only, do NOT crash or exit with error)

if result is [] (empty array):
  Print: "No active database-tracked worktrees."

if result is [records...]:
  → perform disk-check and cross-reference (see below)
  → render tabular output
```

### Disk-Check Mechanism (ORPHANED Detection)

For each record returned by `worktree_list_active`, check whether the `worktreePath` exists on disk:

```
Use Bash tool: ls {worktreePath}
```

- If `ls {worktreePath}` exits with a **non-zero exit code** (path does not exist): flag the record with `[ORPHANED]`
- If `ls {worktreePath}` exits with zero (path exists): no indicator
- If `ls {worktreePath}` throws an unexpected error: flag with `[CHECK-FAILED]` and continue rendering remaining records

### Cross-Reference Mechanism (UNTRACKED Detection)

After checking each DB record:

1. Collect the set of `worktreePath` values from all DB records (`db_paths`)
2. Collect the set of git worktree paths from `git worktree list` (`git_paths`)
3. For each git worktree path that is NOT in `db_paths`:
   - Flag that git worktree with `[UNTRACKED]` in the git worktrees section

An `[UNTRACKED]` label means: a git worktree exists on disk but has no corresponding active DB record.

### Output Format

Section header:

```
--- Database-Tracked Worktrees ---
```

Tabular output (consistent column widths, no emoji):

```
Story ID      Branch                    Path                          Registered              Status
WINT-1140     story/WINT-1140           tree/story/WINT-1140          2026-02-17 10:00:00     (active)
WINT-1130     story/WINT-1130           tree/story/WINT-1130          2026-02-16 08:00:00     [ORPHANED]
```

Empty state:

```
--- Database-Tracked Worktrees ---
No active database-tracked worktrees.
```

Degraded state (MCP tool error):

```
WARNING: DB worktree data unavailable (worktree_list_active MCP tool error). Showing git-level view only.
```

## Full Execution Flow

```
1. Run git worktree commands → collect git_paths and worktree status
2. Call worktree_list_active({ limit: 50, offset: 0 })
   a. If null/error → show degradation warning, stop (git view already rendered)
   b. If [] → print "No active database-tracked worktrees."
   c. If [records...]:
      - For each record: ls {worktreePath} → tag [ORPHANED] if non-zero exit
      - Cross-reference: for each git_path not in db_paths → tag [UNTRACKED]
      - Render tabular DB section
3. Display git section (with any [UNTRACKED] labels)
4. Display DB-tracked worktrees section
```

## Benefits

- **Complete Overview** — See everything at a glance (git + DB)
- **Sync Awareness** — Know what needs pushing/pulling
- **Change Tracking** — See all uncommitted work
- **Multi-Worktree View** — Status of all git worktrees
- **Conflict Detection** — Identify stories with active DB-tracked worktrees to prevent parallel work collisions
- **Orphaned Record Detection** — Flag DB records where path no longer exists on disk
- **Untracked Git Worktree Detection** — Flag git worktrees with no DB record (possible abandoned sessions)

## Schema References

The `worktree_list_active` result follows `WorktreeListActiveOutputSchema` — an array of `WorktreeRecord`:

```typescript
WorktreeRecord {
  id: string (UUID)           // worktree database ID — use for worktree_mark_complete
  storyId: string             // human-readable story ID (e.g., "WINT-1130")
  worktreePath: string        // filesystem path (e.g., "tree/story/WINT-1130")
  branchName: string          // git branch (e.g., "story/WINT-1130")
  status: "active"            // always "active" from worktree_list_active
  createdAt: Date             // registration timestamp
  updatedAt: Date
  mergedAt: Date | null
  abandonedAt: Date | null
  metadata: Record<unknown>
}
```

## Related Skills

- `/wt:new` — Create a new story worktree
- `/wt:switch` — Switch to an existing worktree
- `/wt:finish` — Complete and clean up a worktree
