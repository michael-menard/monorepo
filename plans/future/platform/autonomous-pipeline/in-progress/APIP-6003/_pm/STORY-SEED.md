---
generated: "2026-03-01"
baseline_used: "pipeline-audit-2026-03-01"
baseline_date: "2026-03-01"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: APIP-6003

## Reality Context

### Problem Statement

The autonomous pipeline uses two truth sources for story state:
1. **Filesystem directories** (ready-to-work/, in-progress/, needs-code-review/, etc.) — used by `implement-stories.sh` to determine which phase to run next
2. **Knowledge Base (MCP)** — used by `/status-audit`, `/story-status`, and planning tools for visibility and reporting

These two sources drift apart because:
- Pipeline scripts move directories but don't always update KB
- Manual interventions update one but not the other
- Failed transitions leave stories in unexpected locations
- Duplicate directories appear when stories exist in multiple stages

### Current State (2026-03-01)

| Story | KB State | Filesystem Location | Drift |
|-------|----------|-------------------|-------|
| APIP-5001 | completed | needs-code-review + in-progress | KB ahead, FS has duplicates |
| APIP-5004 | completed | ready-for-qa + in-progress | KB ahead, FS has duplicates |
| APIP-5006 | ready | failed-code-review | FS ahead, KB stale |
| APIP-1040 | in-progress | failed-code-review | FS ahead, KB stale |
| APIP-2030 | ready-for-qa | failed-code-review | FS ahead, KB stale |
| APIP-3010 | ready-for-code-review | failed-code-review | FS ahead, KB stale |

---

## Story Seed

### Title

KB-Filesystem State Reconciliation

### Description

**Context**: The pipeline relies on filesystem directories as the runtime truth for "where is this story right now" and the KB as the persistent truth for "what is this story's metadata and history." When these drift apart, the pipeline makes wrong decisions and operators get misleading status reports.

**Problem**: No automatic reconciliation runs. The `/status-audit` skill exists but is never called by the pipeline. Manual cleanup is needed every few pipeline runs.

**Proposed Solution**:

1. **Post-batch reconciliation**: After `implement-stories.sh` finishes a batch, run a reconciliation sweep that:
   - Scans all stage directories to find each story's current filesystem location
   - Queries KB for each story's recorded state
   - Identifies mismatches (KB behind, KB ahead, duplicates)
   - Applies fixes based on authority rules

2. **Authority rules**:
   - **Filesystem is authoritative for current stage**: If FS says `failed-code-review` but KB says `ready`, update KB to match FS
   - **KB is authoritative for metadata**: Story title, dependencies, priority come from KB
   - **Duplicate resolution**: Keep the most-progressed directory (by stage order), remove others. If both have artifacts, merge artifacts into the kept directory

3. **Duplicate cleanup**: Detect stories existing in multiple stage directories. Keep the one at the furthest-progressed stage. Archive (don't delete) the duplicate.

4. **Audit trail**: Write RECONCILIATION.yaml listing all corrections made.

### Acceptance Criteria

- [ ] AC-1: A `reconcile_kb_filesystem()` function scans all stage directories and KB, identifies mismatches, and returns a list of corrections needed
- [ ] AC-2: For each mismatch where FS is ahead of KB: KB story status is updated to match the filesystem stage via `kb_update_story_status`
- [ ] AC-3: For each mismatch where KB is ahead of FS (story completed in KB but directory still exists in earlier stage): directory is moved to the KB-indicated stage (e.g., move to UAT/ if KB says completed)
- [ ] AC-4: Duplicate directories are resolved: most-progressed copy kept, others archived to `.archive/` with timestamp
- [ ] AC-5: stories.index.md is updated to reflect the reconciled state
- [ ] AC-6: RECONCILIATION.yaml is written with: `{timestamp, corrections[], duplicates_resolved[], kb_updates[], index_updates[]}`
- [ ] AC-7: Reconciliation runs automatically at the end of each `implement-stories.sh` batch (after all stories processed)
- [ ] AC-8: Reconciliation can be triggered standalone: `./scripts/implement-stories.sh --reconcile`
- [ ] AC-9: The `/status-audit` skill output is consumed where possible to avoid duplicating detection logic
- [ ] AC-10: Reconciliation is idempotent — running twice produces the same result without duplicating corrections

### Non-Goals

- Changing which source is authoritative (filesystem for stage, KB for metadata — this is settled)
- Real-time sync (event-driven KB updates on every directory move) — batch reconciliation is sufficient
- Migrating the pipeline to be KB-first instead of filesystem-first (future work, out of scope)
- Modifying the KB schema or MCP tools

### Technical Approach

1. Build a `scan_filesystem_state()` function — walks stage directories, returns map of {story_id → stage}
2. Build a `scan_kb_state()` function — calls `kb_list_stories` via claude -p, returns map of {story_id → status}
3. Compare maps, classify each mismatch by type (fs-ahead, kb-ahead, duplicate, orphan)
4. Apply corrections per authority rules
5. Wire into implement-stories.sh cleanup phase and add --reconcile flag
6. Leverage existing `cleanup_duplicate_stages()` function (extend it with archival instead of deletion)
