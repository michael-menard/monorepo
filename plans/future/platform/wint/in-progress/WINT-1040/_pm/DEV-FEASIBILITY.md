# Dev Feasibility Review: WINT-1040 — Update /story-status Command to Use DB

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This story modifies exactly one markdown file (`.claude/commands/story-status.md`). The shim module it depends on (`shimGetStoryStatus`, `shimGetStoriesByFeature`) is UAT-verified (WINT-1011/1012). The DB is populated (WINT-1030 UAT/PASS). No TypeScript changes are required. The implementation is a documentation spec update to a command file — a well-understood pattern established by `story-update.md`.

---

## Likely Change Surface (Core Only)

**Files to create/modify**:

| File | Action | Reason |
|------|--------|--------|
| `.claude/commands/story-status.md` | Modify | Update Feature+Story ID mode, add Data Source section, add state mapping table |

**No other files need to change for this story.**

**Packages involved** (read-only reference, no changes):
- `packages/backend/mcp-tools/src/story-compatibility/index.ts` — shimGetStoryStatus (called via MCP tool, not imported)
- `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — SWIM_LANE_TO_STATE reference for building the inverse mapping

---

## MVP-Critical Risks (Max 5)

### Risk 1: MCP Tool Availability at Command Execution Time

- **Risk**: The updated command calls `story_get_status` MCP tool. If the MCP server is not running when `/story-status` is invoked, the command must gracefully degrade (not crash).
- **Why it blocks MVP**: If the command errors when the MCP server is down, operators lose access to story status information — core use case broken.
- **Required mitigation**: The shim's directory fallback handles this transparently. The command spec must explicitly document: "If `story_get_status` MCP tool is unavailable, fall back to directory scan." This is behavioral spec documentation, not TypeScript logic.

### Risk 2: DB State Enum → Display Label Completeness

- **Risk**: The DB state enum has 8 values, but the command's swimlane view handles 11 directory-based states (including `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `created` which are NOT in `SWIM_LANE_TO_STATE`). The state-to-display-label mapping must cover all states that could arrive from the DB.
- **Why it blocks MVP**: If a story in `elaboration` state is queried and the command has no mapping for it, the output shows a raw enum value — confusing to operators.
- **Required mitigation**: The state mapping table in the command spec must include ALL known DB state values, including those not in `SWIM_LANE_TO_STATE`. Confirm the complete list with the DB schema.

### Risk 3: Scope of AC-5 (Feature Only Mode)

- **Risk**: AC-5 is optional — "either the feature summary shows DB-sourced counts, or the AC is documented as deferred to WINT-1070." If left ambiguous, QA will flag it.
- **Why it blocks MVP**: Ambiguous ACs cause QA failures.
- **Required mitigation**: Story must explicitly state whether AC-5 is implemented or deferred. Given the LOW effort estimate and scope boundary (one file), recommend deferring AC-5 to WINT-1070 and documenting it as a Non-Goal. This keeps WINT-1040 tightly scoped.

---

## Missing Requirements for MVP

- **State mapping completeness**: The story must specify the complete DB state → display label mapping, including DB-only states (`blocked`, `cancelled`). The seed lists 8 DB states; all 8 need display labels. The command spec should include this as a lookup table.
- **AC-5 explicit decision**: The story file must state whether Feature Only mode DB routing is in-scope or explicitly deferred. Currently AC-5 says "optionally" — this needs to resolve to a binary decision before elaboration.

---

## MVP Evidence Expectations

- Updated `.claude/commands/story-status.md` file is the primary artifact
- Behavioral test: `/story-status plans/future/platform/wint WINT-1011` returns DB-sourced result (HP-1 in TEST-PLAN.md)
- Behavioral test: `--depth` mode produces identical output before/after (HP-4)
- Behavioral test: `--deps-order` mode produces identical output before/after (HP-5)
- Static review: no write operations in updated command spec (EC-4)
- Documentation review: "Data Source" section present in updated command spec (AC-8)
- Documentation review: state mapping table present and complete (AC-3)

---

## Proposed Subtask Breakdown

Story is estimated at 2 points (2-4 hours). Recommend 3 subtasks.

### ST-1: Read and Understand Current Command + Canonical References

- **Goal**: Establish clear understanding of the current `story-status.md` implementation, the shim API, and the command-calls-MCP-tool pattern before making any changes.
- **Files to read**:
  - `.claude/commands/story-status.md` (current implementation)
  - `.claude/commands/story-update.md` (canonical pattern: command calls MCP tool)
  - `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (SWIM_LANE_TO_STATE, ShimOptions)
  - `packages/backend/mcp-tools/src/story-compatibility/index.ts` (shimGetStoryStatus signature)
  - `.claude/agents/_reference/examples/story-status-output.md` (output format reference)
- **Files to create/modify**: None (read-only phase)
- **ACs covered**: Informs all ACs
- **Depends on**: none
- **Verification**: Dev has captured: (a) current Feature+Story ID mode logic, (b) shimGetStoryStatus call signature, (c) all DB state enum values from SWIM_LANE_TO_STATE + KNOWN_DB_ONLY_STATES

### ST-2: Add Data Source Section and State Mapping Table to Command Spec

- **Goal**: Add the "Data Source" section (AC-8) and the DB state → display label mapping table (AC-3) to `.claude/commands/story-status.md`. These additions provide context and the mapping needed for the Feature+Story ID mode update.
- **Files to read**:
  - `.claude/commands/story-status.md` (target file)
  - `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (SWIM_LANE_TO_STATE, KNOWN_DB_ONLY_STATES)
- **Files to create/modify**:
  - `.claude/commands/story-status.md`
- **ACs covered**: AC-3, AC-8
- **Depends on**: ST-1
- **Verification**: Updated command spec contains:
  1. A "Data Source" section explaining DB-first routing, fallback behavior, and migration window context
  2. A state mapping table covering all 8+ DB state enum values with human-readable display labels

### ST-3: Update Feature+Story ID Mode to Use shimGetStoryStatus

- **Goal**: Update the "Feature + Story ID" mode in `.claude/commands/story-status.md` to call `story_get_status` MCP tool (shimGetStoryStatus) instead of directory scanning. Document that `--depth` and `--deps-order` modes are unchanged. If AC-5 is in-scope, update Feature Only mode to call `story_get_by_feature` MCP tool.
- **Files to read**:
  - `.claude/commands/story-status.md` (after ST-2)
  - `.claude/commands/story-update.md` (canonical MCP tool call pattern)
  - `packages/backend/mcp-tools/src/story-compatibility/index.ts` (shimGetStoryStatus return shape)
- **Files to create/modify**:
  - `.claude/commands/story-status.md`
- **ACs covered**: AC-1, AC-2, AC-4, AC-5 (if in-scope), AC-6, AC-7
- **Depends on**: ST-2
- **Verification**:
  - `/story-status plans/future/platform/wint WINT-1011` returns DB-sourced status (behavioral test)
  - `/story-status plans/future/platform/wint --depth` output unchanged (regression check)
  - Updated command spec has no write operations (static review)
  - Story not found case documented in command spec
