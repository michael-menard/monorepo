---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 1
---

# Story Seed: APIP-1030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No implementation graph, git worktree management, code-generation nodes, or micro-verify toolchain exists yet. APIP-1020 (ChangeSpec Schema Design Spike) and APIP-0040 (PipelineModelRouter) are prerequisite dependencies currently in backlog — neither is implemented. The LangGraph worker graph pattern is established in `packages/backend/orchestrator/src/graphs/` but no implementation graph exists. The ChangeSpec schema that this story consumes as input has not been finalized (APIP-1020 is a research spike specifically to validate it).

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Elaboration LangGraph graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Primary pattern for constructing a LangGraph `StateGraph` with typed state, `Annotation`, sequential nodes, and `runElaboration()` entry point — the implementation graph must follow the same conventions |
| Story-creation LangGraph graph | `packages/backend/orchestrator/src/graphs/story-creation.ts` | Second existing worker graph — further confirms the established graph composition pattern |
| NodeCircuitBreaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | CLOSED/OPEN/HALF_OPEN state machine — must apply per-provider in the change loop retry logic |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | TRANSIENT vs PERMANENT error routing — used to decide retry vs abort in the change loop |
| YAML artifact persistence | `packages/backend/orchestrator/src/artifacts/` | Zod-validated schemas for evidence, plan, scope, etc. — evidence production node must write using this pattern |
| Evidence schema | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `EvidenceSchema` with `touched_files`, `commands_run`, `acceptance_criteria` — direct output target for the evidence production phase |
| PipelineModelRouter (APIP-0040) | `packages/backend/orchestrator/src/pipeline/` (new — not yet built) | The model dispatch interface this story calls for code-gen per ChangeSpec; must be built first |
| createToolNode / node-factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Pattern for wrapping node functions with timeout and circuit breaker — required for all nodes in the implementation graph |
| Redis client (ioredis) | `apps/api/lego-api/core/cache/redis-client.ts` | BullMQ connection factory used by the supervisor (APIP-0020); the implementation graph checkpoint thread ID convention (`{storyId}:implementation:{attempt}`) must be consistent with this |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-1020 (backlog, HARD BLOCKER) | ChangeSpec Schema Design Spike | APIP-1030 consumes ChangeSpec as its primary input contract. Per ADR-001 Decision 3, integration code for the implementation graph cannot begin until the ChangeSpec spike validates and publishes the schema as an ADR. Zero integration code should be written before APIP-1020 closes. |
| APIP-0040 (backlog, blocker) | Model Router v1 with Rate Limiting and Token Budgets | APIP-1030 dispatches every code-gen LLM call through `PipelineModelRouter.dispatch()`. The escalation chain (Ollama → OpenRouter → Claude), token budget cap, and `BudgetExhaustedError` typed signal are all prerequisites. The implementation graph cannot call model providers without this wrapper in place. |
| APIP-1010 (backlog) | Structurer Node in Elaboration Graph | APIP-1010 is the dependency for APIP-1020, which is the dependency for APIP-1030. This dependency chain means APIP-1030 is third in line. No immediate overlap but relevant for critical path timing. |
| APIP-5001 (Ready to Work) | Test Database Setup and Migration Testing | Integration tests for the implementation graph require the test DB for any worktree state or telemetry DB writes. Must be available before integration tests are written. |

### Constraints to Respect

- **APIP ADR-001 Decision 3 (HARD GATE)**: Implementation graph integration code cannot begin until APIP-1020 ChangeSpec spike validates and publishes the schema ADR. The ChangeSpec schema is the foundational contract for this story. Schema changes after integration would cascade to 6+ downstream systems.
- **APIP ADR-001 Decision 4**: All pipeline components run on dedicated local server. Git worktree paths must be local filesystem paths — no S3/remote storage.
- **COST-CONTROL-001 (FOLLOW-UPS)**: The `PipelineModelRouter` hard budget cap circuit breaker from APIP-0040 must be in place and wired into every `dispatch()` call before this story's code-gen loop runs real stories.
- **Thread ID convention**: `{storyId}:implementation:{attemptNumber}` — consistent with the convention established in APIP-0020 (`{storyId}:{stage}:{attempt}`). LangGraph checkpoint continuity requires this to be documented and respected.
- **Atomic commit invariant**: Each ChangeSpec must result in its own `git commit` (or a clear failure record) before the next ChangeSpec begins. Partial batch writes are not acceptable — pipeline restarts must resume from the last completed atomic commit.
- **Micro-verify must run synchronously in the loop**: TypeScript typecheck + Vitest test run for the changed files must complete before the git commit is made. This is the primary durability guarantee.
- **Protected areas**: `packages/backend/orchestrator/src/models/` must not be modified — protected by active WINT/MODL UAT coverage. The implementation graph calls `PipelineModelRouter` (APIP-0040), not the raw `ModelRouter`.
- **Sizing warning applies**: This story has `sizing_warning: true` in story.yaml. The story spans multiple domains: implementation graph nodes, git tooling (worktree management), model dispatch integration, and micro-verify toolchain. This is a strong split candidate at elaboration time.

---

## Retrieved Context

### Related Endpoints

None — the implementation graph is a pure server-side LangGraph process. No HTTP routes.

### Related Components

None — no UI components. The implementation graph is headless.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| LangGraph graph factory pattern | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Model `createImplementationGraph()` and `runImplementation()` entry point on this structure. Use `Annotation`, `StateGraph`, `START`, `END` from `@langchain/langgraph` exactly as shown. |
| `createToolNode` / node-factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Wrap each implementation graph node function using the established timeout + circuit-breaker wrapper. |
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Apply per-provider circuit breaker in the change loop retry path (one breaker per LLM provider tier). |
| Error classification | `packages/backend/orchestrator/src/runner/error-classification.ts` | `isRetryableNodeError()` + `ErrorCategory` — drives retry vs abort decision in the change loop when micro-verify fails or model dispatch throws. |
| `EvidenceSchema` + helper functions | `packages/backend/orchestrator/src/artifacts/evidence.ts` | `createEvidence()`, `addTouchedFile()`, `addCommandRun()`, `updateAcEvidence()` — evidence production node writes using these exact helpers. |
| YAML artifact writer | `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts` | Persist evidence bundle to the story's feature directory on completion. |
| `PipelineModelRouter.dispatch()` | `packages/backend/orchestrator/src/pipeline/model-router.ts` (APIP-0040 — not yet built) | Every code-gen call in the change loop must go through this interface. Accumulates tokens, applies rate limiting, escalates Ollama → OpenRouter → Claude. |
| ChangeSpec schema (ADR from APIP-1020) | TBD — produced by APIP-1020 spike | The primary input contract for the change loop. Each iteration: `dispatch(changeSpec)` → code gen → micro-verify → commit. |
| `@repo/logger` | Used throughout orchestrator | `logger.info/warn/error` for all implementation graph log output with structured fields: `storyId`, `changeSpecId`, `nodeType`, `attemptNumber`, `durationMs`. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph worker graph structure | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/elaboration.ts` | Canonical pattern for `StateGraph` + `Annotation` + `createToolNode` + `runElaboration()` entry point. The implementation graph must follow this exact structure: typed state, conditional edges, `START`/`END` wiring. |
| Evidence production and helpers | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/evidence.ts` | Shows `createEvidence()`, `addTouchedFile()`, `addCommandRun()`, `updateAcEvidence()` — the evidence production node uses these helpers directly. |
| Circuit breaker pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/runner/circuit-breaker.ts` | CLOSED/OPEN/HALF_OPEN state machine with configurable thresholds. Apply per-provider in the change loop retry path; do not re-implement. |
| Zod-first artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod-first type pattern (no TypeScript interfaces). All new schemas in the implementation graph must follow `z.object()`  with `z.infer<>` type aliases. |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** LangGraph graph tests should target compiled graph routing logic, not dynamic lens imports. (*category: testing*)
  - *Applies because*: Tests for the implementation graph must mock LLM dispatch at the `PipelineModelRouter.dispatch()` module boundary, not reconstruct internal node AI calls. Test `graph.compile()` succeeds and verify change loop conditional routing (retry path vs. commit path vs. abort path) directly.

- **[WINT-9020]** Native 7-phase LangGraph node implementation proves viable for subprocess-delegating agents. Sequential phase architecture with graceful fallback is robust. (*category: architecture*)
  - *Applies because*: The implementation graph's change loop phases (load-story, create-worktree, plan, change-loop, evidence-production) follow the same sequential node pattern. Each phase should be a discrete node with clear state transitions — not a single monolithic node.

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas before code review. (*category: other*)
  - *Applies because*: The implementation graph state, ChangeSpec input, micro-verify result, and commit record types must all be `z.object()` schemas with `z.infer<>`. Do not write any TypeScript interfaces in graph state or node types — catch this at implementation time to avoid a fix cycle.

- **[WKFL-pattern]** Review phase waived for documentation-only stories; code review provides minimal value for markdown/agent-only deliverables. (*category: workflow*)
  - *Applies because*: This story is a full code story (LangGraph graph, nodes, tests, git tooling). Code review is mandatory. Do not apply review waivers here.

- **[WINT-general]** Filesystem-walking nodes require temp directory isolation in tests. (*category: testing*)
  - *Applies because*: The `create-worktree` node and micro-verify toolchain run filesystem operations and shell commands. Tests must use `os.tmpdir()` with fixture isolation — never walk the real monorepo in tests.

### Blockers to Avoid (from past stories)

- **ChangeSpec schema lock-in before integration**: Per APIP ADR-001 Decision 3 and FOLLOW-UP ENG-001, writing integration code against an unvalidated ChangeSpec schema is the single highest risk in this story. If implementation begins before APIP-1020 closes, schema changes will cascade through all graph nodes and downstream stories. Wait for the spike ADR.
- **Missing BudgetExhaustedError handling in change loop**: Per COST-CONTROL-001 and APIP-0040 AC-4, when `PipelineModelRouter.dispatch()` throws `BudgetExhaustedError`, the change loop must treat this as PERMANENT (no retry) and immediately abort the story, updating BullMQ job status to permanently failed. Failing to handle this means runaway token spend.
- **Non-atomic git commit pattern**: Each ChangeSpec must be committed atomically before the next begins. If the commit step is deferred or batched, pipeline restarts cannot resume from a safe point — all work after the last committed ChangeSpec would need to be re-done, defeating the primary goal of the story.
- **LangGraph state extension types as interfaces**: Past experience (WINT-9090 lesson) shows this causes a code review fix cycle. All graph state types, ChangeSpec types, and micro-verify result types must be Zod schemas — proactively convert at implementation time.
- **Cheap model quality passing micro-verify but failing QA (RISK-001)**: The index rates this HIGH risk. Micro-verify (typecheck + limited test run) is a necessary but not sufficient quality gate. The story should document this risk explicitly in AC language ("micro-verify passes" is not the same as "implementation is correct").
- **Missing thread ID convention**: LangGraph checkpoint thread ID for the implementation graph must be `{storyId}:implementation:{attemptNumber}`. Changing this post-implementation requires checkpoint data migration. Document before coding.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 3 | ChangeSpec Spike Before Integration | HARD GATE: No implementation graph integration code until APIP-1020 spike validates ChangeSpec schema and publishes ADR |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Git worktrees run on local filesystem. No Lambda, no remote storage. Worktree paths are absolute local paths. |
| ADR-005 | Testing Strategy — UAT must use real services | Integration tests for the change loop and worktree operations must use real git operations and real filesystem — no mocking of `git` subprocess calls in integration tier |
| ADR-006 | E2E Tests Required in Dev Phase | No UI impact — ADR-006 Playwright requirement does not apply. Backend-only implementation graph. |

### Patterns to Follow

- `StateGraph` + `Annotation` + `createToolNode` from `@langchain/langgraph` — follow `elaboration.ts` structure exactly
- Change loop as a LangGraph conditional edge: `changeSpec → dispatch → micro-verify → (pass: commit → next spec) | (fail: retry or abort)`
- Thread ID: `{storyId}:implementation:{attemptNumber}` — log and pass to LangGraph checkpointer on every dispatch
- Zod-first schemas for all new types — no TypeScript interfaces anywhere in graph, nodes, or types files
- `@repo/logger` with structured fields on every lifecycle event: `storyId`, `changeSpecId`, `provider`, `attemptNumber`, `durationMs`
- Atomic git commit per ChangeSpec using `child_process.execSync` (or `execa`) with explicit working directory set to the worktree path
- Micro-verify as: `tsc --noEmit` on touched files, then `pnpm test --filter <package>` scoped to changed files only

### Patterns to Avoid

- TypeScript interfaces for graph state or node result types — use Zod schemas
- Batching multiple ChangeSpecs into a single git commit
- Calling `ModelRouterFactory.getInstance()` directly — always go through `PipelineModelRouter.dispatch()`
- Modifying `packages/backend/orchestrator/src/models/` (protected)
- Mocking `git` CLI calls in integration tests (per ADR-005)
- Starting integration code before APIP-1020 ChangeSpec ADR is published
- Treating `BudgetExhaustedError` as retryable — it is PERMANENT

---

## Conflict Analysis

### Conflict: Hard dependency on APIP-1020 ChangeSpec spike (not yet complete)
- **Severity**: blocking
- **Description**: APIP-1030 is fundamentally an integration story that wires together the output of APIP-1020 (ChangeSpec schema ADR) and APIP-0040 (PipelineModelRouter). The ChangeSpec schema is the primary input to the change loop — every node in the implementation graph either produces or consumes ChangeSpec data. APIP ADR-001 Decision 3 explicitly states: "Integration code moves to a follow-up story [i.e., APIP-1030] — Phase 1 cannot start integration until spike validates schema." Writing implementation graph code against an assumed ChangeSpec schema risks cascading rework across all downstream stories (APIP-1040, APIP-1050, APIP-3010, APIP-3030, telemetry, affinity).
- **Resolution Hint**: APIP-1030 must not begin integration coding until APIP-1020 is complete and the ChangeSpec ADR is published. During elaboration, the implementation graph story can be fully specified (nodes, ACs, subtasks) using a placeholder ChangeSpec schema. Mark AC-1 as "ChangeSpec schema imported from APIP-1020 ADR" with an explicit dependency gate. Story can be fully elaborated now; implementation starts only after APIP-1020 merges.

### Conflict: Hard dependency on APIP-0040 PipelineModelRouter (not yet built)
- **Severity**: warning
- **Description**: Every code-gen LLM call in the change loop goes through `PipelineModelRouter.dispatch()` (APIP-0040). The token budget cap, rate limiting, and `BudgetExhaustedError` typed signal are all in APIP-0040. Without this, the change loop has no cost controls and no provider escalation. APIP-0040 is currently in backlog.
- **Resolution Hint**: Structure the implementation graph with an injected `IModelDispatch` interface that `PipelineModelRouter` satisfies. This allows unit tests for graph routing, worktree management, and micro-verify to be written before APIP-0040 completes. Full integration (real model dispatch) requires APIP-0040. Parallel development is possible at the unit test layer.

### Conflict: Sizing warning — story spans 4 distinct technical domains
- **Severity**: warning
- **Description**: The story.yaml carries `sizing_warning: true`. The implementation graph touches: (1) LangGraph graph infrastructure (nodes, state, routing), (2) git worktree management (filesystem operations, subprocess calls), (3) model dispatch integration (PipelineModelRouter, ChangeSpec loop), and (4) micro-verify toolchain (typecheck + test runner invocation). Each domain has independent failure modes and testing requirements. Prior experience with similarly scoped stories shows >3 review cycles and split risk >0.7.
- **Resolution Hint**: During elaboration, evaluate splitting APIP-1030 into: (a) APIP-1030a: Implementation Graph skeleton + worktree management (graph structure, load-story node, create-worktree node, evidence production node — no LLM dispatch); (b) APIP-1030b: Change Loop + model dispatch integration (the actual code-gen loop, micro-verify, atomic commit, retry with model escalation). This split reduces risk and allows APIP-1030a to proceed before APIP-0040 is complete.

---

## Story Seed

### Title

Implementation Graph with Atomic Change Loop

### Description

The autonomous pipeline requires a LangGraph worker graph that takes a validated story (with ChangeSpec plan from APIP-1020) and executes atomic, independently committed code changes through a change loop — dispatching each ChangeSpec to a code-generation model (via APIP-0040's `PipelineModelRouter`), running micro-verification (typecheck + scoped test run), and making an atomic git commit per ChangeSpec before proceeding to the next.

The graph runs in an isolated git worktree (one per story, created at graph start), meaning the main repository is never in a partially-modified state during implementation. If the pipeline is restarted mid-story, LangGraph checkpointing resumes from the last committed ChangeSpec — no completed work is lost.

The two direct prerequisites are:
1. **APIP-1020** (ChangeSpec Schema Design Spike) — must close first; the ChangeSpec Zod schema and its ADR are the primary input contract for this graph.
2. **APIP-0040** (PipelineModelRouter) — must be built first; all code-gen LLM calls go through `PipelineModelRouter.dispatch()` which enforces token budgets and provider escalation.

The existing orchestrator codebase provides: a LangGraph graph structure pattern (`elaboration.ts`), an evidence schema and helper functions (`artifacts/evidence.ts`), circuit breaker (`runner/circuit-breaker.ts`), error classification (`runner/error-classification.ts`), and node factory (`runner/node-factory.ts`). This story wires those together with new git tooling and the code-gen dispatch loop.

**Note**: `sizing_warning: true` applies — the story spans LangGraph graph infrastructure, git worktree management, model dispatch integration, and micro-verify toolchain. Splitting at elaboration time is strongly recommended.

### Initial Acceptance Criteria

- [ ] AC-1: A `ChangeSpec` Zod schema (imported from APIP-1020 ADR output) is the typed input contract for the change loop. No integration code proceeds without this schema.
- [ ] AC-2: An `ImplementationGraph` is implemented in `packages/backend/orchestrator/src/graphs/implementation.ts` following the `elaboration.ts` structure: `StateGraph`, `Annotation`-typed state, `createToolNode`-wrapped nodes, `runImplementation(storyId, config)` entry point, and LangGraph checkpointer configured with thread ID `{storyId}:implementation:{attemptNumber}`.
- [ ] AC-3: A `create-worktree` node creates an isolated git worktree at a configurable base path (`worktrees/{storyId}`) using `git worktree add`. The worktree path is recorded in graph state. On graph completion (success or failure), the worktree is removed via `git worktree remove --force`. Worktree cleanup never blocks graph result propagation (non-blocking cleanup pattern from KB lesson).
- [ ] AC-4: A `load-story` node reads the story file (STORY-SEED.md or elaborated story) and the ChangeSpec plan (produced by APIP-1020's Diff Planner) into graph state. Missing story or ChangeSpec plan produces a typed `LoadError` that transitions to `abort` edge.
- [ ] AC-5: A `change-loop` node iterates over ChangeSpecs in order. For each ChangeSpec: (a) calls `PipelineModelRouter.dispatch()` with `storyId`, `agentId: 'implementation-codegen'`, and the ChangeSpec as message context; (b) writes the generated code to the worktree; (c) runs micro-verify (typecheck + scoped test); (d) on micro-verify pass, makes an atomic `git commit` in the worktree with message `feat({storyId}): {changeSpec.id} — {changeSpec.summary}`; (e) on micro-verify fail, applies retry logic (up to configurable `maxRetries`, default: 2) before transitioning to `abort`.
- [ ] AC-6: `PipelineModelRouter.dispatch()` throws `BudgetExhaustedError` → change loop treats this as PERMANENT, immediately aborts remaining ChangeSpecs, marks evidence `status: aborted`, and propagates `BudgetExhaustedError` to the BullMQ job processor for permanent failure (no retry).
- [ ] AC-7: Micro-verify runs `pnpm check-types --filter <changed-package>` and `pnpm test --filter <changed-package>` scoped to the packages touched by the ChangeSpec. Both commands run inside the worktree path. A micro-verify pass requires both commands to exit 0. Stdout/stderr are captured and included in the evidence `commands_run` array.
- [ ] AC-8: Each successful ChangeSpec commit is recorded atomically: commit SHA is captured and stored in graph state under `completedChanges`. On graph restart (LangGraph checkpoint resume), already-committed ChangeSpecs are skipped (idempotent loop — check `completedChanges` before dispatching).
- [ ] AC-9: An `evidence-production` node runs after the change loop completes (pass or abort). It writes an `EVIDENCE.yaml` file to the story's feature directory using `EvidenceSchema` + `createEvidence()` / `addTouchedFile()` / `addCommandRun()` helpers. Evidence captures: AC coverage status, touched files per ChangeSpec, micro-verify command results, commit SHAs, token summary (from `PipelineModelRouter` usage), and abort reason if applicable.
- [ ] AC-10: The implementation graph logs structured events with `@repo/logger` for each lifecycle transition: `graph_started`, `worktree_created`, `story_loaded`, `change_spec_dispatched`, `micro_verify_passed`, `micro_verify_failed`, `change_committed`, `change_aborted`, `evidence_written`, `graph_completed` — with fields: `storyId`, `changeSpecId`, `provider`, `attemptNumber`, `durationMs`, `tokenUsage` on each event.
- [ ] AC-11: Vitest unit tests cover: graph compiles and has expected node/edge structure; change loop routes to commit on micro-verify pass; change loop routes to retry on micro-verify fail; change loop routes to abort after maxRetries; `BudgetExhaustedError` triggers immediate abort (PERMANENT, no retry); already-committed ChangeSpec is skipped on resume; evidence production writes correct `EvidenceSchema`-conformant output.
- [ ] AC-12: Vitest integration test (using real git subprocess in `os.tmpdir()` fixture) verifies: `create-worktree` creates an actual git worktree; `git commit` in worktree produces a real commit visible via `git log`; micro-verify runs `pnpm check-types` against a real file change; cleanup removes the worktree. Test must NOT walk the real monorepo — use isolated temp fixture.
- [ ] AC-13: Existing orchestrator test suites (`packages/backend/orchestrator`) continue to pass unchanged. The implementation graph does not modify any file in `packages/backend/orchestrator/src/models/`.

### Non-Goals

- Implementing the ChangeSpec schema (deferred to APIP-1020 — must complete first)
- Implementing `PipelineModelRouter` (deferred to APIP-0040 — must complete first)
- Review graph integration (deferred to APIP-1050)
- QA graph integration (deferred to APIP-1060)
- Merge graph integration (deferred to APIP-1070)
- Change telemetry DB writes (deferred to APIP-3010 — reads change loop evidence, adds telemetry layer)
- Model affinity learning in dispatch routing (deferred to APIP-3040)
- Parallel story concurrency via multiple worktrees (deferred to APIP-3080)
- Full SAST/security scanning gate (verify during APIP-1050 elaboration per SEC-003 FOLLOW-UP)
- PR creation, branch management, or merge operations — the implementation graph leaves changes committed in a worktree branch; merge is APIP-1070's responsibility
- Modifying `packages/backend/orchestrator/src/models/` (protected by WINT/MODL UAT)
- Modifying `packages/backend/database-schema/` or `@repo/db` client API surface (protected)
- UI or operator dashboard (deferred to APIP-2020, APIP-5005)

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: LangGraph `StateGraph` + `Annotation` pattern from `elaboration.ts`; `createToolNode` wrapping for all nodes; `NodeCircuitBreaker` per-provider in change loop; `Promise.race()` for per-ChangeSpec wall clock timeout; Zod-first schemas for all types; `@repo/logger` structured logging; atomic git commit per ChangeSpec via `child_process` or `execa`; `os.tmpdir()` isolation for integration tests
- **Packages**: `packages/backend/orchestrator` (graph pattern, circuit-breaker, error-classification, evidence artifact helpers, node-factory, persistence/yaml-artifact-writer); `@repo/logger`; `PipelineModelRouter` (APIP-0040)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 Playwright E2E requirement does not apply. Backend-only LangGraph graph.
- **Two test tiers required**:
  - *Unit tests* (Vitest): Mock `PipelineModelRouter.dispatch()` at module boundary. Mock `child_process` / `execa` for git operations. Cover all change loop routing branches: commit path, retry path, abort path after maxRetries, `BudgetExhaustedError` permanent abort, resume-from-checkpoint skipping. Test graph compilation and edge structure directly (follow `elaboration.test.ts` pattern).
  - *Integration tests* (Vitest + real git + `os.tmpdir()`): Use isolated temp directory with a real `git init` fixture. Verify `git worktree add`, actual `git commit` in worktree, `git log` shows commit, `git worktree remove` cleans up. Do NOT use the real monorepo. Do NOT mock `git` CLI calls in integration tier (per ADR-005 principle applied to subprocess calls).
- **Coverage focus**: The change loop conditional routing (retry vs. commit vs. abort) and the idempotent resume logic (skipping committed ChangeSpecs) are the highest-value coverage targets. The LangGraph graph compilation verification is a fast and high-value smoke test.
- **Regression guard (AC-13)**: Running `pnpm test --filter @repo/orchestrator` as part of this story's CI gate is mandatory. The implementation graph must not regress existing tests.
- **Risk-001 acknowledgment**: Micro-verify passing does not guarantee correctness (RISK-001). Test plan should document that micro-verify is a fast gate (typecheck + scoped tests), not a full QA gate. False-positive rate testing is out of scope for this story but flagged for APIP-1060 (QA Graph).

### For UI/UX Advisor

- No UI impact. Implementation graph is invisible to end users.
- The only operator-visible output is `@repo/logger` structured logs and the `EVIDENCE.yaml` artifact. Log field names (`storyId`, `changeSpecId`, `provider`, `attemptNumber`) must be consistent and predictable for the minimal CLI (APIP-5005) to consume.
- The `EVIDENCE.yaml` schema from APIP-0040 evidence patterns must be followed precisely so the Review Graph (APIP-1050) can parse it without schema negotiation.

### For Dev Feasibility

- **Critical gate**: Confirm APIP-1020 will close before implementation begins. If APIP-1020 is delayed, APIP-1030 implementation is blocked. The ChangeSpec Zod schema is the first artifact to import.
- **Split recommendation (strong)**: Given `sizing_warning: true` and 4 distinct technical domains, evaluate splitting into:
  - *APIP-1030a*: Implementation Graph skeleton — graph structure, load-story node, create-worktree node, evidence-production node. No LLM dispatch. Can be built in parallel with APIP-0040.
  - *APIP-1030b*: Change Loop — dispatch per ChangeSpec via `PipelineModelRouter`, micro-verify, atomic commit, retry logic, resume idempotency. Requires APIP-0040 complete.
- **Git worktree mechanics**: `git worktree add <path> <branch>` creates the isolated worktree. All subsequent git operations (`git add`, `git commit`, `git log`) must pass `-C <worktreePath>` or be run with `cwd: worktreePath`. Confirm the pipeline server's git version supports `git worktree` (requires git >= 2.5).
- **Micro-verify scoping**: `pnpm check-types --filter <package>` scopes typecheck to a single Turborepo package. The ChangeSpec must carry enough metadata (touched package names) to build the correct filter list. Verify this is part of the ChangeSpec schema ADR output from APIP-1020.
- **Idempotent resume**: The `completedChanges: string[]` field in graph state (list of committed ChangeSpec IDs) plus LangGraph checkpoint handles restart recovery. On resume, the change loop checks `completedChanges.includes(changeSpec.id)` before dispatching. This requires ChangeSpec IDs to be stable across restarts — confirm with APIP-1020 schema ADR.
- **Budget exhaustion wiring**: `BudgetExhaustedError` must be caught at the BullMQ job processor level (in APIP-0020's supervisor), not swallowed inside the graph. The graph propagates it; the supervisor marks the job permanently failed.
- **Canonical references for subtask decomposition**:
  - LangGraph graph structure: `packages/backend/orchestrator/src/graphs/elaboration.ts`
  - Evidence production: `packages/backend/orchestrator/src/artifacts/evidence.ts`
  - Circuit breaker: `packages/backend/orchestrator/src/runner/circuit-breaker.ts`
  - Node factory wrapper: `packages/backend/orchestrator/src/runner/node-factory.ts`
  - YAML persistence: `packages/backend/orchestrator/src/persistence/yaml-artifact-writer.ts`
