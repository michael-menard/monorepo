# Dev Feasibility: WINT-1050
# Update /story-update Command to Write Status to Database

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a documentation-only change to a single markdown file. The shim module (`shimUpdateStoryStatus`) is UAT-verified with a frozen API. The WINT-1040 and WINT-1060 sibling stories establish the exact pattern to follow. No TypeScript changes, no new packages, no schema migrations. All infrastructure is in place.

---

## Likely Change Surface (Core Only)

- **Primary file**: `.claude/commands/story-update.md` (sole deliverable)
- **Areas**: Claude Code command spec (markdown), no TypeScript source files
- **Packages touched**: None (shimUpdateStoryStatus called via MCP tool mechanism by executing agent)
- **Deploy touchpoints**: None — command file changes do not require deployment

---

## MVP-Critical Risks (Max 5)

### Risk 1: MCP tool unavailability during implementation

- **Risk**: The executing agent implementing WINT-1050 must have `shimUpdateStoryStatus` available as a callable MCP tool to test the spec. If unavailable, the command spec cannot be verified.
- **Why it blocks MVP**: The spec describes calling `shimUpdateStoryStatus` via MCP tool mechanism. Without confirming the tool is accessible, the spec cannot be verified as correct.
- **Required mitigation**: Dev agent must verify MCP tool availability in setup phase (Step 1 baseline read). If unavailable, include a note in the command spec directing operators to confirm MCP tool availability before relying on `db_updated: true`. This is documented in the seed as a key risk to confirm at setup.

### Risk 2: Step ordering error (AC-5/AC-6 ordering)

- **Risk**: Implementing agent inserts Step 3a in the wrong position (e.g., before Step 2 worktree cleanup, or before transition validation).
- **Why it blocks MVP**: AC-5 and AC-6 are explicit ordering constraints. Violating them creates a behavioral defect where DB writes happen before worktree cleanup or before transition validation gates invalid transitions.
- **Required mitigation**: ST-3 subtask explicitly specifies insert position: AFTER Step 2, BEFORE existing Step 3 (renumbered to 3b). The command spec must clearly label the execution order: Step 1 → Step 2 → Step 3a → Step 3b → Step 4 → Step 5.

### Risk 3: FS fallback misimplemented (AC-3 null handling)

- **Risk**: Dev agent adds FS fallback write when `shimUpdateStoryStatus` returns null, violating WINT-1011 AC-2 contract.
- **Why it blocks MVP**: The null-return path must log a WARNING and continue with existing FS frontmatter update only. A compensating FS write would violate the shim contract and could cause data inconsistency.
- **Required mitigation**: ST-3 must explicitly state: `if shimUpdateStoryStatus returns null → emit WARNING → set db_updated: false → proceed to Step 3b (existing frontmatter update) — do NOT add additional FS writes`. Blockers-to-avoid from seed make this explicit.

---

## Missing Requirements for MVP

None. All 10 ACs are fully specified in the index and seed. No ambiguity that blocks implementation.

---

## MVP Evidence Expectations

- `.claude/commands/story-update.md` file updated with:
  - Version `3.0.0`, date `2026-02-20` in frontmatter
  - New `## Step 3a: DB Write` section inserted between Step 2 and Step 3 (renamed to 3b)
  - Inline 14-status mapping table with explicit DB state or skip-with-reason for each entry
  - Null-return handling with WARNING format
  - `db_updated: true | false` field in Step 5 result YAML
  - `## Integration Test Scenarios` section with Scenarios A-F
- UAT verification: Run Scenarios A and F against live `core.stories` (ADR-005)

---

## Proposed Subtask Breakdown

### ST-1: Read baseline — story-update command and shim contract

- **Goal**: Establish full understanding of v2.1.0 command structure and shimUpdateStoryStatus behavioral contract before making any edits.
- **Files to read**:
  - `.claude/commands/story-update.md` (current v2.1.0 — understand all 5 execution steps, result YAML, status table)
  - `packages/backend/mcp-tools/src/story-compatibility/index.ts` (shimUpdateStoryStatus implementation — confirm null-on-DB-failure, no FS fallback)
  - `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (SWIM_LANE_TO_STATE — extract the 6 mapped DB states)
  - `packages/backend/mcp-tools/src/story-management/__types__/index.ts` (StoryUpdateStatusInput schema — confirm call signature)
- **Files to create/modify**: None (read-only phase)
- **ACs covered**: AC-1 (precondition), AC-2 (precondition), AC-5 (precondition), AC-6 (precondition)
- **Depends on**: none
- **Verification**: Dev agent produces a summary confirming: (a) current Step 3 location, (b) 6 DB-mapped states from SWIM_LANE_TO_STATE, (c) 8 unmapped statuses from command's 14-status table, (d) shimUpdateStoryStatus call signature

### ST-2: Build the 14-status → DB state mapping table

- **Goal**: Produce the complete inline mapping table documenting all 14 story statuses with explicit DB state or skip-with-reason for each.
- **Files to read**: ST-1 outputs (SWIM_LANE_TO_STATE, command status table)
- **Files to create/modify**: Mapping table artifact (embedded in ST-3 edit)
- **ACs covered**: AC-2, AC-10
- **Depends on**: ST-1
- **Table to produce**:

  | Status | DB State | Decision |
  |--------|----------|----------|
  | `backlog` | `backlog` | mapped |
  | `created` | — | skip: no DB equivalent in current schema |
  | `elaboration` | — | skip: no DB equivalent in current schema |
  | `ready-to-work` | `ready_to_work` | mapped |
  | `in-progress` | `in_progress` | mapped |
  | `needs-code-review` | — | skip: no DB equivalent — review status lives in PR tooling |
  | `failed-code-review` | — | skip: no DB equivalent — review outcome tracked in PR tooling |
  | `ready-for-qa` | `ready_for_qa` | mapped |
  | `failed-qa` | — | skip: no DB equivalent — QA failure tracked in story file only |
  | `uat` | `in_qa` | mapped |
  | `completed` | `done` | mapped |
  | `needs-split` | — | skip: transient admin status, not a workflow state |
  | `BLOCKED` | `blocked` | mapped — explicit decision: BLOCKED maps to blocked |
  | `superseded` | `cancelled` | mapped — explicit decision: superseded maps to cancelled |

- **Verification**: Table has exactly 14 rows. 6 are mapped (match SWIM_LANE_TO_STATE + 2 explicit decisions). 8 have skip-with-reason. No status left without decision.

### ST-3: Insert DB write step (Step 3a) into story-update command

- **Goal**: Insert new Step 3a between existing Step 2 (worktree cleanup) and existing Step 3 (frontmatter update, renumbered to 3b). Include mapping table, shimUpdateStoryStatus call syntax, null-return handling, and db_updated flag logic.
- **Files to read**: `.claude/commands/story-update.md` (current), ST-2 mapping table
- **Files to create/modify**: `.claude/commands/story-update.md`
- **ACs covered**: AC-1, AC-3, AC-5, AC-6, AC-7
- **Step 3a content to insert**:

  ```
  ### 3a. DB Write (shimUpdateStoryStatus)

  **Preconditions** (both must be satisfied before this step executes):
  1. Transition validation (Status Transition Rules table) must have passed
  2. Step 2 worktree cleanup must have completed (or been skipped if NEW_STATUS != 'completed')

  **Mapping table** (NEW_STATUS → DB state):
  [inline 14-status table from ST-2]

  **If NEW_STATUS is mapped**:
  Call: shimUpdateStoryStatus({ storyId: STORY_ID, newState: MAPPED_DB_STATE, triggeredBy: 'story-update-command' })
  - If result is non-null: set db_updated = true
  - If result is null: emit `WARNING: DB write failed for story '{STORY_ID}' — DB unavailable. Proceeding with filesystem update only.` Set db_updated = false. Continue to Step 3b.

  **If NEW_STATUS is NOT mapped (skip)**:
  Set db_updated = false. Continue to Step 3b. No shimUpdateStoryStatus call.

  **Note on --no-index flag**: The --no-index flag only affects Step 4 (index update). This step (3a) executes regardless of --no-index.
  ```

- **Depends on**: ST-2
- **Verification**: File diff shows Step 3a inserted after Step 2. Existing Step 3 renumbered to Step 3b. No changes to Step 1, Step 2, or the transition rules table.

### ST-4: Update result YAML + version bump + integration test scenarios

- **Goal**: Extend Step 5 result YAML with `db_updated` field; bump version to v3.0.0; add Integration Test Scenarios A-F section; add version history note.
- **Files to read**: `.claude/commands/story-update.md` (after ST-3)
- **Files to create/modify**: `.claude/commands/story-update.md`
- **ACs covered**: AC-4, AC-8, AC-9
- **Changes**:
  - Frontmatter: `version: 3.0.0`, `updated: 2026-02-20`
  - Step 5 result YAML: add `db_updated: true | false` field
  - Add `## Integration Test Scenarios` section with Scenarios A-F (per AC-9 spec)
  - Add version history comment: `v3.0.0 — DB integration: shimUpdateStoryStatus called before frontmatter update (WINT-1050). Breaking: result YAML includes new db_updated field.`
- **Depends on**: ST-3
- **Verification**: `grep 'version: 3.0.0' .claude/commands/story-update.md` passes. Result YAML block contains `db_updated`. Integration Test Scenarios section present with all 6 scenarios.

---

## Future Risks (see FUTURE-RISKS.md)

- Concurrent update conflicts (WINT-1160 owns this — deferred)
- DB-only mode without frontmatter write (WINT-7030 — Phase 7)
- Index update removal after WINT-1070 stabilizes
