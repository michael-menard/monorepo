---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 9 activity; does not capture the completed WINT-9020 (doc-sync LangGraph node) or in-progress WINT-9010 (shared business logic package)

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| LangGraph graphs (elaboration, story-creation, qa, review, merge, code-audit, doc-graph, pattern-miner, bake-off-engine, dead-code-reaper) | `packages/backend/orchestrator/src/graphs/` | These are the graphs that WINT-9120 must test for parity with Claude Code equivalents |
| doc-sync LangGraph node (WINT-9020, completed) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | First completed parity node — can serve as reference for parity test structure |
| Context cache LangGraph nodes (WINT-9090, completed) | `packages/backend/orchestrator/src/nodes/context/` | context-warmer, session-manager — already ported and verified |
| Shared business logic package (WINT-9010, in-qa) | `packages/backend/workflow-logic/src/` | The shared package both Claude Code and LangGraph will depend on — critical dependency |
| Existing graph test patterns | `packages/backend/orchestrator/src/graphs/__tests__/` | story-creation.test.ts, elaboration.test.ts, metrics.test.ts — canonical test structure |
| Runner middleware (circuit breaker, retry, node-factory) | `packages/backend/orchestrator/src/runner/` | Infrastructure the parity test suite must exercise |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas: story, knowledge-context, checkpoint, scope, plan, evidence, review, qa-verify, audit-findings — shared contract between both execution paths |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-9010: Create Shared Business Logic Package | in-qa | HIGH — WINT-9120 depends on @repo/workflow-logic being stable; parity tests cannot be finalized until shared logic is locked |
| WINT-9110: Create Full Workflow LangGraph Graphs | created (not started) | CRITICAL — WINT-9120 directly depends on WINT-9110 graphs existing; seed generated early per explicit user instruction |
| WINT-9105: Define LangGraph Error Handling & Retry Strategy | created | MEDIUM — error handling ADR may define parity expectations (retry counts, timeout behavior) that the parity suite must verify |
| WINT-9107: Implement Node-Level Retry & Circuit Breaker Middleware | created | LOW — runner infrastructure already exists; WINT-9107 may add surface that parity tests should cover |

### Constraints to Respect

- Do not modify production DB schemas in `packages/backend/database-schema/` (protected)
- Do not modify `@repo/db` client package API surface (protected)
- Do not modify orchestrator artifact schemas without versioning (protected)
- Parity test suite must live in `packages/backend/orchestrator/src/__tests__/parity/` (specified in index)
- ADR-005: Unit and integration tests may mock services; UAT must use real services — parity suite is a unit/integration suite and may use mocks for determinism

---

## Retrieved Context

### Related Endpoints

None directly applicable — this is a backend-only test suite with no API endpoints.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| story-creation graph | `src/graphs/story-creation.ts` | Primary workflow to test for parity |
| elaboration graph | `src/graphs/elaboration.ts` | Second major workflow |
| qa graph | `src/graphs/qa.ts` | QA workflow parity |
| review graph | `src/graphs/review.ts` | Code review workflow parity |
| doc-sync node (LangGraph) | `src/nodes/sync/doc-sync.ts` | Already ported — can use as reference for assertion patterns |
| doc-sync node (Claude Code subprocess) | `src/nodes/workflow/doc-sync.ts` | Claude Code path for doc-sync — the "other side" of parity |
| workflow-logic shared package | `packages/backend/workflow-logic/src/` | Shared business logic both paths use |
| runner/node-factory | `src/runner/node-factory.ts` | createToolNode factory — used by all LangGraph nodes |
| runner/circuit-breaker | `src/runner/circuit-breaker.ts` | Infrastructure parity may need to verify |

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|-------------|
| Existing graph test fixtures | `src/graphs/__tests__/story-creation.test.ts` | createTestStoryRequest, createTestBaseline, createTestState patterns |
| Vitest vi.mock pattern for @repo/logger | All graph test files | Standard logger mock — copy as-is |
| @langchain/langgraph vitest alias | vitest.config.ts | Required for LangGraph module resolution in tests (lesson from APIP-3030) |
| Artifact schemas | `src/artifacts/` | Use Zod schemas to validate output shape equivalence |
| Dependency injection pattern for determinism | runner/node-factory.ts | Inject toolRunner to avoid real AI calls |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Graph test structure (compile + routing + node behavior) | `packages/backend/orchestrator/src/graphs/__tests__/story-creation.test.ts` | Gold standard: tests graph compilation, node factories, state transitions, and full runStoryCreation path using mocked dependencies — exactly the pattern parity tests should follow |
| LangGraph node parity (native port vs subprocess delegate) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | First completed parity node — WINT-9020 gives a concrete reference for what a "ported" node looks like vs the original `nodes/workflow/doc-sync.ts` |
| Vitest dependency injection for determinism | `packages/backend/orchestrator/src/runner/__tests__/node-factory.test.ts` | Shows how to inject fake toolRunner/handlers to get deterministic node execution without real AI or filesystem side effects |
| Existing Claude Code agent output shape | `packages/backend/orchestrator/src/artifacts/` | Zod schemas for story, evidence, review, qa-verify — the shared contract both paths must produce identically |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** Graph compilation tests can validate LangGraph routing without running the full pipeline (category: testing)
  - *Applies because*: Parity tests for routing behavior (which nodes are visited, in what order) can be written against compiled graph structure rather than full AI execution — this keeps parity tests fast and deterministic

- **[AUDT-0010]** LangGraph graph tests should target compiled graph routing, not dynamic lens imports (category: testing)
  - *Applies because*: WINT-9120 must verify that LangGraph graphs visit the same nodes as Claude Code workflows — routing verification via graph.compile() is the proven pattern

- **[APIP-3030]** LangGraph node handler index.ts files are not unit-testable in isolation (category: testing)
  - *Applies because*: Parity tests should target individual module functions (business logic extracted to workflow-logic), not node handler index.ts files — integration tests handle end-to-end verification

- **[APIP-3060 / general]** Dependency injection for deterministic probabilistic routing (category: testing)
  - *Applies because*: Any nondeterministic behavior (randomness, timestamps, AI responses) must be injectable to ensure parity tests produce stable, comparable outputs from both execution paths

- **[LNGG-0060]** LangGraph alias requirement in worktree context (category: tooling)
  - *Applies because*: Parity tests use @langchain/langgraph — must ensure @langchain/langgraph vitest alias is configured in vitest.config.ts for the parity test directory

### Blockers to Avoid (from past stories)

- Do not attempt to run real AI/LLM calls in parity tests — both paths must use injected mock toolRunners for determinism
- Do not import LangGraph modules without configuring the @langchain/langgraph vitest alias (causes module resolution failures in worktrees)
- Do not test node handler index.ts files in isolation — target the business logic functions extracted into @repo/workflow-logic
- Do not finalize output shape assertions before WINT-9010 (@repo/workflow-logic) QA is complete — shared types may shift during QA

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Parity test suite is unit/integration — mocking is permitted and required for determinism. UAT-level parity validation (if required) must use real services per ADR-005 |
| ADR-006 | E2E Tests Required in Dev Phase | Not applicable — this story produces only a test suite with no frontend UI |

### Patterns to Follow

- Graph compilation test: call `graph.compile()`, assert it succeeds, then verify routing functions with mock state objects
- State fixture factory pattern: `createTestState()`, `createTestStoryRequest()`, `createTestBaseline()` — consistent with existing graph tests
- Injectable toolRunner: pass mock toolRunner to node factories so AI calls return controlled fixtures
- Zod output validation: parse both Claude Code and LangGraph outputs through shared artifact Zod schemas to verify structural equivalence
- Separate unit tests (mock everything) from integration tests (real filesystem, controlled DB) — use real tmpdir for any filesystem parity checks

### Patterns to Avoid

- Global `vi.mock` on @langchain/langgraph core — prefer dependency injection at the node/graph level
- Hard-coding expected AI output text — parity is about schema shape and state transitions, not LLM response content
- Coupling parity tests tightly to WINT-9110 graph internals — test via public graph interfaces (run* functions, state schemas) not internal node wiring
- Using real external services (KB, DB, AI providers) in unit parity tests

---

## Conflict Analysis

### Conflict: Dependency Not Satisfied (warning)

- **Severity**: warning
- **Description**: WINT-9110 (Create Full Workflow LangGraph Graphs) is in "created" status and has not begun implementation. WINT-9120 depends on WINT-9110 graphs existing in `packages/backend/orchestrator/src/graphs/` before parity tests can be written against them. Additionally, WINT-9110 itself depends on WINT-9060, WINT-9070, WINT-9080, and WINT-9100 — none of which are completed.
- **Resolution Hint**: Story seed is generated early per explicit user instruction. Implementation of WINT-9120 must not begin until WINT-9110 is at least in ready-for-qa state. The parity test skeleton (types, fixtures, harness) can be scaffolded early using existing graphs (story-creation, elaboration) as proxies, but workflow-specific parity assertions must wait for WINT-9110 graphs.

---

## Story Seed

### Title

Create Workflow Parity Test Suite — Prove Functional Equivalence Between Claude Code and LangGraph Execution Paths

### Description

**Context**: The WINT Phase 9 initiative is porting all major Claude Code workflow agents to LangGraph graphs. As of 2026-03-02, WINT-9020 (doc-sync) and WINT-9090 (context cache) are complete. WINT-9010 (shared business logic via @repo/workflow-logic) is in-qa. WINT-9110 (full workflow graphs: bootstrap, elab-epic, elab-story, dev-implement, qa-verify, backlog-review) is in "created" status and blocked on several predecessor stories.

**Problem**: Before the team can confidently cut over from Claude Code orchestration to LangGraph orchestration, they need a mechanically verifiable proof that both execution paths produce identical outputs for identical inputs. Without this, the cutover is a leap of faith. Subtle behavioral differences (different artifact field ordering, missing fields, different retry semantics) could silently break workflows in production.

**Proposed Solution**: Build a test suite at `packages/backend/orchestrator/src/__tests__/parity/` that acts as a dual-execution harness. For each workflow (story-creation, elaboration, qa, review, doc-sync, and the workflows introduced by WINT-9110), the suite runs the same fixture inputs through both the Claude Code agent path (subprocess-delegating nodes) and the LangGraph graph path, then compares the outputs using shared Zod artifact schemas. External services (AI providers, KB, DB) are mocked via injectable toolRunners for determinism. The suite serves as the technical gate for cutover sign-off.

### Initial Acceptance Criteria

- [ ] AC-1: Parity test harness created at `packages/backend/orchestrator/src/__tests__/parity/` with a shared `parity-harness.ts` that accepts a `claudeCodeRunner` and `langGraphRunner` and produces a `ParityResult` (matching | divergent | error) for any given fixture input
- [ ] AC-2: Parity tests exist for the doc-sync workflow (WINT-9020 is completed) — both Claude Code subprocess path (`nodes/workflow/doc-sync.ts`) and LangGraph native path (`nodes/sync/doc-sync.ts`) are exercised with the same `DocSyncInput` fixture; outputs compared via `DocSyncResultSchema`
- [ ] AC-3: Parity tests exist for the story-creation workflow — both the Claude Code agent invocation path and the `runStoryCreation()` LangGraph graph path produce identical `SynthesizedStory` Zod-validated outputs for the same `StoryRequest` fixture
- [ ] AC-4: Parity tests exist for the elaboration workflow — both paths produce identical `ElaborationResult` Zod-validated outputs for the same `SynthesizedStory + delta` fixture
- [ ] AC-5: Parity tests exist for all workflows introduced by WINT-9110 (bootstrap, elab-epic, dev-implement, qa-verify, backlog-review) — one parity test per workflow minimum
- [ ] AC-6: All external services (AI/LLM calls, KB MCP, database writes, git operations, subprocess spawns) are injectable via dependency injection in the parity harness — no real network calls in unit parity tests
- [ ] AC-7: `ParityResult` includes a structured diff when `divergent` — lists which output fields differ between Claude Code and LangGraph paths, with actual vs expected values, using Zod schema paths for field identification
- [ ] AC-8: At least one "known divergence" test documents an expected behavioral difference (if any exist) between the two paths — to prevent false parity failures from known/acceptable differences
- [ ] AC-9: All parity tests pass in CI without real services — `pnpm test` on the orchestrator package passes the parity suite with injected mocks
- [ ] AC-10: Parity suite is wired to the orchestrator package's vitest config with the `@langchain/langgraph` alias configured — no module resolution errors in worktree or CI context
- [ ] AC-11: `README.md` in `packages/backend/orchestrator/src/__tests__/parity/` documents: what parity means in this context, how to add a new parity test for a new workflow, and what a "PASS" verdict requires for cutover sign-off

### Non-Goals

- Do not implement the WINT-9110 workflow graphs themselves — this story only tests them, once they exist
- Do not build a live/production parity monitor (that is a separate telemetry story)
- Do not write Playwright/E2E parity tests — this suite is unit/integration level per ADR-005
- Do not modify existing graph implementations to make them parity-testable — if a graph is not injectable, fix it in the graph's own story scope
- Do not test LLM output content equality — only structural/schema equivalence and state transition parity
- Do not touch production DB schemas, `@repo/db` client, or orchestrator artifact schemas

### Reuse Plan

- **Components**: `createTestStoryRequest`, `createTestBaseline`, `createTestState` fixtures from existing graph tests; Zod artifact schemas from `src/artifacts/`; `updateState` from `src/runner/state-helpers.ts`
- **Patterns**: Graph compilation test pattern from `story-creation.test.ts` and `elaboration.test.ts`; dependency injection pattern from `runner/node-factory.test.ts`; logger mock pattern (`vi.mock('@repo/logger', ...)`) from all graph tests
- **Packages**: `@repo/workflow-logic` (shared business logic — once WINT-9010 QA passes); `@langchain/langgraph` (with vitest alias); `zod` for output schema validation; `vitest` for test runner

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The parity test suite is itself a test artifact — the test plan should specify:
1. Which workflows have parity coverage (at minimum: doc-sync, story-creation, elaboration, and all WINT-9110 workflows)
2. The definition of "parity PASS" — exact schema match vs structural equivalence (nullable fields, optional fields handling)
3. How to handle non-deterministic outputs (AI responses injected as fixtures; timestamps pinned via vi.useFakeTimers() or injected clock)
4. Coverage thresholds: the parity test files themselves contribute to orchestrator package coverage — target 80%+ branch coverage within the parity/ directory

Note: ADR-005 permits mocking in unit/integration tests. The parity suite is classified as integration-level. Real services are not required for the parity suite itself.

### For UI/UX Advisor

Not applicable — this is a pure backend test suite with no frontend UI.

### For Dev Feasibility

Key implementation constraints:
1. **Dependency sequencing**: WINT-9010 (@repo/workflow-logic) must complete QA before parity tests can import shared types without risk of type shape changes. WINT-9110 graphs must exist before workflow-specific parity tests can be finalized. The parity harness scaffold and doc-sync parity tests (AC-1, AC-2) can be built immediately.
2. **Injection boundaries**: Review each existing graph to confirm `toolRunner` and external dependencies are injectable. If any graph hardcodes external calls, that graph's story must address injectability before parity tests can cover it.
3. **LangGraph alias**: Add `@langchain/langgraph` to the vitest alias config in `packages/backend/orchestrator/vitest.config.ts` (already needed per APIP-3030 lesson — verify it exists).
4. **ParityResult schema**: Design the `ParityResult` Zod schema early — it is the core contract the harness produces and all AC verification depends on it.
5. **Canonical references for subtask decomposition**:
   - `packages/backend/orchestrator/src/graphs/__tests__/story-creation.test.ts` — graph test pattern
   - `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` — completed parity node (LangGraph side)
   - `packages/backend/orchestrator/src/nodes/workflow/doc-sync.ts` — original Claude Code path (for doc-sync parity test)
   - `packages/backend/orchestrator/src/runner/node-factory.ts` — createToolNode and injectable toolRunner pattern
