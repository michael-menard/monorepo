---
generated: "2026-02-26"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: KFMB-6010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: KB was unavailable during seed generation — lesson search skipped. Lessons from dependency story ELAB artifacts were used as a proxy. All ADR data loaded from filesystem.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `resolve-plan.sh` KB-first plan resolution | `scripts/lib/resolve-plan.sh` | Contains `resolve_plan()` (KB-primary, filesystem-fallback) and `discover_stories()` (KB-primary after KFMB-3030). Primary pattern template. |
| `generate-stories.sh` stage detection | `scripts/generate-stories.sh` | After KFMB-4020: has `[KB-FIRST]` / `[KB-FIRST FALLBACK]` KB state detection for `ALREADY_GENERATED` / `ALREADY_ELABORATED`. After KFMB-5030: ALREADY_ELABORATED uses KB artifact existence not filesystem. |
| `implement-stories.sh` state functions | `scripts/implement-stories.sh` | After KFMB-4020: `find_story_dir`, `is_elaborated`, `is_implemented`, `is_reviewed`, `is_completed` use KB-first with filesystem fallback. After KFMB-5030: artifact-based functions use KB. |
| `implement-dispatcher.sh` | `scripts/implement-dispatcher.sh` | After KFMB-3030: sources `resolve-plan.sh` (removes inline discovery). After KFMB-4020: `is_elaborated()` and EVIDENCE check KB-first. After KFMB-5030: artifact checks use KB exclusively. |
| `sync-work-order.py` | `scripts/sync-work-order.py` | After KFMB-3030: `scan_index_file()` replaced by KB query; `discover_files()` no longer searches `*stories.index.md`. Still uses `scan_directories()` and `scan_proof_files()`. |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated artifact schemas (story, knowledge-context, checkpoint, scope, plan, evidence, review, qa-verify, audit-findings). The canonical artifact type definitions. |
| KB MCP Server | `apps/api/knowledge-base/` | PostgreSQL at port 5433 with `knowledgeEntries` table and `stories` table with `state` column. All story state transitions and artifact reads/writes go through MCP tools. |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|-------------|
| KFMB-3030 | Eliminate stories.index.md — Script Updates | Direct predecessor: modifies same scripts. KFMB-6010 inherits the KB-first discovery from this story. |
| KFMB-4020 | Stage Directory Elimination — precondition-check, context-init, and Script State Detection | Direct predecessor: modifies `generate-stories.sh`, `implement-stories.sh` for KB-first state detection. KFMB-6010 removes the remaining filesystem fallbacks from these same functions. |
| KFMB-5030 | Migrate _implementation/ Command Orchestrators | Direct predecessor: removes `_implementation/ELAB.yaml`, `EVIDENCE.yaml`, `REVIEW.yaml` filesystem checks from scripts. KFMB-6010 removes the remaining filesystem fallbacks. |

### Constraints to Respect

- **KB availability** is now a hard dependency (KFMB-3030 Note): if KB is unavailable, scripts currently log warnings and fall back to filesystem. KFMB-6010 may remove these fallbacks — but only after verifying the upstream KFMB stories have confirmed KB writes are stable.
- **Bash 3.2 compatibility** (from KFMB-3030): no associative arrays; all array patterns use indexed arrays or positional args. macOS ships bash 3.2.
- **ADR-005**: UAT must use real KB instance at port 5433. No mocking in integration tests.
- **No TypeScript / no HTTP endpoints** (confirmed by story.yaml): script and command file changes only.
- **Protected areas**: all production DB schemas in `packages/backend/database-schema/` and `@repo/db` client API surface are off-limits.

---

## Retrieved Context

### Related Endpoints

None. This story has no HTTP API endpoints. All state reads/writes use MCP tool calls or `claude -p` subprocess invocations.

### Related Components

| Component | Type | Current State After Dependencies | Relevance to KFMB-6010 |
|-----------|------|----------------------------------|------------------------|
| `scripts/lib/resolve-plan.sh` | Shell library | KB-primary, filesystem-fallback (both `resolve_plan` and `discover_stories`) | KFMB-6010 may promote KB to sole path (remove filesystem fallback) after KFMB-3030 confirms KB is stable |
| `scripts/generate-stories.sh` | Shell script | KB-first state detection with `[KB-FIRST FALLBACK]` for filesystem | KFMB-6010 removes or conditions the fallback path |
| `scripts/implement-stories.sh` | Shell script | KB-first state functions with filesystem fallback | KFMB-6010 hardens or removes filesystem fallback |
| `scripts/implement-dispatcher.sh` | Shell script | Sources `resolve-plan.sh`, KB-first state detection | KFMB-6010 completes migration |
| `scripts/sync-work-order.py` | Python script | `scan_index_file()` replaced by KB query; `scan_directories()` and `scan_proof_files()` remain | KFMB-6010 may remove or refactor the remaining filesystem-based status detection (`scan_directories`) |
| `scripts/lib/resolve-plan.sh` `discover_stories()` | Shell function | KB-primary post-KFMB-3030; filesystem fallback retained until KFMB-3010 is done | KFMB-6010 can consider removing filesystem fallback from `discover_stories()` if KFMB-3010 is complete |

### Reuse Candidates

- `resolve_plan()` and `discover_stories()` in `scripts/lib/resolve-plan.sh` — established `claude -p` + `--allowedTools` + `jq` pattern for KB queries from shell scripts
- `[KB-FIRST]` / `[KB-FIRST FALLBACK]` logging pattern added by KFMB-4020 — consistent audit trail already wired in
- `kb_state_query()` helper function (defined in KFMB-4020 architecture notes) — reuse or extract to `scripts/lib/kb-state.sh` (KFMB-4020 OPP-2 identified this as a KFMB-6010 candidate)
- `scan_directories()` and `scan_proof_files()` in `sync-work-order.py` — these remain in scope and should NOT be removed (they fill legitimate gaps that the KB does not cover: real-time filesystem state for worktrees and proof detection)
- Batch `kb_list_stories` query pattern from KFMB-5030 ST-2 — one call per run, associative array for in-memory lookups

### Similar Stories

- KFMB-3030 (direct predecessor, ready-to-work): detailed subtask decomposition for script KB-first migration is a template
- KFMB-4020 (direct predecessor, ready-to-work): KB-first state detection pattern in shell scripts with structured fallback
- KFMB-5030 (direct predecessor, elaboration): artifact-based readiness detection without filesystem paths

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| KB-first pattern with filesystem fallback (shell) | `scripts/lib/resolve-plan.sh` | Authoritative template: `resolve_plan()` and `discover_stories()` demonstrate the exact `claude -p` subprocess pattern, `|| true` error wrapping, `-z` null check, and filesystem fallback. All script changes should follow this template. |
| Filesystem fallback removal decision point | `scripts/lib/resolve-plan.sh` `discover_stories()` | The KFMB-3030 change promoted KB to primary but explicitly retained filesystem fallback pending KFMB-3010 completion. KFMB-6010 is the story that resolves this pending condition. |
| KB query pattern from Python script | `scripts/sync-work-order.py` `scan_index_file()` replacement (added by KFMB-3030) | Shows the `subprocess.run(['claude', '-p', ...])` pattern for KB queries in Python — the model for any remaining sync-work-order.py modernization. |
| Batch KB story state query | `scripts/implement-stories.sh` state detection (added by KFMB-5030) | Batch `kb_list_stories` → associative array → in-memory lookups; avoids N-story subprocess latency in poll loops. |

---

## Knowledge Context

### Lessons Learned

Note: KB was unavailable during seed generation. The following lessons are derived from the ELAB.yaml artifacts of dependency stories (KFMB-3030, KFMB-4020, KFMB-5030) which document gaps and opportunities relevant to KFMB-6010.

- **[KFMB-3030 GAP-1]** `check_untracked_stories()` and `scan_all_index_stories()` in `sync-work-order.py` become silent no-ops when `stories.index.md` is removed. These are explicitly deferred to KFMB-6020 (dead code removal) and KFMB-6010. (category: pattern)
  - *Applies because*: KFMB-6010 must decide whether to remove these dormant functions, convert them to KB queries, or document them as intentionally dormant stubs.

- **[KFMB-3030 OPP-1]** `scan_all_index_stories()` and `check_untracked_stories()` are cleanup candidates — logged at KB entry `1ef272ff-9648-4c45-82e2-c616f466df4c`. (category: pattern)
  - *Applies because*: KFMB-6010 scope explicitly includes this cleanup. These functions should be converted to KB queries or removed.

- **[KFMB-3030 OPP-2]** Usage comments in `generate-stories.sh` and `implement-stories.sh` reference `stories.index.md`. After KFMB-6010, these become misleading. (category: pattern)
  - *Applies because*: KFMB-6010 is the story that finalizes script modernization; comment cleanup is appropriate here or in KFMB-6020.

- **[KFMB-4020 OPP-2]** The `kb_state_query` bash helper function described in KFMB-4020 Architecture Notes will be duplicated in `generate-stories.sh` and `implement-stories.sh`. A future refactoring could extract it to `scripts/lib/kb-state.sh` for DRY compliance. Logged at KB entry `5d1e871c-1ee6-4991-8c0b-59d7fb1ef6f8`. (category: architecture)
  - *Applies because*: KFMB-6010 is the designated story to consolidate this deduplication. Extracting `kb-state.sh` is a strong candidate AC.

- **[KFMB-5030 finding]** `implement-dispatcher.sh` poll loop performance degradation with per-story `claude -p` calls. Mitigation: batch `kb_list_stories` call per poll cycle, stored in associative array. (category: performance)
  - *Applies because*: Any remaining per-story calls in KFMB-6010 scope should use the batch pattern.

- **[KFMB-5030 finding]** KFMB-4020 and KFMB-5030 both target `precondition-check.md`, `context-init.md`, and script state detection. Scope coordination required to avoid conflicting edits. (category: workflow)
  - *Applies because*: By the time KFMB-6010 starts, these conflicts will be resolved, but the ordering of subtask merges should be verified.

### Blockers to Avoid (from past stories)

- Do not start KFMB-6010 implementation until KFMB-3030, KFMB-4020, and KFMB-5030 are all at `needs-code-review` or later — their script changes must be merged before KFMB-6010 can safely remove fallbacks.
- Do not remove `scan_directories()` or `scan_proof_files()` from `sync-work-order.py` — these detect real filesystem state (worktrees, PROOF files) that the KB does not replicate.
- Do not remove the filesystem fallback from `discover_stories()` until KFMB-3010 (Eliminate stories.index.md — Agent Updates) is confirmed complete (KFMB-3030 explicitly deferred this removal).
- KB unavailability must not crash scripts — even in the "KB exclusive" target state, a clear error exit (not a hang) is required.
- `sync-work-order.py` has no `--dry-run` flag; live KB at port 5433 is required for UAT verification (ADR-005).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration and UAT verification requires real KB at port 5433. No mock KB. Script dry-runs (for shell scripts) are acceptable for functional verification; `sync-work-order.py` requires live KB. |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — `frontend_impacted: false` for this story. No Playwright E2E tests required. |

### Patterns to Follow

- `claude -p "Call <tool> with ..." --allowedTools <tool> --output-format text 2>/dev/null) || true` — wrapping KB calls to prevent crash on KB unavailability
- `-z "$raw"` check after KB subprocess — guard before jq parsing
- `[KB-FIRST] state from DB: {state}` / `[KB-FIRST FALLBACK] using filesystem` — logging pattern for auditability
- Batch `kb_list_stories` per-run rather than per-story `claude -p` calls in poll loops
- Filesystem fallback removal gated on upstream story completion confirmation (not a flag, a dependency check)

### Patterns to Avoid

- Removing `scan_directories()` / `scan_proof_files()` from `sync-work-order.py` — these are legitimate filesystem reads for worktree and PROOF detection
- Per-story `claude -p` calls in `implement-dispatcher.sh` poll loop — use batch query
- Silent empty-list production on KB failure — always exit non-zero with descriptive error message when KB is the sole source of truth
- Mixing KFMB-6010 scope with KFMB-6020 (dead code removal, documentation updates) — keep the boundary clean

---

## Conflict Analysis

### Conflict: dependency_not_complete
- **Severity**: warning
- **Description**: KFMB-3030 is `ready-to-work` (not yet implemented), KFMB-4020 is `ready-to-work`, and KFMB-5030 is in `elaboration`. KFMB-6010 is Backlog and cannot be elaborated or implemented until all three are at `needs-code-review` or later. The story is correctly in Backlog; this is expected.
- **Resolution Hint**: Confirm all three dependencies are merged before beginning elaboration of KFMB-6010.

### Conflict: scope_boundary_with_KFMB-6020
- **Severity**: warning
- **Description**: KFMB-6020 (Dead Code Removal and Documentation Updates, status: Backlog) shares scope with KFMB-6010. Dead functions like `check_untracked_stories()`, `scan_all_index_stories()` are noted as KFMB-6020 candidates, but the KFMB-3030 ELAB explicitly says KFMB-6010 may be the right story for this cleanup too. Scope boundary must be explicitly resolved in ACs.
- **Resolution Hint**: KFMB-6010 ACs should be explicit about what is in scope vs. deferred to KFMB-6020. Recommended partition: KFMB-6010 = functional modernization (remove fallbacks, consolidate kb-state.sh, convert dead functions to KB queries); KFMB-6020 = documentation updates, comment cleanup, removing deprecated helper stubs.

### Conflict: filesystem_fallback_removal_gating
- **Severity**: warning
- **Description**: The filesystem fallback in `discover_stories()` was explicitly NOT removed by KFMB-3030 pending KFMB-3010 (Agent Updates) completing. By the time KFMB-6010 begins, KFMB-3010 may or may not be complete. If KFMB-3010 is not done, the fallback removal is blocked.
- **Resolution Hint**: Add an explicit precondition check in KFMB-6010 ACs: verify KFMB-3010 status before removing `discover_stories()` filesystem fallback. If not done, document the fallback removal as deferred.

---

## Story Seed

### Title

Script Modernization — Remove Filesystem Fallbacks and Consolidate KB-First Helpers

### Description

**Context**: The KB-First Migration plan has, across Phases 3 and 4, progressively moved all script logic to KB-first patterns with graceful filesystem fallbacks. By the time KFMB-6010 starts, every automation script (`generate-stories.sh`, `implement-stories.sh`, `implement-dispatcher.sh`, `sync-work-order.py`) and shared library (`resolve-plan.sh`) will query the KB as the primary source of truth, with filesystem directory scans retained as resilience fallbacks for KB unavailability.

**Problem**: The fallback paths add maintenance burden and create split-brain risk: a script running during a KB outage can silently produce state based on stale filesystem data. As KB write stability is confirmed by the completion of KFMB-4010 and KFMB-4020 (which ensure the `stories.state` DB column is reliably written on every state transition), the filesystem fallbacks become safety-critical scaffolding that no longer needs to hold up the structure.

Additionally, the `kb_state_query()` bash helper is currently duplicated across `generate-stories.sh` and `implement-stories.sh` (both added the same function independently in KFMB-4020). The KFMB-4020 ELAB explicitly identified extraction to `scripts/lib/kb-state.sh` as a KFMB-6010 candidate.

Finally, `sync-work-order.py` has two dormant functions — `check_untracked_stories()` and `scan_all_index_stories()` — that became no-ops after KFMB-3030 removed the `*stories.index.md` glob from `discover_files()`. These should either be replaced with KB queries or removed cleanly.

**Proposed Solution**: Remove the filesystem fallback paths from script state detection functions (gated on confirming KFMB-3010 completion for `discover_stories()`), extract the `kb_state_query()` helper to a shared `scripts/lib/kb-state.sh` library, and convert or remove the dormant `sync-work-order.py` functions. After this story, all scripts operate against the KB exclusively — no filesystem state reads for story state or artifact detection.

### Initial Acceptance Criteria

- [ ] **AC-1**: `scripts/lib/kb-state.sh` is created and exports a `kb_state_query()` function that wraps the `claude -p` KB query pattern. `generate-stories.sh` and `implement-stories.sh` source this library and remove their duplicated local definitions.
- [ ] **AC-2**: `scripts/generate-stories.sh` state detection (`ALREADY_GENERATED`, `ALREADY_ELABORATED`) removes the `[KB-FIRST FALLBACK]` filesystem path; KB query is the sole path. A clear error exit (non-zero, descriptive message) is produced when KB is unavailable.
- [ ] **AC-3**: `scripts/implement-stories.sh` state detection functions (`find_story_dir`, `is_elaborated`, `is_implemented`, `is_reviewed`, `is_completed`) remove the `[KB-FIRST FALLBACK]` filesystem directory iteration; KB state is the sole source. KB unavailability produces a non-zero exit with descriptive message.
- [ ] **AC-4**: `scripts/implement-dispatcher.sh` state detection (`is_elaborated()`, EVIDENCE readiness check) removes the filesystem fallback path. KB unavailability produces a non-zero exit.
- [ ] **AC-5**: `scripts/sync-work-order.py` `check_untracked_stories()` and `scan_all_index_stories()` are either replaced with KB queries or removed. The removal decision is documented with rationale (e.g., functionality superseded by KB, or explicitly deferred with comment).
- [ ] **AC-6**: `scripts/lib/resolve-plan.sh` `discover_stories()` filesystem fallback is removed IF KFMB-3010 is at `needs-code-review` or later. If KFMB-3010 is not complete, the fallback is retained with a `# TODO(KFMB-3010)` comment and this AC is documented as a partial pass.
- [ ] **AC-7**: `scripts/sync-work-order.py` `scan_directories()` and `scan_proof_files()` are explicitly preserved unchanged (these detect live filesystem state that the KB does not replicate).
- [ ] **AC-8**: All three shell scripts (`generate-stories.sh`, `implement-stories.sh`, `implement-dispatcher.sh`) pass `bash -n` syntax check and `--dry-run` against the `kb-first-migration` plan with KB available.
- [ ] **AC-9**: `sync-work-order.py` completes one cycle against the `kb-first-migration` plan (with KB available) without Python exceptions.

### Non-Goals

- Do not remove `scan_directories()` or `scan_proof_files()` from `sync-work-order.py` — these detect worktree and PROOF file state that KB does not replicate.
- Do not modify any `.claude/commands/` files — command file migration is KFMB-5030 and KFMB-4020 scope.
- Do not modify `packages/backend/database-schema/` or `@repo/db` client API — protected features.
- Do not add new MCP tool registrations to the KB server.
- Do not update usage documentation or comments in scripts that refer to deprecated filesystem behavior — that is KFMB-6020.
- Do not delete `stories.index.md` files — deferred to KFMB-6020.
- Do not remove the `_implementation/` directory structure — deferred to KFMB-6020.
- Do not handle `sync-work-order.py` work order file updates (`WORK-ORDER*.md` modification logic) — out of scope for this story.

### Reuse Plan

- **Components**: `scripts/lib/resolve-plan.sh` `resolve_plan()` and `discover_stories()` — primary templates for `kb-state.sh` and any remaining KB query patterns
- **Patterns**: `claude -p "Call <tool> ..." --allowedTools ... --output-format text 2>/dev/null) || true` + `[[ -z "$raw" ]]` guard; `[KB-FIRST]` logging for auditability
- **Packages**: No TypeScript packages modified; pure shell/Python scripting work
- **Library extraction**: Extract `kb_state_query()` to `scripts/lib/kb-state.sh` (identified as KFMB-6010 candidate in KFMB-4020 ELAB OPP-2)
- **Batch query pattern**: Batch `kb_list_stories` per-run (not per-story) for `implement-dispatcher.sh` poll loop (KFMB-5030 established this pattern)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Strategy: manual + dry-run verification. No TypeScript, no HTTP endpoints, no frontend.
- Key test scenarios:
  1. KB available: all scripts produce correct story selection / state output (no `[KB-FIRST FALLBACK]` logs)
  2. KB unavailable: scripts exit non-zero with descriptive error message (not silent empty list, not hang)
  3. Dry-run backward compatibility: `--dry-run` output matches expected story list from KB state
  4. `sync-work-order.py` one-cycle smoke test against live KB (no index file; `scan_directories()` + `scan_proof_files()` still active)
  5. `kb-state.sh` extraction: both `generate-stories.sh` and `implement-stories.sh` source the library and no duplicate function definitions remain
- ADR-005 applies: live KB at port 5433 required for UAT. `sync-work-order.py` has no `--dry-run`; its full smoke test requires a live KB.
- ADR-006 does not apply: `frontend_impacted: false`.
- KFMB-3010 gating: include a manual check / precondition step to confirm KFMB-3010 status before attempting AC-6 (discover_stories fallback removal).

### For UI/UX Advisor

Not applicable. This is a shell/Python scripting story with no frontend surface, no UI components, and no user-facing changes. No UX guidance needed.

### For Dev Feasibility

- Change surface: `scripts/lib/resolve-plan.sh`, `scripts/lib/kb-state.sh` (new file), `scripts/generate-stories.sh`, `scripts/implement-stories.sh`, `scripts/implement-dispatcher.sh`, `scripts/sync-work-order.py`
- No TypeScript, no pnpm build, no deployment required.
- Highest-risk change: removing filesystem fallbacks from `implement-dispatcher.sh` poll loop — this script runs production-style pipelines and regression testing (especially with `--parallel` and `--only` flags) is critical.
- Token estimate (per KFMB-3030 and KFMB-4020 baselines): 3-5 points, ~120,000-150,000 tokens. Medium complexity.
- Sizing risk: low — changes are mechanical removals of fallback branches. No new design exploration required; all patterns are established by KFMB-3030, KFMB-4020, and KFMB-5030.
- Suggested subtask decomposition:
  - ST-1: Create `scripts/lib/kb-state.sh` with `kb_state_query()` (and potentially `kb_artifact_exists()`)
  - ST-2: Update `generate-stories.sh` to source `kb-state.sh` and remove filesystem fallback from state detection
  - ST-3: Update `implement-stories.sh` to source `kb-state.sh` and remove filesystem fallbacks from all five state functions
  - ST-4: Update `implement-dispatcher.sh` to source `kb-state.sh` and remove filesystem fallbacks
  - ST-5: Update `sync-work-order.py` — remove/replace `check_untracked_stories()` and `scan_all_index_stories()`; preserve `scan_directories()` / `scan_proof_files()`
  - ST-6: Conditional: remove `discover_stories()` filesystem fallback from `resolve-plan.sh` if KFMB-3010 is complete; otherwise document the pending removal
- Canonical references for implementation:
  - `scripts/lib/resolve-plan.sh` — `resolve_plan()` function (lines 28-56): exact `claude -p` + `jq` pattern template
  - `scripts/generate-stories.sh` `process_story()` function: shows `[KB-FIRST]` / `[KB-FIRST FALLBACK]` pattern added by KFMB-4020 — the branches to remove
  - `scripts/implement-stories.sh` state functions: same fallback pattern to remove
  - KFMB-4020 Architecture Notes `kb_state_query()` bash function: the function to extract to `kb-state.sh`
