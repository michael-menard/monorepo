---
created: 2026-01-20
updated: 2026-01-25
version: 3.2.0
type: utility
---

/story-status [FEATURE_DIR | INDEX_PATH] [STORY_ID] [--depth]

Check story status. Read-only utility command.

## Usage

```
/story-status                                              # Summary of all features
/story-status plans/future/wishlist                        # Summary of wishlist feature
/story-status plans/future/wishlist WISH-001               # Single story status
/story-status plans/future/wishlist/stories.index.md       # In-depth epic view
/story-status plans/future/wishlist --depth                # In-depth epic view (alt)
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `FEATURE_DIR` | No | Feature directory path |
| `INDEX_PATH` | No | Direct path to stories.index.md for in-depth view |
| `STORY_ID` | No | Story identifier (e.g., WISH-001) |
| `--depth` | No | Flag to show in-depth epic view |

- No arguments: Show summary of all features in `plans/future/`
- Feature dir only: Show summary of that feature
- Feature dir + `--depth` OR index path: Show in-depth epic view
- Feature dir + story ID: Show single story status

## In-Depth Epic View

When INDEX_PATH (stories.index.md) or FEATURE_DIR with `--depth` flag provided:

1. Read the `stories.index.md` file
2. Parse all story sections extracting:
   - Story ID and title/feature description
   - Status
   - Dependencies (Depends On field)
   - Priority if present
3. For each story, check for `_implementation/CHECKPOINT.md`:
   - Extract `phases_completed` array
   - Extract `stage` (setup, planning, implementation, verification, etc.)
   - Extract `code_review_verdict` if present
   - Extract `implementation_complete` flag
4. Build dependency graph to identify:
   - Blocking chains (A blocks B blocks C)
   - Stories ready to start (all deps satisfied)
   - Blocked stories (waiting on dependencies)
5. Generate swimlane visualization:
   - Group stories by workflow stage (backlog → elaboration → ready → in-progress → review → qa → done)
   - Show story ID + abbreviated title in each lane
   - Display counts per lane in footer

**Output format:**
```
╔═════════════════════════════════════════════════════════════════════════════════════════╗
║                              KNOW Epic - In-Depth Status                                ║
╠═════════════════════════════════════════════════════════════════════════════════════════╣
║ Total: 28 │ Done: 7 │ In QA: 1 │ Ready for QA: 2 │ In Progress: 2 │ Ready: 2 │ Pending: 14
╚═════════════════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ 📊 PROGRESS SUMMARY                                              │
├─────────────────────────────────────────────────────────────────┤
│ completed        ████████████████░░░░░░░░░░░░░░░░  7 (25%)      │
│ in-qa            ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  1 (4%)       │
│ ready-for-qa     ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ in-progress      ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ ready-to-work    ████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
│ pending          ████████████████████████████████  12 (43%)     │
│ cancelled        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  2 (7%)       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🚀 READY TO START (no blockers)                                  │
├─────────────────────────────────────────────────────────────────┤
│ KNOW-006  │ Parsers and Seeding                                  │
│ KNOW-017  │ Data Encryption                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔗 DEPENDENCY GRAPH                                              │
├─────────────────────────────────────────────────────────────────┤
│ KNOW-003 ──► KNOW-004 ──► KNOW-008 ──► KNOW-013                 │
│                               └──────► KNOW-019                  │
│                               └──────► KNOW-022                  │
│                                                                  │
│ KNOW-006 ──► KNOW-007 ──► KNOW-012                              │
│                  └──────► KNOW-014                               │
│                  └──────► KNOW-020                               │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🏊 SWIMLANE VIEW                                                                                           │
├────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────┬────────────────┤
│  BACKLOG   │   ELAB     │   READY    │ IN-PROGRESS│  READY-QA  │   IN-QA    │    DONE    │                │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────────┤
│ KNOW-007   │ KNOW-006   │ KNOW-0053  │ KNOW-008   │ KNOW-0052  │ KNOW-028   │ KNOW-001   │                │
│ Admin      │ Parsers    │ Stubs      │ Workflow   │ Search     │ Env Vars   │ Infra      │                │
│            │            │            │            │            │            │            │                │
│ KNOW-009   │            │            │            │ KNOW-015   │            │ KNOW-002   │                │
│ Auth       │            │            │            │ DR         │            │ Embedding  │                │
│            │            │            │            │            │            │            │                │
│ KNOW-010   │            │            │            │            │            │ KNOW-003   │                │
│ Rate Limit │            │            │            │            │            │ CRUD       │                │
│            │            │            │            │            │            │            │                │
│ ...+10     │            │            │            │            │            │ ...+4      │                │
├────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────┼────────────────┤
│     12     │      1     │      1     │      1     │      2     │      1     │      7     │                │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────┴────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📋 STORY DETAILS (expandable per story)                          │
├─────────────────────────────────────────────────────────────────┤
│ KNOW-001  │ ✅ completed  │ Package Infrastructure Setup         │
│           │ Phases: setup ✓ planning ✓ implementation ✓         │
│           │         verification ✓ documentation ✓ review ✓     │
│           │ Code Review: PASS                                    │
├───────────┼───────────────┼──────────────────────────────────────┤
│ KNOW-004  │ ✅ completed  │ Search Implementation                │
│           │ Depends: KNOW-003 ✓                                  │
│           │ Phases: all complete                                 │
│           │ QA: PASS - 91 tests (100% pass rate)                │
├───────────┼───────────────┼──────────────────────────────────────┤
│ KNOW-007  │ ⏳ pending    │ Admin Tools and Polish               │
│           │ Depends: KNOW-006 (pending)                          │
│           │ BLOCKED - waiting on dependencies                    │
├───────────┼───────────────┼──────────────────────────────────────┤
│ KNOW-0052 │ 🔍 ready-qa   │ MCP Search Tools + Deployment        │
│           │ Phases: setup ✓ planning ✓ implementation ✓         │
│           │ Awaiting QA verification                             │
└─────────────────────────────────────────────────────────────────┘
```

**Swimlane columns** (maps to directory structure):
| Column | Source Directory | Statuses Included |
|--------|------------------|-------------------|
| BACKLOG | `backlog/` | pending, generated, deferred |
| ELABORATION | `elaboration/` | in-elaboration |
| READY | `ready-to-work/` | ready-to-work |
| IN-PROGRESS | `in-progress/` | in-progress, ready-for-code-review |
| READY-QA | `ready-for-qa/` | ready-for-qa (dev complete, awaiting QA) |
| IN-QA | `UAT/` | in-qa |
| DONE | `UAT/` or `completed/` | completed, uat, cancelled |

**Swimlane rendering rules:**
- Show story ID + abbreviated title (first 10 chars)
- Max 5 stories visible per column, then show "+N more"
- Column width fixed at 12 chars
- Footer row shows count per lane
- Empty lanes show blank cells

**Story status icons:**
- ✅ completed
- 🔍 ready-for-qa / ready-for-code-review
- 🔨 in-progress
- 🟢 ready-to-work (passed elab, awaiting dev)
- ⏳ pending
- 🚫 blocked
- ❌ cancelled / superseded
- 📝 in-elaboration / generated

**Implementation phase indicators:**
- Show checkmarks (✓) for completed phases from CHECKPOINT.md
- Show current phase if in-progress
- Show "no implementation data" if _implementation folder missing

---

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
| pending       | 2     |
| ready-to-work | 1     |
| in-progress   | 1     |
| completed     | 2     |

┌────────────────┬───────┬─────────────────────────────┐
│   Directory    │ Count │           Stories           │
├────────────────┼───────┼─────────────────────────────┤
│ backlog/       │ 2     │ WISH-003, WISH-004          │
├────────────────┼───────┼─────────────────────────────┤
│ ready-to-work/ │ 1     │ WISH-002                    │
├────────────────┼───────┼─────────────────────────────┤
│ in-progress/   │ 1     │ WISH-001                    │
├────────────────┼───────┼─────────────────────────────┤
│ ready-for-qa/  │ 1     │ WISH-005                    │
├────────────────┼───────┼─────────────────────────────┤
│ UAT/           │ 1     │ WISH-006                    │
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

| Feature    | Prefix | Total | Pending | Ready | In Prog | Ready-QA | In QA | Done |
|------------|--------|-------|---------|-------|---------|----------|-------|------|
| wishlist   | WISH   | 8     | 2       | 1     | 1       | 1        | 1     | 2    |
| auth       | AUTH   | 4     | 2       | 1     | 0       | 1        | 0     | 0    |
| sets       | SETS   | 6     | 1       | 1     | 2       | 0        | 1     | 1    |

Total Features: 3
Total Stories: 18
```

## Notes

- Feature directories discovered via `plans/future/*/stories.index.md`
- Status values are case-sensitive as stored
- Common statuses: pending, generated, ready-to-work, in-progress, ready-for-qa, completed, BLOCKED
- Story directories indicate workflow position; index status is authoritative
- In-depth view reads `_implementation/CHECKPOINT.md` for phase progress
- Dependency graph built from `**Depends On:**` fields in index
- Stories with all dependencies completed show as "ready to start"
- Missing `_implementation` folders show "no implementation data"
