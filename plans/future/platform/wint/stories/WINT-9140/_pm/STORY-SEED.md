---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9140

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline pre-dates Phase 9 LangGraph work; does not reflect WINT-9020 completion or WINT-9010 in-qa state.

### Relevant Existing Features

| Feature | Status | Notes |
|---------|--------|-------|
| LangGraph orchestrator package | active | `packages/backend/orchestrator/` — StateGraph, nodes, graphs, runner infrastructure |
| doc-sync LangGraph node (WINT-9020) | completed | `src/nodes/sync/doc-sync.ts`, 42 tests, 86% coverage — first completed parity node |
| Context cache LangGraph nodes (WINT-9090) | completed | `src/nodes/context/` — context-warmer and session-manager ported |
| Shared business logic package (WINT-9010) | in-qa | `packages/backend/workflow-logic/` — shared logic layer for both execution paths |
| Runner infrastructure | active | `src/runner/` — NodeCircuitBreaker, withNodeRetry, createNode, classifyError, RETRY_PRESETS |
| LangGraph error handling ADR (WINT-9105) | created | `wint/backlog/WINT-9105/` — defines error handling strategy |
| LangGraph checkpointer (WINT-9106) | created | `wint/backlog/WINT-9106/` — PostgreSQL-backed state recovery |
| LangGraph retry middleware (WINT-9107) | created | `wint/backlog/WINT-9107/` — circuit breaker surface |
| Full workflow graphs (WINT-9110) | created | `src/graphs/` — target for bootstrap, elab, dev, QA graphs |
| Parity test suite (WINT-9120) | pending | `src/__tests__/parity/` — does not yet exist; blocked by WINT-9110 |
| Migration documentation (WINT-9130) | pending | `docs/workflow/langraph-migration.md` — blocked by WINT-9120 |

### Active In-Progress Work

| Story | Status | Potential Overlap |
|-------|--------|------------------|
| WINT-9010 | in-qa | Workflow-logic package must be stable before WINT-9140 can run real workflows |
| WINT-9120 | pending | Direct dependency — parity test suite must exist |
| WINT-9130 | pending | Direct dependency — migration documentation must exist |

### Constraints to Respect

- `packages/backend/database-schema/` — protected; no schema modifications unless WINT-9140 explicitly covers them
- `@repo/db` client API surface — protected; must not be broken
- All validation-phase stories must use real services (ADR-005)
- Existing Claude Code workflow agents and agent markdown files must not be modified as part of parity validation — this story is read-only from the agent perspective

---

## Retrieved Context

### Related Endpoints

Not applicable — WINT-9140 is a validation story, not an API story. No new HTTP endpoints.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| LangGraph graphs | `packages/backend/orchestrator/src/graphs/` | Existing graphs: elaboration, qa, review, story-creation, doc-graph, metrics, code-audit, pattern-miner, merge, cohesion-scanner, dead-code-reaper, bake-off-engine, test-quality-monitor |
| LangGraph nodes — sync | `src/nodes/sync/` | doc-sync.ts — only completed parity node from Phase 9 new work |
| LangGraph runner | `src/runner/` | circuit-breaker.ts, retry.ts, node-factory.ts, error-classification.ts, timeout.ts |
| Parity test directory | `src/__tests__/parity/` | Does not yet exist — WINT-9120 creates it |
| Claude Code agent system | `.claude/agents/` | Existing agents remain the reference implementation to compare against |
| Graph state | `src/state/graph-state.ts` | Central state definition for all LangGraph nodes |
| Orchestrator artifacts | `src/artifacts/` | evidence.ts, scope.ts, review.ts, story.ts — Zod-validated YAML schemas |

### Reuse Candidates

- `src/graphs/story-creation.ts` — Pattern for composing nodes into a complete workflow graph
- `src/nodes/sync/doc-sync.ts` — Canonical example of a fully ported LangGraph node with 7-phase architecture
- `src/runner/` — Retry and circuit breaker infrastructure for any live workflow runs
- `src/artifacts/qa-verify.ts` — QA verification artifact schema for recording sign-off
- Existing parity test patterns from `src/graphs/__tests__/` — compilation and routing validation approach

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph graph with compilation tests | `packages/backend/orchestrator/src/graphs/__tests__/story-creation.test.ts` | Shows how to test graph compilation and routing without executing AI nodes |
| LangGraph graph structure | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Canonical composition of nodes into a complete workflow graph |
| Completed parity node | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | First fully ported Phase 9 node — shows 7-phase native TypeScript pattern with 42 tests and 86% coverage |
| QA verification artifact | `packages/backend/orchestrator/src/artifacts/qa-verify.ts` | Zod-validated schema for recording verification outcomes and sign-off |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9020]** Native 7-phase LangGraph node implementation proves viable for subprocess-delegating agents. Sequential phase architecture with graceful DB fallback is robust for orchestration use cases. (*Applies because*: WINT-9140 must validate that all ported nodes follow this same architecture pattern.)

- **[General: graph compilation]** Graph compilation tests can validate LangGraph routing without running the full pipeline. Test the compiled graph's routing functions directly with mock state objects to validate routing logic while keeping tests fast and side-effect-free. (*Applies because*: WINT-9140's parity suite relies on WINT-9120, which should follow this pattern.)

- **[General: graph tests]** LangGraph graph tests should target compiled graph routing, not dynamic lens imports. Test graph.compile() succeeds and verify routing paths. (*Applies because*: The parity validation approach should follow the established graph test pattern.)

- **[General: LangGraph external context]** LangGraph StateGraph expects all inputs to be part of compiled state. External context (repo root, config) requires special handling — pragmatic compromise for v1 is invoking a node outside compiled graph. (*Applies because*: Parity test runs that exercise full workflow paths will encounter this pattern.)

- **[General: LangGraph checkpoint]** LangGraph's PostgresSaver.setup() handles checkpoint schema creation; use it for migrations rather than raw SQL. (*Applies because*: Phase completion sign-off may include checkpointer validation if WINT-9106 is merged by the time WINT-9140 executes.)

- **[General: backend-only QA]** For backend-only stories with no new HTTP endpoints, QA verification needs only unit tests and architecture compliance. E2E is exempt. (*Applies because*: WINT-9140 is an orchestration/validation story with no frontend; QA must apply the correct simplification.)

- **[General: infrastructure-only verification]** Infrastructure and documentation stories should be verified by direct file inspection, config validation, and documentation completeness — not by writing unit tests. (*Applies because*: The sign-off component of WINT-9140 may include documentation review of the migration guide from WINT-9130.)

### Blockers to Avoid (from past stories)

- Do not attempt parity validation before all dependency stories (WINT-9120, WINT-9130) are complete — the test suite and documentation must exist first
- Do not run live AI workflows (full LLM invocations) as primary parity evidence — use compiled graph routing tests and unit-level input/output comparison
- Do not assume existing agents need modification as part of this validation — agents remain the reference, LangGraph nodes are the subjects under test
- Do not skip sign-off documentation — this story gates Phase 9 completion; a formal sign-off artifact is required

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — parity validation that involves real workflow runs must use live infrastructure |
| ADR-006 | E2E Tests Required in Dev Phase | Backend-only stories (no frontend impact) are exempt from E2E requirements |

### Patterns to Follow

- Graph compilation tests via `graph.compile()` + routing function validation with mock state
- Zod-validated artifacts for all sign-off records (`qa-verify.ts` pattern)
- `@repo/logger` for all logging (no `console.log`)
- Zod-first types — no TypeScript interfaces for any new data structures produced by this story

### Patterns to Avoid

- Do not use mocking frameworks in parity tests that are supposed to validate real behavior — ADR-005 applies
- Do not create barrel files (index.ts re-exports)
- Do not import from individual shadcn/ui paths (not applicable here, but noted as global constraint)

---

## Conflict Analysis

### Conflict: Dependency chain not yet satisfied

- **Severity**: warning (non-blocking at seed time; would become blocking if story were activated now)
- **Description**: WINT-9140 depends on WINT-9120 (Workflow Parity Test Suite) and WINT-9130 (Document Migration Path). Both are currently pending. WINT-9120 in turn depends on WINT-9110 (Full Workflow LangGraph Graphs), which depends on WINT-9060, 9070, 9080, 9100 — all pending. The full dependency chain is several stories deep and none of the intermediate work exists yet.
- **Resolution Hint**: This story is correctly positioned at the end of the Phase 9 sequence. The seed is generated now for planning purposes; do not activate until WINT-9120 and WINT-9130 are both in UAT or completed.

---

## Story Seed

### Title
Validate LangGraph Parity Phase — Execute, Compare, and Sign Off

### Description

**Context:** Phase 9 of the WINT epic ports all workflow agents to LangGraph nodes, enabling two fully operational execution paths: the existing Claude Code agent system and a new LangGraph-based graph system. Both paths must produce identical outputs for identical inputs.

**Problem:** Phase 9 produces a collection of ported nodes and workflow graphs, but without a final validation milestone, there is no formal confirmation that parity has been achieved. Individual nodes and test suites (WINT-9120) provide unit/integration evidence, but parity must be verified at the workflow level and signed off by a responsible party before Phase 9 can be closed.

**Proposed Solution:** Execute complete representative workflows through both execution paths using the parity test suite from WINT-9120. Record output comparisons, surface any remaining deltas, apply fixes or create follow-up stories for acceptable deviations, and produce a formal Phase 9 sign-off artifact that closes the LangGraph migration chapter.

This story is the final gate of Phase 9. It is read-only from the agent code perspective — no new nodes or graphs are created here. The outputs are: (1) a completed parity verification run, (2) a sign-off document, and (3) a KB entry recording Phase 9 completion status.

### Initial Acceptance Criteria

- [ ] AC-1: Execute all parity test scenarios defined by WINT-9120 against both execution paths; document pass/fail per scenario with input/output comparison artifacts.
- [ ] AC-2: All parity test scenarios that were passing in WINT-9120 continue to pass — no regressions introduced by this validation run.
- [ ] AC-3: Any parity gaps identified during validation are classified as either (a) blocking — must be fixed before sign-off, or (b) acceptable deviation — documented with rationale and a follow-up story ID created.
- [ ] AC-4: All blocking parity gaps are resolved; all acceptable deviations have follow-up stories in the backlog.
- [ ] AC-5: A Phase 9 sign-off document is produced at `packages/backend/orchestrator/docs/WINT-9140-PHASE9-SIGNOFF.md` containing: workflow matrix (workflows validated, pass/fail), deviation register (gaps with classification and follow-up IDs), and sign-off statement.
- [ ] AC-6: Sign-off document reviewed and confirmed by the human operator (HiTL gate).
- [ ] AC-7: KB entry written recording Phase 9 completion, workflows validated, deviation count, and links to follow-up stories.
- [ ] AC-8: WINT index story status updated to `completed` following sign-off approval.
- [ ] AC-9: The migration documentation from WINT-9130 (`docs/workflow/langraph-migration.md`) is spot-checked as part of sign-off — any inaccuracies identified during validation are noted and a correction task is logged if needed.

### Non-Goals

- Creating new LangGraph nodes or graphs (all porting was done in earlier Phase 9 stories)
- Modifying existing Claude Code agents or `.agent.md` files
- Replacing or deprecating the Claude Code execution path — parity means both paths work; the decision to migrate is a separate concern
- Full performance benchmarking (that would be a dedicated Phase 9 extension or Phase 10 story)
- Fixing parity gaps that are categorized as acceptable deviations — those are handled by follow-up stories
- Touching the production database schema (`packages/backend/database-schema/`) — no migrations in this story
- Modifying the `@repo/db` client API

### Reuse Plan

- **Components**: `src/graphs/__tests__/` — follow existing graph test patterns for compilation and routing validation
- **Patterns**: Zod-validated sign-off artifact (extend or adapt `src/artifacts/qa-verify.ts` schema pattern); KB entry via `kb_add` MCP tool
- **Packages**: `packages/backend/orchestrator` — all parity testing happens within the orchestrator package; `@repo/logger` for logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has no new unit tests — the primary test artifact is the parity run output from WINT-9120's test suite. The test plan should focus on: (1) defining which workflow scenarios constitute "complete" coverage for sign-off, (2) specifying the human review gate for AC-6, and (3) defining pass/fail thresholds (e.g., what percentage of parity tests must pass before sign-off is permitted).
- ADR-005 applies: any live workflow invocations must use real services.
- E2E tests are exempt (ADR-006 — backend-only, no frontend impact).
- Consider whether the parity run should be conducted in a branch worktree (following the lesson that QA must run from the story branch to access branch-specific artifacts).

### For UI/UX Advisor

Not applicable — this is a pure backend/orchestration story with no user-facing components. The only "UX" consideration is the sign-off document format, which should be human-readable Markdown with clear tables (workflow matrix, deviation register).

### For Dev Feasibility

- The key implementation risk is dependency completeness: WINT-9120 must be complete and its test suite must be executable before this story begins. If WINT-9120 is incomplete or its tests are not runnable, this story cannot start.
- The sign-off artifact is a Markdown document, not a Zod-validated YAML — this is intentional since it requires human narrative. However, any machine-readable portions (deviation register, workflow matrix) should use a Zod-validated schema if they are to be parsed downstream.
- Canonical references for implementation patterns:
  - Sign-off artifact format: model after `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` (existing strategy doc pattern)
  - Parity test execution: model after `src/graphs/__tests__/story-creation.test.ts` (graph compilation + routing pattern)
  - KB entry: use `mcp__knowledge-base__kb_add` with `entry_type: 'decision'` and tags `['langgraph', 'phase-9', 'sign-off', 'wint']`
- Story is low-risk for code changes (read-only validation), but high-stakes for outcome: this gates Phase 9 closure and informs the decision about production use of LangGraph workflows.
- If any blocking gaps are discovered during validation, the story should NOT be closed — instead, gaps should be fixed in-place (if minor) or tracked as new stories (if substantial), and the parity run re-executed.
