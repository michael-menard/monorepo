---
generated: "2026-02-17"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1050

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists (baseline_path was null). Seed proceeds from codebase scan and index context.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| WINT-0090: Story Management MCP Tools | uat | Provides `storyUpdateStatus`, `storyGetStatus`, `storyGetByStatus`, `storyGetByFeature` |
| WINT-1011: Compatibility Shim Core Functions | uat | `shimUpdateStoryStatus` wraps `storyUpdateStatus`, DB-only write, no FS fallback |
| WINT-1012: Shim Observability & Tests | uat | `ShimDiagnostics` opt-in, 80%+ unit test coverage across all four shim functions |
| WINT-1030: Populate Stories DB | uat | `wint.stories` table populated from directory scan; `storyId` → `state` mapping validated |
| WINT-1040: Update story-status Command | pending | Sibling story: read path via shim (not yet started) |
| WINT-1060: Update story-move Command | pending | Sibling story: directory movement deferred to DB updates |
| story-update.md (v2.1.0) | current | Current command implementation; file-based status writes + index update |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-1040 (story-status → DB) | pending | Sibling — read path. No overlap with write path, but test fixtures may be shared |
| WINT-1060 (story-move → DB) | pending | Sibling — directory movement. story-update and story-move currently call each other (story-move --update-status calls /story-update). Decoupling needed |
| WINT-1070 (Deprecate index.md) | being worked (pm-story) | Overlap: story-update currently writes to index. If WINT-1070 lands during WINT-1050, index update logic changes |

### Constraints to Respect

1. `permission_level: docs-only` on story-update.md — the command file itself only has docs-write permission. The executing agent calls MCP tools; it does NOT have filesystem write permission for source code. The command spec is the deliverable.
2. `shimUpdateStoryStatus` is **DB-only write** (AC-2 from WINT-1011): it NEVER falls back to filesystem on write failure.
3. WINT-1020 (directory flattening) context: stories may now live in a flat structure. The current story-update.md Step 1 searches swim-lane directories — this must still work during transition.
4. The `story-update` command currently updates story frontmatter AND the stories index. The DB write replaces the frontmatter update (the index update can remain or use WINT-1070's DB-generated index).
5. Concurrent updates: `storyUpdateStatus` already uses a database transaction (atomic). No additional concurrency logic needed in the command layer — this risk is already handled by WINT-0090.

---

## Retrieved Context

### Related Endpoints / MCP Tools

| Tool | Location | Purpose |
|------|----------|---------|
| `shimUpdateStoryStatus` | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Primary write path: DB-first, no FS fallback |
| `storyUpdateStatus` | `packages/backend/mcp-tools/src/story-management/story-update-status.ts` | Underlying DB write (transaction + storyStates + storyTransitions) |
| `worktree_get_by_story` | `packages/backend/mcp-tools/src/worktree-management/` | Already called by story-update.md (WINT-1150 integration) |
| `worktree_mark_complete` | `packages/backend/mcp-tools/src/worktree-management/` | Already called by story-update.md (WINT-1150 integration) |

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `/story-update` command | `.claude/commands/story-update.md` (v2.1.0) | The file being modified |
| `/story-move` command | `.claude/commands/story-move.md` (v2.0.0) | Calls story-update via `--update-status`; sibling story WINT-1060 |
| `/story-status` command | `.claude/commands/story-status.md` (v4.0.0) | Read-only; sibling story WINT-1040 |

### Reuse Candidates

- `shimUpdateStoryStatus(input, options?)` — exported from `@repo/mcp-tools` (via `packages/backend/mcp-tools/src/index.ts`). Already handles DB-first + null return on failure.
- `StoryUpdateStatusInputSchema` / `StoryUpdateStatusInput` — Zod schema in `story-management/__types__/index.ts`. Has `storyId`, `newState`, `reason`, `triggeredBy`, `metadata` fields.
- Status → DB state mapping from WINT-1011 (`SWIM_LANE_TO_STATE`): `backlog`, `ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`, `done`, `cancelled`.
- The `stories.index.md` update (Step 4 of story-update.md) can be removed or retained as a secondary action since WINT-1070 will eventually make it read-only/generated.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command spec (docs-only skill) | `.claude/commands/story-update.md` | The file being modified — shows accepted command spec format, argument table, execution steps, status transition table, error handling table, signal conventions |
| Shim write function | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | `shimUpdateStoryStatus` shows the exact DB-first write pattern: no FS fallback, null on failure, warn log |
| Status input schema | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | `StoryUpdateStatusInputSchema` defines `newState` enum values (`ready_to_work`, `in_progress`, etc.) — maps from command status strings |
| Shim write test | `packages/backend/mcp-tools/src/story-compatibility/__tests__/shimUpdateStoryStatus.test.ts` | Shows exact test coverage: DB-success, DB-unavailable, non-existent story, DB-error — pattern for integration tests |

---

## Knowledge Context

### Lessons Learned

No KB lessons loaded (no baseline file). The following are inferred from sibling story patterns:

- **[WINT-1011]** Shim functions must NEVER fall back to filesystem on write operations (category: blocker)
  - *Applies because*: `shimUpdateStoryStatus` has AC-2 enforced — story-update.md must not attempt any FS fallback when DB write fails
- **[WINT-1030]** Status string mapping is not 1:1 between the command's status strings and DB `storyStateEnum`. Story-update uses `in-progress` (hyphenated), DB stores `in_progress` (underscored).
  - *Applies because*: The command spec must include explicit mapping table from command-visible status values to DB `newState` enum values
- **[WINT-1150]** The `uat → completed` transition already triggers worktree cleanup. This logic is in story-update.md and MUST be preserved — DB write must happen BEFORE or AFTER worktree cleanup, not replace it.
  - *Applies because*: The worktree cleanup step (Step 2) already exists in story-update.md v2.1.0 and must remain intact

### Blockers to Avoid (from sibling story patterns)

- Do not attempt filesystem writes to story frontmatter files when making the DB write. This is a docs-only command — after this story, the DB IS the status, not the YAML frontmatter.
- Do not remove the index update (Step 4) without confirming WINT-1070 status. If WINT-1070 is not complete, the index update must remain to keep the human-readable index current.
- Do not map DB `newState` directly from the command's status string without explicit conversion — they use different separator conventions.
- Do not break the `--no-index` flag behavior — it must still skip the index update (and any future DB-generated index sync).
- The `--force` flag (not currently in v2.1.0 execution steps but mentioned) must still apply at the command layer, not the DB layer.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for story-update command changes must call real DB, not mocks |

ADR-001 (API path schema) — not applicable (CLI/agent command, no HTTP endpoints).
ADR-002 (Infra) — not applicable.
ADR-003 (Image/CDN) — not applicable.
ADR-004 (Auth) — not applicable.

### Patterns to Follow

- Command spec format: frontmatter + `## Arguments` table + `## Execution Steps` numbered sections + `## Error Handling` table + `## Signal` section. Match story-update.md v2.1.0 structure.
- DB-first write via `shimUpdateStoryStatus` — shim handles null return on failure; command should surface this as a warning, not a hard failure (backward compat during DB rollout).
- Explicit status → DB state mapping table in command spec (prevents future confusion).
- Preserve all existing error handling paths (Feature dir not found, Story not found, Invalid status, Invalid transition, Index entry missing).
- Versioning: bump story-update.md from v2.1.0 to v3.0.0 (DB integration is a breaking behavioral change).

### Patterns to Avoid

- Do not replace the execution steps entirely — augment Step 3 (Update Frontmatter) with a DB write, rather than deleting the FS write. During Phase 1 transition, the frontmatter can remain as secondary record until WINT-1020/1070 fully land.
- Do not hardcode DB state strings without a mapping table — the command's status vocabulary differs from the DB enum.
- Do not add async error handling complexity at the command layer — the shim already handles resilient DB errors.

---

## Conflict Analysis

### Conflict: WINT-1070 Index Deprecation Race

- **Severity**: warning
- **Description**: WINT-1070 (Deprecate stories.index.md) is currently being worked by pm-story and shares overlap with WINT-1050's Step 4 (Update Index). If WINT-1070 lands first, it changes the index from mutable to generated/read-only. WINT-1050's story-update.md Step 4 must be updated accordingly. If WINT-1050 lands first, Step 4 should still write to the index (since WINT-1070 is not done).
- **Resolution Hint**: In WINT-1050's implementation, retain Step 4 (index update) but add a note that it will be removed/replaced when WINT-1070 is complete. The AC for WINT-1050 should not depend on WINT-1070 state.

---

## Story Seed

### Title

Update `/story-update` Command to Write Status to Database via Compatibility Shim

### Description

**Context**: The WINT platform is migrating story status management from filesystem-based (directory locations + YAML frontmatter) to database-driven (the `wint.stories` table). WINT-0090 created the `storyUpdateStatus` MCP tool. WINT-1011 wrapped it in the `shimUpdateStoryStatus` compatibility shim. WINT-1030 populated the DB from existing directories. The DB is now populated and the shim is production-ready.

**Problem**: The `/story-update` command (`.claude/commands/story-update.md` v2.1.0) currently only updates YAML frontmatter and the stories index file when changing story status. The database (`wint.stories` table) is NOT updated, meaning the DB drifts from filesystem state every time an agent calls `/story-update`.

**Proposed Solution**: Modify `/story-update` to call `shimUpdateStoryStatus` as Step 3.5 (after locating the story, before or instead of writing YAML frontmatter). The DB write becomes the primary status update. The YAML frontmatter write is retained as secondary (for backward compat during Phase 1 transition). The index update (Step 4) is retained unless WINT-1070 has completed. On DB write failure (null returned from shim), emit a warning and continue with the filesystem write as fallback — this is the compatibility shim's design intent.

### Initial Acceptance Criteria

- [ ] AC-1: When `/story-update {FEATURE_DIR} {STORY_ID} {NEW_STATUS}` is called, the executing agent calls `shimUpdateStoryStatus({ storyId: STORY_ID, newState: <mapped_state>, triggeredBy: 'story-update', reason: <optional> })` before updating YAML frontmatter
- [ ] AC-2: A status → DB state mapping table is documented in the command spec covering all 13 status values (backlog, created, elaboration, ready-to-work, in-progress, needs-code-review, failed-code-review, ready-for-qa, failed-qa, uat, completed, needs-split, BLOCKED, superseded) with their DB `newState` equivalents
- [ ] AC-3: When `shimUpdateStoryStatus` returns null (DB unavailable or write failed), the command emits a WARNING log and falls back to filesystem-only update (no hard failure — backward compat)
- [ ] AC-4: When `shimUpdateStoryStatus` returns a valid record, the DB is now the source of truth — the command's result YAML includes `db_updated: true` (in addition to `file_updated` and `index_updated`)
- [ ] AC-5: The worktree cleanup step (Step 2: `uat → completed` transition) from WINT-1150 is preserved and executes BEFORE the DB write (logical order: lookup worktree → cleanup → DB update → FS update → index update)
- [ ] AC-6: Status transition validation (the transition rules table) applies BEFORE the DB write — invalid transitions return `UPDATE FAILED` without calling `shimUpdateStoryStatus`
- [ ] AC-7: The `--no-index` flag behavior is preserved (DB write always happens regardless of this flag; only index Step 4 is affected)
- [ ] AC-8: The command spec version is bumped to v3.0.0 and `updated` frontmatter date is current
- [ ] AC-9: An integration test scenario is documented (in the story or test plan) showing: DB write succeeds → `db_updated: true`; DB unavailable → `db_updated: false`, WARNING emitted, FS update proceeds; invalid transition → `UPDATE FAILED` returned, no DB call made
- [ ] AC-10: Status values not mappable to DB `newState` (e.g., `needs-split`, `BLOCKED`, `superseded`, `created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`) are handled gracefully — either skip DB write with a note, or map to `blocked`/`cancelled` where appropriate, with explicit decision documented

### Non-Goals

- This story does NOT add a `--db-only` or `--skip-db` flag. The DB write is always attempted first (shim pattern).
- This story does NOT remove YAML frontmatter updates. Frontmatter sync is retained for Phase 1 backward compatibility (removal is deferred to Phase 7 migration stories).
- This story does NOT update `story-move.md` — that is WINT-1060's scope.
- This story does NOT update `story-status.md` — that is WINT-1040's scope.
- This story does NOT replace the index update step — WINT-1070 owns the index deprecation.
- This story does NOT implement the telemetry logging (WINT-3070) that would eventually call telemetry tools from story-update.
- This story does NOT add concurrent update locking at the command layer — `storyUpdateStatus` already uses DB transactions.

### Reuse Plan

- **MCP Tools**: `shimUpdateStoryStatus` from `@repo/mcp-tools` (exported from `packages/backend/mcp-tools/src/index.ts`)
- **Schemas**: `StoryUpdateStatusInputSchema` from `packages/backend/mcp-tools/src/story-management/__types__/index.ts`
- **Patterns**: Command spec structure from `.claude/commands/story-update.md` v2.1.0 (preserve all sections, augment Step 3)
- **State Mapping**: `SWIM_LANE_TO_STATE` from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` as reference for the mapping table

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a **command spec story** (docs-only). There is no TypeScript source to write unit tests for. Tests are integration tests verifying agent behavior.
- Key test scenarios per AC-9: (a) happy path DB write, (b) DB unavailable fallback, (c) invalid transition guard, (d) `uat → completed` worktree cleanup + DB write in correct order.
- ADR-005 requires UAT to use real services. The `storyUpdateStatus` MCP tool connects to the live `wint.stories` PostgreSQL table. Integration tests should verify a real DB row is updated.
- The "status → DB state" mapping table (AC-2) should be tested exhaustively — at minimum the 6 mappable states and 4+ non-mappable states should have documented test expectations.
- Note: WINT-0120 (Telemetry MCP Tools) is listed in the index entry's ACs under "Phase 0 test infrastructure setup" — this is an artifact of copy-paste from sibling story WINT-1060. It does NOT apply to WINT-1050 which has no telemetry dependency. Do not add WINT-0120 as a blocker.

### For UI/UX Advisor

- Not applicable. This is a CLI/agent workflow command. No UI surface exists.
- The output YAML returned by the command (`feature_dir`, `story`, `old_status`, `new_status`, `file_updated`, `index_updated`) should be extended with `db_updated: true | false` for observability.

### For Dev Feasibility

- The implementation target is `.claude/commands/story-update.md` — a markdown spec file, not TypeScript source. The dev task is updating the command spec document.
- Step 3 (Update Frontmatter) should become Step 3 (DB Write via Shim) + Step 3.5 (Update Frontmatter, conditional on DB write failure or always as secondary).
- The canonical reference for the DB write call is `shimUpdateStoryStatus` in `packages/backend/mcp-tools/src/story-compatibility/index.ts`. The function signature: `shimUpdateStoryStatus(input: StoryUpdateStatusInput, options?: ShimOptions): Promise<StoryUpdateStatusOutput>`.
- Status string mapping challenge: the command uses hyphenated strings (`in-progress`, `ready-for-qa`), the DB uses underscored enums (`in_progress`, `ready_for_qa`). A lookup table in the command spec handles this.
- Statuses with no DB equivalent (`created`, `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `needs-split`, `BLOCKED`, `superseded`) require a decision: either (a) skip DB write for those statuses, or (b) map to a DB state (`blocked`, `cancelled`). Recommendation: skip DB write with a warning for `needs-split` and `BLOCKED`; map `elaboration` → no DB state exists yet (skip); map `superseded` → `cancelled`. Document decisions explicitly in AC-10.
- Execution order must be: validate transition → worktree cleanup (if uat→completed) → DB write → frontmatter write → index write. This order ensures the DB and FS remain consistent even on partial failures.
- Canonical references for subtask decomposition:
  - Spec edit: `.claude/commands/story-update.md` (augment Steps 3, 5 and add mapping table)
  - DB call reference: `packages/backend/mcp-tools/src/story-compatibility/index.ts` (`shimUpdateStoryStatus`)
  - Schema reference: `packages/backend/mcp-tools/src/story-management/__types__/index.ts` (`StoryUpdateStatusInputSchema.newState` enum)
