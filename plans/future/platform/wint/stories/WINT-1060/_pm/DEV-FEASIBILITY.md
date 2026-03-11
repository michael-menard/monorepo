# Dev Feasibility Review: WINT-1060
# Update /story-move Command to Write Status to Database

generated: "2026-02-17"
story_id: WINT-1060
agent: pm-dev-feasibility-review

---

## Feasibility Summary

- **Feasible for MVP**: yes
- **Confidence**: high
- **Why**: The shim API (`shimGetStoryStatus`, `shimUpdateStoryStatus`) is already live and UAT-verified (WINT-1011). The `SWIM_LANE_TO_STATE` mapping exists and covers the primary workflow stages. The implementation is primarily a markdown document update to `.claude/commands/story-move.md`, inserting a new Step 2.5 (DB write) between Step 2 (Validate Move) and the existing Step 3 (Execute Move). The sibling commands WINT-1040 (/story-status) and WINT-1050 (/story-update) establish the exact pattern. No new packages are required.

---

## Likely Change Surface (Core Only)

### Primary Change
- **File**: `.claude/commands/story-move.md` (version bump from 2.0.0)
  - Insert Step 2.5: DB Write (shimUpdateStoryStatus before mv)
  - Augment Step 1: DB-first locate (shimGetStoryStatus before directory scan)
  - Extend Return Result YAML: add `db_updated: true | false | skipped` field
  - Document SWIM_LANE_TO_STATE mapping inline (as lookup table in markdown)
  - Document which stages are DB-mapped vs directory-only

### Optional (if TypeScript helper introduced)
- **File**: `packages/backend/mcp-tools/src/story-compatibility/stage-mapper.ts` (new, optional)
  - Only needed if the TO_STAGE → DB state lookup is extracted into a unit-testable function
  - If inline in command markdown only: no TypeScript file needed
  - Seed recommendation: inline in markdown (simpler, avoids new file)

### No-Touch Zones (Protected)
- `packages/backend/mcp-tools/src/story-compatibility/index.ts` — shim API is stable
- `packages/backend/database-schema/` — schema is frozen
- `@repo/db`, `@repo/logger` API surfaces

---

## MVP-Critical Risks (Max 5)

### Risk 1: SWIM_LANE_TO_STATE stage mapping gap
- **Risk**: 4 of 10 valid stages (`elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`) are not in SWIM_LANE_TO_STATE. If the command attempts a DB write for these stages, it will fail to map the state.
- **Why it blocks MVP**: Without AC-5 (graceful skip for unmapped stages), the command may throw or produce incorrect output for common workflow transitions.
- **Required mitigation**: AC-5 is already in scope — implement the "if TO_STAGE not in SWIM_LANE_TO_STATE, skip DB write and log warning" path explicitly. Inline the stage mapping table in the command markdown so the agent executing the command can perform the lookup without an external call.

### Risk 2: Double-write with --update-status flag (WINT-1050 coordination)
- **Risk**: When `--update-status` is provided, the command delegates to `/story-update`. If WINT-1050 makes `/story-update` DB-aware, both Step 2.5 (WINT-1060) and `/story-update` (WINT-1050) may write the same DB record.
- **Why it blocks MVP**: Redundant writes could cause race conditions or unexpected log noise; more critically, if the writes disagree on state (e.g., different `newState` values), the DB record may end up in an inconsistent state.
- **Required mitigation**: AC-7 scopes this correctly — the `--update-status` path delegates to `/story-update` (owned by WINT-1050). The resolution is to either: (a) skip Step 2.5 DB write when `--update-status` is provided, or (b) ensure both writes target the same `newState` (idempotent). Recommend option (a) — document explicitly in command: "If --update-status is set, DB write is delegated to /story-update; Step 2.5 is skipped."

### Risk 3: shimGetStoryStatus returns null for locate step — edge case handling
- **Risk**: Stories in `blocked` or `cancelled` DB state return null from shimGetStoryStatus because these states have no swim-lane directory equivalent. The locate step must handle this gracefully (fall back to directory scan).
- **Why it blocks MVP**: If the locate step treats null as "story not found" and aborts, stories in blocked/cancelled state can never be moved.
- **Required mitigation**: AC-9 is already in scope — locate fallback is required. Implementation must distinguish "DB returned null" (fallback to directory) from "story not found anywhere" (MOVE FAILED).

---

## Missing Requirements for MVP

None identified. The 9 ACs in the seed are complete and unambiguous. The conflict (backward compatibility scope) is resolved by the seed's recommended approach (DB write AND directory move, both on happy path).

The one clarification required for implementation:
- **Clarification needed**: Should Step 2.5 DB write be skipped when `--update-status` flag is provided? Recommend: YES — skip Step 2.5 and delegate DB write to `/story-update` (WINT-1050). Add this as a note in AC-7 or add a new AC-10 if clarity is required.

---

## MVP Evidence Expectations

- `story-move.md` updated with new Step 2.5 block and inline SWIM_LANE_TO_STATE table
- Return YAML includes `db_updated` field in all outcomes (true, false, skipped)
- Manual dry-run: move story via `/story-move` and confirm `db_updated` field appears
- If TypeScript helper introduced: `pnpm check-types --filter @repo/mcp-tools` passes with 0 errors
- If TypeScript helper introduced: `pnpm test --filter @repo/mcp-tools` passes with unit tests for: (a) mapped stage returns correct newState, (b) unmapped stage returns undefined/null, (c) null shimUpdateStoryStatus response handled

---

## Proposed Subtask Breakdown

Story is estimated at **2 points** (markdown command update + optional TypeScript helper). 2-point story → 2-3 subtasks.

### ST-1: Augment /story-move locate step with shimGetStoryStatus (DB-first)

- **Goal**: Update Step 1 (Locate Story) in `story-move.md` to attempt `shimGetStoryStatus` lookup before the directory scan, per AC-9
- **Files to read**: `.claude/commands/story-move.md` (current Step 1), `packages/backend/mcp-tools/src/story-compatibility/index.ts` (shimGetStoryStatus contract)
- **Files to create/modify**: `.claude/commands/story-move.md`
- **ACs covered**: AC-9
- **Depends on**: none
- **Verification**: Read updated `story-move.md` and confirm Step 1 includes DB-first lookup with directory fallback. No TypeScript compilation needed (markdown file only).

### ST-2: Add DB write step (Step 2.5) with SWIM_LANE_TO_STATE inline table

- **Goal**: Insert Step 2.5 into `story-move.md` that: (a) maps TO_STAGE to newState via inline SWIM_LANE_TO_STATE table, (b) calls shimUpdateStoryStatus before directory mv, (c) skips write for unmapped stages, (d) logs warning on null return and proceeds with mv
- **Files to read**: `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (SWIM_LANE_TO_STATE exact mapping), `.claude/commands/story-move.md` (after ST-1)
- **Files to create/modify**: `.claude/commands/story-move.md`
- **ACs covered**: AC-1, AC-3, AC-4, AC-5, AC-8
- **Depends on**: ST-1
- **Verification**: Read updated `story-move.md` and confirm: (a) Step 2.5 is present between Step 2 and Step 3, (b) inline stage mapping table is complete (shows which stages are DB-mapped and which are directory-only), (c) failure/null handling matches AC-3 spec, (d) all existing signals preserved per AC-8.

### ST-3: Extend return YAML and update --update-status flag handling

- **Goal**: Add `db_updated: true | false | skipped` field to Step 5 return YAML; document that Step 2.5 is skipped when `--update-status` is provided (to avoid double-write with WINT-1050)
- **Files to read**: `.claude/commands/story-move.md` (after ST-2)
- **Files to create/modify**: `.claude/commands/story-move.md`
- **ACs covered**: AC-2, AC-6, AC-7
- **Depends on**: ST-2
- **Verification**: Read final `story-move.md` and confirm: (a) return YAML block includes `db_updated` field with all 3 possible values documented, (b) `--update-status` behavior note is clear (DB write delegated to /story-update), (c) command version bumped (e.g., 2.1.0), (d) Step 3 (directory mv) still executes regardless of DB outcome per AC-2.
