---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-1050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates the autonomous-pipeline epic elaboration (2026-02-25). Active stories listed in baseline as "none" — superseded by the new stories index. No gap in architecture context.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator package with LangGraph graphs | `packages/backend/orchestrator/src/` | Primary implementation home — this story adds a new graph here |
| Code audit graph with parallel lens fan-out | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Direct structural analogue: parallel `Promise.all` over worker nodes |
| ReviewSchema artifact + helpers | `packages/backend/orchestrator/src/artifacts/review.ts` | Pre-built artifact schema for this story — DO NOT reimplement |
| 10 code review worker agents | `.claude/agents/code-review-*.agent.md` | Existing Claude Code agent implementations to be wrapped as LangGraph nodes |
| review-aggregate-leader agent | `.claude/agents/review-aggregate-leader.agent.md` | Fan-in aggregation logic reference — maps directly to the fan-in node |
| NodeCircuitBreaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Required for wrapping expensive Claude security worker |
| createToolNode factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Standard node factory — use for every worker node |
| Elaboration graph (multi-phase, delta detection) | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Graph structure pattern to follow |

### Active In-Progress Work

| Story | Title | Overlap Risk |
|-------|-------|-------------|
| APIP-1030 | Implementation Graph with Atomic Change Loop | Direct dependency — this story receives the worktree output that APIP-1050 reviews. Status: Needs Split. |
| APIP-0040 | Model Router v1 with Rate Limiting and Token Budgets | Dependency — APIP-1050 uses model router to dispatch LLM review workers. Status: Needs Code Review. |
| APIP-5006 | LangGraph Server Infrastructure Baseline | Platform dependency — server must exist before review graph can run. Status: elaboration. |

### Constraints to Respect

- APIP-1030 is "Needs Split" into APIP-1030a/b — APIP-1050 depends on APIP-1030 completing. Do not begin APIP-1050 implementation until APIP-1030 (or at least APIP-1030b, the change-loop half) is merged.
- APIP-0040 (Model Router) must gate the APIP-1050 security worker's Claude dispatch. Circuit breaker required per COST-CONTROL-001.
- ReviewSchema (`artifacts/review.ts`) is already implemented and tested — DO NOT reimplement. Reuse `createReview`, `addWorkerResult`, `carryForwardWorker`, `generateRankedPatches`.
- `packages/backend/database-schema/` is a protected feature — this story touches no DB schemas.
- Orchestrator artifact schemas are protected — extend RankedPatchSchema only if truly required; avoid schema breaking changes.
- Thread ID convention must follow `{storyId}:review:{attempt}` (established in DECISIONS.yaml architecture review).

---

## Retrieved Context

### Related Endpoints

None — this story is pure backend orchestrator logic with no HTTP API surface.

### Related Components

| Component | Path | Role |
|-----------|------|------|
| CodeAuditStateAnnotation (parallel lens) | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Pattern for fan-out state annotation with append reducers |
| ElaborationGraph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Pattern for graph config schema, state annotation, compiled graph factory |
| ReviewSchema | `packages/backend/orchestrator/src/artifacts/review.ts` | Output artifact — already complete |
| NodeCircuitBreaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Required wrapper for Claude security worker |
| createToolNode | `packages/backend/orchestrator/src/runner/node-factory.ts` | Standard node factory — use for all 10 worker nodes |
| code-review-lint.agent.md | `.claude/agents/code-review-lint.agent.md` | Worker behavior spec for lint worker node |
| code-review-security.agent.md | `.claude/agents/code-review-security.agent.md` | Worker behavior spec for security worker node (Claude tier) |
| review-aggregate-leader.agent.md | `.claude/agents/review-aggregate-leader.agent.md` | Fan-in aggregation logic and ranked patch generation |

### Reuse Candidates

- `artifacts/review.ts` — entire artifact schema and all helper functions. Import as-is.
- `runner/node-factory.ts` — `createToolNode` factory for wrapping each worker with retry/circuit breaker/logging.
- `runner/circuit-breaker.ts` — `NodeCircuitBreaker` for the Claude security worker (expensive tier).
- `runner/types.ts` — `NodeMetricsCollector` interface for optional metrics capture.
- 10 existing code-review agent `.md` files — behavioral contracts for each worker. Implement node logic to match.
- `review-aggregate-leader.agent.md` — fan-in aggregation and `generateRankedPatches` logic reference.
- `graphs/code-audit.ts` — `appendArray` reducer pattern, `Annotation.Root` fan-out state, `Promise.all` parallel execution idiom.

### Similar Stories

- AUDT-0010 (Code Audit Graph) — implemented parallel lens fan-out in `code-audit.ts`. Key patterns: `appendArray` reducer, dynamic imports per lens, `Promise.all` aggregation.
- WINT-9020 (LangGraph node for doc-sync subprocess agent) — native TypeScript LangGraph node from subprocess-delegating agent.
- WINT-9090 (LangGraph node with state extension) — state extension Zod schema pattern (`GraphStateWith*` must be Zod, not interface).

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Parallel fan-out graph with append reducers | `packages/backend/orchestrator/src/graphs/code-audit.ts` | Direct analogue: parallel workers, append reducer for results, conditional routing, graph factory function |
| LangGraph graph with Zod config + state annotation | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Gold standard for graph config schema, state annotation structure, compiled graph export |
| Worker node with circuit breaker via node-factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | `createToolNode` is the only factory to use — wraps retry, circuit breaker, logging |
| Review artifact schema and helpers | `packages/backend/orchestrator/src/artifacts/review.ts` | Complete `ReviewSchema`, `createReview`, `addWorkerResult`, `carryForwardWorker`, `generateRankedPatches` — import, do not reimplement |

---

## Knowledge Context

### Lessons Learned

- **[AUDT-0010]** Graph compilation tests should target compiled graph routing, not dynamic lens imports. (`category: testing`)
  - *Applies because*: APIP-1050 will have a parallel fan-out dispatcher node. Tests should validate routing and `graph.compile()` succeeds without running actual ESLint or Claude calls.

- **[AUDT-0010]** Test routing functions directly with mock state objects to validate conditional logic without executing AI nodes. (`category: testing`)
  - *Applies because*: The fan-in aggregation and verdict routing are pure logic — test them directly. This avoids test fragility from mocking 10 worker implementations.

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas before code review. (`category: other`)
  - *Applies because*: `ReviewGraphState` and any `GraphStateWith*` extensions must use `z.object()` + `z.infer<>`, not TypeScript `interface`. This is a recurring code review trigger.

- **[WINT-9020]** Native TypeScript LangGraph node implementation is viable for subprocess-delegating agents. (`category: architecture`)
  - *Applies because*: The 10 code review workers currently exist as Claude Code agents. They can be implemented as native TypeScript nodes that invoke the underlying tools (ESLint, TypeScript compiler, Claude API) directly.

### Blockers to Avoid (from past stories)

- Do not use TypeScript `interface` for any graph state type — convert to `z.object()` + `z.infer<>` before submitting for code review (recurring WINT-9090 trigger).
- Do not reimplement `ReviewSchema` or its helpers — `artifacts/review.ts` is the canonical source. Importing from it avoids schema divergence.
- Do not use dynamic imports in worker nodes if avoidable — prefer static imports or a pre-loaded module map (AUDT-0010 lesson on test fragility).
- Token estimates for parallel-worker graph stories with agents + schemas + integration tests historically run 4-8x over initial estimates (WKFL patterns). Budget accordingly.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests may use injected tool runners; UAT must use real ESLint, TypeScript, and Claude |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable — this story is `frontend_impacted: false`, so E2E may be skipped |
| COST-CONTROL-001 | Circuit breaker for Claude model dispatch | NodeCircuitBreaker MUST wrap the security worker's Claude API call. Hard-cap enforcement required. |
| PLAT-002 | Checkpoint schema docs required | Thread ID convention `{storyId}:review:{attempt}` must be documented and used consistently |
| ENG-001 | ChangeSpec schema gates APIP-1020 | APIP-1050 receives ChangeSpec from APIP-1030's output — the `changeSpecId` must be captured in the review state for downstream routing |

### Patterns to Follow

- Use `Annotation.Root` with `appendArray` reducer for `workerResults` state field — allows fan-in to collect all parallel results.
- Use `Send` API from `@langchain/langgraph` to dispatch worker nodes in true parallel (not `Promise.all` inside a single node — that prevents per-node checkpointing).
- Wrap every worker node with `createToolNode` from `runner/node-factory.ts` — provides retry, circuit breaker, logging, and metrics capture.
- Use `NodeCircuitBreaker` specifically for the Claude security worker — it is the only expensive-tier worker.
- Use injectable `toolRunner` interface for testability — unit tests inject a mock runner, production uses the real ESLint/TS/Claude callers.
- Export `createReviewGraph(config)` factory function following the `createCodeAuditGraph` / `createElaborationGraph` naming convention.
- Thread ID format: `{storyId}:review:{attempt}`.

### Patterns to Avoid

- Do not write `interface ReviewGraphState` — must be `z.object()` schema.
- Do not add a new `findings` object format — use the existing `findings` map from `ReviewSchema` (`lint`, `style`, `syntax`, `security`, `typecheck`, `build`, `reusability`, `react`, `typescript`, `accessibility`).
- Do not skip the `workers_skipped` carry-forward mechanism — it is part of the Review artifact contract and enables partial re-runs.
- Do not add new DB tables — this story touches no database schema.
- Do not use `Promise.all` inside a single dispatcher node for the actual worker execution — use LangGraph's `Send` API to get per-node checkpointing.

---

## Conflict Analysis

### Conflict: Dependency Not Yet Complete (APIP-1030)
- **Severity**: warning
- **Description**: APIP-1030 has status "Needs Split" and is not yet implemented. APIP-1050 depends on the worktree and change-loop outputs from APIP-1030. The implementation of APIP-1050 cannot proceed until at least APIP-1030b (the change-loop half) is merged. KB finding `72ace356` confirms APIP-1030a/b split is being actioned.
- **Resolution Hint**: Gate APIP-1050 implementation start on APIP-1030b merge. Elaboration can proceed now.

### Conflict: APIP-0040 Model Router in Code Review (Not Merged)
- **Severity**: warning
- **Description**: APIP-0040 (Model Router) has status "Needs Code Review" and is not yet merged. The review graph uses the model router for LLM worker dispatch (OpenRouter for react/typescript/reusability/accessibility workers, Claude for security worker). The `IModelDispatch` interface from APIP-1030 context is also relevant here.
- **Resolution Hint**: APIP-1050 elaboration should define the model dispatch interface expected from APIP-0040 and APIP-1030. Implementation waits for APIP-0040 merge.

---

## Story Seed

### Title

Review Graph with Parallel Fan-Out Workers

### Description

The autonomous pipeline's implementation graph (APIP-1030) produces a completed worktree with code changes. Before those changes can proceed to QA (APIP-1060), they must pass a structured code review gate that covers static analysis, LLM-based quality checks, and security scanning.

This story builds the Review Graph — a LangGraph worker graph in `packages/backend/orchestrator/src/graphs/review.ts`. The graph receives a `storyId` and `worktreePath`, fans out to 10 review workers in parallel using the LangGraph Send API, collects all worker results via a fan-in aggregation node, determines a PASS/FAIL verdict, generates a ranked patch list for any failures, and writes a `REVIEW.yaml` artifact.

The 10 workers are organized into three cost tiers:
- **Free (Ollama/local)**: lint, style, syntax, typecheck, build — run static analysis tools directly against the worktree
- **Cheap (OpenRouter)**: react, typescript, reusability, accessibility — LLM-based review using cheap models
- **Expensive (Claude)**: security — SAST, dependency scanning, secret detection — wrapped in NodeCircuitBreaker for budget protection

The ReviewSchema artifact (`artifacts/review.ts`) is already implemented and must not be reimplemented. The 10 code review agent `.md` files in `.claude/agents/` define the behavioral contract for each worker. The fan-in aggregation follows the `review-aggregate-leader` agent contract.

On PASS, the graph emits a signal for the supervisor to advance the story to QA. On FAIL, the ranked patches are returned to the supervisor for re-dispatch to the implementation graph.

### Initial Acceptance Criteria

- [ ] AC-1: `packages/backend/orchestrator/src/graphs/review.ts` exports `createReviewGraph(config)` factory and a `ReviewGraphConfig` Zod schema.
- [ ] AC-2: `ReviewGraphStateAnnotation` is defined using `Annotation.Root` with an `appendArray` reducer on `workerResults` for fan-in collection. All state extension types use `z.object()` + `z.infer<>` — no TypeScript `interface` permitted.
- [ ] AC-3: A dispatcher node uses the LangGraph `Send` API to dispatch all 10 worker nodes in true parallel (not `Promise.all` inside a single node), enabling per-node checkpointing.
- [ ] AC-4: All 10 worker nodes are implemented: `lint`, `style`, `syntax`, `typecheck`, `build`, `react`, `typescript`, `reusability`, `accessibility`, `security`. Each is wrapped with `createToolNode` from `runner/node-factory.ts`.
- [ ] AC-5: Static analysis workers (`lint`, `style`, `syntax`, `typecheck`, `build`) invoke the real tools (ESLint, TypeScript compiler, Prettier) against the worktree path via an injectable `toolRunner` interface.
- [ ] AC-6: LLM review workers (`react`, `typescript`, `reusability`, `accessibility`) dispatch to OpenRouter via the model router from APIP-0040. Each worker receives the diff/changed files as input context.
- [ ] AC-7: Security worker (`security`) dispatches to Claude via the model router, wrapped in `NodeCircuitBreaker`. Budget gate from APIP-0040's hard-cap enforcement is respected.
- [ ] AC-8: Fan-in aggregation node collects all `workerResults`, calls `addWorkerResult` / `carryForwardWorker` from `artifacts/review.ts` to build the `Review` object, and calls `generateRankedPatches` to produce the ranked patch list.
- [ ] AC-9: Overall verdict is `PASS` if all workers pass; `FAIL` if any worker fails. Carried-forward (skipped) workers from previous iterations are merged in correctly.
- [ ] AC-10: A `REVIEW.yaml` artifact is written to the story's feature directory at `{featureDir}/in-progress/{storyId}/_implementation/REVIEW.yaml`. Artifact uses `ReviewSchema` from `artifacts/review.ts` — not a new schema.
- [ ] AC-11: Thread ID follows the convention `{storyId}:review:{attempt}` (matches PLAT-002 checkpoint schema requirement).
- [ ] AC-12: On PASS verdict, the graph outputs a signal (routing state update) that the supervisor uses to advance the story to QA (APIP-1060).
- [ ] AC-13: On FAIL verdict, the graph outputs the ranked patches list so the supervisor can return the story to implementation (APIP-1030).
- [ ] AC-14: The `changeSpecId` from the incoming story state is captured in the Review artifact (for downstream traceability in APIP-1060 and APIP-1070).
- [ ] AC-15: Worker nodes are independently testable via injected `toolRunner` — unit tests inject a mock runner; no real ESLint or Claude calls in unit tests.
- [ ] AC-16: Unit tests cover: graph compilation succeeds, dispatcher routing, fan-in aggregation with mock worker results, verdict determination (all-pass, one-fail, mixed), and REVIEW.yaml write. Minimum 45% coverage.
- [ ] AC-17: Integration test verifies the full graph flow end-to-end against a real worktree fixture with real static analysis tools (no Claude required for integration test — stub security worker).

### Non-Goals

- This story does NOT implement the model router (APIP-0040) — it consumes it.
- This story does NOT implement the implementation graph (APIP-1030) — it consumes its outputs.
- This story does NOT implement the QA graph (APIP-1060) or merge graph (APIP-1070).
- This story does NOT add new database tables or modify any schema in `packages/backend/database-schema/`.
- This story does NOT implement the carry-forward diff optimization (re-running only failed workers on re-review) — that is an enhancement for a future polish story.
- This story does NOT implement worker execution telemetry beyond `duration_ms` (deferred — see KB future opportunity `e7de9b6a`).
- This story does NOT change `ReviewSchema.findings` to a dynamic `z.record()` pattern (deferred — see KB future opportunity `6f959853`).
- Do NOT modify any protected features: `packages/backend/database-schema/`, knowledge base schemas, `@repo/db` client API.

### Reuse Plan

- **Artifact Schema**: `packages/backend/orchestrator/src/artifacts/review.ts` — import `ReviewSchema`, `createReview`, `addWorkerResult`, `carryForwardWorker`, `generateRankedPatches` directly.
- **Node Factory**: `packages/backend/orchestrator/src/runner/node-factory.ts` — use `createToolNode` for all 10 worker nodes.
- **Circuit Breaker**: `packages/backend/orchestrator/src/runner/circuit-breaker.ts` — use `NodeCircuitBreaker` for the security worker.
- **Graph Pattern**: `packages/backend/orchestrator/src/graphs/code-audit.ts` — follow `appendArray` reducer, `Annotation.Root`, `createLensParallelNode` / `Promise.all` pattern (adapt to `Send` API for true parallel).
- **Graph Config Pattern**: `packages/backend/orchestrator/src/graphs/elaboration.ts` — follow `ElaborationConfigSchema`, `createElaborationGraph` factory convention.
- **Worker Behavior Contracts**: `.claude/agents/code-review-*.agent.md` (10 files) — each worker node must satisfy the contract of its corresponding agent file.
- **State Helpers**: `packages/backend/orchestrator/src/runner/state-helpers.ts` — `createErrorUpdate`, `createBlockedUpdate`.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has `frontend_impacted: false` — ADR-006 E2E requirement does not apply. No Playwright tests required.
- Unit tests MUST use an injectable `toolRunner` to avoid real ESLint/Claude calls. Design the `toolRunner` interface early (AC-15).
- The integration test (AC-17) requires a real worktree fixture with known files. Plan for a fixture directory in `packages/backend/orchestrator/src/__fixtures__/review-worktree/`.
- Security worker testing: unit tests use a stubbed security worker; integration tests use a stubbed Claude call (cost control). Only UAT exercises the real Claude security worker.
- Test the carry-forward logic explicitly: previous PASS result from worker X should be preserved in the next review iteration's `REVIEW.yaml`.
- Minimum 45% coverage per project standard. Aim for 60%+ given the well-defined worker contracts.

### For UI/UX Advisor

- This story has no frontend or UI component. UI/UX review is not applicable.
- The one operator-visible artifact is `REVIEW.yaml` — its human-readable structure (ranked patches, per-worker verdicts) is relevant to APIP-5005 (Operator Visibility CLI) and APIP-2020 (Monitor UI). Ensure the REVIEW.yaml structure is legible in the CLI output already designed for APIP-5005.

### For Dev Feasibility

- **Split risk is HIGH (0.9 per KB entry `eca41030`)** — strongly consider splitting into:
  - APIP-1050a: Graph skeleton + state annotation + dispatcher + fan-in stub + ReviewSchema integration (ST-1, ~18K tokens)
  - APIP-1050b: Static analysis workers — lint, style, syntax, typecheck, build (ST-2, ~32K tokens)
  - APIP-1050c: LLM review workers — react, typescript, reusability, accessibility (ST-3, ~28K tokens)
  - APIP-1050d: Security worker + circuit breaker + budget gate (ST-4, ~14K tokens)
  - APIP-1050e: Full fan-in, changeSpecId mapping, RankedPatchSchema extension, integration tests (ST-5, ~22K tokens)
- **Token estimate**: KB entry `eca41030` predicts 750K tokens at low confidence. Historical 4-8x overrun on parallel-worker graph stories suggests 750K–1.5M realistic range. Budget accordingly.
- **Key design decision**: Use LangGraph `Send` API (not `Promise.all` inside a single node) for worker dispatch. This enables per-node checkpointing if a worker crashes mid-review. The `code-audit.ts` graph uses `Promise.all` — this story should improve on that pattern.
- **Dependency gate**: Implementation cannot start until APIP-1030b is merged (provides worktree path and changeSpecId in state) AND APIP-0040 is merged (provides model router for LLM workers). Elaboration can proceed independently.
- **Canonical references for subtask decomposition**:
  - Graph skeleton: `packages/backend/orchestrator/src/graphs/code-audit.ts` (parallel fan-out)
  - Graph config + factory: `packages/backend/orchestrator/src/graphs/elaboration.ts` (config schema pattern)
  - Worker wrapping: `packages/backend/orchestrator/src/runner/node-factory.ts` (createToolNode)
  - Artifact write: `packages/backend/orchestrator/src/artifacts/review.ts` (schema + helpers)
  - Security worker circuit breaker: `packages/backend/orchestrator/src/runner/circuit-breaker.ts`
- **SEC-003 deferred scope**: Per `DECISIONS.yaml`, APIP-1050 AC must explicitly cover the SAST/scanning gate (security worker). This is AC-7. The deferred NEW-009 story (Security Scanning Gate) will not be created if APIP-1050 covers this.
