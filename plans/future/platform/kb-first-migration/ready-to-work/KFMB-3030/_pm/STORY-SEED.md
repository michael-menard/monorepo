---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: KFMB-3030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the kb-first-migration plan bootstrapping (plan created 2026-02-26); no active stories are recorded for the platform epic in the baseline.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | KB API that scripts will call instead of reading files |
| Orchestrator YAML Artifacts | `packages/backend/orchestrator/src/artifacts/` | Story state model scripts currently track via filesystem |
| MCP Tools (kb_list_stories, kb_get_plan) | KB server | Already partially integrated in `scripts/lib/resolve-plan.sh` |

### Active In-Progress Work

| Story | Title | Overlap |
|-------|-------|---------|
| KFMB-3010 | Eliminate stories.index.md — Agent Updates | Direct dependency; must complete before KFMB-3030 can start. Once agents no longer write stories.index.md, the file becomes unreliable. |
| KFMB-2020 | KB-Native Bootstrap Setup Leader | In elaboration; bootstrap no longer writes stories.index.md |
| KFMB-2040 | KB-Native Story Generation Pipeline | In elaboration; story gen no longer writes stories.index.md |

### Constraints to Respect

- No barrel files; import directly from source files.
- Shell scripts must remain bash-compatible (macOS zsh + Linux bash, no bash 4.x associative arrays assumed).
- Network availability for KB API calls is not guaranteed (scripts run on developer machines and CI). Graceful degradation or clear error messaging is required.
- `sync-work-order.py` currently uses stories.index.md as one of three data sources (alongside directory scan and PROOF-*.md). The directory scan must remain as the primary source of truth until KFMB-4020 completes stage directory elimination.

---

## Retrieved Context

### Related Endpoints

None (KB access is via MCP tool calls made by subshell `claude -p` invocations, not HTTP endpoints).

### Related Components

| File | Role in Current Story |
|------|----------------------|
| `scripts/lib/resolve-plan.sh` | Already has KB lookup for `resolve_plan()` and partial KB fallback for `discover_stories()`. The `discover_stories()` function is already written to call `kb_list_stories` when no `stories.index.md` is present — this is the primary code path to complete and harden. |
| `scripts/generate-stories.sh` | Sources `resolve-plan.sh`; calls `discover_stories`. References stories.index.md only in comments and log output. Functionally already delegates to `resolve-plan.sh`. |
| `scripts/implement-stories.sh` | Sources `resolve-plan.sh`; calls `discover_stories`. Same pattern as generate-stories.sh. |
| `scripts/implement-dispatcher.sh` | Does NOT source `resolve-plan.sh`. Has its own inline plan resolution and story discovery logic that directly reads `stories.index.md`. This is the largest change in scope. |
| `scripts/sync-work-order.py` | Python script with `scan_index_file()` function that reads stories.index.md for status markers. Must shift to KB query for story status, but directory scan and PROOF-*.md scan remain. |

### Reuse Candidates

- `resolve-plan.sh` `discover_stories()` already has KB fallback code — the implementation just needs the filesystem-first branch removed or demoted.
- `resolve_plan()` in `resolve-plan.sh` already calls `kb_get_plan` as primary with filesystem fallback — same pattern should be applied to `discover_stories()`.
- `implement-dispatcher.sh` inline story discovery logic (lines 136–150) should be refactored to source and call `resolve-plan.sh` functions instead of duplicating.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| KB-first plan resolution with filesystem fallback | `scripts/lib/resolve-plan.sh` | `resolve_plan()` already implements the KB-primary, filesystem-fallback pattern with `claude -p` + `kb_get_plan`. The `discover_stories()` function already has a KB-only branch. These two functions are the direct model for the changes. |
| Script that correctly delegates to resolve-plan.sh | `scripts/generate-stories.sh` | Properly sources `resolve-plan.sh` and calls `discover_stories` — no direct file reads of stories.index.md in functional code paths. Shows the correct integration pattern. |
| KB query via subshell claude invocation | `scripts/lib/resolve-plan.sh` (lines 28–56) | Pattern for calling `claude -p` with `--allowedTools`, capturing JSON output, and parsing with `jq` — this is the established pattern for all KB queries from shell scripts. |

---

## Knowledge Context

### Lessons Learned

No directly applicable lesson-learned entries from past stories were found for shell script KB migration. The KB entries found relate to stories.index.md description drift (cosmetic) rather than migration execution patterns.

The following relevant signal was found:

- **[WINT-1060]** stories.index.md is being deprecated as a source of truth — the direction to use KB as primary is established (referenced in multiple KB entries about WINT-1070).
  - *Applies because*: This story is part of that same migration path; the pattern is expected and planned.

### Blockers to Avoid (from past stories)

- Do not attempt to run KB queries synchronously inside tight polling loops (e.g., `sync-work-order.py`'s main loop). Each `claude -p` invocation to query KB adds 2–5 seconds of latency. Design the Python script to batch KB queries or accept that `sync-work-order.py` may need a different approach (see Non-Goals).
- `implement-dispatcher.sh` has its own inline plan resolution (lines 73–85) that duplicates `resolve-plan.sh` logic. This duplication must be resolved — do not patch both paths separately.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — applies to any test plan for these scripts |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth), ADR-006 (E2E) do not apply — this story has no frontend or API endpoint changes.

### Patterns to Follow

- KB-first with graceful error exit: query KB, fail loudly with helpful error message if KB unreachable. Do not silently fall back to file reads after KFMB-3010 completes (agents will no longer maintain the file).
- Shell KB queries use `claude -p "Call <tool> with ..." --allowedTools <tool> --output-format text` pattern already established in `resolve-plan.sh`.
- Python KB queries will require a different mechanism — either a subprocess `claude -p` call or a direct MCP HTTP call. This needs dev feasibility input.

### Patterns to Avoid

- Do not read `stories.index.md` in functional code paths after this story lands. Comments and documentation may still reference it during transitional period.
- Do not attempt to parse story state from filesystem directory structure in `sync-work-order.py`'s new index-reading code — the directory scan (existing code) already covers that; the index file scan's role was to supplement with status markers from the file's Status column.
- Do not introduce associative arrays in bash (bash 4-only feature, macOS ships bash 3.2).

---

## Conflict Analysis

### Conflict: dependency not yet complete
- **Severity**: warning
- **Description**: KFMB-3030 depends on KFMB-3010 (agent updates), which is currently in backlog with no active work. The scripts cannot safely remove their stories.index.md fallback until agents have stopped writing that file. Implementing KFMB-3030 before KFMB-3010 completes would result in scripts querying a KB that may be missing story entries that agents haven't yet migrated to write.
- **Resolution Hint**: This story is correctly ordered after KFMB-3010 in the plan. Do not implement the "remove filesystem fallback" part until KFMB-3010 is in UAT or done. The story can proceed with adding KB-primary support while retaining filesystem fallback, and the fallback removal becomes a follow-on acceptance criterion.

---

## Story Seed

### Title

Eliminate stories.index.md — Script Updates

### Description

The `scripts/` directory contains five scripts that currently discover story lists and read story state from `stories.index.md` files on disk. As part of the KB-First Migration plan, the knowledge base (via MCP tools `kb_list_stories` and `kb_get_plan`) must become the authoritative source for story discovery and state tracking, eliminating the dependency on static markdown files.

The primary change is in `scripts/lib/resolve-plan.sh`'s `discover_stories()` function, which already has a KB fallback branch — the work is to make KB the primary path and remove or demote the filesystem fallback. The `scripts/implement-dispatcher.sh` script has its own inline story-discovery logic that duplicates `resolve-plan.sh` and must be refactored to delegate to the shared library. The `scripts/sync-work-order.py` script reads the index file's Status column for story state markers — this behavior must be replaced with KB queries, though the directory scan and PROOF-*.md scan paths in that script remain intact as they track physical pipeline stage transitions.

The net outcome is that all five scripts can operate against plans that have no `stories.index.md` file at all.

### Initial Acceptance Criteria

- [ ] AC-1: `scripts/lib/resolve-plan.sh` `discover_stories()` uses `kb_list_stories` as the primary path and does not require `stories.index.md` to be present. The function succeeds for any plan registered in the KB.
- [ ] AC-2: `scripts/generate-stories.sh` continues to work correctly for a plan with no `stories.index.md`. No direct file reads of `stories.index.md` remain in the script (comments excluded).
- [ ] AC-3: `scripts/implement-stories.sh` continues to work correctly for a plan with no `stories.index.md`. No direct file reads of `stories.index.md` remain in the script (comments excluded).
- [ ] AC-4: `scripts/implement-dispatcher.sh` sources `scripts/lib/resolve-plan.sh` and delegates plan resolution and story discovery to the shared library functions. The inline `STORY_PREFIX=$(sed ...)` and inline story parsing loop are removed. The script no longer requires `stories.index.md` to be present.
- [ ] AC-5: `scripts/sync-work-order.py` replaces `scan_index_file()` behavior with KB API queries for story status. The `discover_files()` function no longer searches for `*stories.index.md`. The directory scan and PROOF-*.md scan paths are preserved and continue to function as before.
- [ ] AC-6: Error behavior is clear when the KB is unreachable: scripts exit with a descriptive error message (not a silent fallback to stale file data).
- [ ] AC-7: All five scripts pass a dry-run against the `kb-first-migration` plan (which has a `stories.index.md` present) to confirm backward compatibility during transition.
- [ ] AC-8: Manual smoke test: run `./scripts/generate-stories.sh kb-first-migration --dry-run` against a plan with `stories.index.md` removed; confirm story list is discovered from KB.

### Non-Goals

- Do not remove or delete any `stories.index.md` files — that is handled by KFMB-6020 (Dead Code Removal).
- Do not update any agents or Claude commands — that is KFMB-3010.
- Do not eliminate the filesystem stage-directory scan in `sync-work-order.py` — that belongs to KFMB-4020.
- Do not change how story state is written (the scripts call claude commands that move directories; the directory-move-based state transition model is preserved until KFMB-4010/KFMB-4020).
- Do not add `kb_update_story_status` calls to the scripts — this story only covers read/discovery paths, not write paths.
- Do not modify work order files (`WORK-ORDER*.md`) — `sync-work-order.py`'s work order update logic is out of scope.

### Reuse Plan

- **Components**: `resolve_plan()` and the existing KB-query subshell pattern in `scripts/lib/resolve-plan.sh` — extend and harden rather than rewrite.
- **Patterns**: `claude -p "Call <tool> with ..." --allowedTools <tool> --output-format text` + `jq` parsing, already used in `resolve-plan.sh`.
- **Packages**: No TypeScript package changes; pure shell/Python scripting work.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Testing shell scripts requires dry-run invocations and log output inspection. All five scripts support `--dry-run` flags (except `sync-work-order.py`, which is a watcher). Test cases should include: (1) plan with no stories.index.md present, KB available — expect success; (2) plan with no stories.index.md, KB unavailable — expect clean error exit; (3) plan with stories.index.md present — expect backward-compatible behavior.
- `sync-work-order.py` cannot be tested with `--dry-run`. A manual one-cycle smoke test with a small plan against a live KB is the appropriate test approach.
- ADR-005 applies: any UAT involving these scripts must use a real KB instance, not mocks.

### For UI/UX Advisor

Not applicable — this story has no frontend or UI changes. All changes are to shell and Python scripts run by developers and CI.

### For Dev Feasibility

- The largest implementation risk is `sync-work-order.py`. This Python script cannot easily invoke `claude -p` for every polling cycle without significant latency (each `claude -p` call takes 2–5 seconds and requires a running Claude CLI). Two alternatives should be evaluated: (1) call a direct MCP HTTP endpoint if the KB server exposes one; (2) cache story states from KB at startup and refresh periodically rather than per-cycle. The existing `scan_index_file()` function is only called once per cycle — a cached KB query replacing it is feasible.
- `implement-dispatcher.sh` has completely standalone plan resolution logic (does not source `resolve-plan.sh`) — this is the highest effort change as it requires both refactoring the script structure AND migrating to KB. Confirm whether `implement-dispatcher.sh` should fully adopt `resolve-plan.sh` or whether a lighter approach (just replacing the story list grep) is acceptable.
- Canonical references for subtask decomposition:
  - `scripts/lib/resolve-plan.sh` lines 76–132 — the `discover_stories()` function with its two branches is the primary implementation target.
  - `scripts/implement-dispatcher.sh` lines 69–150 — the inline plan resolution + story discovery that must be replaced.
  - `scripts/sync-work-order.py` lines 110–187 — `discover_files()` and `scan_index_file()` are the two functions to change.
