---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: PIPE-0030

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No active baseline exists. Codebase was scanned directly for current state.

### Relevant Existing Features

| Feature                      | File                                                                                  | Current State                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `kb_update_story_status`     | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`                | **Artifact gate already implemented** — `ARTIFACT_GATES` map at lines 591-596                                           |
| `artifact_write` gated write | `apps/api/knowledge-base/src/crud-operations/artifact-operations.ts`                  | `GATED_ARTIFACT_TYPES = new Set(['elaboration', 'proof', 'review', 'qa_gate'])` — KB write is mandatory for these types |
| `story_artifacts` jump table | `apps/api/knowledge-base/src/db/schema.ts` (via `schema/artifacts.ts`)                | Registry pattern: 17 type-specific detail tables, jump table as index                                                   |
| `StoryStateSchema`           | `apps/api/knowledge-base/src/__types__/index.ts` lines 780-800                        | 13 canonical states, no ghost states                                                                                    |
| Existing test suite          | `apps/api/knowledge-base/src/crud-operations/__tests__/story-crud-operations.test.ts` | Tests kb_create_story, kb_update_story — **no tests for artifact gate in kb_update_story_status**                       |

### CRITICAL FINDING: Story Is Partially Already Implemented

The artifact gate logic already exists in `kb_update_story_status` at lines 589-621 of `story-crud-operations.ts`. The current `ARTIFACT_GATES` map is:

```typescript
const ARTIFACT_GATES: Partial<Record<string, string>> = {
  'elab→ready': 'elaboration',
  'in_progress→needs_code_review': 'proof',
  'needs_code_review→ready_for_qa': 'review',
  'in_qa→completed': 'qa_gate',
}
```

This covers:

- `in_progress → needs_code_review` requires `proof` artifact (matches story requirement)
- `needs_code_review → ready_for_qa` requires `review` artifact (matches story requirement)
- `in_qa → completed` requires `qa_gate` artifact (story says "qa_verify" — name mismatch to clarify)

What the story description says is needed vs what exists:
| Story requirement | Artifact type required (story) | Artifact type required (code) | Gap |
|---|---|---|---|
| needs_code_review gate | proof | proof | None — already implemented |
| ready_for_qa gate | review | review | None — already implemented |
| completed gate | qa_verify | qa_gate | Name mismatch — qa_gate exists in DB, story says "qa_verify" |
| elab→ready gate | elaboration | elaboration | Not mentioned in story, but already implemented |

**The story as described is substantially already implemented.** What is actually missing is:

1. **No unit/integration tests** for the artifact gate precondition check in `kb_update_story_status`
2. **Error message quality** — current message uses `updated: false` return, not an exception; needs verification this surfaces to MCP callers clearly
3. **The `qa_gate` vs `qa_verify` naming** in the story description needs reconciliation
4. Potential story refocus: tests + observability for the existing gate, or expansion of gates

### Active In-Progress Work

| Story                           | State                                        | Potential Overlap                                                                 |
| ------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| PIPE-0020                       | Has `_pm/` dir (story-in-progress directory) | PIPE-0020 is a sibling PIPE story — review for ordering                           |
| done/artifact-iterations branch | Active branch (current git branch)           | Recent commits show artifact iteration work — may have touched artifact gate code |

### Constraints to Respect

- KB is the sole source of truth — no filesystem story directories
- `StoryStateSchema` is the canonical 13-state model (fixed by PIPE-0010); any gate keys must use canonical state names
- No ghost states: `ready_for_review`, `in_review`, `uat`, `ready_to_work` are invalid
- Tests must use real PostgreSQL (ADR-005) — integration tests, not mocks
- Zod schemas for all types (CLAUDE.md)
- No barrel files
- `@repo/logger` not `console.log`

---

## Retrieved Context

### Related Endpoints

This is a backend-only story. No HTTP endpoints — `kb_update_story_status` is an MCP tool, not an APIGW route.

- MCP tool: `kb_update_story_status` (registered in `access-control.ts` line 48, all roles)
- MCP handler: `tool-handlers.ts` (exports `handleKbUpdateStoryStatus`)
- Tool schema: `tool-schemas.ts` (has description text referencing ghost states — see KB lesson opp-2)

### Related Components

None — this is pure backend, no UI components.

### Reuse Candidates

| Candidate                                 | Location                                 | How                                                                         |
| ----------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- |
| Existing artifact gate implementation     | `story-crud-operations.ts` lines 589-621 | Baseline to test against / extend                                           |
| `story-crud-operations.test.ts`           | `crud-operations/__tests__/`             | Pattern for integration tests — real DB, `TEST_PREFIX`, `afterEach` cleanup |
| `artifact-operations.integration.test.ts` | `crud-operations/__tests__/`             | Pattern for tests that use `storyArtifacts` table                           |
| `artifact-iteration.test.ts`              | `crud-operations/__tests__/`             | Most recent artifact test — follow its patterns                             |
| `getDbClient()`                           | `db/client.ts`                           | Standard test DB client                                                     |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                | File                                                                                            | Why                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Story status operation + existing gate | `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts`                          | The primary file to test; `kb_update_story_status` at line 547, `ARTIFACT_GATES` at line 591                     |
| Integration test pattern (real DB)     | `apps/api/knowledge-base/src/crud-operations/__tests__/story-crud-operations.test.ts`           | Canonical test structure: `TEST_PREFIX`, `beforeAll` schema check, `afterEach` cleanup, `testStoryIds[]` tracker |
| Artifact table interactions            | `apps/api/knowledge-base/src/crud-operations/__tests__/artifact-operations.integration.test.ts` | Shows how to write/read `storyArtifacts` rows in tests — needed to set up gate preconditions                     |
| MCP tool handler pattern               | `apps/api/knowledge-base/src/mcp-server/tool-handlers.ts`                                       | Handler export pattern (`handleKbUpdateStoryStatus`) for confirming error surfacing                              |

---

## Knowledge Context

### Lessons Learned

- **[KBAR-0220]** `uat` is a `WorkPhaseSchema` value, not a `StoryStateSchema` terminal state — the terminal DB state after QA PASS is `completed`. (category: architecture)
  - _Applies because_: Any gate key referencing `uat` would be invalid. Current code uses `in_qa→completed` which is correct.

- **[PIPE-0010 opp-2]** `kb_update_story_status` tool description text still lists ghost states in human-readable documentation in `tool-schemas.ts`. (category: observability)
  - _Applies because_: If the story involves touching `tool-schemas.ts`, update the description to list canonical 13 states.

### Blockers to Avoid

- Do not use ghost states (`ready_for_review`, `in_review`, `uat`, `ready_to_work`) in gate keys — they will never match current state values since stories are stored with canonical states post-PIPE-0010
- Do not mock the database in tests — ADR-005 requires real PostgreSQL
- Do not confuse `qa_gate` (the artifact type in code and DB) with `qa_verify` (the name used in story description) — reconcile before writing ACs

### Architecture Decisions (ADRs)

| ADR                | Title            | Constraint                                                     |
| ------------------ | ---------------- | -------------------------------------------------------------- |
| ADR-005 (inferred) | Testing Strategy | Integration tests must use real PostgreSQL via `getDbClient()` |
| CLAUDE.md          | Zod-First Types  | No TypeScript interfaces — use `z.object()` + `z.infer<>`      |
| CLAUDE.md          | No Barrel Files  | Import directly from source files                              |

### Patterns to Follow

- Integration test structure from `story-crud-operations.test.ts`: `TEST_PREFIX`, tracked `testStoryIds[]`, `afterEach` cleanup, `beforeAll` schema pre-check
- Return `{ story, updated: false, message: ... }` (not throw) for gate failures — consistent with terminal-state guard pattern already in the file
- Artifact gates use simple `storyArtifacts` jump table query: `WHERE story_id = X AND artifact_type = Y LIMIT 1`

### Patterns to Avoid

- Do not add a new DB table or migration — gate check reads existing `story_artifacts` table
- Do not import from individual shadcn paths (not applicable here, but good practice)
- Do not add `console.log` — use `@repo/logger`

---

## Conflict Analysis

### Conflict: Story Already Implemented (Warning)

- **Severity**: warning
- **Description**: The artifact gate enforcement described in this story is already present in `story-crud-operations.ts` at lines 589-621. The `ARTIFACT_GATES` constant covers all three transitions described: `in_progress→needs_code_review` (proof), `needs_code_review→ready_for_qa` (review), `in_qa→completed` (qa_gate). The story as written in the KB may be describing work that is already shipped.
- **Resolution Hint**: The story should be re-scoped to focus on what is actually missing: (1) integration tests covering all gate transitions (happy path and rejection path), (2) verification that MCP error responses surface gate rejections clearly to callers, (3) any gate transitions not yet covered (e.g., `elab→ready` gate already exists but was not mentioned in story). If there are genuinely missing gates, confirm against the canonical state model before adding them.

---

## Story Seed

### Title

Add Integration Tests and Observability for Artifact Gate Enforcement in `kb_update_story_status`

### Description

**Context**: The `kb_update_story_status` MCP tool already enforces artifact preconditions before allowing certain state transitions. The `ARTIFACT_GATES` map in `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (lines 589-621) gates four transitions: `elab→ready` (requires `elaboration`), `in_progress→needs_code_review` (requires `proof`), `needs_code_review→ready_for_qa` (requires `review`), and `in_qa→completed` (requires `qa_gate`).

**Problem**: No integration tests exist for the artifact gate logic. The `story-crud-operations.test.ts` file covers `kb_create_story`, `kb_get_story`, and `kb_update_story` but has zero tests for `kb_update_story_status` — including no coverage of the gate rejection path. If a regression silently removes or changes the gate map, nothing catches it. Additionally, the story description references `qa_verify` as the artifact type for the completed gate, but the code uses `qa_gate` — this naming needs alignment and documentation.

**Proposed solution**: Write integration tests against a real PostgreSQL database that exercise all four artifact gate transitions in both directions — allowed (artifact present) and rejected (artifact absent). Confirm that the MCP error response surfaces gate rejections clearly. If any gate transitions from the canonical state model are missing from `ARTIFACT_GATES`, add them.

### Initial Acceptance Criteria

- [ ] AC-1: Integration test verifies `in_progress → needs_code_review` is **rejected** when no `proof` artifact exists for the story in `story_artifacts`
- [ ] AC-2: Integration test verifies `in_progress → needs_code_review` **succeeds** when a `proof` artifact exists in `story_artifacts`
- [ ] AC-3: Integration test verifies `needs_code_review → ready_for_qa` is **rejected** when no `review` artifact exists
- [ ] AC-4: Integration test verifies `needs_code_review → ready_for_qa` **succeeds** when a `review` artifact exists
- [ ] AC-5: Integration test verifies `in_qa → completed` is **rejected** when no `qa_gate` artifact exists
- [ ] AC-6: Integration test verifies `in_qa → completed` **succeeds** when a `qa_gate` artifact exists
- [ ] AC-7: Integration test verifies `elab → ready` is **rejected** when no `elaboration` artifact exists (gate already in code, needs test)
- [ ] AC-8: Integration test verifies `elab → ready` **succeeds** when an `elaboration` artifact exists
- [ ] AC-9: When a gate rejects, the returned `message` string from `kb_update_story_status` clearly names the missing artifact type (e.g., "required artifact 'proof' not found in KB") — verified in test assertions
- [ ] AC-10: The `updated` field in the return value is `false` when a gate rejects — verified in test assertions
- [ ] AC-11: State transitions **not** gated (e.g., `backlog → created`, `created → elab`, `ready → in_progress`, `needs_code_review → failed_code_review`, `in_qa → failed_qa`) proceed without artifact checks — at least two ungated transitions verified to still work
- [ ] AC-12: The artifact type name `qa_gate` (used in `ARTIFACT_GATES` and `storyArtifacts`) is reconciled in comments or documentation — the story description's "qa_verify" label is clarified to avoid future confusion

### Non-Goals

- Do not add new DB migrations — the `story_artifacts` table and all gate types already exist
- Do not change the MCP tool schema or tool handler behavior — this is testing existing behavior
- Do not add UI changes — purely backend
- Do not refactor the `ARTIFACT_GATES` map structure unless a missing gate is identified — keep changes minimal
- Do not add a `UAT` state gate — `uat` is not in `StoryStateSchema`; the story description mentions "completed requires qa_verify" which maps to the existing `in_qa→completed` gate

### Reuse Plan

- **Components**: None (backend only)
- **Patterns**: `story-crud-operations.test.ts` test structure (TEST_PREFIX, afterEach cleanup, testStoryIds tracking, beforeAll schema pre-check)
- **Packages**: `getDbClient()` from `apps/api/knowledge-base/src/db/client.ts`, `storyArtifacts` table from `schema/artifacts.ts`, `kb_update_story_status` and `kb_create_story` from `story-crud-operations.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- All tests are integration tests against real PostgreSQL — no mocks allowed (ADR-005 pattern)
- Test setup pattern: use `kb_create_story` to create test story, then optionally `kb_write_artifact` (or direct DB insert into `story_artifacts`) to set the artifact precondition, then call `kb_update_story_status`
- The `storyArtifacts` table requires: `storyId`, `artifactType`, and a linked `detailTable`/`detailId` row — the simplest approach is to call `kb_write_artifact` in test setup rather than raw INSERT, to avoid schema drift
- Cleanup: test stories created with `TEST_PREFIX` must be deleted in `afterEach`, and artifact rows should cascade-delete via FK (verify this — if not, explicit cleanup needed)
- Gate rejection tests should assert: `result.updated === false`, `result.story.storyId === <testId>`, `result.message.includes('<artifact_type>')`
- Gate pass tests should assert: `result.updated === true`, `result.story.state === <targetState>`

### For UI/UX Advisor

Not applicable — this is a pure backend story with no UI surface. The MCP tool returns structured JSON; the "UX" is the machine-readable error message format, which is already well-structured in the existing implementation.

### For Dev Feasibility

- **Primary file**: `apps/api/knowledge-base/src/crud-operations/__tests__/story-crud-operations.test.ts` — add a new `describe` block for `kb_update_story_status — artifact gate enforcement`
- **The gate logic is already in `story-crud-operations.ts`** — no implementation changes required to satisfy the core story description. Focus is on test coverage.
- If a missing gate transition is found during implementation (e.g., `ready_for_qa → in_qa` or `completed → UAT` — though the latter is not a valid state), add it to `ARTIFACT_GATES` and create the corresponding test pair
- The `needs_code_review → ready_for_qa` gate key may need review: currently the story description says "ready_for_qa requires code review artifact" — but `needs_code_review → ready_for_qa` means a story goes from "needs code review" state directly to "ready_for_qa". Check the canonical state model: should there be an intermediate state (`in_code_review`?) or is this the intended direct jump? If the state model has `needs_code_review → failed_code_review` or `needs_code_review → ready_for_qa` as valid transitions, the existing gate is correct.
- Canonical references for implementation: `apps/api/knowledge-base/src/crud-operations/story-crud-operations.ts` (lines 547-672), `apps/api/knowledge-base/src/crud-operations/__tests__/artifact-operations.integration.test.ts` (artifact write in test setup pattern)
