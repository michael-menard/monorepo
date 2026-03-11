---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9105

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 9 LangGraph work — no specific LangGraph error strategy documented; runner infrastructure built after baseline date

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Node runner infrastructure (retry, circuit breaker, timeout, error classification) | `packages/backend/orchestrator/src/runner/` | Directly applicable — existing retry and circuit breaker patterns to extend or align with |
| Workflow error schemas (WorkflowErrorTypeSchema, CircuitBreakerConfigSchema, ErrorRetryConfig) | `packages/backend/orchestrator/src/errors/workflow-errors.ts` | Canonical error type definitions the ADR must supersede or consolidate |
| RETRY_PRESETS per node category (llm, tool, validation) | `packages/backend/orchestrator/src/runner/types.ts` | Existing category-based retry config — ADR must align or extend this |
| NodeCircuitBreaker class (CLOSED/OPEN/HALF_OPEN state machine) | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Existing per-node circuit breaker — ADR must decide whether to keep node-local or move to shared DB state |
| Error classification (ZodError, TypeError, NodeTimeoutError, network, rate-limit) | `packages/backend/orchestrator/src/runner/error-classification.ts` | Retryability classification logic the ADR must extend to cover LangGraph-specific error categories |
| LangGraph orchestrator package | `packages/backend/orchestrator/` | All new ADR constraints apply here |
| doc-sync LangGraph node (WINT-9020) | `packages/backend/orchestrator/src/nodes/` | First completed node — demonstrates existing node structure without error middleware |
| Context cache LangGraph nodes (WINT-9090) | `packages/backend/orchestrator/src/nodes/` | Completed — currently has no standardized error handling |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| WINT-9010 — Create Shared Business Logic Package | in-qa | Direct dependency — WINT-9105 depends on this. ADR may reference `@repo/workflow-logic` for shared error utilities |
| WINT-0220 — Model-per-Task Strategy | active/active | Defines retry escalation model: 3-provider escalation chain (ollama → openrouter → anthropic). ADR must integrate with model-tier cost caps |
| WINT-9106 — Implement LangGraph Checkpointer & State Recovery | pending, depends on WINT-9105 | ADR must define rollback/compensating transaction semantics that WINT-9106's checkpointer will implement |
| WINT-9107 — Implement Node-Level Retry & Circuit Breaker Middleware | pending, depends on WINT-9105 | ADR is the specification document that WINT-9107 implements — must be concrete enough to drive WINT-9107 ACs directly |

### Constraints to Respect

- Zod-first types required — all error schemas in ADR must use `z.object()`/`z.enum()`, not TypeScript interfaces
- No barrel files — import directly from source
- `@repo/logger` for all logging, never `console`
- Protected: existing Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/`
- Protected: `@repo/db` client package API surface
- Protected: production DB schemas in `packages/backend/database-schema/`
- ADR output goes to `packages/backend/orchestrator/docs/architecture/adr-langgraph-error-handling.md` (no source code in this story — docs only)

---

## Retrieved Context

### Related Endpoints

Not applicable — WINT-9105 is an architecture/documentation story. No API endpoints touched.

### Related Components

| Component | Path | Notes |
|-----------|------|-------|
| NodeCircuitBreaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Existing per-node circuit breaker — ADR decision: keep per-node or move to DB-shared state |
| withNodeRetry | `packages/backend/orchestrator/src/runner/retry.ts` | Existing retry wrapper with jitter and callback support |
| classifyError / isRetryableNodeError | `packages/backend/orchestrator/src/runner/error-classification.ts` | Error classification table to extend for LangGraph categories |
| RETRY_PRESETS (llm/tool/validation) | `packages/backend/orchestrator/src/runner/types.ts` | Existing preset registry — ADR must add git and file I/O categories |
| workflow-errors.ts (WorkflowErrorTypeSchema, ERROR_RETRY_DEFAULTS) | `packages/backend/orchestrator/src/errors/workflow-errors.ts` | Existing workflow-level error types — ADR consolidation decision needed |
| NodeRetryExhaustedError / NodeCircuitOpenError | `packages/backend/orchestrator/src/runner/errors.ts` | Base error classes available for use in ADR patterns |

### Reuse Candidates

- `packages/backend/orchestrator/src/runner/` — entire runner module provides the foundation; ADR extends rather than replaces these patterns
- `packages/backend/orchestrator/src/errors/workflow-errors.ts` — existing WorkflowErrorType enum covers AGENT_TIMEOUT, MALFORMED_OUTPUT, EXTERNAL_SERVICE_DOWN; ADR should consolidate or supersede
- `RETRY_PRESETS` in `types.ts` — LLM and tool presets already defined; ADR adds git and DB write categories
- Model-tier strategy from WINT-0220 — 3-provider escalation (ollama → openrouter → anthropic) drives retry cost-cap constraints

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Retry with exponential backoff + jitter | `packages/backend/orchestrator/src/runner/retry.ts` | Canonical retry wrapper with `calculateRetryDelay`, jitter, and `NodeRetryExhaustedError` — ADR must align its retry contracts with this implementation |
| Circuit breaker state machine | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | CLOSED/OPEN/HALF_OPEN state machine with configurable failure threshold and recovery timeout — ADR must decide whether to keep this per-node or extend to shared DB state |
| Error classification (retryable vs terminal) | `packages/backend/orchestrator/src/runner/error-classification.ts` | Existing `classifyError()` with ZodError, TypeError, network, rate-limit categories — ADR extends this table to cover LangGraph node types |
| Workflow error Zod schemas | `packages/backend/orchestrator/src/errors/workflow-errors.ts` | WorkflowErrorTypeSchema, ERROR_RETRY_DEFAULTS, circuit breaker config — the pre-existing error contract this ADR consolidates and supersedes |

---

## Knowledge Context

### Lessons Learned

- **[APIP-3030]** LangGraph node handler `index.ts` files are not unit-testable in isolation — `createToolNode` factory requires full graph runtime context. (*Testing*)
  - *Applies because*: The ADR must account for this when defining test strategy for error handling middleware — unit tests must target individual functions (retry logic, classification) rather than node handlers directly.

- **[APIP-1050]** No retry logic for flaky static analysis workers — `createToolNode` already has retry config; just needs per-worker tuning. (*Performance/Reliability*)
  - *Applies because*: Confirms that RETRY_PRESETS pattern in `types.ts` is the right mechanism; ADR should formalize per-category configuration in this registry.

- **[AUDT-0010]** Graph compilation tests can validate LangGraph routing without running the full pipeline — test routing functions directly with mock state objects. (*Testing*)
  - *Applies because*: ADR should note that error routing conditionals in graphs can be tested via compiled graph routing tests, separate from middleware unit tests.

- **[General — WINT-0220]** LLM retry must be budget-aware. Unlimited retries on Tier 0/1 (Claude Opus/Sonnet) burn tokens at $15–$75/1M. Cost cap on LLM retries is non-negotiable.
  - *Applies because*: ADR's budget-aware retry caps section must reference the 4-tier model cost table from WINT-0220.

### Blockers to Avoid (from past stories)

- Defining retry policies without circuit breaker integration — if retries succeed in isolation but the circuit breaker fires on the fourth attempt, behavior is inconsistent. ADR must define combined retry + circuit breaker sequencing.
- Treating node-local circuit breaker state as sufficient for LangGraph — concurrent graph executions share an LLM provider; one graph's failures should protect all graphs. WINT-9107 AC-004 requires DB-shared circuit breaker state — ADR must call this out explicitly.
- Leaving idempotency undefined — KB writes, git commits, and file writes in LangGraph nodes will be retried; without idempotency contracts each retry could create duplicates.
- Over-scoping to implementation — WINT-9105 is an ADR (documentation + schema definitions), not middleware code. The implementation belongs to WINT-9107. Avoid merging scopes.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Unit tests: mocks allowed. Integration tests for error handling middleware: may use partial mocks. UAT: real services only. |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable — WINT-9105 is docs-only with no UI-facing ACs. E2E skip condition applies: `frontend_impacted: false`. |

### Patterns to Follow

- Zod-first types for all error schemas, retry configs, and circuit breaker configs
- Extend `RETRY_PRESETS` registry in `packages/backend/orchestrator/src/runner/types.ts` to add `git`, `db_write`, and `file_io` categories (via WINT-9107)
- `NodeExecutionContext` with `traceId` and `graphExecutionId` must be preserved in DLQ error entries for debugging
- ADR document style should follow existing `WINT-0220-STRATEGY.md` pattern — include a decision table, constraints, and migration path

### Patterns to Avoid

- TypeScript interfaces for error types — use `z.infer<typeof SchemaName>` throughout
- Per-story ad-hoc try/catch blocks — the ADR explicitly establishes that all error handling goes through shared middleware (to be built in WINT-9107)
- Node-local-only circuit breaker state for LLM provider calls — must be shared across graph executions via DB (defined in ADR, implemented in WINT-9107)
- Retry without cost caps on LLM nodes — unlimited retries on Anthropic APIs are prohibited per WINT-0220

---

## Conflict Analysis

### Conflict: Pattern Consolidation Gap
- **Severity**: warning
- **Description**: Two overlapping error handling systems currently exist in the codebase. `packages/backend/orchestrator/src/runner/` implements `NodeCircuitBreaker`, `withNodeRetry`, and `classifyError`. Separately, `packages/backend/orchestrator/src/errors/workflow-errors.ts` implements `WorkflowErrorTypeSchema`, `ERROR_RETRY_DEFAULTS`, and `DEFAULT_CIRCUIT_BREAKER_CONFIG`. The two systems define similar concepts with different APIs and different threshold defaults (runner circuit breaker: failureThreshold=5; workflow-errors: failureThreshold=3). The ADR must explicitly decide whether to consolidate these into one canonical module or declare which layer owns which concern.
- **Resolution Hint**: Recommended decision — declare `runner/` as the node-execution layer (per-invocation) and `errors/workflow-errors.ts` as the workflow-lifecycle layer (per-story/phase). ADR should document this split and which layer LangGraph middleware in WINT-9107 builds on.

---

## Story Seed

### Title

Define LangGraph Error Handling & Retry Strategy

### Description

**Context:** The LangGraph parity phase (Phase 9) is assembling a set of production-grade workflow graphs that will mirror and eventually replace the current Claude Code agent-based orchestration. Before any graph assembly story (WINT-9060, WINT-9110) begins, the error handling, retry, and fault-tolerance contracts must be defined in a single authoritative document.

The codebase already contains two partially overlapping error handling foundations: a node runner module (`packages/backend/orchestrator/src/runner/`) with circuit breaker, retry, and error classification; and a workflow error schema module (`packages/backend/orchestrator/src/errors/workflow-errors.ts`) with per-type retry defaults and circuit breaker config. Neither was designed as the comprehensive LangGraph error strategy — they are building blocks that this story must synthesize into a binding ADR.

**Problem:** Without a unified error handling strategy, downstream implementation stories (WINT-9106 checkpointer, WINT-9107 middleware) will make independent decisions about retry thresholds, circuit breaker state ownership, idempotency contracts, and partial-success semantics. This creates drift risk and inconsistent resilience across graphs.

**Proposed Solution:** Produce a binding Architecture Decision Record (ADR) committed to `packages/backend/orchestrator/docs/architecture/adr-langgraph-error-handling.md` that defines: node-level retry policies per operation category, graph-level error propagation rules, circuit breaker thresholds (including the decision on node-local vs DB-shared state), dead-letter queue strategy, idempotency contracts, timeout mapping from `max_turns` to LangGraph timeouts, partial-success semantics for batch graphs, and a parity mapping of existing Claude Code retry policies to their LangGraph equivalents.

This ADR is a prerequisite for WINT-9106 (checkpointer), WINT-9107 (middleware implementation), and WINT-9110 (full workflow graphs).

### Initial Acceptance Criteria

- [ ] AC-001: ADR defines node-level retry policy with configurable exponential backoff (base delay, max delay, max attempts, jitter) per operation category: LLM call, file I/O, DB write, git operation. Values must align with or supersede existing `RETRY_PRESETS` in `runner/types.ts`.
- [ ] AC-002: ADR defines graph-level error propagation rules — which node failures are retryable vs terminal, and how errors bubble to the parent graph. Must distinguish between saga-style (compensate and continue) vs fail-fast semantics per graph type.
- [ ] AC-003: ADR defines circuit breaker pattern for LLM provider calls — open/half-open/closed states, failure thresholds, cooldown periods. Must explicitly decide: node-local state (current `NodeCircuitBreaker`) vs DB-shared state (`workflow.circuitBreakerState` table). If DB-shared, this constraint propagates to WINT-9107 AC-004.
- [ ] AC-004: ADR defines dead-letter queue (DLQ) strategy for batch workflows — failed stories written to `graph.deadLetterQueue` table with error context, retry eligibility, and manual review path.
- [ ] AC-005: ADR defines idempotency contracts for side-effecting nodes (KB writes, git commits, file writes, index updates) — each category must specify whether it is naturally idempotent, requires an idempotency key, or requires compensating transactions.
- [ ] AC-006: ADR defines timeout strategy mapping from current `max_turns` limits in agent `.md` files to LangGraph node/graph-level `timeoutMs` values. Must cover: LLM node timeout, tool node timeout, graph-level deadline.
- [ ] AC-007: ADR defines partial-success semantics for batch graphs — how N-of-M failures are reported, whether successful items commit independently, and what the minimum success threshold is for a batch to be considered passing.
- [ ] AC-008: ADR maps each existing Claude Code retry policy to its LangGraph equivalent: `dev-implement` (1 retry for type errors → node retry with error context forwarding), `elab-story` (1 retry for parse/write errors → node retry with backoff), `elab-epic` (1 retry per worker timeout, save & resume via CHECKPOINT.yaml → checkpointer + node retry), `phase-contracts` (on_failure: block transition → graph-level conditional edges).
- [ ] AC-009: ADR includes a budget-aware retry cap section: maximum retry spend per node invocation for each model tier (Tier 0 Claude Opus, Tier 1 Claude Sonnet, Tier 2/3 Ollama/OpenRouter). References WINT-0220 model-tier cost table.
- [ ] AC-010: ADR consolidates or explicitly partitions the two existing error-handling layers (`runner/` vs `errors/workflow-errors.ts`) — declares which layer owns which concern going forward.
- [ ] AC-011: ADR reviewed and approved — committed to `packages/backend/orchestrator/docs/architecture/adr-langgraph-error-handling.md` with a signed-off status header.

### Non-Goals

- Do NOT implement any retry or circuit breaker middleware code — that belongs to WINT-9107
- Do NOT implement the PostgreSQL checkpointer — that belongs to WINT-9106
- Do NOT create any `graph.deadLetterQueue` DB table — that is part of WINT-9107 infrastructure
- Do NOT create `workflow.circuitBreakerState` or `workflow.idempotencyKeys` DB tables — WINT-9107 scope
- Do NOT modify existing `runner/` source files — observe and document only in this story
- Do NOT modify `errors/workflow-errors.ts` — the ADR documents the consolidation decision; WINT-9107 executes it
- Do NOT port any agent to LangGraph nodes — WINT-9020 through WINT-9050 scope
- Do NOT add any frontend or API Gateway components

### Reuse Plan

- **Components**: `runner/circuit-breaker.ts`, `runner/retry.ts`, `runner/error-classification.ts`, `runner/types.ts` — read as reference for existing defaults; ADR aligns or supersedes
- **Patterns**: WINT-0220 model-tier cost structure for budget-aware retry caps; existing `RETRY_PRESETS` registry pattern for category-based configuration
- **Packages**: `@repo/workflow-logic` (WINT-9010) — ADR may reference this package as the home for shared error utility functions; `@repo/logger` for any logging guidance in the ADR code examples

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a documentation-only story — the primary deliverable is a Markdown ADR file. Test plan should focus on:
- Verifying the ADR file exists at the correct path (`packages/backend/orchestrator/docs/architecture/adr-langgraph-error-handling.md`)
- Verifying all 11 ACs are addressable from the ADR content (review checklist)
- Verifying no source code changes are made (scope integrity check)
- No unit tests required in this story — unit tests belong to WINT-9106 and WINT-9107
- Note: ADR-005 applies; if any code-level verification scripts are written, they must use real services

### For UI/UX Advisor

Not applicable — WINT-9105 is a pure backend architecture story with no frontend components, API endpoints, or user-facing surfaces.

### For Dev Feasibility

This story produces a single ADR Markdown document. Implementation complexity is low — the work is intellectual synthesis, not code authoring.

Key feasibility considerations:
1. **Consolidation decision (AC-010)** is the highest-stakes AC. Incorrectly partitioning `runner/` vs `errors/workflow-errors.ts` will cause naming collisions when WINT-9107 implements the middleware. Recommended approach: declare `runner/` as the execution-layer primitive and `errors/workflow-errors.ts` as the workflow-lifecycle descriptor — both are valid at their respective layers.
2. **Circuit breaker state decision (AC-003)** gates WINT-9107 AC-004 (DB-shared state). If the ADR decides node-local state is sufficient, WINT-9107 becomes simpler. If ADR mandates DB-shared state, WINT-9107 needs a DB migration (new `workflow.circuitBreakerState` table). This decision should be made with WINT-9107 feasibility in mind.
3. **Budget-aware retry caps (AC-009)** require reading `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` and the `model-assignments.yaml`. Estimated LLM costs per tier are already documented there.

Canonical references for implementation subtasks:
- `packages/backend/orchestrator/src/runner/types.ts` — existing RETRY_PRESETS and NodeRetryConfig schema to extend
- `packages/backend/orchestrator/src/runner/circuit-breaker.ts` — existing circuit breaker defaults (failureThreshold=5, recoveryTimeoutMs=60000)
- `packages/backend/orchestrator/src/errors/workflow-errors.ts` — existing circuit breaker config (failureThreshold=3, failureWindowMs=300000) — note the discrepancy with `runner/` defaults; ADR must resolve
- `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` — model tier cost table for budget cap calculations
