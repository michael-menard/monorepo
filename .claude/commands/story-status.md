/story-status [STORY-ID]

Check the status of stories in this project.

-------------------------------------------------------------------------------
ARGUMENT HANDLING
-------------------------------------------------------------------------------

This command accepts ONE OPTIONAL argument:
- `STORY-ID` — a story identifier (e.g., STORY-007, story-007, wrkf-1020, WRKF-1020)
- If no argument is provided, show a summary of all stories by status

-------------------------------------------------------------------------------
INPUTS
-------------------------------------------------------------------------------

Index files (dynamically discovered):
- Find ALL files matching `plans/stories/*.stories.index.md`
- Examples: stories.index.md, wrkf.stories.index.md, future-epic.stories.index.md

Status directories (may contain story subdirectories):
- plans/stories/backlog
- plans/stories/elaboration
- plans/stories/ready-to-work
- plans/stories/in-progress
- plans/stories/QA
- plans/stories/UAT

-------------------------------------------------------------------------------
BEHAVIOR: SINGLE STORY LOOKUP
-------------------------------------------------------------------------------

When a STORY-ID is provided:

1. Normalize the ID to uppercase (e.g., story-007 → STORY-007, wrkf-1020 → WRKF-1020)

2. Find all index files: `plans/stories/*.stories.index.md`

3. Search EACH index file for a section matching `## <STORY-ID>:` (case-insensitive)
   - Example: `## STORY-007:` or `## wrkf-1020:`

4. Extract the status from `**Status:** <status>` line within that section

5. Report:
   - Story ID
   - Index file where found (e.g., "from wrkf.stories.index.md")
   - Status (e.g., completed, generated, pending, in-progress, superseded)
   - Feature name (from `**Feature:**` line if present)
   - Dependencies (from `**Depends On:**` line if present)

6. If story not found in any index:
   - Check if a directory exists at `plans/stories/<STORY-ID>/`
   - If found, report: "Story directory exists but not in any index"
   - If not found, report: "Story not found"

-------------------------------------------------------------------------------
BEHAVIOR: STATUS SUMMARY (NO ARGUMENT)
-------------------------------------------------------------------------------

When no STORY-ID is provided:

1. Find all index files: `plans/stories/*.stories.index.md`

2. For EACH index file found:
   - Extract the epic/project name from the file's title (first `# ` heading)
   - Find all `## <ID>:` sections and their `**Status:**` values
   - Count stories by status

3. Display counts per index file, then combined totals:

   ```
   === stories.index.md ===
   Title: Vercel Migration Stories Index

   | Status      | Count |
   |-------------|-------|
   | completed   | 16    |
   | generated   | 1     |
   | pending     | 2     |

   === wrkf.stories.index.md ===
   Title: wrkf Stories Index — LangGraph Orchestrator

   | Status      | Count |
   |-------------|-------|
   | completed   | 2     |
   | generated   | 5     |
   | pending     | 11    |
   | superseded  | 1     |

   === Combined Totals ===

   | Status      | Count |
   |-------------|-------|
   | completed   | 18    |
   | generated   | 6     |
   | pending     | 13    |
   | superseded  | 1     |

   Total Stories: 38
   Index Files: 2
   ```

4. ALWAYS report stories in status directories using a box-drawing table:

   **IMPORTANT: This must show LIVE DATA from the filesystem, not static content.**

   a. Run `ls` on each status directory to find story subdirectories
   b. Count and list the actual story IDs found in each directory
   c. Use "—" for empty directories
   d. For long lists, abbreviate consecutive IDs with "thru" (e.g., "STORY-009 thru STORY-016")

   **Example format** (data shown is illustrative only — always scan directories for real data):

   ```
   === Stories in Status Directories ===
   ┌────────────────┬───────┬────────────────────────────────────────────────────────────────────────────────────┐
   │   Directory    │ Count │                                      Stories                                       │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ backlog/       │ 3     │ STORY-017, wrkf-1030, wrkf-1021                                                    │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ elaboration/   │ 0     │ —                                                                                  │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ ready-to-work/ │ 2     │ wrkf-1022-A, WORKF-1022-B                                                          │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ in-progress/   │ 0     │ —                                                                                  │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ QA/            │ 1     │ wrkf-1020                                                                          │
   ├────────────────┼───────┼────────────────────────────────────────────────────────────────────────────────────┤
   │ UAT/           │ 5     │ STORY-001 thru STORY-005                                                           │
   └────────────────┴───────┴────────────────────────────────────────────────────────────────────────────────────┘
   ```

   This table is MANDATORY output for every status summary. Scan these directories:
   - `plans/stories/backlog/`
   - `plans/stories/elaboration/`
   - `plans/stories/ready-to-work/`
   - `plans/stories/in-progress/`
   - `plans/stories/QA/`
   - `plans/stories/UAT/`

-------------------------------------------------------------------------------
OUTPUT FORMAT
-------------------------------------------------------------------------------

For single story lookup:
```
Story: STORY-007
Status: completed
Feature: Inspiration Gallery - Image Browsing
Depends On: none
```

For status summary:
- Use markdown tables for index-based counts
- Use box-drawing table (with │ ├ ┼ ─ etc.) for status directories — this is MANDATORY
- Include both index-based counts and directory-based counts
- Show combined totals at the end
- The status directories table must list actual story IDs, not just counts

-------------------------------------------------------------------------------
NOTES
-------------------------------------------------------------------------------

- Index files are discovered dynamically via glob: `plans/stories/*.stories.index.md`
- New epics/projects should create their own `<prefix>.stories.index.md` file
- Status values are case-sensitive as stored in the index
- Common statuses: pending, generated, in-progress, completed, superseded, BLOCKED
- The Progress Summary tables at the top of each index file can be used to verify counts
- Story directories in status folders indicate workflow position, index status is authoritative
