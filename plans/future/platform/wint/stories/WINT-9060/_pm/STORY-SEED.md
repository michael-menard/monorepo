---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No active stories listed (baseline notes platform index newly bootstrapped — 235 stories across 11 epics). No in-progress work overlapping the orchestrator graphs directory.

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for story, scope, plan, evidence, review, qa-verify, audit-findings |
| LangGraph graphs directory | `packages/backend/orchestrator/src/graphs/` | Multiple complete graphs: story-creation, elaboration, implementation, code-audit, bootstrap, elab-epic, elab-story, dev-implement, qa-verify, backlog-review |
| Runner infrastructure | `packages/backend/orchestrator/src/runner/` | circuit-breaker, retry, timeout, error-classification, node-factory, state-helpers |
| workflow-batch command | `.claude/commands/workflow-batch.md` | Claude Code agent-based batch orchestrator (the source to port) |

### Active In-Progress Work

No active in-progress work detected. Dependencies WINT-9020, WINT-9030, WINT-9040, WINT-9050 are at various stages (completed, created, created, pending respectively) but none block the architecture design of WINT-9060.

### Constraints to Respect

- All production DB schemas in `packages/backend/database-schema/` are protected — do not modify
- Knowledge base schemas and pgvector setup are protected
- `@repo/db` client package API surface is protected
- Orchestrator artifact schemas are protected
- Zod-first types required — no TypeScript interfaces
- No barrel files — import directly from source
- `@repo/logger` for all logging

---

## Retrieved Context

### Related Endpoints

None — this is a pure backend orchestrator graph with no HTTP API surface. The batch-process graph is invoked programmatically.

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| workflow-batch command | `.claude/commands/workflow-batch.md` | Primary source to port — defines batch mode decision handling, tier behavior, autonomy levels |
| story-creation graph | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Existing single-story orchestration graph — key pattern reference |
| elab-epic graph | `packages/backend/orchestrator/src/graphs/elab-epic.ts` | Fan-out pattern using Send API — directly applicable for batch parallelism |
| bootstrap graph | `packages/backend/orchestrator/src/graphs/bootstrap.ts` | Subgraph composition pattern — wraps story-creation |
| backlog-review graph | `packages/backend/orchestrator/src/graphs/backlog-review.ts` | injectable stub pattern (`z.unknown().optional()`) for pending dependencies |
| implementation graph | `packages/backend/orchestrator/src/graphs/implementation.ts` | Bounded retry loop pattern (change_loop), abort/complete node structure |
| runner/circuit-breaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Failure/retry infrastructure reusable in batch |
| runner/retry | `packages/backend/orchestrator/src/runner/retry.ts` | Retry logic directly applicable to per-story failure handling |
| state/graph-state | `packages/backend/orchestrator/src/state/graph-state.ts` | Base GraphState to extend |

### Reuse Candidates

- **Send API fan-out pattern** from `elab-epic.ts`: Use `Send` from `@langchain/langgraph` to dispatch per-story workers in parallel — exactly what batch processing needs
- **Injectable stub pattern** from `backlog-review.ts`: `z.unknown().optional()` for WINT-9030/9040/9050 nodes that are pending — allows graph to compile without those dependencies being complete
- **`createToolNode` adapter** from `runner/node-factory.ts`: Wrap `runBatchProcess()` as a node adapter for integration with larger graphs
- **`Annotation.Root` with append reducer** from `elab-epic.ts`: Per-story results collected via append reducer in fan-in node
- **Bounded iteration pattern** from `implementation.ts`: `changeLoopRetryCount` + conditional edges for retry/abort — applicable to per-story retry budget
- **Thread ID convention**: `${batchId}:batch-process:${attempt}` following existing conventions

### Similar Stories

| Story | What to Learn |
|-------|--------------|
| WINT-9110 (bootstrap) | How bootstrap wraps story-creation as subgraph |
| WINT-9110 (elab-epic) | Definitive fan-out with Send API for parallel story processing |
| WINT-9110 (backlog-review) | Injectable stub pattern for pending dependencies |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Fan-out graph with Send API (parallel story dispatch) | `packages/backend/orchestrator/src/graphs/elab-epic.ts` | Exact pattern needed: dispatcher → worker nodes → fan-in using Send API; append reducer for collected results |
| Multi-phase graph with subgraph invocation | `packages/backend/orchestrator/src/graphs/bootstrap.ts` | Shows how to wrap an existing graph as a node, injectable config pattern, thread ID convention |
| Injectable stubs for pending deps + bounded retry loop | `packages/backend/orchestrator/src/graphs/backlog-review.ts` | `z.unknown().optional()` deps that skip gracefully; complete/abort node structure |
| Conditional retry routing | `packages/backend/orchestrator/src/graphs/implementation.ts` | `afterChangeLoop` conditional edge: pass/retry/abort/complete routing; `changeLoopRetryCount` tracking |

---

## Knowledge Context

### Lessons Learned

KB search unavailable in this session. Deriving from codebase evidence and ADR review.

- **[elab-epic pattern]** Send API fan-out requires dispatcher as a CONDITIONAL EDGE function, not a node — returns `Send[]`, not `Partial<State>` (category: pattern)
  - *Applies because*: Batch-process graph needs to dispatch per-story workers in parallel using the same Send API pattern

- **[backlog-review pattern]** Pending dependencies (WINT-9030, 9040, 9050 nodes) must be injectable stubs using `z.unknown().optional()` that skip gracefully with warnings, not block compilation (category: pattern)
  - *Applies because*: WINT-9030 (cohesion-prosecutor), WINT-9040 (scope-defender), and WINT-9050 (evidence-judge) are pending — batch-process.ts must compile before they're done

- **[implementation graph pattern]** Retry loops need explicit `retryCount` tracking in state and bounded `maxRetries` in config to prevent infinite loops (category: blocker)
  - *Applies because*: Per-story failure handling requires bounded retries before escalating to abort

### Blockers to Avoid (from past stories)

- Missing exports in `graphs/index.ts` — all new graph symbols must be added to the index file or downstream importers fail
- Forgetting `append` reducer on result arrays — if worker results use `overwrite` instead of `append`, fan-in only keeps the last worker result
- Dispatcher returning `Send[]` instead of a string route — the Send API dispatcher MUST be used as a conditional edge function, not added as a node

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — batch-process tests must use real story data structures |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path test required during dev phase; applicable since batch-process has no UI, vitest integration tests count |

ADR-001, ADR-002, ADR-003, ADR-004 do not apply (no API endpoints, no infrastructure changes, no CDN, no auth).

### Patterns to Follow

- Zod-first: all schemas defined with `z.object(...)` before any TypeScript types via `z.infer<>`
- `const overwrite = <T>(_: T, b: T): T => b` — reuse this exact reducer pattern from every other graph file
- `const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]` — use for workerResults accumulation
- Thread ID: `${batchId}:batch-process:${attempt}` — follow existing convention
- Export everything needed: graph factory, runner, node adapter, individual node factories, conditional edge functions, schemas, state annotation, types — matching the index.ts export pattern
- Inject optional dependencies using `z.unknown().optional()` — never hard-import WINT-9030/9040/9050 nodes
- `@repo/logger` for all structured logging with `graph_started`, `graph_completed`, `graph_failed` log keys

### Patterns to Avoid

- Do NOT use TypeScript interfaces — use `z.infer<typeof Schema>` exclusively
- Do NOT import WINT-9030/9040/9050 node implementations directly — they are pending and must be injectable
- Do NOT add a node that is meant to be a conditional edge dispatcher (Send API pattern — it's a function, not a node)
- Do NOT use `overwrite` reducer on arrays that aggregate from multiple parallel workers

---

## Conflict Analysis

### Conflict: Dependency ordering
- **Severity**: warning
- **Description**: WINT-9030 (cohesion-prosecutor node) and WINT-9050 (evidence-judge node) are still pending as of baseline. WINT-9040 (scope-defender node) is also "Created" but not yet implemented. WINT-9060 depends on all four (9020, 9030, 9040, 9050) per the index, but WINT-9020 (doc-sync) is already completed. The graph can be fully scaffolded with injectable stubs for the three pending dependencies.
- **Resolution Hint**: Use `z.unknown().optional()` injectable pattern (as in backlog-review.ts) so batch-process.ts compiles and runs without the pending node implementations. Document stub behavior clearly in JSDoc.

---

## Story Seed

### Title

Create batch-coordinator LangGraph Graph (`batch-process.ts`)

### Description

The existing `/workflow-batch` Claude Code command orchestrates batch story processing through an agent-based leader pattern: it wraps `/dev-implement-story` with batch mode enabled, queuing decisions by tier, presenting batch reviews at thresholds, and writing BATCH-DECISIONS.yaml / DEFERRED-BACKLOG.yaml artifacts.

WINT-9060 ports this agent logic to a native LangGraph graph at `packages/backend/orchestrator/src/graphs/batch-process.ts`. The new graph orchestrates a queue of stories through the implementation pipeline (story-creation → elaboration → dev-implement), handling per-story failures and retries identically to the Claude Code agent, so batch processing works in both execution contexts with equivalent behavior.

The graph uses the Send API fan-out pattern (established in elab-epic.ts) to dispatch per-story workers in parallel, collects results via an append-reducer fan-in node, and exposes injectable stubs for the WINT-9030/9040/9050 nodes (cohesion-prosecutor, scope-defender, evidence-judge) that are still pending.

### Initial Acceptance Criteria

- [ ] AC-1: `packages/backend/orchestrator/src/graphs/batch-process.ts` exists and exports `createBatchProcessGraph`, `runBatchProcess`, `createBatchProcessNode`, `BatchProcessConfigSchema`, `BatchProcessResultSchema`, `BatchProcessStateAnnotation`, and all per-story node factories following the established graph export pattern
- [ ] AC-2: Graph compiles and runs without errors when WINT-9030/9040/9050 injectable stubs are absent (graceful skip with warnings, not crashes)
- [ ] AC-3: `BatchProcessConfigSchema` includes: `storyIds` (array of story IDs to process), `maxConcurrency`, `maxRetriesPerStory`, `batchThreshold` (decisions before batch review), `autonomyLevel` (conservative/moderate/aggressive), `persistToDb`, `storyRepo`, `workflowRepo`, injectable `cohesionProsecutorNode`, `scopeDefenderNode`, `evidenceJudgeNode`
- [ ] AC-4: Fan-out dispatcher dispatches one worker per story ID using the Send API (matching elab-epic.ts `createElabEpicDispatcher` pattern exactly)
- [ ] AC-5: Per-story worker node runs stories through the implementation sub-pipeline, tracking `retryCount` per story, retrying up to `maxRetriesPerStory` before marking story as failed
- [ ] AC-6: Fan-in (aggregation) node collects all worker results via `append` reducer, produces per-story status summary (success/failed/retried counts)
- [ ] AC-7: Batch result includes: `batchId`, `storiesQueued`, `storiesSucceeded`, `storiesFailed`, `storiesRetried`, `workerResults[]`, `durationMs`, `completedAt`, `errors[]`, `warnings[]`
- [ ] AC-8: Thread ID convention: `${batchId}:batch-process:${attempt}` — used when checkpointer is provided
- [ ] AC-9: `graphs/index.ts` exports all WINT-9060 symbols with prefixed aliases to avoid name collisions (matching pattern used for other graphs)
- [ ] AC-10: Vitest unit tests in `graphs/__tests__/batch-process.test.ts` cover: graph compiles, dispatcher sends correct number of workers, fan-in aggregates results, retry logic bounded by `maxRetriesPerStory`, graceful stub skip when injectable nodes absent
- [ ] AC-11: `runBatchProcess` logs `graph_started`, `graph_completed`, `graph_failed` using `@repo/logger` with structured fields matching the pattern in `implementation.ts`

### Non-Goals

- Do NOT implement the cohesion-prosecutor, scope-defender, or evidence-judge node logic (those belong to WINT-9030, WINT-9040, WINT-9050)
- Do NOT port the exact decision tiering UI (batch summary presentation to user) — the LangGraph version is headless; decision handling is internal policy
- Do NOT create a CLI command or HTTP endpoint — `runBatchProcess()` is the programmatic entry point only
- Do NOT modify any protected database schemas
- Do NOT implement actual story discovery from the backlog — the `storyIds` input array is provided by the caller (story discovery belongs to WINT-9070 backlog-curator)

### Reuse Plan

- **Graphs**: Import and invoke `runElabStory` (from `elab-story.ts`) or `runDevImplement` (from `dev-implement.ts`) as the per-story sub-pipeline inside the worker node
- **Patterns**: Send API dispatcher pattern from `elab-epic.ts`; injectable stub pattern from `backlog-review.ts`; bounded retry loop from `implementation.ts`; `createToolNode` adapter from `runner/node-factory.ts`
- **Packages**: `@langchain/langgraph` (Annotation, StateGraph, Send, END, START); `zod`; `@repo/logger`; existing `runner/` utilities (circuit-breaker, retry, state-helpers)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is a pure TypeScript orchestrator graph with no UI surface — E2E tests in the Playwright sense do not apply (ADR-006 skip condition: `frontend_impacted: false`)
- Vitest unit tests are the primary test vehicle; focus on: graph compilation, state annotation correctness, dispatcher fan-out count, fan-in append behavior, retry bounded iteration, graceful stub skip
- Integration test should run the full graph with a mocked per-story sub-pipeline (inject a stub `devImplementNode` that returns success/failure on demand)
- Coverage target: ≥ 45% global (existing threshold); aim for 80%+ on the new file given its central role
- Per-story failure/retry path must be tested explicitly: story fails on attempt 1, retries on attempt 2, succeeds — validate `storiesRetried: 1`, `storiesSucceeded: 1`

### For UI/UX Advisor

- No UI surface. N/A for visual design.
- The batch result schema (`BatchProcessResultSchema`) IS the "UI" — downstream consumers (scripts, commands, future dashboard) will read it. Ensure `workerResults[]` contains enough per-story detail (storyId, status, retryCount, errors) for callers to render meaningful status output.

### For Dev Feasibility

- **Primary implementation file**: `packages/backend/orchestrator/src/graphs/batch-process.ts` — new file
- **Secondary file**: `packages/backend/orchestrator/src/graphs/index.ts` — add exports
- **Test file**: `packages/backend/orchestrator/src/graphs/__tests__/batch-process.test.ts` — new file
- **Canonical references for subtask decomposition**:
  1. `elab-epic.ts` — copy the dispatcher/worker/fan-in skeleton; adapt for batch processing domain
  2. `backlog-review.ts` — copy injectable stub pattern for WINT-9030/9040/9050 nodes
  3. `implementation.ts` — copy bounded retry counter pattern for per-story retries
  4. `bootstrap.ts` — copy subgraph invocation pattern for calling existing graphs as sub-pipelines
- **Key risk**: WINT-9050 (evidence-judge) is pending — the `evidenceJudgeNode` must be injectable with a no-op stub that returns `{ judged: false, warning: 'evidence-judge not configured' }`. Do NOT block graph compilation on it.
- **Suggested node structure**: `initialize → dispatch_stories [Send API] → story_worker (per-story) → fan_in → complete → END` with `abort` node reachable from story_worker on unrecoverable failure
- **State consideration**: The main graph state needs both an `overwrite` field for aggregate status and `append` fields for per-worker results — do NOT reuse a single reducer for both
