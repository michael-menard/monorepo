---
generated: "2026-03-18"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: PIPE-1030

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No `plans/baselines/` directory exists in the repository. No active baseline reality file is available. Context was gathered directly from KB queries and codebase scanning.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| `autonomous-pipeline-test-plan` plan | `stories-created` | Plan exists in KB, linked to 8 ORCH stories |
| ORCH-1010 (Mock LLM Factory) | `completed` | Shared test factories delivered |
| ORCH-2010 (Unit Tests — Edge Routing) | `completed` | Elaboration/story-creation edge routing unit tests done |
| ORCH-2020 (Unit Tests — State Validation) | `backlog` | State validation utilities tests pending |
| ORCH-3010 (Integration — Elaboration Delta Cluster) | `completed` | Multi-node delta pipeline integration tests done |
| ORCH-3020 (Integration — Story Creation Fanout) | `backlog` | Fanout+attack cluster integration tests pending |
| ORCH-3030 (Integration — Persistence Round-Trip) | `backlog` | DB persistence round-trip tests pending |
| ORCH-4010 (Full Graph Tests) | `backlog` | Elaboration + story-creation full graph tests pending |
| ORCH-4020 (E2E Pipeline Tests) | `completed` | Bootstrap→story-creation→elaboration E2E done |
| `packages/backend/orchestrator` | Present | 23 graph types, fully built, never triggered end-to-end by scheduler |

### CRITICAL REALITY DISCREPANCY

The story description states: "Only ORCH-1010 exists in KB. Import remaining 7."

**This is FALSE as of 2026-03-18.** All 8 ORCH stories are already in the KB:

| Story ID | State |
|----------|-------|
| ORCH-1010 | completed |
| ORCH-2010 | completed |
| ORCH-2020 | backlog |
| ORCH-3010 | completed |
| ORCH-3020 | backlog |
| ORCH-3030 | backlog |
| ORCH-4010 | backlog |
| ORCH-4020 | completed |

The `autonomous-pipeline-test-plan` plan exists with `status: stories-created` and is linked to all 8 ORCH stories. The import work described in PIPE-1030's description has **already been completed** (likely as part of PIPE-1010 or a related import story around 2026-03-12, when the ORCH stories were created in the KB).

### Active In-Progress Work

| Story | State | Overlap |
|-------|-------|---------|
| PIPE-2010 (Unified BullMQ Job Payload Schema) | `backlog` (was `in_progress`) | No direct overlap — BullMQ schema work |
| PIPE-0020 (Ghost State Migration) | `elab` | No direct overlap — state migration work |
| PIPE-0030 (Artifact Gate Enforcement) | `created` | No direct overlap — artifact enforcement |
| PIPE-0010 (Fix MCP Story State Enum) | `completed` | Foundation complete — enables canonical states |

### Constraints to Respect

- KB is source of truth — no filesystem story directories
- Stories exist only in KB; do NOT create story.yaml files or story directories for ORCH stories
- Canonical state model: `backlog → created → elab → ready → in_progress → needs_code_review → ready_for_qa → in_qa → completed`
- PIPE-1030 depends on PIPE-0010 (completed)

---

## Retrieved Context

### Related Endpoints

None — PIPE-1030 is not an API/endpoint story. It is a data management / pipeline setup story (importing stories into KB and elaborating them).

### Related Components

| Component | Location | Relevance |
|-----------|----------|-----------|
| `kb_add` / `kb_update` MCP tools | KB MCP server | Used to import/upsert stories into KB |
| `kb_get_story` / `kb_list_stories` MCP tools | KB MCP server | Used to verify import state |
| `plan_story_links` table | KB schema | Used to link stories to the `autonomous-pipeline-test-plan` plan |
| Elaboration agent workflow | `.claude/agents/` + orchestrator graphs | For elaborating ORCH stories through `elab-story` graph |
| `packages/backend/orchestrator` | `packages/backend/orchestrator/src/graphs/` | 23 graph types — source of ORCH story implementation targets |

### Reuse Candidates

- `kb_get_story` — verify each ORCH story exists before taking action
- `kb_list_stories` with `plan_slug: 'autonomous-pipeline-test-plan'` — enumerate all ORCH stories
- Existing elaboration workflow agent for elaborating backlog ORCH stories
- `kb_update_story_status` — advance stories from `backlog` to `elab` (and onwards) once elaborated

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (data-management/config-only) — PIPE-1030 is about verifying KB state, confirming plan linkage, and elaborating backlog ORCH stories. No new implementation files are being created. No implementation pattern refs applicable.'

---

## Knowledge Context

### Lessons Learned

- **[ORCH-1010]** Test helper factories should self-test with co-located test files — factories need companion .test.ts files for self-validation (category: testing)
  - *Applies because*: When elaborating ORCH stories, ensure each test factory story includes a co-located test plan

- **[PIPE-0010 area]** Ghost states in KB examples cause agent confusion — tool schema examples using ghost states cause Zod validation failures after state enum fix (category: tooling)
  - *Applies because*: PIPE-1030 will work with KB story state tools; ensure canonical states are used (backlog, created, elab, ready, etc.) not ghost states

- **[Pipeline lesson]** Pipeline stories get stuck when phase transitions lack artifact validation gates — stories advance state without required artifacts being present (category: workflow)
  - *Applies because*: When elaborating ORCH backlog stories (2020, 3020, 3030, 4010), the elaboration agent must write artifacts atomically with state advancement

- **[WINT-9030 area]** Dependency status in stories can be outdated — story baseline dates lag behind actual story completion (category: architecture)
  - *Applies because*: PIPE-1030's own description has outdated KB state (says only ORCH-1010 exists; actually all 8 exist). Always verify KB state before acting on story description

- **[Orchestrator lessons]** Full orchestrator test suite has 13 pre-existing failures in health-gate.integration.test.ts requiring a live DB — use scoped test runs for story-specific verification (category: testing)
  - *Applies because*: When elaborating ORCH test stories, their acceptance criteria should reference scoped test commands, not the full suite

### Blockers to Avoid

- Acting on stale story description: do NOT attempt to "import" ORCH stories from the filesystem — they already exist in KB
- Using ghost states when calling KB tools — use only canonical 13 states
- Elaborating stories without artifact gates — `elab` state requires an ELABORATION artifact before advancing to `ready`
- Running full orchestrator test suite expecting all-green — 13 pre-existing failures exist; use scoped test commands

### Architecture Decisions (ADRs)

ADR-LOG.md does not exist in this repository. Constraints are inferred from CLAUDE.md and KB knowledge entries.

| Source | Constraint |
|--------|-----------|
| CLAUDE.md | No TypeScript interfaces — use Zod schemas with z.infer<> |
| CLAUDE.md | No barrel files — import directly from source |
| CLAUDE.md | No console.log — use @repo/logger |
| KB memory | KB is source of truth for stories — no filesystem story directories |
| KB memory | Stories can only advance state via kb_update_story_status with required artifacts |

### Patterns to Follow

- Verify KB state before acting on story descriptions (descriptions can be stale)
- Use `kb_list_stories` with `plan_slug` filter to enumerate plan-linked stories
- Use `kb_get_story` to check individual story state and artifacts
- Use canonical state transitions: `backlog → elab` requires moving through `created` first (or direct if allowed by transition rules)
- Elaborate stories using the autonomous elaboration pipeline — write ELABORATION artifact atomically with state advancement
- Use scoped test commands for orchestrator stories: `pnpm test --filter @repo/orchestrator -- {story-specific-test}`

### Patterns to Avoid

- Do NOT create filesystem story directories for ORCH stories
- Do NOT use ghost states (ready_to_work, in_review, ready_for_review, uat, deferred) in KB tool calls
- Do NOT run `pnpm test --filter @repo/orchestrator` (full suite) for coverage checks — use scoped runs
- Do NOT import stories that already exist in KB — check first with kb_get_story

---

## Conflict Analysis

### Conflict: Stale story description
- **Severity**: warning
- **Description**: PIPE-1030 description says "Only ORCH-1010 exists in KB. Import remaining 7." Reality: All 8 ORCH stories (ORCH-1010 through ORCH-4020) already exist in the KB as of 2026-03-12. The import work has already been completed. The plan `autonomous-pipeline-test-plan` is linked to all 8 stories (status: stories-created).
- **Resolution Hint**: This story needs to be re-scoped. The "import" task is complete. The remaining actionable work is: (1) verify all 8 ORCH stories are correctly linked to the plan, (2) elaborate the 4 backlog ORCH stories (ORCH-2020, ORCH-3020, ORCH-3030, ORCH-4010) that have not yet been elaborated.

### Conflict: Missing baseline
- **Severity**: warning
- **Description**: No baseline reality file exists (`plans/baselines/` directory does not exist). Reality context was gathered directly from KB and codebase scanning.
- **Resolution Hint**: Continue without baseline. A future PIPE story may establish a baseline reality tracking mechanism.

### Conflict: ADR-LOG.md missing
- **Severity**: warning
- **Description**: `plans/stories/ADR-LOG.md` does not exist. Architecture decisions were inferred from CLAUDE.md and KB knowledge entries.
- **Resolution Hint**: Continue with inferred constraints. If ADR-LOG.md is created later, re-run conflict detection.

---

## Story Seed

### Title
Verify ORCH Story KB State and Elaborate Remaining Backlog ORCH Test Stories

### Description

**Context**: PIPE-1030 was originally created to import ORCH-2010 through ORCH-4020 into the KB and link them to the `autonomous-pipeline-test-plan`. This import has already been completed — all 8 ORCH stories exist in the KB, linked to the plan (plan status: `stories-created`). The current state as of 2026-03-18:

- **Completed**: ORCH-1010, ORCH-2010, ORCH-3010, ORCH-4020 (4 stories)
- **Backlog (not yet elaborated)**: ORCH-2020, ORCH-3020, ORCH-3030, ORCH-4010 (4 stories)

**Problem**: The `autonomous-pipeline-test-plan` has 4 remaining backlog stories that have never been elaborated. These stories represent the test coverage gaps that must be closed before the autonomous pipeline can be considered production-ready. Specifically: ORCH-2020 (state validation utilities), ORCH-3020 (story-creation fanout+attack cluster integration), ORCH-3030 (persistence round-trip integration), and ORCH-4010 (full graph tests for elaboration + story-creation).

**Proposed Solution**: Re-scope PIPE-1030 to: (1) verify current KB state of all 8 ORCH stories and confirm plan linkage, (2) elaborate the 4 backlog stories (ORCH-2020, ORCH-3020, ORCH-3030, ORCH-4010) through the existing elaboration pipeline so they reach `elab` state with proper ELABORATION artifacts, and (3) advance them to `ready` state so the autonomous pipeline can pick them up for implementation.

### Initial Acceptance Criteria

- [ ] AC-1: Audit confirms all 8 ORCH stories (ORCH-1010, ORCH-2010, ORCH-2020, ORCH-3010, ORCH-3020, ORCH-3030, ORCH-4010, ORCH-4020) exist in KB with correct `feature: autonomous-pipeline-test-plan` and are linked to `autonomous-pipeline-test-plan` plan via `plan_story_links`.
- [ ] AC-2: ORCH-2020 (Unit Tests — State Validation and Schema Utilities) is elaborated: ELABORATION artifact written to KB, story advanced to `elab` state. Elaboration covers `validateGraphState`, `safeValidateGraphState`, `createInitialState`, schema versioning utilities in `packages/backend/orchestrator`.
- [ ] AC-3: ORCH-3020 (Integration Tests — Story Creation Fanout and Attack Cluster) is elaborated: ELABORATION artifact written to KB, story advanced to `elab` state. Elaboration covers `story_seed → fanout (pm/ux/qa) → merge_fanout → attack` multi-node cluster test with mocked LLM.
- [ ] AC-4: ORCH-3030 (Integration Tests — Persistence Round-Trip) is elaborated: ELABORATION artifact written to KB, story advanced to `elab` state. Elaboration covers `load_from_db → processing → save_to_db` nodes with mocked StoryRepository.
- [ ] AC-5: ORCH-4010 (Full Graph Tests — Elaboration and Story Creation Graphs) is elaborated: ELABORATION artifact written to KB, story advanced to `elab` state. Elaboration covers full `graph.invoke()` tests for `elaboration.ts` and `story-creation.ts` covering all major routing paths. Note: ORCH-4010 is a direct prerequisite of ORCH-4020 (which is completed); elaboration must account for the fact that ORCH-4020 is already done and patterns from it are available as references.
- [ ] AC-6: All 4 elaborated stories (ORCH-2020, ORCH-3020, ORCH-3030, ORCH-4010) are advanced to `ready` state after elaboration artifact is verified present, making them eligible for the autonomous pipeline scheduler.
- [ ] AC-7: No new filesystem story directories or YAML files are created for ORCH stories. All state changes are KB-only operations via `kb_update_story_status`.
- [ ] AC-8: Elaboration for each story references the completed ORCH stories as canonical references: ORCH-1010 (mock factories), ORCH-3010 (integration test pattern), ORCH-4020 (E2E test pattern) are all usable as implementation pattern guides.

### Non-Goals

- Do NOT attempt to re-import ORCH stories — they already exist in KB
- Do NOT create filesystem story directories, story.yaml files, or worktrees for ORCH stories
- Do NOT modify any orchestrator source files as part of this story — PIPE-1030 is a data management story
- Do NOT elaborate stories that are already completed (ORCH-1010, ORCH-2010, ORCH-3010, ORCH-4020)
- Do NOT attempt to run the orchestrator tests as part of this story — test execution is in scope for the individual ORCH implementation stories
- Do NOT implement the ORCH stories themselves — only elaborate them (define ACs, acceptance criteria, subtasks)
- Do NOT trigger BullMQ dispatch as part of this story

### Reuse Plan

- **Components**: `kb_get_story`, `kb_list_stories`, `kb_update_story_status`, `kb_add` MCP tools for all KB operations
- **Patterns**: Elaboration pattern established by ORCH-3010 and ORCH-4020 stories (already elaborated, available as canonical references in filesystem at `plans/stories/ORCH/ORCH-3010/` and `plans/stories/ORCH/ORCH-4020/`)
- **Packages**: `packages/backend/orchestrator` — inspect `src/graphs/`, `src/nodes/`, `src/__tests__/helpers/` to ground elaborations in actual code structure
- **Test helpers**: `createMockLLMProvider` and `createMockGraphState` from `packages/backend/orchestrator/src/__tests__/helpers/` — all 4 stories should reference these as established factories from ORCH-1010

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This story produces no testable code changes — it is a KB data management + elaboration story. The "test plan" for PIPE-1030 is:

1. Verify all 8 ORCH stories exist in KB via `kb_list_stories` (plan_slug: autonomous-pipeline-test-plan)
2. Verify the 4 target stories each have an ELABORATION artifact in KB after processing
3. Verify each target story reaches `ready` state in KB
4. No filesystem changes to verify — KB-only

Pre-existing orchestrator test suite has 13 failures in `health-gate.integration.test.ts` — do not include these in baseline or expect them to pass.

### For UI/UX Advisor

Not applicable. This is a backend data management / pipeline setup story with no frontend components or user-facing changes.

### For Dev Feasibility

**Implementation approach** (sequential):

1. **Phase 1 — Audit**: Call `kb_list_stories` with `plan_slug: 'autonomous-pipeline-test-plan'` to verify all 8 ORCH stories exist and are correctly linked. Flag any gaps (missing stories, wrong state, missing plan links).

2. **Phase 2 — Elaborate ORCH-2020 first** (simplest — state validation utilities, pure computation):
   - Read `packages/backend/orchestrator/src/__types__/` and related schema files
   - Write ELABORATION artifact to KB with full AC set
   - Advance story to `elab` state via `kb_update_story_status`

3. **Phase 3 — Elaborate ORCH-3020** (story-creation fanout+attack cluster):
   - Read `packages/backend/orchestrator/src/nodes/story/` for node implementations
   - Reference `plans/stories/ORCH/ORCH-3010/ORCH-3010.md` as structural pattern
   - Write ELABORATION artifact, advance to `elab`

4. **Phase 4 — Elaborate ORCH-3030** (persistence round-trip):
   - Read `packages/backend/orchestrator/src/persistence/` and `src/db/` for StoryRepository interface
   - Write ELABORATION artifact, advance to `elab`

5. **Phase 5 — Elaborate ORCH-4010** (full graph tests):
   - Note: ORCH-4020 (E2E) is already completed — `plans/stories/ORCH/ORCH-4020/ORCH-4020.md` shows the full graph mock patterns
   - Read `packages/backend/orchestrator/src/graphs/elaboration.ts` and `story-creation.ts` for graph API signatures
   - Write ELABORATION artifact covering all major routing paths, advance to `elab`

6. **Phase 6 — Advance all 4 to `ready`**: After elaboration artifacts are verified present, call `kb_update_story_status` to advance each to `ready` state.

**Key canonical references for elaboration**:

- `plans/stories/ORCH/ORCH-3010/ORCH-3010.md` — structural template for integration test stories
- `plans/stories/ORCH/ORCH-4020/ORCH-4020.md` — structural template for full-graph/E2E test stories
- `packages/backend/orchestrator/src/__tests__/helpers/createMockLLMProvider.ts` — mock factory used by all ORCH stories
- `packages/backend/orchestrator/src/__tests__/integration/change-loop.integration.test.ts` — integration test style reference
- `packages/backend/orchestrator/src/__tests__/integration/elaboration-delta-cluster.integration.test.ts` — cluster integration test precedent (from ORCH-3010)

**Risk**: ORCH-4010 is technically a prerequisite of ORCH-4020 (which is completed). The elaboration must acknowledge this inversion — ORCH-4020 patterns can inform ORCH-4010's ACs since the E2E test was written without ORCH-4010's per-graph tests. ORCH-4010 can now be elaborated with the advantage of knowing ORCH-4020's full-pipeline mock patterns.
