---
generated: "2026-02-17"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-1060

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A (no baseline reality file provided; `baseline_path: null`)
- Gaps: No baseline loaded. Codebase was scanned directly for ground truth.

### Relevant Existing Features

| Feature | Status | Source |
|---------|--------|--------|
| `shimGetStoryStatus` | UAT — PASS (35 unit + 10 integration tests) | WINT-1011 |
| `shimUpdateStoryStatus` | UAT — PASS | WINT-1011 |
| `shimGetStoriesByStatus` | UAT — PASS | WINT-1011 |
| `shimGetStoriesByFeature` | UAT — PASS | WINT-1011 |
| `core.stories` DB table + `storyStateEnum` (8 states) | Active | WINT-0020 + WINT-1030 |
| Swim-lane → DB state mapping (`SWIM_LANE_TO_STATE`) | Active, proven | WINT-1030 + WINT-1011 |
| `/story-move` command (directory-based) | Active | `.claude/commands/story-move.md` v2.0.0 |
| `/story-update` command (directory-based, with worktree cleanup hook) | Active | `.claude/commands/story-update.md` v2.1.0 |
| `/story-status` command (directory-based) | Active | `.claude/commands/story-status.md` v4.0.0 |
| Shim named exports in `mcp-tools/src/index.ts` | Active | WINT-1011 AC-8 |
| `ShimOptions` (injectable `storiesRoot`) | Active | WINT-1011 AC-12 |
| `isValidStoryId` from `@repo/workflow-logic` | Active | WINT-9010 |

### Active In-Progress Work

| Story | Status | Relevance |
|-------|--------|-----------|
| WINT-1040 | pending | Sibling — updates `/story-status` to use DB via shim |
| WINT-1050 | pending | Sibling — updates `/story-update` to use DB via shim |
| WINT-1120 | pending | Phase 1 gate — depends on WINT-1040, WINT-1050, and WINT-1060 all completing |
| WINT-1012 | uat | Shim diagnostics — adds `ShimDiagnostics` field; output is compatible with WINT-1060 |

### Constraints to Respect

- The shim module at `packages/backend/mcp-tools/src/story-compatibility/` is the only approved integration point — do not call `storyGetStatus`/`storyUpdateStatus` directly from the command.
- Do NOT write to filesystem directories in the update path (AC-2 from WINT-1011: `shimUpdateStoryStatus` is DB-only with fail-safe null on error — no directory mutation fallback).
- `@repo/db`, `@repo/logger`, and `@repo/database-schema` are protected — do not modify their API surfaces.
- No barrel files (CLAUDE.md rule) — import directly from source files.
- No TypeScript interfaces — Zod schemas with `z.infer<>` only (CLAUDE.md rule).
- `packages/backend/database-schema/` production schemas are protected — do not modify.
- The `/story-move` command must retain its directory-move fallback for backward compatibility with unmigrated agents (explicitly noted in index risk notes: "May still need to move directories for backward compatibility").

---

## Retrieved Context

### Related Endpoints

None — this story has no HTTP API surface. The shim is a TypeScript module consumed internally; the command is a markdown `.md` file read by agents.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| `/story-move` command | `.claude/commands/story-move.md` | Target command to update |
| `/story-update` command | `.claude/commands/story-update.md` | Sibling command (WINT-1050); model for DB integration pattern |
| `/story-status` command | `.claude/commands/story-status.md` | Sibling command (WINT-1040); read-only DB query model |
| Shim module | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Integration point for DB lookup and write |
| Shim types | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | `ShimOptions`, `SWIM_LANE_TO_STATE`, `resolveStoriesRoot` |

### Reuse Candidates

- `shimGetStoryStatus` — already exported from `@repo/mcp-tools`; use to locate story before move (DB-first)
- `shimUpdateStoryStatus` — already exported; use to write new status to DB after move decision
- `SWIM_LANE_TO_STATE` — exported constant mapping directory names to DB state enum values; use to determine `newState` from `TO_STAGE` argument
- `ShimOptions` + `resolveStoriesRoot` — injectable storiesRoot for test isolation
- `isValidStoryId` from `@repo/workflow-logic` — story ID validation (no regex reinvention)
- `@repo/logger` — required for all logging (no `console.log`)
- The pattern established by WINT-1050 for `/story-update` (once complete): augment the command with a DB write step before or instead of the filesystem step

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Shim API usage (DB-first read + write) | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Source of truth for all four shim functions; documents behavioral contract (no double-read, fail-safe write) |
| Shim types and state mapping | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | `SWIM_LANE_TO_STATE` constant maps stage directory names to DB state enum values — exact mapping needed for `TO_STAGE → newState` conversion |
| Story command structure (move) | `.claude/commands/story-move.md` | Current implementation being updated; defines argument contract, valid stages, execution steps, and return format |
| Story command with DB integration hook | `.claude/commands/story-update.md` | Most recent sibling command (v2.1.0); demonstrates how WINT-1150 added a DB-backed worktree cleanup hook into an existing command — same pattern for adding DB status write |

---

## Knowledge Context

### Lessons Learned

No KB search was performed (KB unavailable without MCP tools in this context). The following lessons are inferred from the WINT-1011 QA notes and sibling story patterns:

- **[WINT-1011]** `storyGetByStatus`/`storyGetByFeature` return `[]` on BOTH empty result AND DB error — the shim treats both as "empty, try directory fallback." Callers cannot distinguish the two cases. (category: behavioral-nuance)
  - *Applies because*: The move command will call `shimGetStoryStatus` which returns `null` on both DB-miss and DB-error. Implementation must handle null gracefully (directory fallback for locate, not for write).
- **[WINT-1011]** `blocked` and `cancelled` states have no swim-lane directory equivalent — stories in those states return `not_found` from directory fallback. (category: edge-case)
  - *Applies because*: If a story is in `blocked` or `cancelled` state in the DB, `shimGetStoryStatus` may fall back to directory scan and return `null`. The move command must handle this case.
- **[WINT-1011]** `ShimOptions.storiesRoot` must be injectable for unit test isolation — do not hardcode filesystem paths in command logic. (category: pattern)
  - *Applies because*: Any TypeScript glue code (e.g., a helper that maps `TO_STAGE` to DB state) should accept injectable paths for testability.

### Blockers to Avoid (from past stories)

- Do not hardcode the swim-lane → DB state mapping in the command; reuse `SWIM_LANE_TO_STATE` from the shim `__types__` module.
- Do not add filesystem writes to the DB update path (AC-2 from WINT-1011 is a hard constraint: `shimUpdateStoryStatus` never writes to filesystem; the command must follow the same discipline).
- Do not use `console.log` — use `@repo/logger`.
- Do not create a barrel file — named imports directly from source.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for any TypeScript glue code must use real PostgreSQL, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | If the command touches UI/agent workflows, at least one happy-path test is required; this command is agent-facing (no browser UI), so ADR-006 does not directly apply |

ADR-001 (API paths), ADR-002 (IaC), ADR-003 (CDN), ADR-004 (Auth) are not applicable to this story.

### Patterns to Follow

- DB-first with directory fallback for reads (story locate step).
- DB-write-only with fail-safe null for status updates (no directory mutation on the write path).
- Use `SWIM_LANE_TO_STATE[TO_STAGE]` to convert the stage argument to the `storyStateEnum` value before calling `shimUpdateStoryStatus`.
- Backward compatibility: if DB write returns null (DB unavailable), fall back to directory move (the legacy behavior) and log a warning. This is the safe degradation path during Phase 1 — the shim's fail-safe null on write is an acceptable signal for fallback.
- Return format in command output must extend (not replace) the existing YAML return block with DB-specific fields (e.g., `db_updated: true | false | skipped`).
- Retain existing command structure and signals (`MOVE COMPLETE`, `MOVE FAILED`, `MOVE SKIPPED`) — only augment with DB write step.

### Patterns to Avoid

- Do not replace directory movement with DB-only write and silently drop directory state — unmigrated agents still read the filesystem. Both operations should happen unless `--db-only` is explicitly scoped (defer to Phase 7 migration).
- Do not call `storyUpdateStatus` directly — always go through `shimUpdateStoryStatus` so the fail-safe and diagnostic layers are preserved.
- Do not add `shimGetStoriesByStatus` or `shimGetStoriesByFeature` calls to this command — only single-story operations (`shimGetStoryStatus`, `shimUpdateStoryStatus`) are needed.

---

## Conflict Analysis

### Conflict: Backward Compatibility Scope Uncertainty
- **Severity**: warning (non-blocking)
- **Description**: The index risk note states "May still need to move directories for backward compatibility." This creates a scope ambiguity: should WINT-1060 (a) do both DB write AND directory move, (b) do DB write only and skip directory move, or (c) do DB write first and fall back to directory move only if DB fails? The sibling stories (WINT-1040 for read, WINT-1050 for update) set the pattern for their respective operations, but WINT-1060 is unique because a "move" has two observable side effects: (1) status change and (2) filesystem directory change. At Phase 1, both effects are still expected by downstream agents.
- **Resolution Hint**: The recommended scope is: perform DB write via `shimUpdateStoryStatus` AND directory move (mv command) in sequence — DB write first, then directory move. If DB write returns null (DB unavailable), proceed with directory move and log a warning. This maintains the full observable behavior for unmigrated agents while progressively building DB authority. This matches the spirit of the compatibility shim: no hard cutover during Phase 1. Downstream WINT-7030 will remove the directory-move step when all agents are migrated.

---

## Story Seed

### Title

Update `/story-move` Command to Write Status to Database (DB-First with Directory Backward Compatibility)

### Description

The `/story-move` command currently moves a story directory between swim-lane folders (`backlog/`, `ready-to-work/`, `in-progress/`, etc.) as its sole mechanism for recording story status changes. This is the filesystem-only model that the WINT project is migrating away from.

WINT-1011 delivered the compatibility shim module (`shimGetStoryStatus`, `shimUpdateStoryStatus`, `shimGetStoriesByStatus`, `shimGetStoriesByFeature`) at `packages/backend/mcp-tools/src/story-compatibility/`. WINT-1030 populated the `core.stories` database table from the current directory state. The shim now provides a stable, well-tested integration point for reading and writing story status to the database with directory fallback.

This story updates `.claude/commands/story-move.md` to:
1. Write the new status to the database via `shimUpdateStoryStatus` before (or in parallel with) the directory move.
2. Continue performing the directory `mv` operation for backward compatibility — unmigrated agents still read the filesystem.
3. If the DB write returns null (DB unavailable), log a warning and proceed with directory move only (fail-safe degradation, not a blocking error).
4. Extend the command's return YAML block with a `db_updated` field reflecting the DB write outcome.

The `--update-status` flag path (which delegates to `/story-update`) is not independently modified here — WINT-1050 handles `/story-update` separately.

### Initial Acceptance Criteria

- [ ] AC-1: When `/story-move` is invoked with a valid `FEATURE_DIR`, `STORY_ID`, and `TO_STAGE`, the command calls `shimUpdateStoryStatus({ storyId: STORY_ID, newState: SWIM_LANE_TO_STATE[TO_STAGE] })` BEFORE executing the directory `mv` operation.
- [ ] AC-2: The directory `mv` operation is still executed regardless of DB write outcome — both the DB status and the filesystem directory position are updated on the happy path.
- [ ] AC-3: If `shimUpdateStoryStatus` returns null (DB unavailable), the command logs a warning using `@repo/logger` and proceeds with the directory `mv` (fail-safe degradation). The move is not aborted.
- [ ] AC-4: The `TO_STAGE` → DB state conversion uses `SWIM_LANE_TO_STATE` from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — no hardcoded state mapping in the command.
- [ ] AC-5: If `TO_STAGE` does not have a `SWIM_LANE_TO_STATE` entry (e.g., it is a stage not in the shim mapping), the DB write step is skipped with a logged warning, and the directory `mv` proceeds normally (graceful degradation for unmapped stages).
- [ ] AC-6: The command's return YAML block is extended with a `db_updated: true | false | skipped` field indicating the outcome of the DB write step.
- [ ] AC-7: The `--update-status` flag behavior is unchanged — it still delegates to `/story-update` (which is independently updated by WINT-1050) after the move.
- [ ] AC-8: All existing command signals (`MOVE COMPLETE`, `MOVE FAILED`, `MOVE SKIPPED`) and error handling behaviors are preserved — the DB write step does not change the command's external contract for failure/success signaling.
- [ ] AC-9: The story locate step (Step 1 in the current command) uses `shimGetStoryStatus` to attempt DB lookup first; if the story is found in the DB, the current stage is confirmed from the DB record. If not found in DB, the command falls back to the existing directory scan (no behavioral change for locate when DB is unavailable).

### Non-Goals

- Do NOT remove or replace the directory `mv` operation — this is a Phase 7 concern (WINT-7030).
- Do NOT modify `packages/backend/mcp-tools/src/story-compatibility/` — the shim API is complete and stable.
- Do NOT modify `packages/backend/database-schema/` or `@repo/db` API surface — protected.
- Do NOT add integration tests against a real PostgreSQL for the command itself — the shim already has integration test coverage (WINT-1011); command-level tests are unit tests against mocked shim calls.
- Do NOT implement `--db-only` mode (skip directory move) — deferred to Phase 7.
- Do NOT handle concurrent update conflicts — deferred to WINT-1160.
- Do NOT change the `--update-status` flag logic — owned by WINT-1050.
- Do NOT create a new package for this command's helper logic — co-locate any TypeScript utilities with the command test files or in the mcp-tools module (no new pnpm workspace packages).

### Reuse Plan

- **Components**: `shimGetStoryStatus`, `shimUpdateStoryStatus` from `packages/backend/mcp-tools/src/story-compatibility/index.ts`
- **Patterns**: `SWIM_LANE_TO_STATE` constant from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` for TO_STAGE → newState conversion; `ShimOptions`/`resolveStoriesRoot` for testable path injection; fail-safe null pattern from WINT-1011 AC-2
- **Packages**: `@repo/logger` (required), `@repo/workflow-logic` (`isValidStoryId` for story ID validation)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The command itself is a markdown instruction file (`.claude/commands/story-move.md`). The primary testable artifact is the agent behavior when reading this command — however, any TypeScript helper module introduced to support the DB write step (e.g., a `stageToDbState` utility) must have unit tests.

- Unit tests should mock `shimUpdateStoryStatus` and verify: (a) it is called with correct `newState` derived from `TO_STAGE`, (b) a null return triggers warning log and directory move proceeds, (c) a successful return produces `db_updated: true` in output.
- Integration tests (ADR-005): only required if a new TypeScript module is introduced; the shim already has integration coverage.
- The command itself does not have automated test infrastructure — verify behavioral correctness via documented manual test scenarios or agent dry-run scripts.
- Key edge cases: `TO_STAGE` not in `SWIM_LANE_TO_STATE` (e.g., `failed-code-review`), DB returns null (fail-safe), story not found in DB (locate fallback), valid move with `--update-status` flag (ensure no double-write with WINT-1050).

### For UI/UX Advisor

Not applicable — this command is agent-facing only (no browser UI or user-facing interface changes). The return YAML format is the only "output UX" concern: the new `db_updated` field should be clearly named and documented in the command's "Return Result" section.

### For Dev Feasibility

The implementation is primarily a markdown document update to `.claude/commands/story-move.md`. The key implementation questions are:

1. **Where does the TO_STAGE → newState conversion happen?** Either inline in the command instructions (using the `SWIM_LANE_TO_STATE` table rendered as a lookup table in the markdown), or in a TypeScript helper imported by the executing agent. The markdown approach is simpler and avoids new code files; the TypeScript approach enables unit testing. Recommend: add a small lookup table in the command markdown itself (since agents read and execute the command directly) and document that it mirrors `SWIM_LANE_TO_STATE`.

2. **Shim call placement**: The DB write step should be inserted as new Step 2.5 (between "Validate Move" and "Execute Move") in the command's Execution Steps section. This ordering ensures: (a) the move is validated before writing to DB, (b) if the move would fail (target already exists), we don't write a stale state to DB.

3. **WINT-1050 coordination**: If WINT-1050 is complete before WINT-1060, the `--update-status` flag path through `/story-update` will already be DB-aware. Coordinate to avoid double-writing the DB state (once from the move step, once from the update step). Resolution: the DB write in WINT-1060 only runs for the non-`--update-status` path, or the write in step 2.5 is skipped when `--update-status` is set (since WINT-1050's `/story-update` will handle it).

4. **Canonical references for decomposition**: See the "Canonical References" section above. The implementation touches one file (`story-move.md`) and potentially introduces one small TypeScript helper (optional). Estimated points: 1-2 (similar to WINT-1040/WINT-1050 scope).

5. **Stage mapping gap**: `SWIM_LANE_TO_STATE` covers 6 of the command's 10 valid stages. The stages `created`, `elaboration`, `needs-code-review`, and `failed-code-review` are NOT in the shim mapping (they have no DB state equivalent in the current `storyStateEnum`). AC-5 covers this gracefully — skip DB write for unmapped stages. Document which stages are DB-mapped and which are directory-only in the updated command.
