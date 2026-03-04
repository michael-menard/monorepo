---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-9107

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates Phase 9 LangGraph work; no WINT-9105 or WINT-9107 entries exist in the February 13 snapshot. Phase 9 context derived from stories index and codebase scan.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `NodeCircuitBreaker` class | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | **Direct reuse** — full circuit breaker implementation (CLOSED/OPEN/HALF_OPEN states, configurable thresholds) already exists |
| `withNodeRetry` function | `packages/backend/orchestrator/src/runner/retry.ts` | **Direct reuse** — retry with exponential backoff, jitter, and `onRetryAttempt` callback already implemented |
| `createNode()` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | **Direct reuse** — already composes circuit breaker + retry + timeout + logging into a LangGraph-compatible node wrapper |
| `classifyError()` / `isRetryableNodeError()` | `packages/backend/orchestrator/src/runner/error-classification.ts` | **Direct reuse** — error classification by category (validation, programming, timeout, network, rate_limit) already exists |
| `NodeRetryConfig`, `CircuitBreakerConfig` Zod schemas | `packages/backend/orchestrator/src/runner/types.ts` | **Direct reuse** — type-safe config schemas with defaults and presets (llm, tool, validation) already defined |
| `NodeExecutionError`, `NodeTimeoutError`, `NodeRetryExhaustedError`, `NodeCircuitOpenError` | `packages/backend/orchestrator/src/runner/errors.ts` | **Direct reuse** — full error hierarchy already exists |
| `RETRY_PRESETS` (llm, tool, validation) | `packages/backend/orchestrator/src/runner/types.ts` | **Direct reuse** — preconfigured retry profiles per node type |
| `createLLMNode()`, `createToolNode()`, `createSimpleNode()` | `packages/backend/orchestrator/src/runner/node-factory.ts` | **Direct reuse** — convenience factories with preset configurations |
| Orchestrator YAML artifacts | `packages/backend/orchestrator/src/artifacts/` | Established pattern for Zod-validated YAML artifact persistence |
| `packages/backend/workflow-logic/` | `packages/backend/workflow-logic/src/` | **WINT-9010 output** — shared business logic package; this story's middleware must live here or alongside orchestrator runner |

### Active In-Progress Work

| Story | Status | Overlap |
|-------|--------|---------|
| WINT-9010: Create Shared Business Logic Package | in-qa | **Direct dependency** — WINT-9107 depends on WINT-9010. The `packages/backend/workflow-logic/` package exists and is the expected home for shared abstractions. |
| WINT-0250: Define Escalation Rules for Multi-Model Routing | in-qa | Contextual — escalation rules (local → API-Cheap → API-Mid) conceptually align with retry/circuit-breaker escalation. No file overlap. |

### Constraints to Respect

- `packages/backend/orchestrator/src/runner/` is **already complete** (all runner primitives implemented and tested). WINT-9107 must **not duplicate** this infrastructure — it must expose it as composable middleware.
- `packages/backend/workflow-logic/` is the WINT-9010 output package and the designated home for shared business logic consumable by both Claude Code MCP tools and LangGraph nodes.
- Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/` are protected; do not modify.
- `@repo/db` client package API surface is protected.
- All new code must use Zod-first types (no TypeScript interfaces).

---

## Retrieved Context

### Related Endpoints
None — this story produces middleware infrastructure, not HTTP endpoints.

### Related Components
None — no UI components involved.

### Reuse Candidates

| Candidate | Path | How to Reuse |
|-----------|------|--------------|
| `NodeCircuitBreaker` | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Import and re-export from middleware module; wrap in a per-node-type factory that attaches to GraphState nodes |
| `withNodeRetry` | `packages/backend/orchestrator/src/runner/retry.ts` | Import and compose in `withNodeLevelRetry` middleware wrapper |
| `createNode()` | `packages/backend/orchestrator/src/runner/node-factory.ts` | This is the primary middleware entry point — WINT-9107 may extend or document its usage pattern for node authors |
| `classifyError()` | `packages/backend/orchestrator/src/runner/error-classification.ts` | Import to enrich middleware error handling |
| `RETRY_PRESETS` | `packages/backend/orchestrator/src/runner/types.ts` | Use as preset configurations for different node classifications |
| `packages/backend/workflow-logic/` | `packages/backend/workflow-logic/src/` | If middleware exports shared types/adapters, they belong here (per WINT-9010 intent) |

### Similar Stories
- **WINT-9020** (completed): doc-sync LangGraph node — demonstrates pattern for creating a LangGraph-compatible node that integrates orchestrator infrastructure
- **WINT-9090** (completed): Context Cache LangGraph nodes — demonstrates node-per-responsibility pattern at `nodes/context/`
- **WINT-1011/1012** (uat): Compatibility shim — demonstrates Zod schema validation + diagnostics pattern for infrastructure wrappers

### Relevant Packages
- `packages/backend/orchestrator` — primary home; runner infrastructure is fully built
- `packages/backend/workflow-logic` — WINT-9010 shared package; middleware types or adapter exports may belong here
- `@repo/logger` — required for all logging (no `console.log`)

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Node factory (circuit breaker + retry composition) | `packages/backend/orchestrator/src/runner/node-factory.ts` | Canonical example of composing circuit breaker, retry, timeout, and logging into a single LangGraph-compatible node wrapper — this IS the middleware |
| Circuit breaker implementation | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Clean class-based circuit breaker with CLOSED/OPEN/HALF_OPEN states; direct reuse target |
| Retry with backoff and jitter | `packages/backend/orchestrator/src/runner/retry.ts` | Retry wrapper with exponential backoff, jitter, error classification integration, and callback hooks |
| Zod-first config + defaults | `packages/backend/orchestrator/src/runner/types.ts` | Shows how to define NodeConfig, RetryConfig, CircuitBreakerConfig as Zod schemas with inferred types and RETRY_PRESETS |

---

## Knowledge Context

### Lessons Learned
No KB lessons were loaded (KB search tools unavailable in this session). The following are derived from codebase inspection:

- **[WINT-9010]** The `packages/backend/workflow-logic/` package was created as the shared business logic layer. Middleware that must be used by both LangGraph nodes and Claude Code MCP tools should be exported from here, not buried in orchestrator internals.
  - *Applies because*: WINT-9107 middleware must be consumable in both execution paths.

- **[WINT-9020]** Node implementations live in `packages/backend/orchestrator/src/nodes/{domain}/` not in the runner layer. The runner provides the "how to execute" infrastructure; nodes provide the "what to do" logic.
  - *Applies because*: WINT-9107 must clarify whether it delivers middleware (runner layer) or node-level wrappers (node layer).

- **[general]** The `createNode()` factory already assembles the full middleware stack. If WINT-9107's goal is "implement middleware," the core implementation already exists — the work may be: (1) documenting the pattern, (2) creating per-node-type convenience wrappers, (3) ensuring the middleware is exported from workflow-logic, or (4) adding per-node circuit breaker state isolation guarantees.

### Blockers to Avoid (from past stories)
- **Scope duplication**: The runner infrastructure in `packages/backend/orchestrator/src/runner/` already implements circuit breaker and retry. Do NOT re-implement these primitives — wrap and expose them.
- **Barrel files**: Do not create `index.ts` re-exports. Import directly from source files.
- **Interface over Zod**: All config types must use Zod schemas with `z.infer<>`, not TypeScript interfaces.
- **console.log**: Use `@repo/logger` exclusively.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Middleware tests that exercise retry/circuit-breaker must use actual timing, not fake timers if in UAT scope. Unit tests may use mocks. |

ADR-001, ADR-002, ADR-003, ADR-004, ADR-006 are not directly applicable (no API endpoints, no infrastructure changes, no images, no auth, no E2E changes).

### Patterns to Follow
- Zod-first configuration types with `z.infer<>` (see `types.ts`)
- Class-based circuit breaker with private state (see `circuit-breaker.ts`)
- Async retry with jitter and callback hooks (see `retry.ts`)
- Factory function pattern: `createNode(config, implementation) => NodeFunction` (see `node-factory.ts`)
- Named exports only; no default exports
- Tests alongside source in `__tests__/` subdirectory

### Patterns to Avoid
- Do not duplicate `NodeCircuitBreaker`, `withNodeRetry`, `classifyError` — these exist and are tested
- Do not hardcode retry counts or timeouts — use `RETRY_PRESETS` or configurable defaults
- Do not add circuit breaker state to GraphState — per-node circuit breakers hold their own state in memory (as designed in `circuit-breaker.ts`)
- Do not modify the `@repo/db` package or production DB schemas

---

## Conflict Analysis

### Conflict: Scope ambiguity — middleware may already exist
- **Severity**: warning (non-blocking)
- **Description**: The runner infrastructure in `packages/backend/orchestrator/src/runner/` already fully implements node-level retry (`withNodeRetry`), circuit breaker (`NodeCircuitBreaker`), and their composition in `createNode()`. The story title "Implement Node-Level Retry & Circuit Breaker Middleware" may be pointing at already-built code. Dev feasibility must clarify whether the remaining work is: (a) integration/export from workflow-logic, (b) per-node-type preset wrappers not yet created, (c) documentation/usage patterns for node authors, or (d) gap between what exists and what WINT-9105 (error handling strategy) specifies.
- **Resolution Hint**: Elaboration should diff WINT-9105 strategy requirements against the existing runner implementation. Any gaps become the true scope. If no gaps, the story is about surfacing the middleware as a documented, tested, and exported API for node authors.

---

## Story Seed

### Title
Implement Node-Level Retry & Circuit Breaker Middleware for LangGraph Nodes

### Description

**Context**: The WINT workflow is being ported to LangGraph (Phase 9). Individual LangGraph nodes need resilient execution — they must retry on transient failures and stop executing when a downstream service is consistently failing (circuit breaker). WINT-9105 defines the error handling and retry strategy that governs how nodes should behave under failure conditions.

**Existing Reality**: The orchestrator package already contains a complete runner infrastructure in `packages/backend/orchestrator/src/runner/` that implements:
- `NodeCircuitBreaker` class with CLOSED/OPEN/HALF_OPEN state machine
- `withNodeRetry()` with exponential backoff, jitter, and error classification
- `createNode()` factory that composes circuit breaker + retry + timeout + logging
- `RETRY_PRESETS` (llm, tool, validation) for common node configurations
- Full error hierarchy: `NodeRetryExhaustedError`, `NodeCircuitOpenError`, `NodeTimeoutError`

**Problem**: It's unclear whether this existing runner infrastructure satisfies the requirements defined in WINT-9105, and whether it is properly accessible to node authors building new LangGraph nodes. The middleware may exist but not be discoverable or correctly composed for the expected patterns.

**Proposed Solution Direction**:
1. Review WINT-9105 error handling strategy requirements against the existing runner implementation
2. Identify and close any gaps (missing presets, missing per-node-type isolation, missing export from workflow-logic)
3. Ensure node authors have a clear, tested entry point via `createNode()` or a new convenience wrapper
4. Verify that per-node circuit breakers are isolated (separate `NodeCircuitBreaker` instance per node, not shared state)
5. Deliver a documented, tested middleware API that WINT-9110 (Full Workflow LangGraph Graphs) can rely on

### Initial Acceptance Criteria

- [ ] AC-1: Review WINT-9105 requirements against existing runner implementation (`circuit-breaker.ts`, `retry.ts`, `node-factory.ts`) and produce a gap analysis document or confirm full coverage
- [ ] AC-2: Each LangGraph node configured with `createNode()` (or equivalent) uses an isolated `NodeCircuitBreaker` instance — no shared circuit state between distinct node registrations
- [ ] AC-3: `RETRY_PRESETS.llm`, `RETRY_PRESETS.tool`, and `RETRY_PRESETS.validation` are applied by default when a node type is identified; no hardcoded retry values in individual node implementations
- [ ] AC-4: `classifyError()` is the sole source of truth for retry/no-retry decisions — all retry decisions in the middleware chain flow through this function
- [ ] AC-5: Node-level retry exhaustion (`NodeRetryExhaustedError`) routes the graph node to `blocked` routing flag in `GraphState`, not to an unhandled exception
- [ ] AC-6: Circuit breaker `OPEN` state prevents node execution and returns a `blocked` state update with `CIRCUIT_OPEN` code (per existing `createNode()` implementation — verify this is exercised by integration tests)
- [ ] AC-7: Middleware is accessible to node authors via a documented import path — either from `packages/backend/orchestrator/src/runner/node-factory.ts` or re-exported from `packages/backend/workflow-logic/`
- [ ] AC-8: Unit test coverage for middleware composition (retry + circuit breaker + error classification) is ≥ 80% on new/changed code
- [ ] AC-9: All existing runner tests continue to pass without modification (no regressions)
- [ ] AC-10: TypeScript compilation passes with zero errors on all new/changed files
- [ ] AC-11: Zero ESLint errors on all new/changed files (warnings addressed per CLAUDE.md)

### Non-Goals
- Do not re-implement `NodeCircuitBreaker`, `withNodeRetry`, or `classifyError` — reuse existing implementations
- Do not add circuit breaker state to `GraphState` — per-node instances hold state in memory
- Do not modify production DB schemas or the `@repo/db` package API surface
- Do not modify the orchestrator YAML artifact schemas
- Do not implement the full workflow graphs (that is WINT-9110)
- Do not implement the shared business logic package (that is WINT-9010, currently in-qa)
- Do not create barrel files

### Reuse Plan
- **Components**: `NodeCircuitBreaker`, `withNodeRetry`, `createNode()`, `classifyError()`, `RETRY_PRESETS`, all error classes
- **Patterns**: Factory function composition pattern from `node-factory.ts`; Zod-first config schemas from `types.ts`; `__tests__/` alongside source
- **Packages**: `packages/backend/orchestrator` (primary); `packages/backend/workflow-logic` (if exporting shared types); `@repo/logger` for all logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- The existing `__tests__/` directory under `packages/backend/orchestrator/src/runner/` has comprehensive tests for `circuit-breaker.test.ts`, `retry.test.ts`, `node-factory.test.ts`, `error-classification.test.ts`, and `integration.test.ts`. Any new tests for WINT-9107 should be additive — use these as reference for test patterns.
- AC-6 (circuit OPEN → blocked state) must be tested with an integration test that actually drives a node to exhaustion, not just a unit test of `canExecute()`.
- ADR-005: UAT integration tests must use real services (no mocks for timing-sensitive circuit breaker tests in UAT). Unit tests may use `vi.useFakeTimers()` for determinism.
- Test the `HALF_OPEN` recovery path explicitly — it is a subtle state that is easy to miss.

### For UI/UX Advisor
Not applicable — this is a backend infrastructure story with no user-facing components.

### For Dev Feasibility
- **Primary task**: Diff WINT-9105 requirements against `packages/backend/orchestrator/src/runner/` to find true gaps. The implementation may be 80% done. If WINT-9105 is unavailable (pending), request its strategy document before elaborating.
- **File scope estimate**: If no gaps, scope is documentation + export surface + integration test coverage. If gaps exist (e.g., WINT-9105 specifies cross-node circuit breakers, graph-level circuit breakers, or per-node-type config not in RETRY_PRESETS), scope expands.
- **Canonical references for subtask decomposition**:
  - `packages/backend/orchestrator/src/runner/node-factory.ts` — understand how `createNode()` assembles the middleware stack before making any changes
  - `packages/backend/orchestrator/src/runner/types.ts` — Zod-first config and `RETRY_PRESETS` — the extension point for new presets
  - `packages/backend/orchestrator/src/runner/__tests__/integration.test.ts` — integration test patterns for end-to-end middleware testing
- **WINT-9010 dependency**: `packages/backend/workflow-logic/` is currently in-qa (WINT-9010). If middleware re-exports are needed from that package, coordinate with WINT-9010 QA outcome before proceeding with that part of scope.
- **Risk**: If WINT-9105 requires graph-level (cross-node) circuit breakers rather than per-node isolation, the design in `circuit-breaker.ts` needs extension. This would be the largest scope item. Per the current design, circuit breakers are per-node (one `NodeCircuitBreaker` instance per `createNode()` call). Clarify with WINT-9105 whether this is sufficient.
