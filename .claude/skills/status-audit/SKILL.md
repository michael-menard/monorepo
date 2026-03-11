---
name: status-audit
description: Audit story statuses across filesystem, KB, and git worktrees. Detects stale statuses, duplicate directories, orphaned worktrees, unprocessed deferred KB writes, and missing KB artifacts. Resolves conflicts by picking the furthest-progressed directory as ground truth.
created: 2026-02-23
updated: 2026-02-23
version: 1.0.0
type: utility
---

# /status-audit — Story Status Reconciliation

> **CRITICAL EXECUTION RULE: Do NOT spawn sub-agents (Task tool) for this skill. Call all MCP tools and Bash commands directly in the main conversation. Sub-agents do not have reliable access to the knowledge-base MCP server.**

## Usage

```
/status-audit [--fix] [--epic=platform] [--story=STORY-ID]
```

**Examples:**
```bash
/status-audit                          # Full audit of all platform stories (report only)
/status-audit --fix                    # Audit + apply all KB corrections
/status-audit --story=KBAR-0040        # Audit a single story
/status-audit --epic=platform --fix    # Audit + fix all platform stories
```

---

## What It Does

Performs a five-part audit and optionally fixes all detected issues:

| Section | What It Checks |
|---------|---------------|
| **A. Legacy Stage Directories** | Stories that still exist in old-style stage dirs (`backlog/`, `in-progress/`, etc.) — flags for migration to flat `stories/` layout |
| **B. KB State Mismatch** | Stories in flat `stories/` on disk vs KB `state` field — flags stories on disk not in KB, and vice versa |
| **C. Orphaned Worktrees** | Active `git worktree list` entries vs `worktree_list_active` KB records |
| **D. Deferred KB Writes** | `DEFERRED-KB-WRITES.yaml` files on disk that were never processed |
| **E. Artifact Sync** | Key artifacts on disk (`CHECKPOINT.yaml`, `EVIDENCE.yaml`, `QA-VERIFY.yaml`) vs KB artifact records |

**Source of truth:** The KB is the authoritative source for story state. Filesystem directories are for artifact storage only — status is never inferred from directory location.

---

## Execution Steps

### Step 0 — Parse Arguments

Extract `--fix` flag, `--epic` (default: `platform`), `--story` (optional single story filter).

---

### Step 1 — Git Worktree Scan

Run via Bash tool:

```bash
git worktree list
```

Parse output into a map: `{ path → branch }`. Extract story IDs from branch names matching pattern `story/STORY-ID` or `story/STORY-ID-*`.

Example:
```
/repo/tree/story/KBAR-0050  e2d613a4 [story/KBAR-0050]   → KBAR-0050
/repo/tree/story/WINT-1120  56f9fede [story/WINT-1120]    → WINT-1120
```

Store as `GIT_WORKTREES`: `{ storyId → { path, branch, commit } }`

---

### Step 2 — KB Worktree Query

Call MCP tool directly:

```
mcp__knowledge-base__worktree_list_active({})
→ KB_WORKTREES: { storyId → { path, branch, status } }
```

If tool fails, set `KB_WORKTREES = {}` and note in output.

---

### Step 3 — Filesystem Scan

**Scan A: Flat stories/ directories (canonical)**

Run via Bash tool to find all story directories in the flat layout:

```bash
find plans/future/platform -type d \
  -regextype posix-extended \
  -regex '.*/stories/[A-Z]+-[0-9]+$'
```

For each path found, extract:
- `story_id`: last path segment (e.g., `KBAR-0040`)
- `story_path`: full path (e.g., `plans/future/platform/wint/stories/KBAR-0040`)

Store as `DISK_STORIES`: `{ storyId → { story_path } }`

**Scan B: Legacy stage directories (flag for migration)**

Run via Bash tool to find stories still in old-style stage directories:

```bash
find plans/future/platform -mindepth 2 -maxdepth 5 -type d \
  -regextype posix-extended \
  -regex '.*/(backlog|created|elaboration|ready-to-work|in-progress|needs-code-review|failed-code-review|ready-for-qa|failed-qa|UAT|completed)/[A-Z]+-[0-9]+$'
```

For each path found, extract:
- `story_id`: last path segment
- `stage_dir`: parent directory name
- `legacy_path`: full path

Store as `LEGACY_STORIES`: `{ storyId → { legacy_path, stage_dir } }`. These are flagged in Section A.

If `--story` flag is set, filter both scans to just that story ID.

---

### Step 4 — KB Story Query

Call MCP tool directly:

```
mcp__knowledge-base__kb_list_stories({
  epic: "platform",
  limit: 100
})
```

If result has 100 stories (may be paginated), call again with `offset: 100`, repeat until exhausted.

Store as `KB_STORIES`: `{ storyId → { state, story_dir, priority, blocked } }`

---

### Step 5 — Deferred KB Writes Scan

Run via Bash tool:

```bash
find plans/future/platform -name "DEFERRED-KB-WRITES.yaml" -type f
```

For each file found, read the first few lines to extract:
- `deferred_at` timestamp
- `reason`
- `story_id` from the writes array

Store as `DEFERRED_WRITES`: `[ { file_path, story_id, deferred_at, reason } ]`

---

### Step 6 — Artifact Scan

For each story in `DISK_STORIES`, check for key artifact files in the canonical path and its `_implementation/` subdirectory:

```bash
# For each canonical_path:
ls {canonical_path}/
ls {canonical_path}/_implementation/ 2>/dev/null
```

Key artifacts to flag if present on disk:
- `CHECKPOINT.yaml` or `_implementation/CHECKPOINT.yaml`
- `EVIDENCE.yaml` or `_implementation/EVIDENCE.yaml`
- `QA-VERIFY.yaml` or `_implementation/QA-VERIFY.yaml`
- `DEFERRED-KB-WRITES.yaml` (already in Step 5, skip here)

Then check KB artifacts:

```
mcp__knowledge-base__kb_list_artifacts({ story_id: STORY_ID })
```

Only call `kb_list_artifacts` for stories that have at least one key artifact on disk and are in `DISK_STORIES`. Batch these calls — do not call for every story.

Compare disk artifacts vs KB artifact `artifact_type` values:
- `CHECKPOINT.yaml` → type `checkpoint`
- `EVIDENCE.yaml` → type `evidence`
- `QA-VERIFY.yaml` → type `qa_gate`

Flag stories where disk artifacts exist but no corresponding KB artifact type is found.

---

### Step 7 — Build Report

#### Section A: Legacy Stage Directories

For each story in `LEGACY_STORIES`:

```
STORY-ID  legacy: in-progress/STORY-ID  → needs migration to stories/STORY-ID/
```

Stories in legacy directories should be manually moved to `{FEATURE_DIR}/stories/{STORY_ID}/` and the KB updated accordingly. Run with `--fix` to update KB state from these directories.

#### Section B: KB State Mismatches

Compare `DISK_STORIES` vs `KB_STORIES`:

- If story is in `DISK_STORIES` but NOT in `KB_STORIES`: flag as **Not in KB** (on disk, not registered)
- If story is in `KB_STORIES` but NOT in `DISK_STORIES`: flag as **No directory** (in KB, no story directory)
- If `KB_STORIES[id].story_dir` doesn't match the path in `DISK_STORIES`: flag as **Path mismatch**

Also include stories from `LEGACY_STORIES` in KB comparisons — their KB state is preserved but directory needs migration.

Also flag if `KB_STORIES[id].story_dir` doesn't match the canonical path on disk.

#### Section C: Orphaned Worktrees

Cross-reference `GIT_WORKTREES` vs `KB_WORKTREES`:
- In git but not in KB → **Untracked worktree** (git has it, KB doesn't know)
- In KB but not in git → **Orphaned KB record** (KB thinks it's active, git worktree is gone)
- In both → OK (show as healthy)

#### Section D: Deferred KB Writes

List all `DEFERRED-KB-WRITES.yaml` files with their age (current date minus `deferred_at`) and story ID.

#### Section E: Artifact Sync Gaps

List stories where disk artifacts exist but KB has no corresponding artifact record.

---

### Step 8 — Output Format

```
═══════════════════════════════════════════════════════
STATUS AUDIT — plans/future/platform
Scanned: {N} stories on disk  |  {M} in KB  |  {date}
═══════════════════════════════════════════════════════

── A. LEGACY STAGE DIRECTORIES ({count} stories) ─────────────────────

  KBAR-0040  legacy: in-progress/KBAR-0040   → migrate to stories/KBAR-0040/
  LNGG-0030  legacy: UAT/LNGG-0030           → migrate to stories/LNGG-0030/
  ...

── B. KB STATE MISMATCHES ({count} stories) ─────────────────────────

  Story       Disk Dir        Disk State    KB State       Action
  ──────────  ──────────────  ────────────  ─────────────  ──────────────
  INFR-0040   UAT/            in_qa         ready_for_qa   UPDATE NEEDED
  KBAR-0020   UAT/            in_qa         ready          UPDATE NEEDED
  LNGG-0040   UAT/            in_qa         (not in KB)    INSERT NEEDED
  WINT-0110   UAT/            in_qa         ready          UPDATE NEEDED
  ...

── C. WORKTREES ({git_count} in git, {kb_count} in KB) ──────────────

  Story       Git Worktree                    KB Record   Status
  ──────────  ──────────────────────────────  ──────────  ───────────────
  KBAR-0050   tree/story/KBAR-0050            ✗ missing   UNTRACKED
  WINT-1120   tree/story/WINT-1120            ✗ missing   UNTRACKED
  WKFL-007    tree/story/WKFL-007             ✗ missing   UNTRACKED
  ...

── D. DEFERRED KB WRITES ({count} files) ────────────────────────────

  File                                              Story      Age     Reason
  ────────────────────────────────────────────────  ─────────  ──────  ──────────────────────────
  UAT/INFR-0040/DEFERRED-KB-WRITES.yaml            INFR-0040  10 days KB tools unavailable in PM
  ...

── E. ARTIFACT SYNC GAPS ({count} stories) ──────────────────────────

  Story       Disk Artifacts                    KB Artifacts   Missing in KB
  ──────────  ────────────────────────────────  ─────────────  ─────────────────
  INFR-0041   CHECKPOINT, EVIDENCE, QA-VERIFY   (none)         checkpoint, evidence, qa_gate
  AUDT-0010   CHECKPOINT, EVIDENCE              checkpoint     evidence
  ...

═══════════════════════════════════════════════════════
SUMMARY
  Legacy stage dirs:   {A_count} stories need migration
  KB state mismatches: {B_count} (updates needed)
  Orphaned worktrees:  {C_count}
  Deferred writes:     {D_count} files
  Artifact gaps:       {E_count} stories

{if --fix}
Applying fixes...
{else}
Run with --fix to apply all KB corrections.
{/if}
═══════════════════════════════════════════════════════
```

---

### Step 9 — Apply Fixes (only if `--fix` flag is set)

Apply in this order:

#### Fix A: Legacy Stage Directories

Legacy stage directories cannot be auto-migrated (requires moving files and potentially active work). Flag as:

```
⚠ LEGACY directories require manual migration:
  For each story: mv {legacy_path} {FEATURE_DIR}/stories/{STORY_ID}/
  Then update KB story_dir:
    kb_update_story({ story_id, story_dir: "{FEATURE_DIR}/stories/{STORY_ID}" })
```

List each legacy path for easy access.

#### Fix B: KB State + story_dir Updates

For each mismatch in Section B:

```
mcp__knowledge-base__kb_update_story({
  story_id: STORY_ID,
  state: kb_expected_state,
  story_dir: canonical_path
})
```

For stories **not in KB** (INSERT NEEDED): use `kb_get_story` first to confirm absence, then use the appropriate insert tool. If no insert tool is available, flag for manual action.

#### Fix C: Worktree Records

For **UNTRACKED** (in git, not in KB): these are legitimate active worktrees — do NOT auto-register since we don't know if they're truly in-progress or abandoned. Instead, flag them with instructions:

```
⚠ UNTRACKED worktrees require manual verification:
  Run /wt-status to see full worktree health, then
  use /wt-finish or /wt-cleanup to resolve.
```

For **ORPHANED KB records** (in KB but not in git): call `mcp__knowledge-base__worktree_mark_complete` for each.

#### Fix D: Deferred Writes

These cannot be auto-applied here because the write payloads vary. Instead, output:

```
⚠ DEFERRED-KB-WRITES.yaml files must be processed manually:
  Run /kb-compress or read each file and apply writes via kb_update_story.
```

List each file path for easy access.

#### Fix E: Artifact Sync

Artifact content sync is out of scope for auto-fix (requires reading and re-uploading full file content). Flag as:

```
⚠ Artifact gaps noted. To sync, run /qa-verify-story or /checkpoint for each affected story,
  which will re-write artifacts to KB as part of normal workflow.
```

---

### Step 10 — Post-Fix Summary

After applying fixes, show:

```
Fix Results:
  ✓ {N} KB story_dir paths corrected
  ✓ {N} orphaned worktree KB records marked complete
  ⚠ {N} legacy stage directories need manual migration
  ⚠ {N} untracked worktrees need manual review (/wt-status)
  ⚠ {N} deferred write files need manual processing
  ⚠ {N} artifact gaps need re-verification
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Legacy story in `UAT/` or other stage dir | Flagged in Section A as needing migration to `stories/` layout |
| Nested story dir (e.g., `stories/KBAR-0020/KBAR-0020`) | Skip inner dir — it's an artifact folder |
| Story in git worktree but no active work / clearly abandoned | Flag for manual review, don't auto-remove |
| `kb_list_stories` pagination | Keep calling with increasing offset until total exhausted |
| Story on disk but `--story` filter doesn't match | Skip |
| KB `state` is `completed` but story is in a legacy stage dir | KB wins — KB is the authoritative source. Flag dir for migration. |
