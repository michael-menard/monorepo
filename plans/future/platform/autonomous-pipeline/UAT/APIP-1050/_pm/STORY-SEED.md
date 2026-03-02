---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-1050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No Review Graph exists anywhere in the codebase. No parallel worker fan-out pattern for code review exists. No `REVIEW.yaml` artifact writer is wired into any graph. The `ReviewSchema` artifact schema (`packages/backend/orchestrator/src/artifacts/review.ts`) is fully defined with `FindingSchema`, `WorkerResultSchema`, `RankedPatchSchema`, and helper functions (`createReview`, `addWorkerResult`, `carryForwardWorker`, `generateRankedPatches`) — but it is not yet consumed by any graph node. The 10-worker decomposition (lint, style, syntax, typecheck, build via Ollama; react, typescript, reusability, accessibility via OpenRouter; security via Claude) is documented in `story.yaml` but has no implementation.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `ReviewSchema` artifact | `packages/backend/orchestrator/src/artifacts/review.ts` | Fully defined schema for REVIEW.yaml output — `FindingSchema`, `WorkerResultSchema`, `RankedPatchSchema`, `ReviewSchema`, and helper functions already exist. Review graph writes this artifact. |
| Parallel fan-out pattern | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Shows `fanout_pm`, `fanout_ux`, `fanout_qa` running as sequential nodes with a `merge_fanout` aggregation step. APIP-1050 implements true parallel fan-out using LangGraph's `Send` API, which is an advancement over this pattern. |
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Node factory all orchestrator nodes use — each review worker must use `createToolNode('review_{worker}', fn)`. |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Circuit breaker pattern for node-level failure handling — security worker (Claude) should be protected with a circuit breaker given cost implications. |
| Orchestrator artifact YAML pattern | `packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first artifact schema — `ReviewWorkerResultSchema`, `ReviewGraphResultSchema` follow this convention. |
| Model router (APIP-0040) | Not yet built | Security worker always uses Claude; other workers route through Ollama/OpenRouter via the model router. APIP-0040 must be complete before APIP-1050 workers can dispatch model calls. |
| BullMQ + LangGraph integration | Established in ADR-001 | All pipeline graphs run on the dedicated local server. Review graph is a LangGraph worker graph — checkpointing via LangGraph checkpoint store applies. |
| `addWorkerResult` helper | `packages/backend/orchestrator/src/artifacts/review.ts` | Aggregation helper that accumulates worker results, recalculates totals, and determines overall PASS/FAIL verdict. Fan-in node uses this. |
| `generateRankedPatches` helper | `packages/backend/orchestrator/src/artifacts/review.ts` | Produces ranked patch list from all FAIL findings — the implementation graph (APIP-1030) uses this to target re-implementation. |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-1030 (backlog) | Implementation Graph | APIP-1050 depends on APIP-1030 completing first. APIP-1030 produces git worktree output and evidence that the Review Graph receives as input. The `ChangeSpec` schema (from APIP-1020 spike) must be finalized before APIP-1030 can complete — which means APIP-1050 cannot begin until ChangeSpec is stable. |
| APIP-0040 (backlog) | Model Router | Review workers dispatch model calls through the model router. The security worker always uses Claude; others use Ollama (lint, style, syntax, typecheck, build) or OpenRouter (react, typescript, reusability, accessibility). Model router must be available for integration testing. |
| APIP-5006 (In Elaboration) | Server Infrastructure | Review graph runs on the dedicated local server — server must be provisioned before integration testing. No blocker for unit tests. |
| APIP-0020 (In Elaboration) | Supervisor Graph | Supervisor dispatches to the Review Graph via BullMQ. Review graph must expose a `runReview(storyId, config)` entry point consistent with the supervisor dispatch contract. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on the dedicated local server. No Lambda.
- **APIP ADR-001 Decision 2**: Supervisor is a plain TypeScript loop; Review Graph is correctly a LangGraph worker graph with its own checkpoint state. Thread ID convention: `{story_id}:review:{attempt_number}` (e.g., `APIP-0010:review:1`).
- **SEC-003 decision (DECISIONS.yaml)**: APIP-1050 AC must explicitly include a SAST/security scanning gate. The security review worker in this story is the mechanism that satisfies SEC-003. If scope is confirmed, a separate "Security Scanning Gate" story (NEW-009) is deferred.
- **COST-CONTROL-001 (DECISIONS.yaml)**: Security worker always uses Claude — model router circuit breaker must enforce per-story token hard cap before this worker is invoked. Budget tracking per story must be active.
- **ENG-001 (ChangeSpec schema)**: Review graph findings must map back to specific `ChangeSpec` IDs from APIP-1030's implementation. The `RankedPatchSchema` already has `worker` and `file` fields; a `changeSpecId` field may need to be added to support re-implementation targeting.
- **Fan-in timing (story.yaml risk_notes)**: If one worker is slow or crashes, the fan-in aggregation must not deadlock. Workers must have individual timeouts, and fan-in must handle partial results gracefully.
- **Protected areas**: Do NOT touch `packages/backend/database-schema/` or `@repo/db` client. Review graph writes `REVIEW.yaml` to the story feature directory — no Aurora DB writes in this story.

---

## Retrieved Context

### Related Endpoints

None — APIP-1050 produces a LangGraph worker graph. No HTTP routes or API endpoints. The supervisor calls `runReview(storyId, config)` directly.

### Related Components

None — no UI components. This is a headless orchestration graph. Operator visibility is deferred to APIP-5005.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `ReviewSchema` + helpers | `packages/backend/orchestrator/src/artifacts/review.ts` | Use `createReview()`, `addWorkerResult()`, `carryForwardWorker()`, `generateRankedPatches()` in the fan-in aggregation node. Do not rewrite these — they are the canonical aggregation contract. |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Every review worker node: `createToolNode('review_lint', fn)`, `createToolNode('review_security', fn)`, etc. |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Wrap the security worker (Claude) invocation with a circuit breaker. If Claude is unavailable, security worker fails gracefully with a FAIL finding rather than blocking all other workers. |
| Parallel fan-out via LangGraph Send API | `packages/backend/orchestrator/src/graphs/story-creation.ts` | The existing story-creation graph shows sequential fanout. APIP-1050 needs true parallel dispatch using LangGraph's `Send` API (map-reduce pattern). Story-creation graph is the closest reference but APIP-1050 goes further. |
| `WorkerResultSchema` | `packages/backend/orchestrator/src/artifacts/review.ts` | Each worker returns a `WorkerResult` — `{ verdict, skipped, errors, warnings, findings[], duration_ms }`. Workers write to graph state using this schema. |
| `@repo/logger` | Used throughout orchestrator | Structured logging per worker: `storyId`, `worker`, `verdict`, `errorCount`, `durationMs`. |
| YAML artifact writer pattern | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` | Fan-in node writes the final `REVIEW.yaml` to the story feature directory. Follow the existing YAML persistence pattern. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Existing REVIEW.yaml artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/review.ts` | This IS the review output contract. `ReviewSchema`, `WorkerResultSchema`, `FindingSchema`, `RankedPatchSchema`, and all helper functions are already defined. The fan-in aggregation node must use `createReview()`, `addWorkerResult()`, and `generateRankedPatches()` from this file — not reimplement them. |
| Node factory + createToolNode pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern for a new orchestrator node — Zod schemas at top, pure functions, `createToolNode` factory, exported result types, tests in `__tests__/`. Each review worker file should mirror this structure exactly. |
| Graph with parallel fanout + merge | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/story-creation.ts` | Shows `StateGraph` construction, `Annotation.Root()` state schema, sequential fanout nodes, merge node, conditional edge functions, and `graph.compile()`. Review graph uses the same pattern but with LangGraph `Send` API for true parallelism. The `StoryCreationStateAnnotation` pattern with `overwrite` reducer is the exact pattern for `ReviewGraphStateAnnotation`. |
| Circuit breaker for node protection | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/circuit-breaker.ts` | `NodeCircuitBreaker` class with `canExecute()`, `recordSuccess()`, `recordFailure()` — wrap the Claude security worker invocation with this to prevent cost runaway if Claude is unavailable. |

---

## Knowledge Context

### Lessons Learned

- **[APIP-1010 seed / architecture]** The `createToolNode` factory pattern with `createReviewWorkerNode(workerName, config)` factory is the correct abstraction. Each worker should be its own file with its own factory, config schema, result schema, and tests — not a monolithic "review node" with 10 branches.
  - *Applies because*: 10 review workers implemented as one giant switch statement would be untestable and impossible to reason about. Each worker (`review_lint.ts`, `review_security.ts`, etc.) should be an independent module following the `delta-detect.ts` pattern.

- **[story-creation graph / architecture]** Sequential fanout (fanout_pm → fanout_ux → fanout_qa) works for story creation because workers are fast pure-function heuristics. Code review workers invoke real tools (ESLint, TypeScript compiler, Claude) with variable latency — sequential execution would make the review stage unacceptably slow.
  - *Applies because*: APIP-1050 must use LangGraph's `Send` API for true parallel fan-out. The story-creation graph's sequential approach is the wrong pattern to copy for review workers. The Send API dispatches each worker as an independent subgraph invocation.

- **[WKFL retro / workflow]** Stories with broad scope (10 workers + graph + fan-in + artifact writer + REVIEW.yaml integration) can exceed token estimates significantly. The story.yaml already has `sizing_warning: false` — but 10 workers × (schema + implementation + tests) is substantial.
  - *Applies because*: Dev feasibility must recommend splitting implementation across tasks: (1) graph skeleton + state annotation, (2) static analysis workers (lint, style, syntax, typecheck, build), (3) LLM-based workers (react, typescript, reusability, accessibility), (4) security worker (Claude), (5) fan-in aggregation + REVIEW.yaml write.

- **[APIP-1010 seed / blockers]** Adding new nodes to existing graphs without updating all conditional edges and index exports is a common source of integration failures. For a new standalone graph, the risk shifts to ensuring the `runReview()` entry point matches what the supervisor expects.
  - *Applies because*: Review graph is a new standalone graph (not appended to an existing one). The supervisor dispatch contract (thread ID, input shape, output shape) must be documented and consistent with how APIP-0020 will call it.

### Blockers to Avoid (from past stories)

- **Fan-in deadlock on slow/failed workers**: If the fan-in node awaits all 10 workers synchronously and one worker hangs, the entire review stage hangs. Each worker must have an individual `nodeTimeoutMs` config and the fan-in must collect results within a deadline — any worker that exceeds its timeout contributes a FAIL result rather than blocking the graph.
- **Security worker cost runaway**: The security worker always uses Claude. Without a per-story token hard-cap check before invoking Claude, a single review cycle could consume unbounded tokens. The security worker must check the model router's budget gate before dispatching the Claude call (COST-CONTROL-001).
- **Findings not mapped to ChangeSpec IDs**: The `RankedPatchSchema` has `file` and `worker` fields but not `changeSpecId`. If the implementation graph (APIP-1030) needs to re-implement only specific ChangeSpecs based on review failures, findings must be linkable to ChangeSpecs. The fan-in aggregation should attempt to match findings by file path to the ChangeSpec that produced that file — and include `changeSpecId: string | null` in `RankedPatch`.
- **`ReviewSchema` reimplementation**: The artifact schema already exists in `artifacts/review.ts`. Reimplementing it in a review worker file would create a duplicate schema with drift risk. Import from `artifacts/review.ts` directly.
- **Testing workers that require real tools**: ESLint, TypeScript compiler, and Claude cannot be invoked in unit tests. Workers must be designed with injectable tool-runner functions (dependency injection) so tests can replace `runESLint(files)` with a mock that returns a controlled `WorkerResult`. The node implementation accepts a config with optional `toolRunner` overrides.
- **Hardcoded worker list**: The 10 workers are defined in `story.yaml`. If the list is hardcoded in the graph factory, adding/removing workers requires code changes. The `ReviewGraphConfigSchema` should accept a `workers: WorkerName[]` array with the 10 workers as the default, allowing operators to enable/disable workers per-run.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Review Graph is a LangGraph worker graph (correct layer). Supervisor dispatches to it via `runReview(storyId, config)` and does not implement any review logic. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | All review workers run on the dedicated server. Claude calls go outbound from server; Ollama runs locally on the server; OpenRouter calls go outbound. |
| ADR-005 | Testing Strategy | No UAT for this story — internal pipeline tooling with no user-facing surface. Integration tests must use real LangGraph graph invocation; unit tests mock tool runners. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` — ADR-006 Playwright requirement does not apply. |
| DECISIONS.yaml SEC-003 | Security Gate in Review Graph | APIP-1050 AC must explicitly include SAST/security scanning as the security worker's responsibility. This story IS the security gate — a separate story (NEW-009) is deferred pending confirmation during elaboration. |
| DECISIONS.yaml COST-CONTROL-001 | Token Budget Hard Cap | Security worker (Claude) must check per-story token budget via model router circuit breaker before each invocation. Review graph must propagate budget exceeded signal as FAIL on security worker, not as an error that blocks the graph. |

### Patterns to Follow

- One file per review worker: `packages/backend/orchestrator/src/nodes/review/workers/review-lint.ts`, `review-security.ts`, etc. Each follows `delta-detect.ts` structure.
- `createReviewWorkerNode(workerName, config)` factory for each worker, returning a `createToolNode(...)` invocation.
- Fan-out via LangGraph `Send` API: the dispatcher node emits `Send('review_worker', { workerName, storyId, files })` for each enabled worker.
- Fan-in aggregation node collects all `WorkerResult` entries from state (using an append-reducer for `workerResults: WorkerResult[]`), calls `addWorkerResult()` for each, calls `generateRankedPatches()`, and writes `REVIEW.yaml`.
- All schemas Zod-first at top of each file; config schemas with `enabled: z.boolean().default(true)` per worker.
- `@repo/logger` structured logging per worker: `{ storyId, worker, verdict, errorCount, warningCount, durationMs }`.
- Fan-in aggregation: overall PASS only if all enabled, non-skipped workers return PASS. Any FAIL = FAIL.
- Workers that are skipped (e.g., disabled in config or carried forward from previous PASS iteration) use `carryForwardWorker()` and contribute to `workers_skipped` list.
- Thread ID convention for LangGraph checkpoint: `{story_id}:review:{attempt_number}`.

### Patterns to Avoid

- TypeScript interfaces — all types must be `z.infer<typeof Schema>`.
- Reimplementing `ReviewSchema`, `WorkerResultSchema`, `FindingSchema`, or helper functions — import from `artifacts/review.ts`.
- Sequential worker execution — all workers must fan out in parallel via LangGraph `Send` API.
- Blocking the graph on a single worker failure — each worker must have timeout and graceful failure modes.
- Hardcoding the 10 worker names as string literals across multiple files — define a `ReviewWorkerNameSchema = z.enum([...])` in a shared types file and import it.
- Invoking real ESLint/TypeScript compiler/Claude directly in unit tests — inject tool runners via config.
- Writing to Aurora DB from any review worker or aggregation node — output is `REVIEW.yaml` only.

---

## Conflict Analysis

### Conflict: APIP-1030 not yet built (direct dependency)
- **Severity**: warning
- **Description**: APIP-1050 depends on APIP-1030 completing first. APIP-1030 produces the git worktree with implemented code that the review workers analyze. Additionally, APIP-1020 (ChangeSpec spike) must finalize the ChangeSpec schema before APIP-1030 can complete. The chain APIP-1020 → APIP-1030 → APIP-1050 means APIP-1050 cannot begin integration until both predecessors are stable. Unit tests for individual workers can be developed independently — they do not require a real worktree.
- **Resolution Hint**: Develop worker unit tests and graph skeleton in parallel with APIP-1030 implementation. The Review Graph's `runReview(storyId, worktreePath, changeSpecs, config)` input contract should be designed with the same care as the ChangeSpec schema — document it as an interface contract before implementation starts so APIP-1030 can produce the correct output shape.

### Conflict: `changeSpecId` field missing from `RankedPatch`
- **Severity**: warning
- **Description**: The existing `RankedPatchSchema` in `artifacts/review.ts` has `priority`, `file`, `issue`, `severity`, `auto_fixable`, and `worker` fields. It does not have a `changeSpecId` field. Without this field, the implementation graph cannot determine which specific ChangeSpec to re-implement when review fails — it can only know which files have issues. If APIP-1030 needs fine-grained re-implementation targeting, this field is necessary.
- **Resolution Hint**: During elaboration, decide whether to (a) add `changeSpecId: z.string().nullable().default(null)` to `RankedPatchSchema` now (schema is not yet used in production), or (b) use file-path-based ChangeSpec matching in APIP-1030's re-implementation loop. Option (a) is cleaner but requires updating the artifact schema. Since `ReviewSchema` is not yet consumed by any graph, this is a safe extension.

### Conflict: QA-004 (review aggregation logic undefined)
- **Severity**: warning
- **Description**: The epic-level QA review (REVIEW-QA.yaml) flagged APIP-1050's aggregation logic as undefined: "APIP-1050 review aggregation logic undefined—cannot verify PASS/FAIL decision." The `ReviewSchema` helpers define the mechanical aggregation (`addWorkerResult` → `verdict` is FAIL if any worker FAILs), but the story does not yet define: (a) which workers are blocking vs. advisory, (b) whether all 10 workers must pass or only a subset, (c) how to handle workers that time out vs. those that fail with findings.
- **Resolution Hint**: Define in elaboration ACs: (1) all enabled workers are blocking by default — any FAIL = overall FAIL; (2) timed-out workers contribute a FAIL finding `{ message: 'Worker timed out', severity: 'error', auto_fixable: false }`; (3) a `criticalWorkers: WorkerName[]` config field allows designating workers whose failure is always blocking even if others are advisory in future; (4) skipped workers (disabled or carried forward) do not affect PASS/FAIL. This resolves QA-004.

---

## Story Seed

### Title

Review Graph with Parallel Fan-Out Workers

### Description

The autonomous pipeline's implementation graph (APIP-1030) produces committed code changes in a git worktree. Before those changes can be merged, they must pass a comprehensive multi-dimensional code review that checks correctness, style, type safety, security, and code quality across 10 independent dimensions in parallel.

This story builds the **Review Graph** — a LangGraph worker graph that fans out to 10 review workers in parallel, collects their results, aggregates a PASS/FAIL verdict, ranks the top findings for targeted re-implementation, and writes a `REVIEW.yaml` artifact to the story's feature directory.

The 10 workers are partitioned by model tier to control cost:
- **Static analysis via Ollama (local, free)**: lint, style, syntax, typecheck, build
- **LLM review via OpenRouter (cheap)**: react patterns, typescript idioms, reusability, accessibility
- **Security review via Claude (expensive, always Claude)**: SAST, dependency scanning, secret detection

The graph uses LangGraph's `Send` API for true parallel fan-out — all enabled workers execute concurrently, not sequentially. A fan-in aggregation node collects all worker results, calls the existing `addWorkerResult()` and `generateRankedPatches()` helpers from the `ReviewSchema` artifact, and writes the final `REVIEW.yaml`. The overall verdict is FAIL if any enabled, non-timed-out worker fails. Timed-out workers contribute a FAIL finding rather than blocking the graph.

The `ReviewSchema` artifact schema is already defined in `packages/backend/orchestrator/src/artifacts/review.ts`. This story wires it into a new graph with independent worker nodes.

### Initial Acceptance Criteria

- [ ] AC-1: A `ReviewWorkerNameSchema = z.enum(['lint', 'style', 'syntax', 'typecheck', 'build', 'react', 'typescript', 'reusability', 'accessibility', 'security'])` Zod schema exists in `packages/backend/orchestrator/src/nodes/review/types.ts` as the canonical worker name enum used by all workers and the graph.

- [ ] AC-2: Each of the 10 review workers exists as a separate file in `packages/backend/orchestrator/src/nodes/review/workers/review-{name}.ts` with: (a) a `Review{Name}ConfigSchema` Zod schema (with `enabled: z.boolean().default(true)`, `timeoutMs: z.number().positive().default(60000)`, and worker-specific options), (b) a `createReview{Name}Node(config)` factory function using `createToolNode('review_{name}', fn)`, (c) the node function returning a `WorkerResult` (from `artifacts/review.ts`), (d) injectable tool runner for testability.

- [ ] AC-3: Static analysis workers (lint, style, syntax, typecheck, build) invoke real CLI tools when a `worktreePath` is available: ESLint for lint, Prettier check for style, TypeScript compiler for syntax/typecheck, and `pnpm build` for build. Each tool's exit code and output parse into `FindingSchema` entries. Tool invocation is injectable (accepts `toolRunner?: (cmd: string, cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>`).

- [ ] AC-4: LLM review workers (react, typescript, reusability, accessibility) dispatch model calls through the model router (APIP-0040) using the `OpenRouter` tier. Each worker constructs a structured prompt from the changed files (limited to files in the ChangeSpec), parses the model response into `FindingSchema[]`, and returns a `WorkerResult`.

- [ ] AC-5: The security worker (`review-security.ts`) always uses Claude (highest tier) via the model router. Before dispatching the Claude call, it checks the per-story token budget via the model router's budget gate — if budget is exceeded, it returns a `WorkerResult` with `verdict: 'FAIL'` and a single finding `{ message: 'Security review skipped: token budget exceeded', severity: 'error', auto_fixable: false }` rather than throwing an error. A `NodeCircuitBreaker` wraps the Claude call.

- [ ] AC-6: A `ReviewGraphStateAnnotation` Zod-annotated LangGraph state exists with fields: `storyId`, `worktreePath`, `changeSpecs` (array of ChangeSpec IDs from APIP-1020), `iteration`, `workerResults: Annotation<WorkerResult[]>` (append reducer), `workerNames: Annotation<string[]>` (append reducer), `aggregatedReview`, `reviewComplete`, `reviewVerdict` (`'PASS' | 'FAIL' | null`), `config`, `errors`, `warnings`.

- [ ] AC-7: A `dispatcher` node fans out to all enabled workers using LangGraph's `Send` API: `return enabledWorkers.map(name => new Send('review_worker_' + name, { storyId, worktreePath, changeSpecs, workerName: name }))`. Workers that are disabled in config are added to `workers_skipped` immediately without dispatching.

- [ ] AC-8: Each worker node executes within its configured `timeoutMs`. On timeout, the worker returns `{ verdict: 'FAIL', skipped: false, errors: 1, warnings: 0, findings: [{ file: '', message: 'Worker timed out after {timeoutMs}ms', severity: 'error', auto_fixable: false }], duration_ms: timeoutMs }`.

- [ ] AC-9: A `fan_in` aggregation node runs after all worker nodes complete. It calls `createReview(storyId, iteration)` once, then calls `addWorkerResult(review, workerName, result)` for each worker result in `state.workerResults`, then calls `generateRankedPatches(review)` to produce the `ranked_patches` list. The final `review.verdict` is FAIL if any non-skipped worker returned FAIL; PASS only if all non-skipped workers passed.

- [ ] AC-10: The `fan_in` node adds a `changeSpecId: z.string().nullable().default(null)` field to each `RankedPatch` by matching the finding's `file` path against the ChangeSpec file targets. If no ChangeSpec matches the file, `changeSpecId` is null. This requires extending `RankedPatchSchema` in `artifacts/review.ts` with the optional `changeSpecId` field.

- [ ] AC-11: The `fan_in` node writes the final `Review` object as `REVIEW.yaml` to the story's feature directory using the existing YAML artifact writer pattern (`packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts`). The file path is `plans/future/{epic}/{story_id}/REVIEW.yaml` (or the equivalent resolved path for the story's feature directory).

- [ ] AC-12: A `createReviewGraph(config)` factory function creates and compiles the `StateGraph` with: START → dispatcher → [all 10 worker nodes in parallel via Send] → fan_in → complete → END. The graph is exported as a compiled LangGraph graph.

- [ ] AC-13: A `runReview(storyId, worktreePath, changeSpecs, config)` entry point function invokes the compiled graph, awaits completion, and returns a `ReviewGraphResult` with `{ storyId, verdict, review, durationMs, errors }`. This is the function the supervisor (APIP-0020) calls.

- [ ] AC-14: When all workers pass, `runReview()` returns `verdict: 'PASS'` and the implementation graph proceeds to merge. When any worker fails, `runReview()` returns `verdict: 'FAIL'` and the ranked patches are available in the `REVIEW.yaml` for the implementation graph to use for targeted re-implementation.

- [ ] AC-15: Unit tests exist in `packages/backend/orchestrator/src/nodes/review/workers/__tests__/review-{name}.test.ts` for each worker, covering: (a) happy path with clean code returning PASS, (b) finding detection returning FAIL with correct `FindingSchema` entries, (c) timeout returning FAIL with timeout finding, (d) tool runner injection (mock returns controlled output), (e) disabled worker returns skipped result.

- [ ] AC-16: Graph integration tests exist in `packages/backend/orchestrator/src/graphs/__tests__/review.test.ts` covering: (a) `graph.compile()` succeeds, (b) all 10 workers reachable from dispatcher, (c) fan-in aggregation collects all worker results, (d) PASS verdict when all workers pass, (e) FAIL verdict when any one worker fails, (f) disabled workers appear in `workers_skipped`.

- [ ] AC-17: The APIP ADR-001 thread ID convention is documented in the graph source: `const threadId = \`${storyId}:review:${attempt}\`` — LangGraph checkpoint uses this thread ID for crash recovery.

### Non-Goals

- Building the model router (APIP-0040) — this story consumes it but does not implement it.
- Building the implementation graph (APIP-1030) — this story depends on it but does not implement it.
- Defining the ChangeSpec schema (APIP-1020) — this story receives ChangeSpecs as input but does not define them.
- Operator CLI visibility for review results — APIP-5005.
- Monitor dashboard showing review status — APIP-2020.
- QA Graph that acts on the review verdict — APIP-1060.
- Merge Graph — APIP-1070.
- Security scanning at the infrastructure level (container hardening, network boundary) — APIP-0030 / APIP-5003.
- Full auth/authz layer for LangGraph Platform — deferred to Phase 2.
- Writing review results to Aurora DB — output is `REVIEW.yaml` only; DB persistence deferred.
- Playwright E2E tests — `frontend_impacted: false`, ADR-006 does not apply.

### Reuse Plan

- **Components**: None (no UI).
- **Patterns**: `createToolNode('review_{name}', fn)` factory for each worker; `Annotation.Root()` with overwrite reducer for most fields and append reducer for `workerResults` and `workerNames`; LangGraph `Send` API for true parallel fan-out; `NodeCircuitBreaker` wrapping Claude call in security worker; `@repo/logger` structured logging with `{ storyId, worker, verdict, errorCount, durationMs }`.
- **Packages**:
  - `packages/backend/orchestrator/src/artifacts/review.ts` — `ReviewSchema`, `WorkerResultSchema`, `FindingSchema`, `RankedPatchSchema`, `createReview()`, `addWorkerResult()`, `carryForwardWorker()`, `generateRankedPatches()`.
  - `packages/backend/orchestrator/src/runner/node-factory.ts` — `createToolNode`.
  - `packages/backend/orchestrator/src/runner/circuit-breaker.ts` — `NodeCircuitBreaker` for security worker.
  - `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` — REVIEW.yaml write.
  - `@repo/logger` — structured logging.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply (`frontend_impacted: false`).
- **No UAT**: Internal pipeline tooling — ADR-005 real-service UAT requirement does not apply.
- **Two test scopes required**:
  - *Unit tests* (Vitest, injectable tool runners): One `review-{name}.test.ts` per worker. Test: clean code → PASS, dirty code → FAIL with correct findings, timeout → FAIL with timeout finding, disabled → skipped. Do NOT invoke real ESLint/TypeScript compiler/Claude in unit tests.
  - *Graph integration tests* (Vitest, real LangGraph `graph.compile()`): Extend `review.test.ts` to verify compiled graph routes through all 10 workers, fan-in collects all results, PASS/FAIL verdict is correct, `REVIEW.yaml` is written. Mock all tool runners at the graph level.
- **QA-004 resolution**: The elaboration ACs must define the PASS/FAIL decision rule clearly: all enabled, non-timed-out workers must PASS for overall PASS. Timed-out workers contribute a FAIL. Disabled workers are skipped (do not affect verdict). This must be tested explicitly in graph integration tests.
- **Security worker special case**: Test that the security worker returns FAIL (not an error) when the token budget is exceeded. This is a critical correctness requirement (COST-CONTROL-001).
- **Suggested coverage targets**: >80% coverage on each worker file; >70% on graph/review.ts; fan-in aggregation logic at 100% branch coverage.

### For UI/UX Advisor

- No UI impact. Review results are not surfaced to any user-facing interface in this story.
- The `REVIEW.yaml` output will eventually be visible in the operator CLI (APIP-5005). Ensure `ranked_patches` ordering (priority 1 = highest severity) is intuitive for an operator reading the file directly. Consider adding a `summary` field to `ReviewSchema` for a one-line human-readable verdict: e.g., `"3 errors in 2 workers (lint, security). 1 auto-fixable."`.
- The `splitReason`-style human-readable format from APIP-1010 is a good model: "Review FAIL: lint (12 errors, 3 auto-fixable), security (1 critical: hardcoded secret in auth.ts). Top fix: auth.ts:45 — remove hardcoded API key."

### For Dev Feasibility

- **File structure**: New directory `packages/backend/orchestrator/src/nodes/review/` with:
  - `types.ts` — `ReviewWorkerNameSchema`, shared types
  - `workers/review-lint.ts`, `review-style.ts`, `review-syntax.ts`, `review-typecheck.ts`, `review-build.ts` — Ollama tier
  - `workers/review-react.ts`, `review-typescript.ts`, `review-reusability.ts`, `review-accessibility.ts` — OpenRouter tier
  - `workers/review-security.ts` — Claude tier
  - `workers/__tests__/review-{name}.test.ts` — per-worker tests
  - `index.ts` — re-exports (NOT a barrel, just named exports of factories)
  - New graph: `packages/backend/orchestrator/src/graphs/review.ts`
  - Graph tests: `packages/backend/orchestrator/src/graphs/__tests__/review.test.ts`
- **LangGraph `Send` API**: The dispatcher node returns `Send` objects — one per enabled worker. Each `Send` targets a named node in the graph (`'review_lint'`, `'review_security'`, etc.). The fan-in node must be connected from all 10 worker nodes with `.addEdge('review_lint', 'fan_in')`, `.addEdge('review_security', 'fan_in')`, etc. This is how LangGraph implements map-reduce.
- **Append reducer for worker results**: `workerResults: Annotation<WorkerResult[]>({ reducer: (current, update) => [...current, ...update], default: () => [] })`. Each worker appends its single result. Fan-in reads the full array.
- **Schema extension for `RankedPatch`**: Adding `changeSpecId: z.string().nullable().default(null)` to `RankedPatchSchema` in `artifacts/review.ts` is safe — the field has a default, so existing callers that don't provide it will get `null`. This must be done before the fan-in node is implemented.
- **Dependency on APIP-0040**: If model router is not yet available, LLM-based workers should accept an optional `modelRouterOverride` in config that lets tests inject a mock model router. This is the same injectable tool-runner pattern as static analysis workers.
- **Subtask decomposition (recommended)**:
  1. Graph skeleton: `ReviewGraphStateAnnotation`, `createReviewGraph()`, `runReview()`, dispatcher node, fan-in stub, `REVIEW.yaml` write — no real workers yet.
  2. Static analysis workers: lint, style, syntax, typecheck, build + their unit tests.
  3. LLM review workers: react, typescript, reusability, accessibility + model router integration + their unit tests.
  4. Security worker: Claude integration, circuit breaker, budget gate + unit tests.
  5. Full graph integration tests + `changeSpecId` mapping in fan-in.
- **Canonical references for subtask decomposition**:
  - Artifact schema to use (not reimplement): `packages/backend/orchestrator/src/artifacts/review.ts`
  - Node pattern to replicate: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`
  - Graph pattern to adapt: `packages/backend/orchestrator/src/graphs/story-creation.ts` (add `Send` API)
  - Circuit breaker to wrap security worker: `packages/backend/orchestrator/src/runner/circuit-breaker.ts`
  - YAML write pattern: `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts`
