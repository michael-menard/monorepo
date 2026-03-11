---
generated: "2026-02-17"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-1040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-1011, WINT-1012, and WINT-1030 completion. Post-baseline reality is established via story files and proof documents in `wint/UAT/`. The following post-baseline facts are confirmed on disk:
  - WINT-1011 (Compatibility Shim — Core Functions): UAT, QA PASS 2026-02-17
  - WINT-1012 (Compatibility Shim — Observability): UAT, QA PASS 2026-02-17
  - WINT-1030 (Populate Story Status from Directories): UAT, QA PASS 2026-02-16
  - WINT-9010 (Shared Business Logic Package): ready-to-work

### Relevant Existing Features

| Feature | Location | Status | Relevance |
|---------|----------|--------|-----------|
| `/story-status` command | `.claude/commands/story-status.md` (v4.0.0) | Active | Direct target of this story |
| Compatibility Shim Module | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | UAT/PASS (WINT-1011) | shimGetStoryStatus, shimGetStoriesByStatus, shimGetStoriesByFeature are the replacement data source |
| ShimDiagnostics / observability | WINT-1012 | UAT/PASS | `source: db | directory | not_found` opt-in field available |
| Story Management MCP Tools | `packages/backend/mcp-tools/src/story-management/` | UAT/PASS (WINT-0090) | Underlying DB query layer used by shims |
| `core.stories` table population | WINT-1030 | UAT/PASS | DB is now populated and the shim can resolve stories from DB |
| `@repo/workflow-logic` package | `packages/backend/workflow-logic/` | ready-to-work (WINT-9010) | isValidStoryId already referenced in shim |
| `shimGetStoriesByFeature` | Part of WINT-1011 shim | UAT/PASS | Will replace the feature-level directory scan in /story-status |

### Active In-Progress Work

| Story | Status | Potential Impact |
|-------|--------|-----------------|
| WINT-1020 (Flatten Story Directories) | ready-to-work | Story explicitly states WINT-1040 depends on WINT-1030 (which itself depended on WINT-1020). WINT-1020 status mapping is baked into the shim's SWIM_LANE_TO_STATE. No conflict. |
| WINT-1050 (story-update → DB) | pending | Sibling story: same pattern as WINT-1040. Should be worked after WINT-1040 to learn from this implementation. |
| WINT-1060 (story-move → DB) | pending | Sibling story: same pattern as WINT-1040. |
| WINT-1070 (Deprecate stories.index.md) | pending | Downstream: WINT-1040 must remain compatible with index-based display as long as WINT-1070 is pending |
| WINT-9010 (Shared Business Logic) | ready-to-work | `isValidStoryId` from `@repo/workflow-logic` already used in shim. WINT-1040 command is a markdown file, not TypeScript — no direct dependency on WINT-9010. |

### Constraints to Respect

- `/story-status` is a **read-only** command. It must stay read-only — no DB writes in this story.
- The command file is `docs-only` permission level — no TypeScript code lives inside the command file itself. All data-access logic lives in the shim module (already complete).
- The command must continue to work when the DB is unavailable (shim fallback handles this automatically).
- `stories.index.md` remains the source of data for the `--depth` and `--deps-order` modes until WINT-1070 completes. Only single-story lookup and feature summary modes are candidates for DB-first routing in WINT-1040.
- Backward compatibility is mandatory: existing callers of `/story-status` must see no regression.
- `SWIM_LANE_TO_STATE` in the shim maps 6 swim lanes. The command's swimlane view maps 11 directory entries. The shim does not map `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`, `created`. These states come from DB only (or directory scan without shim support).

---

## Retrieved Context

### Related Endpoints

None — `/story-status` is a Claude Code skill command (markdown), not an HTTP endpoint.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| story-status command | `.claude/commands/story-status.md` | Direct modification target |
| story-status-output example | `.claude/agents/_reference/examples/story-status-output.md` | Output format reference — must remain compatible |
| story-update command | `.claude/commands/story-update.md` | Sibling command — follow same DB-integration pattern |
| shimGetStoryStatus | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Primary data source for single-story lookup mode |
| shimGetStoriesByStatus | Same file | Data source for feature-level status aggregation |
| shimGetStoriesByFeature | Same file | Data source for feature-level story listing |
| ShimOptions | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | Options type for storiesRoot injection |
| StoryGetStatusOutput | `packages/backend/mcp-tools/src/story-management/__types__/index.ts` | Type returned by shim: id, storyId, title, state, priority, storyType, epic, wave, createdAt, updatedAt |
| mcp-tools index exports | `packages/backend/mcp-tools/src/index.ts` | Shim functions exported as named exports (AC-8 of WINT-1011 complete) |

### Reuse Candidates

| Candidate | How to Reuse |
|-----------|-------------|
| `shimGetStoryStatus` | Call via MCP tool `story_get_status` or direct import — the shim routes DB-first automatically |
| `shimGetStoriesByFeature` | Call to get all stories for a given epic prefix — replaces directory scan for feature summary mode |
| SWIM_LANE_TO_STATE mapping | Already baked into shim; command does not need to replicate this |
| Output format from story-status-output.md | Reuse existing format — single-story, feature summary, swimlane, deps-order remain the same visually |
| story-update DB integration pattern | Once WINT-1040 is done, story-update (WINT-1050) should follow the same pattern |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Command file that calls MCP tools | `.claude/commands/story-update.md` | story-update calls `worktree_get_by_story` and `worktree_mark_complete` MCP tools directly from a command markdown file — same pattern WINT-1040 should follow for shim calls |
| Shim function signatures | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | Complete implementation of all four shim functions — shows exact input types, return types, and fallback behavior |
| Shim types and options | `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` | ShimOptions, SWIM_LANE_TO_STATE, resolveStoriesRoot — what the command needs to understand about the shim API |
| MCP tool exports | `packages/backend/mcp-tools/src/index.ts` | Confirms the shim functions are exported as named exports from the package root |

---

## Knowledge Context

### Lessons Learned

No KB search was performed (no live KB connection in seed phase). The following lessons are inferred from post-baseline story files and proof documents.

- **[WINT-1011]** The shim functions handle all DB-unavailability and directory-fallback transparently. The command does not need to implement fallback logic — it calls the shim and gets a result. (category: pattern)
  - *Applies because*: WINT-1040 must not reimplement fallback logic the shim already provides.

- **[WINT-1011]** `shimUpdateStoryStatus` returns `null` on DB failure and never writes to filesystem. Only read shims have directory fallback. (category: pattern)
  - *Applies because*: `/story-status` is read-only, so this constraint does not affect WINT-1040, but confirms the separation of read vs write concerns.

- **[WINT-1030]** Status enum values in the DB use underscore format (`ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`). The command's swimlane display uses hyphenated format. The command must map DB enum values to display labels. (category: blocker-to-avoid)
  - *Applies because*: When rendering the swimlane or single-story output, the command receives DB state values and must map them to the human-readable status labels shown in the output examples.

- **[WINT-1011/WINT-1012]** The shim exposes an optional `ShimDiagnostics` field (`source: db | directory | not_found`). This can be used to log or display the data source for debugging. (category: pattern)
  - *Applies because*: The command could optionally surface the data source in verbose output mode without additional complexity.

- **[WINT-1030]** The DB does not yet contain all status states that the directory-based approach tracked (e.g., `elaboration`, `needs-code-review`, `failed-code-review`, `failed-qa`). These are DB-only states or states that require fallback. (category: constraint)
  - *Applies because*: Feature summary and swimlane modes that rely on counting stories by state will show gaps for states not in SWIM_LANE_TO_STATE unless DB has been fully populated.

### Blockers to Avoid (from past stories)

- Do not reimplement directory scanning logic inside the command — the shim already does this as a fallback
- Do not assume all stories in a feature are in the DB yet — the shim's fallback handles the gap
- Do not change the output format — downstream consumers (human operators, other agents) expect the current format
- Do not update frontmatter or move files — this command is read-only and must stay that way
- Do not read the full `stories.index.md` unless in `--depth` or `--deps-order` mode (performance constraint from the current command spec)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any integration/UAT verification for WINT-1040 must use real PostgreSQL, not mocks. Unit tests may mock the shim functions. |

ADR-001, ADR-002, ADR-003, ADR-004, ADR-006 are not relevant to this story (no API routes, no infrastructure, no images, no auth, no frontend E2E).

### Patterns to Follow

- The command is a markdown file (`.claude/commands/story-status.md`) — modify in-place, do not create TypeScript wrappers
- Call shim functions via MCP tools (same approach as `story-update` calling `worktree_get_by_story`)
- Map DB state enum values to display labels in the command spec
- Maintain the existing output format from `story-status-output.md` — visual output must be unchanged
- Preserve all existing modes (no args, feature only, feature + `--depth`, feature + `--deps-order`, feature + story ID)
- The `--depth` and `--deps-order` modes still parse `stories.index.md` — only the "feature + story ID" and "feature only" modes are candidates for DB routing

### Patterns to Avoid

- Do not add TypeScript source files as part of this story — the command is a markdown file
- Do not hardcode story state enum values in the command — map them using the established DB enum values
- Do not query the DB for `--depth` or `--deps-order` modes in this story — that is future work (WINT-1070)
- Do not change the `permission_level: docs-only` or other frontmatter on the command file without justification

---

## Conflict Analysis

### Conflict: Scope Ambiguity — Which Modes Go DB-First?

- **Severity**: warning
- **Description**: The current `/story-status` command has 4 distinct modes. The index entry says "query core.stories table instead of directory structure" but does not specify which modes change. The `--depth` and `--deps-order` modes parse `stories.index.md` for dependency graph data that is not yet in the DB. Only the "single story" and "feature summary" modes can pragmatically switch to DB-first.
- **Resolution Hint**: Scope WINT-1040 to the "single story" mode (DB-first via `shimGetStoryStatus`) and optionally the "feature summary" mode (DB-first via `shimGetStoriesByFeature`). Leave `--depth` and `--deps-order` as-is. Document this in Non-Goals. Elaboration should confirm.

### Conflict: DB State vs Display Status Mismatch

- **Severity**: warning
- **Description**: DB state enum values (`ready_to_work`, `in_qa`, etc.) do not directly match the swimlane display labels (`ready-to-work`, `UAT/completed`). The command's swimlane mapping currently uses directory names as input. When the DB is the source, the command receives state enum values and must map them to display labels.
- **Resolution Hint**: Add an explicit state-to-display-label mapping in the updated command spec. This is a documentation addition to the command file, not a code change. The mapping should mirror the inverse of SWIM_LANE_TO_STATE from the shim types.

---

## Story Seed

### Title

Update `/story-status` Command to Use DB as Primary Source for Story Lookup

### Description

**Context**: The WINT platform has reached a milestone where the `core.stories` database table is populated (WINT-1030), and the compatibility shim module (WINT-1011/WINT-1012) is UAT-verified. The shim provides `shimGetStoryStatus`, `shimGetStoriesByStatus`, and `shimGetStoriesByFeature` functions that route DB-first with automatic directory fallback. The story management MCP tools are exported from `@repo/mcp-tools` and callable by agents executing commands.

**Problem**: The `/story-status` command (`.claude/commands/story-status.md`) currently operates purely from directory structure and `stories.index.md`. When a story's directory-based location no longer reflects its true state (because WINT-1030 populated the DB and WINT-1020 will eventually flatten the directories), the command gives stale or incorrect results for single-story lookup.

**Solution**: Update the `/story-status` command's "Feature + Story ID" mode to call `shimGetStoryStatus` (via MCP tool `story_get_status` or compatible invocation) instead of scanning directories. Optionally update the "Feature Only" summary mode to call `shimGetStoriesByFeature` for story counts. Leave `--depth` and `--deps-order` modes unchanged — they depend on `stories.index.md` for dependency graph data not yet in the DB. The shim handles DB-unavailability and directory fallback transparently, so backward compatibility is maintained.

### Initial Acceptance Criteria

- [ ] **AC-1**: When invoked as `/story-status {FEATURE_DIR} {STORY_ID}`, the command calls `shimGetStoryStatus` (via the story_get_status MCP tool) and displays the DB-sourced status. Falls back to directory scan automatically via shim if DB is unavailable.
  - Verification: Running the command for an existing story ID returns status from DB (not directory scan). When DB is unavailable, status is returned from directory fallback.

- [ ] **AC-2**: The output format for single-story mode is unchanged — displays `Story`, `Status`, `Location` (derived from state), and `Depends On`.
  - Verification: Output matches the example in `story-status-output.md` Single Story Output section.

- [ ] **AC-3**: DB state enum values (`ready_to_work`, `in_progress`, `ready_for_qa`, `in_qa`, `done`, `backlog`, `blocked`, `cancelled`) are mapped to human-readable status labels for display. The mapping is documented in the updated command spec.
  - Verification: For each DB state value, the command displays a recognizable human-readable label.

- [ ] **AC-4**: The `--depth` and `--deps-order` modes continue to read `stories.index.md` unchanged. No regression.
  - Verification: Existing `--depth` and `--deps-order` output is identical before and after this story.

- [ ] **AC-5**: The "Feature Only" (no Story ID) mode optionally calls `shimGetStoriesByFeature` for status counts. If implemented, the summary table counts are sourced from DB (with fallback). If not implemented, this is documented as a Non-Goal.
  - Verification: Either the feature summary shows DB-sourced counts, or the AC is documented as deferred to WINT-1070.

- [ ] **AC-6**: The command remains read-only. No writes to frontmatter, no directory moves, no DB updates.
  - Verification: Static review of updated command spec confirms no write operations.

- [ ] **AC-7**: When no DB record is found and directory fallback also fails, the command displays `Story not found` (same as current behavior for unknown IDs).
  - Verification: Invoking the command with a non-existent story ID returns `Story not found`.

- [ ] **AC-8**: The updated command spec documents the DB-first routing behavior, including the fallback behavior when the DB is unavailable. This information helps operators understand why results may differ between DB and directory states during the migration window.
  - Verification: Updated `.claude/commands/story-status.md` includes a "Data Source" section or equivalent note.

### Non-Goals

- Do not migrate `--depth` mode to use the DB — that is WINT-1070 (stories.index.md deprecation)
- Do not migrate `--deps-order` mode to use the DB — dependency graph data is not in the DB yet
- Do not add TypeScript source files — this story only modifies the command markdown file
- Do not implement DB writes — the command is and must remain read-only
- Do not remove backward compatibility — agents and humans calling `/story-status` must see no regression
- Do not implement the "No Arguments" (all-features summary) mode as DB-first — too broad in scope
- Do not modify the SWIM_LANE_TO_STATE mapping — it lives in the shim and must not be duplicated
- Do not update `stories.index.md` or any story frontmatter files

### Reuse Plan

- **Components**:
  - `shimGetStoryStatus` from `packages/backend/mcp-tools/src/story-compatibility/index.ts` (via MCP tool or direct export)
  - `shimGetStoriesByFeature` from same module (optional, for AC-5)
  - `ShimOptions` type from `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` (for understanding fallback behavior)
  - Output format from `.claude/agents/_reference/examples/story-status-output.md`
- **Patterns**:
  - Command-calls-MCP-tool pattern from `.claude/commands/story-update.md` (worktree_get_by_story invocation)
  - DB state enum to display label mapping (inverse of SWIM_LANE_TO_STATE)
  - Read-only, docs-only command modification pattern
- **Packages**:
  - `@repo/mcp-tools` (shim exports)
  - `@repo/logger` (not directly in command, but shim uses it internally)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary testable behavior is the "single story" mode. Test scenarios needed:
  1. Story exists in DB — returns DB-sourced status
  2. Story not in DB, exists in directory — returns directory fallback result (via shim)
  3. Story not in DB, not in directory — returns "Story not found"
  4. DB unavailable — returns directory fallback (shim handles this)
  5. `--depth` mode unchanged (regression test)
  6. `--deps-order` mode unchanged (regression test)
- The command is a markdown file, so unit tests are not applicable in the traditional sense. UAT testing requires a live PostgreSQL connection (ADR-005).
- Since this is a command modification (docs-only), the primary verification is behavioral: invoke the command and observe output.
- Consider whether WINT-1040 needs an integration test harness or if behavioral observation during QA is sufficient.

### For UI/UX Advisor

- The visual output must remain identical to the current format — no changes to the swimlane ASCII art, progress bars, or dependency graph output.
- The only UX consideration is whether to surface the data source (`db` vs `directory`) in the single-story output. This could be a one-line addition: `Source: database` or `Source: directory (DB miss)`. This is optional and should be scoped conservatively.
- Operators may be confused if the DB and directory disagree. A brief note in the command output (or the "Data Source" section in the command spec) helps set expectations during the migration window.

### For Dev Feasibility

- This story modifies a single markdown file: `.claude/commands/story-status.md`
- The implementation involves:
  1. Adding a "Data Source" section to the command spec explaining DB-first routing
  2. Updating the "Feature + Story ID" mode to call `shimGetStoryStatus` (via MCP tool `story_get_status`) instead of directory scan
  3. Adding a DB-state-to-display-label mapping table to the command spec
  4. Optionally updating the "Feature Only" mode (AC-5)
- Effort estimate: LOW (2-4 hours). This is a documentation/spec update, not a TypeScript implementation.
- The shim module is already UAT-verified. The command only needs to call it correctly.
- Canonical references for implementation:
  - `.claude/commands/story-update.md` — shows how a command calls MCP tools inline
  - `packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts` — SWIM_LANE_TO_STATE (inverse mapping needed for display)
  - `packages/backend/mcp-tools/src/story-management/__types__/index.ts` — StoryGetStatusOutput shape (id, storyId, title, state, priority, storyType, epic, wave)
- The key question for feasibility: does the executing agent have access to the `story_get_status` MCP tool when running `/story-status`? This must be confirmed during setup. If MCP tools are unavailable (e.g., KB server down), the command should degrade gracefully by falling back to the existing directory-scan approach.
- **Split risk**: LOW. This story is well-bounded: one command file, one primary mode change. No TypeScript changes.
