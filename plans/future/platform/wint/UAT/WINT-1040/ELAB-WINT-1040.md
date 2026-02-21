# Elaboration Summary: WINT-1040

**Story ID**: WINT-1040
**Title**: Update /story-status Command to Use DB as Primary Source for Story Lookup
**Status**: Ready to Work
**Elaboration Date**: 2026-02-17
**Autonomous Decider Verdict**: PASS

---

## Executive Summary

WINT-1040 is a **docs-only feature** that updates the `/story-status` CLI command to query the `core.stories` database table as the primary source for single-story lookup, while preserving backward compatibility and leaving dependency-graph modes unchanged.

**Verdict**: PASS — All 9 audit checks pass. No MVP-critical gaps. Story is immediately executable.

---

## Scope & Deliverable

**Single file modification**: `.claude/commands/story-status.md`

The update:
1. Adds a "Data Source" section explaining DB-first routing for the "Feature + Story ID" mode
2. Adds a state mapping table (DB enum values → human-readable display labels)
3. Updates the "Feature + Story ID" mode step sequence to call `shimGetStoryStatus` (via MCP tool `story_get_status`) instead of scanning directories
4. Documents that `--depth` and `--deps-order` modes remain unchanged (they still use `stories.index.md`)
5. Explicitly defers "Feature Only" (no Story ID) DB routing to WINT-1070

**No TypeScript, no infrastructure, no DB schema changes.**

---

## Audit Results

All 9 checks PASS:

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | Scope Alignment | PASS | Story modifies exactly one file (`.claude/commands/story-status.md`). Matches stories.index.md entry precisely. |
| 2 | Internal Consistency | PASS | Goals align with Non-Goals. All 8 ACs are internally consistent. AC-4 and AC-5 validate non-goal boundaries. |
| 3 | Reuse-First | PASS | References existing `shimGetStoryStatus` (WINT-1011). Pattern borrowed from `story-update.md`. No new packages. |
| 4 | Ports & Adapters | PASS | No API endpoints. Command markdown is the adapter; shim is the transport-agnostic core. No business logic in spec. |
| 5 | Local Testability | PASS | Test Plan documents 7 behavioral scenarios. UAT requirement documented (ADR-005). Verification approaches defined. |
| 6 | Decision Completeness | PASS | No blocking TBDs. All design decisions resolved. No Open Questions section (acceptable for this scope). |
| 7 | Risk Disclosure | PASS | Story explicitly documents: backward compatibility risk (mitigated), migration window ambiguity (DB authoritative), read-only constraint. |
| 8 | Story Sizing | PASS | 1 file, 8 ACs (appropriate for docs-only), no frontend/backend/DB/infra touches. No split indicators. |
| 9 | Subtask Decomposition | PASS | 3 subtasks (read/understand → add Data Source + mapping → update Feature+Story ID mode). Each covers specific ACs. Linear DAG. |

---

## Acceptance Criteria (Finalized)

All 8 ACs are frozen and ready for implementation:

1. **AC-1**: Feature+Story ID mode calls `shimGetStoryStatus` via MCP tool; falls back to directory automatically if DB unavailable
2. **AC-2**: Output format unchanged — displays Story, Status, Location, Depends On
3. **AC-3**: DB state enum values mapped to human-readable labels; mapping documented in spec
4. **AC-4**: `--depth` and `--deps-order` modes unchanged; no DB calls
5. **AC-5**: "Feature Only" mode deferred to WINT-1070 (explicitly documented)
6. **AC-6**: Command remains read-only (no writes to frontmatter, no directory moves, no DB updates)
7. **AC-7**: When no DB record and directory fallback fails, displays "Story not found: {STORY_ID}"
8. **AC-8**: Spec documents DB-first routing behavior, fallback behavior, and migration window context

---

## Dependencies (All Satisfied)

All upstream dependencies are **UAT/PASS** as of 2026-02-17:

- **WINT-1011** (Compatibility Shim — Core Functions): UAT/PASS — `shimGetStoryStatus` exported from `@repo/mcp-tools`
- **WINT-1012** (Compatibility Shim — Observability): UAT/PASS — `ShimDiagnostics` available
- **WINT-1030** (Populate Story Status from Directories): UAT/PASS — `core.stories` populated
- **WINT-0090** (Story Management MCP Tools): UAT/PASS — `story_get_status` MCP tool available

---

## Key Design Decisions (Locked)

### 1. DB-First Routing for Feature+Story ID Mode Only
- Only the "Feature + Story ID" mode queries the DB
- `--depth` and `--deps-order` modes remain unchanged (dependency graph data not yet in DB)
- "Feature Only" mode deferred to WINT-1070

### 2. Transparent Fallback via shimGetStoryStatus
- The shim handles DB unavailability and directory fallback automatically
- Command spec delegates all behavior to the shim via MCP tool invocation
- No business logic in the command spec itself

### 3. State Mapping Table
DB state enum values → display labels (all 8 DB states plus 6 directory-only states):

| DB State | Display Label |
|----------|---------------|
| `backlog` | Backlog |
| `ready_to_work` | Ready to Work |
| `in_progress` | In Progress |
| `ready_for_qa` | Ready for QA |
| `in_qa` | In QA / UAT |
| `done` | Done / Completed |
| `blocked` | Blocked |
| `cancelled` | Cancelled |

Directory-only states (via fallback):
- `elaboration` → Elaboration
- `needs-code-review` → Needs Code Review
- `failed-code-review` → Failed Code Review
- `failed-qa` → Failed QA
- `created` → Created

### 4. Read-Only Constraint
- No DB writes, no file moves, no frontmatter updates
- Command remains read-only for all modes

### 5. Backward Compatibility
- Output format unchanged
- Existing callers see no regression
- All modes continue to work as before

---

## Non-Blocking Findings (9 Total)

All 9 findings have been logged to the knowledge base as **future-opportunities** and do not block this story:

### Gaps (4)
1. **Feature Only mode edge case**: During migration window, feature-level summaries may lag behind DB reality for blocked/cancelled states
2. **No Arguments mode edge case**: All-features summary remains directory-based; will become stale if directories flatten
3. **Optional Source diagnostic**: One-line "Source: database / Source: directory (DB miss)" would aid debugging
4. **Directory-only state asymmetry**: Elaboration, needs-code-review, failed-code-review, ready-for-qa, failed-qa, created are not in SWIM_LANE_TO_STATE

### Enhancements (5)
1. **Telemetry instrumentation**: Once WINT-3070 adds telemetry, emit structured events for DB vs directory hit rates
2. **ID validation**: Add pre-call validation against `isValidStoryId` before calling shim
3. **Phase 7 cleanup**: After WINT-7030, remove shim fallback; call `storyGetStatus` directly
4. **Diagnostics field display**: Add optional --verbose flag to surface `ShimDiagnostics.source`
5. **State mapping table governance**: Auto-generate mapping table from canonical source (Drizzle schema or SWIM_LANE_TO_STATE)

---

## Subtasks (Implementation Roadmap)

### ST-1: Read and Understand Current Command + Canonical References
- Read current `.claude/commands/story-status.md`, `story-update.md`, shim types
- Establish understanding of command-calls-MCP-tool pattern
- Capture all DB state enum values from SWIM_LANE_TO_STATE + KNOWN_DB_ONLY_STATES

### ST-2: Add Data Source Section and State Mapping Table
- Add "Data Source" section explaining DB-first routing and fallback
- Add state mapping table covering all DB state enum values
- Covers AC-3, AC-8

### ST-3: Update Feature+Story ID Mode to Use shimGetStoryStatus
- Update "Feature + Story ID" mode step sequence to call `story_get_status` MCP tool
- Document that `--depth` and `--deps-order` modes are unchanged
- Document Feature Only DB routing as Non-Goal (deferred to WINT-1070)
- Covers AC-1, AC-2, AC-4, AC-5, AC-6, AC-7

---

## Test Plan (from _pm/TEST-PLAN.md)

Key scenarios to validate:

| Scenario | Mode | Expected | Verification |
|----------|------|----------|--------------|
| Story exists in DB | Feature + Story ID | DB-sourced status returned | Behavioral test with live DB |
| Story not in DB, in directory | Feature + Story ID | Directory fallback via shim | Shim fallback behavior |
| Story not in DB, not in directory | Feature + Story ID | "Story not found" message | Non-existent story ID (e.g., WINT-9999) |
| DB unavailable | Feature + Story ID | Directory fallback via shim | Simulate DB downtime |
| `--depth` mode regression | Feature + --depth | Output identical to pre-story | No DB calls for this mode |
| `--deps-order` mode regression | Feature + --deps-order | Output identical to pre-story | No DB calls for this mode |
| DB state enum display | Feature + Story ID | All 8 DB states show human-readable labels | Mapping table coverage |

**UAT Requirement** (ADR-005): Integration/behavioral verification requires live PostgreSQL. Unit tests may mock the shim.

---

## Canonical References

- **`.claude/commands/story-update.md`**: Demonstrates command-calls-MCP-tool pattern
- **`packages/backend/mcp-tools/src/story-compatibility/index.ts`**: shimGetStoryStatus signature and implementation
- **`packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts`**: SWIM_LANE_TO_STATE, KNOWN_DB_ONLY_STATES
- **`.claude/agents/_reference/examples/story-status-output.md`**: Output format reference

---

## Migration Window Context

During the migration window (before WINT-1020 completes and WINT-1070 deprecates `stories.index.md`):

- DB and directory may have different state information
- **DB is authoritative** for the "Feature + Story ID" mode
- Directory fallback activates automatically when DB is unavailable
- `--depth` and `--deps-order` modes continue to use `stories.index.md` (unchanged)

---

## Ready for Work

This story is **docs-only**, **well-scoped**, and **immediately executable**. All dependencies are satisfied, all design decisions are locked, and all acceptance criteria are finalized.

No MVP-critical gaps. Ready to move to the dev pipeline.

---

**Generated**: 2026-02-17 by elab-completion-leader
**Audit Verdict**: PASS (9/9 checks)
**Next Phase**: ready-to-work
