---
generated: "2026-02-20"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-1120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates several Phase 1 completions (WINT-1011, WINT-1012, WINT-1030, WINT-1130, WINT-1140, WINT-1150 all moved to UAT after baseline was cut). Baseline does not reflect the current state of dependencies.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| `@repo/db` client (Drizzle + Aurora PG) | Deployed | All DB reads/writes use this client |
| `core.stories` table + MCP tools (WINT-0090) | UAT | The target DB layer for CRUD verification |
| Compatibility shim (WINT-1011, WINT-1012) | UAT | The shim to verify DB-first + directory-fallback behavior |
| `core.worktrees` table + MCP tools (WINT-1130) | UAT | Worktree integration to verify in this story |
| `dev-implement-story` worktree integration (WINT-1140) | UAT | Parallel dev worktree auto-creation — one of the items to verify |
| Story completion worktree cleanup (WINT-1150) | UAT | Worktree cleanup on story completion — one of the items to verify |
| `story-update` command v2.1.0 | Active | Pre-DB-integration version; WINT-1050 adds DB write |
| `story-move` command | Active | Pre-DB-integration version; WINT-1060 adds DB write |
| `story-status` command | Active | Pre-DB-integration version; WINT-1040 adds DB read |
| LangGraph `story-repository.ts` | Active | Target of unification check (both systems on unified schema) |
| LangGraph `workflow-repository.ts` | Active | Second LangGraph repository for unification check |
| Orchestrator shared types (WINT-1100) | UAT | Shared Zod schemas between LangGraph + MCP tools |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| WINT-1040 | elaboration | Dependency: story-status command DB integration — must be complete before WINT-1120 |
| WINT-1050 | ready-to-work | Dependency: story-update command DB integration — must be complete before WINT-1120 |
| WINT-1060 | ready-to-work | Dependency: story-move command DB integration — must be complete before WINT-1120 |
| WINT-1070 | elaboration | Dependency: stories.index.md deprecation — must be complete before WINT-1120 |
| WINT-1160 | pending | Dependency: parallel work conflict prevention — must be complete before WINT-1120 |
| WINT-0240 | in-progress | Ollama model fleet (no overlap, different domain) |

### Constraints to Respect

- All production DB schemas in `packages/backend/database-schema/` are protected — do not modify
- `@repo/db` client API surface is protected — do not change its interface
- Orchestrator artifact schemas are protected — WINT-1120 only validates, does not modify
- The shim (WINT-1011) is designed for deletion in WINT-7100 — verification here should not harden it further
- ADR-005: All UAT verification must use real services, no mocking

---

## Retrieved Context

### Related Endpoints / MCP Tools

| Tool | Package | Purpose |
|------|---------|---------|
| `storyGetStatus` | `mcp-tools/src/story-management/` | Read story status from DB |
| `storyUpdateStatus` | `mcp-tools/src/story-management/` | Write story status to DB |
| `storyGetByStatus` | `mcp-tools/src/story-management/` | Query stories by state |
| `storyGetByFeature` | `mcp-tools/src/story-management/` | Query stories by epic/feature |
| `shimGetStoryStatus` | `mcp-tools/src/story-compatibility/` | DB-first + directory fallback read |
| `shimUpdateStoryStatus` | `mcp-tools/src/story-compatibility/` | DB-only write (no FS fallback) |
| `shimGetStoriesByStatus` | `mcp-tools/src/story-compatibility/` | DB-first + directory fallback by state |
| `shimGetStoriesByFeature` | `mcp-tools/src/story-compatibility/` | DB-first + directory fallback by feature |
| `worktree_register` | `mcp-tools/src/worktree-management/` | Register worktree in DB |
| `worktree_get_by_story` | `mcp-tools/src/worktree-management/` | Lookup worktree for a story |
| `worktree_list_active` | `mcp-tools/src/worktree-management/` | List all active worktrees |
| `worktree_mark_complete` | `mcp-tools/src/worktree-management/` | Mark worktree merged/abandoned |

### Related Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `StoryRepository` | `packages/backend/orchestrator/src/db/story-repository.ts` | LangGraph story CRUD |
| `WorkflowRepository` | `packages/backend/orchestrator/src/db/workflow-repository.ts` | LangGraph workflow state |
| `/story-update` command | `.claude/commands/story-update.md` | Command requiring DB integration (WINT-1050) |
| `/story-move` command | `.claude/commands/story-move.md` | Command requiring DB integration (WINT-1060) |
| `/story-status` command | `.claude/commands/story-status.md` | Command requiring DB integration (WINT-1040) |

### Reuse Candidates

- Existing integration test patterns from WINT-1011/WINT-1012 (`mcp-tools/src/story-compatibility/__tests__/integration/`)
- Existing story-management integration tests (`mcp-tools/src/story-management/__tests__/integration.test.ts`)
- Worktree management integration tests (`mcp-tools/src/worktree-management/__tests__/integration.test.ts`)
- `@repo/db` client for direct DB verification queries
- `@repo/logger` for validation output
- Existing Vitest configuration across `packages/backend/mcp-tools/`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| MCP tool with Zod validation + DB query | `packages/backend/mcp-tools/src/story-management/story-get-status.ts` | Clean Drizzle query, resilient error handling, Zod at entry, null-safe return |
| Compatibility shim implementation | `packages/backend/mcp-tools/src/story-compatibility/index.ts` | The exact module under test — understand DB-first + fallback logic before writing ACs |
| LangGraph story repository | `packages/backend/orchestrator/src/db/story-repository.ts` | Full CRUD class with DI pattern, state transition logging — represents LangGraph's side of unified schema |
| Worktree management integration test | `packages/backend/mcp-tools/src/worktree-management/__tests__/integration.test.ts` | Example of how integration tests are structured in this codebase |

---

## Knowledge Context

### Lessons Learned

No KB query was executed (no `kb_search` tool available in this context). Lessons are inferred from index history and story notes.

**Inferred from story history:**
- **[WINT-1011]** Shim must guarantee no-double-read: DB hit returns immediately without scanning FS. Applies because WINT-1120 must verify this contract holds end-to-end.
- **[WINT-1012]** ShimDiagnostics field (`source: db | directory | not_found`) enables observability. Applies because validation testing should exercise all three source paths.
- **[WINT-1030]** Directory scanning edge cases (wrong-directory stories) need handling. Applies because shim fallback relies on directory scan from WINT-1030 swim-lane mapping.
- **[WINT-1140]** `wt-switch` and `wt-new` interface must be verified during setup before integration testing. Applies because worktree integration testing requires live worktree tools.
- **[WINT-1150]** `wt-finish` structured output must surface CI/PR failure reasons. Applies because worktree cleanup verification needs to test both success and failure paths.

### Blockers to Avoid (from past stories)

- Do not begin integration testing before all 5 dependency stories are complete (WINT-1040, WINT-1050, WINT-1060, WINT-1070, WINT-1160)
- Do not mock the database for validation — this is a foundation validation story, all DB calls must use real postgres-knowledgebase
- Do not attempt LangGraph unified schema verification before confirming WINT-1080/WINT-1090/WINT-1100 are stable (they are in UAT, not yet completed)
- Do not assume the shim's directory fallback path works without explicitly exercising it with a story absent from DB

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — all verification in this story runs against live postgres-knowledgebase |
| ADR-006 | E2E Tests Required in Dev Phase | Validation story has no UI surface; ADR-006 skip condition applies (`frontend_impacted: false`) |

ADR-001 (API paths) and ADR-002 (IaC) do not apply — this story is pure infrastructure/workflow validation with no HTTP endpoints or AWS resources.

### Patterns to Follow

- All DB interactions via `@repo/db` client (Drizzle ORM) — no raw pg queries in validation scripts
- `@repo/logger` for all validation output (no `console.log`)
- Zod schemas for all validation result structures — follow pattern from `mcp-tools/__types__/`
- Integration tests use real postgres-knowledgebase (port 5433) as established in WINT-0090, WINT-1011 test suites
- Validation report artifacts follow EVIDENCE.yaml pattern

### Patterns to Avoid

- Do not write a "validation script" that just calls each function once with hardcoded data — each AC needs a meaningful scenario (create, read, update, verify state, assert fallback)
- Do not skip the LangGraph side of the unified schema check — WINT-1120 explicitly validates BOTH systems operate on the same tables
- Do not conflate "shim fallback" verification with "DB-only" verification — test both paths distinctly

---

## Conflict Analysis

### Conflict: Dependency not yet complete — BLOCKING

- **Severity**: blocking
- **Description**: WINT-1120 depends on WINT-1040, WINT-1050, WINT-1060, WINT-1070, and WINT-1160. As of 2026-02-20, WINT-1040 is in `elaboration`, WINT-1050 and WINT-1060 are `ready-to-work`, WINT-1070 is in `elaboration`, and WINT-1160 is `pending`. None of the three required commands have their DB integrations complete. WINT-1120 cannot be implemented until all five dependency stories reach at least `uat`.
- **Resolution Hint**: This seed should be elaborated now so the story is ready-to-work immediately when all five dependencies complete. Implementation must not begin until all five are in `uat` or `completed`.
- **Source**: index (stories.index.md dependency entries)

### Conflict: LangGraph stories in UAT but not completed — Warning

- **Severity**: warning
- **Description**: WINT-1080 (Reconcile WINT Schema with LangGraph), WINT-1090 (Update LangGraph Repositories), and WINT-1100 (Shared TypeScript Types) are listed as `uat` in the index. WINT-1120's goal includes verifying "both LangGraph and Claude Code agents operate on unified schema." The schema unification work is available but not yet signed off as `completed`. If these stories have outstanding issues discovered in UAT, it could affect WINT-1120 scope.
- **Resolution Hint**: At implementation start, verify WINT-1080/WINT-1090/WINT-1100 are fully passing UAT with no outstanding issues before writing unified schema ACs. If they have open issues, adjust scope accordingly.
- **Source**: baseline + index

---

## Story Seed

### Title

Validate Foundation Phase — Story CRUD, Shim, Commands, Unified Schema, and Worktree Integration

### Description

Phase 1 has established the database foundation for story lifecycle management. Across WINT-1011 through WINT-1160, the following systems have been built:

1. **Story CRUD via DB**: `core.stories` table and four MCP tools (story_get_status, story_update_status, story_get_by_status, story_get_by_feature) are live.
2. **Compatibility Shim**: Four shim functions provide DB-first reads with directory fallback and DB-only writes — designed for deletion in Phase 7.
3. **Three Updated Commands**: `/story-status` (WINT-1040), `/story-update` (WINT-1050), and `/story-move` (WINT-1060) have been augmented to write/read via DB.
4. **Unified Schema**: LangGraph repositories (`story-repository.ts`, `workflow-repository.ts`) and Claude Code MCP tools share the same `wint.stories` schema via shared Zod types (WINT-1100).
5. **Worktree Integration**: Worktrees are registered in DB on story start (WINT-1140), cleaned up on story completion (WINT-1150), and conflict detection prevents duplicate work (WINT-1160).

This validation story runs end-to-end integration checks across all five areas to confirm the foundation is solid before Phase 2 (Context Cache) work begins. It produces an EVIDENCE.yaml proving each area passes.

The goal is not to debug or fix — it is to verify. If failures are found, new fix stories should be filed; this story's scope is proof, not repair.

### Initial Acceptance Criteria

- [ ] AC-1: All four story CRUD operations (get by ID, update status, get by status, get by feature) execute successfully against live `core.stories` table via MCP tools — verified with at least one known WINT story ID per operation
- [ ] AC-2: Shim DB-hit path: `shimGetStoryStatus` for a story present in DB returns a record with `source: db` (ShimDiagnostics) and does NOT trigger a directory scan
- [ ] AC-3: Shim DB-miss path: `shimGetStoryStatus` for a story absent from DB but present in a swim-lane directory returns a record with `source: directory` (ShimDiagnostics) — confirming fallback activates
- [ ] AC-4: Shim update path: `shimUpdateStoryStatus` writes to DB only — calling it on a story absent from DB returns null and logs a WARNING with no filesystem side effect
- [ ] AC-5: `/story-status` command (post-WINT-1040) reads story state from DB and returns correct status for at least one story with a known DB record
- [ ] AC-6: `/story-update` command (post-WINT-1050) writes status change to DB before updating YAML frontmatter — verified by querying DB state before and after command execution, confirming `db_updated: true` in result YAML
- [ ] AC-7: `/story-move` command (post-WINT-1060) writes DB status change before executing directory mv — verified by querying DB state before and after command, confirming both DB and directory reflect the new state
- [ ] AC-8: LangGraph `StoryRepository.getStory()` and Claude Code `storyGetStatus()` return consistent data for the same story ID — fields `storyId`, `state`, `title` match between both system reads
- [ ] AC-9: LangGraph `StoryRepository.updateStoryState()` and Claude Code `storyUpdateStatus()` operate on the same underlying `wint.stories` table — a write via one system is immediately visible via the other system's read
- [ ] AC-10: Worktree registration: `worktree_register` MCP tool writes a record to `core.worktrees` — verified by calling `worktree_get_by_story` immediately after and confirming the record is present with correct `story_id`, `branch_name`, and `status: active`
- [ ] AC-11: Worktree lookup from `dev-implement-story`: if a story already has an active worktree record in DB, the command detects it and offers the three-option dialog (switch / take-over / abort) rather than creating a duplicate
- [ ] AC-12: Worktree cleanup via `story-update completed`: calling `/story-update` to transition a story to `completed` triggers the `wt-finish` path, calls `worktree_mark_complete`, and the DB record reflects `status: merged` or `status: abandoned`
- [ ] AC-13: All verifications above are documented in `EVIDENCE.yaml` with pass/fail per AC, specific DB query results used as proof, and zero unresolved failures
- [ ] AC-14: If any AC fails, a follow-up fix story is filed with the failing AC as its scope — WINT-1120 itself is marked CONDITIONAL PASS with blockers listed

### Non-Goals

- Fixing bugs found during validation (file a fix story; do not expand scope)
- Performance benchmarking of DB queries (deferred to telemetry phase, WINT-3000s)
- Validating the document generation script from WINT-1070 beyond confirming it reads from DB (full generation testing belongs in WINT-1070 itself)
- Removing the compatibility shim (deferred to WINT-7100)
- Testing Phase 2+ stories (context cache, sidecars, etc.)
- Modifying any protected schemas in `packages/backend/database-schema/`
- Modifying the `@repo/db` client API surface
- Creating new MCP tools or agents

### Reuse Plan

- **Components**: Existing integration test fixtures from `mcp-tools/src/story-compatibility/__tests__/integration/` and `mcp-tools/src/worktree-management/__tests__/integration.test.ts`
- **Patterns**: EVIDENCE.yaml schema from `packages/backend/orchestrator/src/artifacts/evidence.ts` for proof documentation
- **Packages**: `@repo/db` (live DB queries), `@repo/logger` (validation output), `@repo/database-schema` (schema reference)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is an integration validation story with no new code — the "tests" are verification scenarios run against live postgres-knowledgebase (port 5433). Test plan should:
- Define exactly which story IDs to use for each AC (pick real stories already in DB from WINT-1030 population)
- Define the DB-miss scenario: select a story ID that exists on disk (swim-lane directory) but has NOT been inserted into `core.stories` — this is the shim fallback trigger
- Define the unified schema parity check: choose one story ID and specify the exact fields to compare between LangGraph and MCP tool reads
- Define the worktree lifecycle scenario: either create a fresh test worktree or identify a story that already has a `core.worktrees` record
- UAT-style verification only — no mocking, no in-memory DB (ADR-005)
- E2E tests not applicable (`frontend_impacted: false`, ADR-006 skip condition applies)

### For UI/UX Advisor

No UI surfaces are involved in this story. No UX review required.

### For Dev Feasibility

**Implementation approach**: This story is a validation script + EVIDENCE.yaml production exercise, not a code implementation. The dev approach should be:

1. **Setup**: Confirm all 5 dependency stories (WINT-1040, WINT-1050, WINT-1060, WINT-1070, WINT-1160) are in `uat` or `completed`. If any are not, STOP — WINT-1120 cannot proceed.
2. **DB access**: Use `@repo/db` or direct `psql` queries against postgres-knowledgebase (port 5433) to inspect table state. The `wint.stories` and `core.worktrees` tables are the primary verification surfaces.
3. **Shim validation**: Write a small Vitest integration test (extending existing integration suite) that explicitly exercises the DB-hit and DB-miss paths with ShimDiagnostics opt-in.
4. **Command validation**: Invoke each of the three updated commands in a test session and capture their result YAML output — `db_updated: true` is the key assertion.
5. **LangGraph parity check**: Instantiate `StoryRepository` with a real DB client and call `getStory()` for the same story ID fetched via `storyGetStatus()` — compare the returned fields.
6. **Worktree validation**: Use the MCP tools directly (no CLI) to register a test worktree, query it back, and mark it complete.

**Canonical references for subtask decomposition**:
- Shim source: `packages/backend/mcp-tools/src/story-compatibility/index.ts` — understand exactly what each function does before writing verification assertions
- Story MCP tool: `packages/backend/mcp-tools/src/story-management/story-get-status.ts` — clean pattern for DB interaction
- LangGraph repository: `packages/backend/orchestrator/src/db/story-repository.ts` — the LangGraph side of the parity check

**Key risk**: WINT-1080 (unified schema reconciliation) is in UAT. If its unified schema tables differ from what `storyGetStatus` and `StoryRepository` actually query (e.g., `core.stories` vs `wint.stories` naming), the parity check (AC-8, AC-9) will fail. Confirm both systems point to the same physical table before attempting parity verification.
