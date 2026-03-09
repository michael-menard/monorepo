---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-9110

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: ADR-LOG.md not found at `plans/stories/ADR-LOG.md` — ADR constraints sourced from KB entries for WINT-9105 and codebase inspection

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Story Creation Graph | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Full graph with HiTL, fanout, synthesis — production-grade reference |
| Elaboration Graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Delta-detect, escape hatch, structurer, DB persistence |
| QA Graph | `packages/backend/orchestrator/src/graphs/qa.ts` | Unit tests, E2E, AC verification, gate decision |
| Review Graph | `packages/backend/orchestrator/src/graphs/review.ts` | Parallel fan-out via Send API, 10 workers |
| Merge Graph | `packages/backend/orchestrator/src/graphs/merge.ts` | PR creation, CI gate, squash-merge, cleanup |
| Metrics Graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Gap analytics, aggregation, output |
| Code Audit Graph | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Multi-lens audit, bake-off |
| Doc Graph | `packages/backend/orchestrator/src/graphs/doc-graph.ts` | Documentation sync |
| Graph Index | `packages/backend/orchestrator/src/graphs/index.ts` | Central re-export — all graphs must be registered here |
| Orchestrator Artifact Schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-validated YAML schemas for story, checkpoint, plan, evidence, review, qa-verify |
| Node Middleware (pending) | `packages/backend/orchestrator/src/middleware/` | WINT-9107 — retry + circuit breaker (not yet implemented) |
| LangGraph Checkpointer (pending) | `packages/backend/orchestrator/src/checkpointer/` | WINT-9106 — PostgreSQL-backed checkpointer (not yet implemented) |

### Active In-Progress Work

| Story | Scope | Overlap Risk |
|-------|-------|--------------|
| WINT-9060 (pending) | `graphs/batch-process.ts` — batch-coordinator LangGraph graph | Direct dependency; batch graph must exist before WINT-9110 |
| WINT-9070 (pending) | `nodes/backlog/curator.ts` — backlog-curator node | Direct dependency; backlog-review graph needs this node |
| WINT-9080 (pending) | `nodes/ml/` — ML pipeline nodes | Direct dependency; dev-implement graph needs ML nodes |
| WINT-9100 (pending) | `nodes/telemetry/` — telemetry logger node | Direct dependency; all full workflow graphs need telemetry |
| WINT-9105 (pending) | `docs/architecture/adr-langgraph-error-handling.md` | ADR defines error/retry pattern this story must follow |
| WINT-9106 (pending) | `checkpointer/` — PostgreSQL checkpointer | Full workflow graphs should integrate checkpointer |
| WINT-9107 (pending) | `middleware/retry.ts`, `middleware/circuit-breaker.ts` | Full workflow graphs must wrap nodes with middleware |

### Constraints to Respect

- All new types MUST use Zod schemas (`z.object({...})`); no TypeScript interfaces
- No barrel files — imports from direct source paths
- Use `@repo/logger` for logging (not `console.*`)
- Prettier: no semicolons, single quotes, trailing commas, 100 char width
- Graph index at `packages/backend/orchestrator/src/graphs/index.ts` must export all new graphs
- All new graphs MUST be compiled with `.compile()` before being returned from factory functions
- Error/retry strategy must follow the ADR from WINT-9105 once available; use existing try/catch pattern in the interim
- WINT-9107 middleware (`withRetry`, `withCircuitBreaker`) should be integrated if available; if not, defer to WINT-9120 parity tests

---

## Retrieved Context

### Related Endpoints
- No API endpoints involved — this is a pure orchestrator backend story

### Related Components
- No UI components involved

### Reuse Candidates

| Artifact | Location | How to Reuse |
|---------|----------|--------------|
| `StoryCreationStateAnnotation` pattern | `graphs/story-creation.ts` | Template for state annotation structure (overwrite reducer, append reducer for arrays) |
| `createToolNode` factory | `runner/node-factory.ts` | Node adapter for main workflow integration |
| `updateState` helper | `runner/state-helpers.js` | State update utility for node adapters |
| `loadFromDb` / `saveToDb` | `nodes/persistence/` | DB persistence pattern for all graphs |
| `extractLearnings` / `persistLearnings` | `nodes/completion/persist-learnings.ts` | KB write-back at workflow completion |
| `Send` API (LangGraph) | Used in `graphs/review.ts` | True parallel fan-out via Send for batch-process graph |
| Conditional edge functions pattern | `graphs/story-creation.ts` | Named `afterX(state)` functions for all routing |
| `QAGraphConfigSchema` pattern | `graphs/qa.ts` | Required config fields with defaults + `worktreeDir` required |
| Graph result schema pattern | All existing graphs | Standard result: storyId, success, durationMs, completedAt, errors, warnings |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Full graph composition with conditional edges, DB persistence, KB learnings | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Most complete graph — state annotation, node factories, conditional edges, DB load/save, persist learnings, runX() entry function, node adapter |
| Send API parallel fan-out pattern | `packages/backend/orchestrator/src/graphs/review.ts` | Demonstrates LangGraph Send for true parallelism — critical for batch-process-style graphs |
| Graph factory with injected dependencies + lazy imports | `packages/backend/orchestrator/src/graphs/qa.ts` | Clean dependency injection + lazy node imports for testability |
| Graph index registration pattern | `packages/backend/orchestrator/src/graphs/index.ts` | Required re-export structure for all new graphs |

---

## Knowledge Context

### Lessons Learned

- **[Lesson: Graph compilation tests can validate LangGraph routing]** Test conditional edge routing functions directly with mock state objects — avoids needing to mock all node AI calls. *Applies because*: WINT-9110 creates 6 graphs; routing tests must not require live LLM/subprocess execution.

- **[Lesson: Native 7-phase LangGraph node implementation proves viable]** Sequential phase architecture with graceful DB fallback is robust. 42 unit tests, 86% coverage achieved in WINT-9020. *Applies because*: bootstrap and backlog-review graphs should follow sequential phase structure rather than attempting full parallelism prematurely.

- **[Lesson: LangGraph external context handling pattern]** External context like filesystem paths must be added to state at invocation time, not passed through graph factory closures. *Applies because*: bootstrap graph needs project root, dev-implement graph needs worktree path — these must be state fields, not closure captures.

### Blockers to Avoid

- Do not attempt to build WINT-9110 before WINT-9060, WINT-9070, WINT-9080, and WINT-9100 have delivered their nodes — the full workflow graphs are compositions of those nodes
- Do not implement custom retry/error handling in individual graph nodes — await the WINT-9107 middleware pattern (or defer to a stub)
- Do not add checkpointer wiring until WINT-9106 delivers the PostgreSQL checkpointer — graphs should be designed with checkpointer injection points but not require it

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| WINT-9105 (pending) | LangGraph Error Handling & Retry Strategy | All graph nodes must use `withRetry` / `withCircuitBreaker` middleware from WINT-9107 once available |
| WINT-9106 (pending) | LangGraph Checkpointer | Graphs should accept optional checkpointer injection — checkpoint TTL 7 days |
| APIP ADR-001 (inferred) | Thread ID convention | Thread IDs follow `${storyId}:${graphName}:${attempt}` pattern |

### Patterns to Follow

- State annotation: `Annotation.Root({...})` with `const overwrite = <T>(_: T, b: T): T => b` reducer for most fields, append reducer for `warnings` and `errors` arrays
- Config schema: Zod object with all fields having defaults except hard-required inputs (e.g., `worktreeDir`, `storyId`)
- Graph result schema: standard `{storyId, phase, success, durationMs, completedAt, errors, warnings}` envelope
- Node factories: named `createXNode()` functions returning `async (state) => Partial<State>`
- Conditional edges: named `afterX(state): string` functions — never inline lambdas
- Graph factory: `createXGraph(config)` parsing config with Zod, compiling and returning `graph.compile()`
- Entry function: `runX(inputs, config)` returning the result schema, wrapping `graph.invoke()` in try/catch
- Node adapter: `createToolNode(...)` wrapping the run function for main workflow integration
- All graphs registered in `graphs/index.ts` with explicit named exports

### Patterns to Avoid

- Inline routing logic in `.addConditionalEdges()` — always extract to a named function
- Reading environment configuration inside individual nodes — pass through config state
- Creating new persistence patterns — reuse `loadFromDb` / `saveToDb` from `nodes/persistence/`
- Implementing retry logic ad-hoc in nodes — use the WINT-9107 middleware pattern

---

## Conflict Analysis

### Conflict: Missing dependencies (pending stories)

- **Severity**: warning
- **Description**: WINT-9060 (batch-coordinator graph), WINT-9070 (backlog-curator node), WINT-9080 (ML pipeline nodes), WINT-9100 (telemetry nodes) are all `pending` with no active implementation. WINT-9110's full workflow graphs depend directly on these. The story cannot be fully implemented until these land.
- **Resolution Hint**: Design WINT-9110 to accept node dependencies as injected parameters so graphs can be wired with stub implementations initially. Phase the work: skeleton graphs first, then wire real nodes as dependencies land. Alternatively, split WINT-9110 into per-graph sub-stories.

### Conflict: WINT-9106 / WINT-9107 middleware not yet available

- **Severity**: warning
- **Description**: The error handling ADR (WINT-9105), checkpointer (WINT-9106), and retry/circuit-breaker middleware (WINT-9107) are all `pending`. Full workflow graphs should adopt these patterns but cannot depend on them being available.
- **Resolution Hint**: Design graphs with explicit injection points for middleware and checkpointer (injectable config fields typed as `z.unknown().optional()`). Apply existing try/catch patterns from story-creation.ts as interim. Document the injection points in comments for WINT-9120 to validate.

---

## Story Seed

### Title
Create Full Workflow LangGraph Graphs (bootstrap, elab-epic, elab-story, dev-implement, qa-verify, backlog-review)

### Description

**Context**: The orchestrator already has several specialized LangGraph graphs (`story-creation`, `elaboration`, `qa`, `review`, `merge`, `code-audit`, `metrics`, `doc-graph`). These were built incrementally as individual APIP/WINT stories were implemented. Phase 9 (WINT-9xxx) is porting the remaining Claude Code agent-based workflows to native LangGraph graphs to achieve full parity.

**Problem**: The six major orchestration workflows (bootstrap, elab-epic, elab-story, dev-implement, qa-verify, backlog-review) currently execute via Claude Code agent scripts or YAML-configured orchestration. They are not yet expressed as first-class LangGraph `StateGraph` instances, which means they cannot benefit from the PostgreSQL checkpointer (WINT-9106), retry middleware (WINT-9107), parallel execution via Send API, or unified thread-based state management.

**Proposed Solution**: Create six new LangGraph graph files under `packages/backend/orchestrator/src/graphs/`, each following the established patterns from `story-creation.ts` and `elaboration.ts`:

1. **`bootstrap.ts`** — Bootstraps a new story from index entry: reality intake → seed → fanout → synthesis. Composition of existing `story-creation.ts` nodes.
2. **`elab-epic.ts`** — Elaboration across all stories in an epic: batch dispatch via Send API → per-story elaboration → aggregate results → checkpoint.
3. **`elab-story.ts`** — Single-story elaboration flow. Thin wrapper/alias over existing `elaboration.ts` with additional worktree lifecycle management.
4. **`dev-implement.ts`** — Development implementation: scope → plan → execute (tool use) → review (via `review.ts`) → evidence collection → DB save.
5. **`qa-verify.ts`** — QA verification workflow: preconditions → unit tests → E2E tests → AC verification → gate decision → artifact write. Thin wrapper over existing `qa.ts` with workflow lifecycle state.
6. **`backlog-review.ts`** — Backlog curation: load backlog → priority scoring (via ML nodes from WINT-9080) → curator analysis (via WINT-9070 node) → reorder → persist.

All graphs must be registered in `graphs/index.ts`.

### Initial Acceptance Criteria

- [ ] AC-1: `bootstrap.ts` — `BootstrapGraphConfigSchema` (Zod), `BootstrapStateAnnotation`, `createBootstrapGraph(config)`, `runBootstrap(storyId, indexEntry, config)` entry function. Graph wires: initialize → load_baseline → retrieve_context → seed → fanout_pm/ux/qa → merge_fanout → attack → gap_hygiene → readiness_scoring → synthesis → save_to_db → persist_learnings → complete → END.
- [ ] AC-2: `elab-epic.ts` — `ElabEpicGraphConfigSchema`, `ElabEpicStateAnnotation`, `createElabEpicGraph(config)`, `runElabEpic(epicPrefix, storyIds, config)`. Uses LangGraph Send API for parallel per-story dispatch. Fan-in aggregates per-story results into epic-level summary.
- [ ] AC-3: `elab-story.ts` — `ElabStoryGraphConfigSchema`, `ElabStoryStateAnnotation`, `createElabStoryGraph(config)`, `runElabStory(storyId, config)`. Wraps `elaboration.ts` graph with worktree lifecycle nodes (setup → elaboration → teardown).
- [ ] AC-4: `dev-implement.ts` — `DevImplementGraphConfigSchema`, `DevImplementStateAnnotation`, `createDevImplementGraph(config)`, `runDevImplement(storyId, scopeArtifact, planArtifact, config)`. Wires: initialize → load_plan → execute (tool use node) → review (calls `createReviewGraph` subgraph) → collect_evidence → save_to_db → complete.
- [ ] AC-5: `qa-verify.ts` — `QAVerifyGraphConfigSchema`, `QAVerifyStateAnnotation`, `createQAVerifyGraph(config)`, `runQAVerify(storyId, evidenceArtifact, reviewArtifact, config)`. Thin lifecycle wrapper around existing `qa.ts` `createQAGraph`, adding worktree path validation and state transition to `ready-for-merge`.
- [ ] AC-6: `backlog-review.ts` — `BacklogReviewGraphConfigSchema`, `BacklogReviewStateAnnotation`, `createBacklogReviewGraph(config)`, `runBacklogReview(epicPrefix, config)`. Wires: load_backlog → ml_score (WINT-9080 nodes, injectable) → curator_analyze (WINT-9070 node, injectable) → reorder → persist → complete.
- [ ] AC-7: All six graphs exported from `packages/backend/orchestrator/src/graphs/index.ts` with explicit named exports following the existing pattern.
- [ ] AC-8: Each graph has a `createXNode()` node adapter (using `createToolNode`) for embedding in parent workflow graphs.
- [ ] AC-9: Each graph has a `__tests__/X.test.ts` with routing tests (conditional edge function tests with mock state — no live LLM/subprocess calls required).
- [ ] AC-10: All graphs accept optional middleware injection points: `retryMiddleware: z.unknown().optional()`, `checkpointer: z.unknown().optional()` in their config schemas. Graphs wire checkpointer via `graph.compile({ checkpointer })` when provided.
- [ ] AC-11: All graphs follow the thread ID convention: `${storyId}:${graphName}:${attempt}` (e.g., `WINT-9110:dev-implement:1`).
- [ ] AC-12: Telemetry node from WINT-9100 (`nodes/telemetry/`) is injected at graph entry and exit when available (injectable dep, not hard-required).
- [ ] AC-13: All graphs compile without TypeScript errors (`pnpm check-types`). All new tests pass (`pnpm test --filter @repo/orchestrator`).

### Non-Goals

- Do NOT implement the parity test suite (that is WINT-9120)
- Do NOT implement the PostgreSQL checkpointer itself (that is WINT-9106)
- Do NOT implement the retry/circuit-breaker middleware (that is WINT-9107)
- Do NOT modify existing graphs (`story-creation.ts`, `elaboration.ts`, `qa.ts`, `review.ts`, `merge.ts`) — new graphs compose them, not replace them
- Do NOT implement the batch-coordinator node itself (that is WINT-9060) — `elab-epic.ts` wires it when available
- Do NOT implement the backlog-curator node (that is WINT-9070) — `backlog-review.ts` accepts it as injectable
- Do NOT implement ML pipeline nodes (that is WINT-9080) — `backlog-review.ts` accepts them as injectable
- Do NOT implement telemetry nodes (that is WINT-9100) — all graphs accept telemetry as injectable

### Reuse Plan

- **Nodes**: `nodes/reality/load-baseline.ts`, `nodes/reality/retrieve-context.ts`, `nodes/story/seed.ts`, `nodes/story/fanout-pm.ts`, `nodes/story/fanout-ux.ts`, `nodes/story/fanout-qa.ts`, `nodes/story/attack.ts`, `nodes/story/gap-hygiene.ts`, `nodes/story/readiness-score.ts`, `nodes/story/synthesize.ts`, `nodes/persistence/load-from-db.ts`, `nodes/persistence/save-to-db.ts`, `nodes/completion/persist-learnings.ts`
- **Patterns**: State annotation with overwrite/append reducers, conditional edge functions, Zod config schemas with defaults, `runX()` entry functions with try/catch, `createToolNode` node adapters
- **Packages**: `@langchain/langgraph` (Annotation, StateGraph, END, START, Send), `zod`, `@repo/logger`
- **Subgraphs**: `createQAGraph` from `graphs/qa.ts` (wrapped by `qa-verify.ts`), `createElaborationGraph` from `graphs/elaboration.ts` (wrapped by `elab-story.ts`)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary testing pattern for these graphs is routing validation: extract all conditional edge functions and test them with mock state objects. See the lesson: "Graph compilation tests can validate LangGraph routing without running the full pipeline."
- Integration tests should use node-level mocks (injectable node factories) — not real LLM calls or subprocess execution.
- Each graph's `runX()` entry function should have at least one happy-path integration test and one error/exception test.
- The parity test suite (WINT-9120) will do full end-to-end validation against the existing Claude Code workflows — WINT-9110 tests only need to validate graph correctness, not output parity.
- `elab-epic.ts` uses the Send API for parallelism — test that fan-out correctly dispatches N stories and fan-in collects all N results.

### For UI/UX Advisor

- No UI components. This is a pure backend orchestrator story. No UX review needed.

### For Dev Feasibility

- **Complexity assessment**: HIGH. Six graphs, each following the established pattern. The pattern is clear and well-documented in `story-creation.ts`, but the sheer volume of code is significant. Recommend splitting into 2-3 subtasks:
  - ST-1: `bootstrap.ts` + `elab-story.ts` (compose existing nodes, minimal new logic)
  - ST-2: `elab-epic.ts` (Send API fan-out — most complex, needs Send API expertise)
  - ST-3: `dev-implement.ts` + `qa-verify.ts` + `backlog-review.ts` + index registration

- **Dependency risk**: WINT-9060, WINT-9070, WINT-9080, WINT-9100 must all land before WINT-9110 can be fully wired. Design strategy: use `z.unknown().optional()` injection for all unimplemented node deps, and wire with stubs for now.

- **Canonical references for subtask decomposition**:
  - `packages/backend/orchestrator/src/graphs/story-creation.ts` — full graph skeleton to copy for each new graph
  - `packages/backend/orchestrator/src/graphs/review.ts` — Send API fan-out pattern for `elab-epic.ts`
  - `packages/backend/orchestrator/src/graphs/qa.ts` — dependency injection pattern for `qa-verify.ts`
  - `packages/backend/orchestrator/src/graphs/index.ts` — required registration pattern

- **Token budget estimate**: Each graph file will be ~300-600 lines following the `story-creation.ts` template. Six graphs + tests + index updates = 3000-4000 lines of new code. Recommend 3 subtasks of ~100K tokens each.
