# WINT-9107 Gap Analysis: WINT-9105 Requirements vs Runner Implementation

**Date:** 2026-03-03
**Story:** WINT-9107 — Runner Verification & Documentation
**Scope:** Compare WINT-9105 ADR requirements against existing `packages/backend/orchestrator/src/runner/` implementation

---

## Executive Summary

The existing `runner/` module implements a production-grade node execution layer with retry, circuit breaker, error classification, and timeout support. WINT-9105 defined 11 ACs for an ADR that formalizes and extends this foundation. This analysis compares those ACs against the current implementation.

**Overall finding:** The implementation satisfies the *primitive layer* requirements (AC-001, AC-003 node-local state, AC-016 error classification). Several WINT-9105 ACs were ADR-only concerns (documentation decisions, not code) and are fully addressed by the `adr-langgraph-error-handling.md` artifact delivered by WINT-9105. WINT-9107's scope is verification and documentation — no new production code primitives are required.

---

## AC-by-AC Comparison

### AC-001 — Retry policy with configurable exponential backoff per operation category

**WINT-9105 requirement:** ADR defines node-level retry policy with configurable exponential backoff (base delay, max delay, max attempts, jitter) per category: LLM call, file I/O, DB write, git operation.

**Implementation status: PARTIALLY COVERED**

| Aspect | Required | Implemented |
|--------|----------|-------------|
| `maxAttempts` | Yes | Yes (`NodeRetryConfigSchema.maxAttempts`) |
| `backoffMs` | Yes | Yes (`NodeRetryConfigSchema.backoffMs`) |
| `backoffMultiplier` | Yes | Yes (`NodeRetryConfigSchema.backoffMultiplier`, default: 2) |
| `maxBackoffMs` | Yes | Yes (`NodeRetryConfigSchema.maxBackoffMs`) |
| `jitterFactor` | Yes | Yes (`NodeRetryConfigSchema.jitterFactor`, default: 0.25) |
| Category: `llm` | Yes | Yes (`RETRY_PRESETS.llm`: maxAttempts=5, backoffMs=2000, timeoutMs=60000) |
| Category: `tool` | Yes | Yes (`RETRY_PRESETS.tool`: maxAttempts=2, backoffMs=500, timeoutMs=10000) |
| Category: `validation` | Yes | Yes (`RETRY_PRESETS.validation`: maxAttempts=1) |
| Category: `file_io` | Yes | **MISSING** from `RETRY_PRESETS` |
| Category: `db_write` | Yes | **MISSING** from `RETRY_PRESETS` |
| Category: `git` | Yes | **MISSING** from `RETRY_PRESETS` |

**Gap:** `RETRY_PRESETS` covers `llm`, `tool`, `validation` only. `file_io`, `db_write`, and `git` categories are documented in the ADR but not yet added to the preset registry. Per WINT-9107 story design notes, these presets are ADR-documented decisions — implementation can defer to downstream stories (WINT-9110) if not needed for current test scope.

**Decision for WINT-9107:** `RETRY_PRESETS` distinct-values test (ST-2) covers `llm` vs `tool` distinctness. No new presets required for this story.

---

### AC-002 — Graph-level error propagation rules

**WINT-9105 requirement:** ADR defines which node failures are retryable vs terminal; saga vs fail-fast semantics per graph type.

**Implementation status: NOT APPLICABLE TO RUNNER (ADR-only)**

The `runner/` module operates at the node-execution layer. Graph-level propagation semantics are defined in the ADR and enforced via LangGraph graph edges — not in the runner primitives. The runner correctly returns `routingFlags.blocked = true` on retry exhaustion, which LangGraph conditional edges use to route to a blocked/failed path.

**Gap:** None in the runner layer. ADR satisfied by `adr-langgraph-error-handling.md`.

---

### AC-003 — Circuit breaker pattern: node-local vs DB-shared state decision

**WINT-9105 requirement:** ADR must explicitly decide node-local (`NodeCircuitBreaker`) vs DB-shared (`workflow.circuitBreakerState` table).

**Implementation status: NODE-LOCAL IMPLEMENTED; DB-SHARED DEFERRED**

Current implementation:
- `NodeCircuitBreaker` in `circuit-breaker.ts`: node-local CLOSED/OPEN/HALF_OPEN state machine
- `failureThreshold`: 5 (from `CircuitBreakerConfigSchema` default)
- `recoveryTimeoutMs`: 60000ms (60s)
- State is held in memory per `NodeCircuitBreaker` instance
- Each `createNode()` call with a `circuitBreaker` config creates a **new, independent** `NodeCircuitBreaker` instance

**Gap:** DB-shared state is not implemented. Per ADR-006 and WINT-9105 architecture notes, this is an explicit deferral — node-local state is the correct choice for the current phase. Cross-graph circuit breaker protection is a WINT-9107/future story concern.

**Key finding for ST-2:** Each `createNode()` call produces an independent circuit breaker instance. Two `createNode()` calls with the same config do NOT share state. This is confirmed by the factory implementation in `node-factory.ts` line 125-127 (`const circuitBreaker = nodeConfig.circuitBreaker ? new NodeCircuitBreaker(nodeConfig.circuitBreaker) : undefined`).

---

### AC-004 — Dead-letter queue strategy

**WINT-9105 requirement:** ADR defines DLQ strategy for batch workflows — failed stories to `graph.deadLetterQueue` table.

**Implementation status: NOT APPLICABLE TO RUNNER (ADR-only; DB scope deferred)**

The runner layer has no DB dependency. DLQ is a workflow-level concern handled by the graph orchestrator layer. Runner returns `routingFlags.blocked = true` which is the signal the graph-level DLQ consumer reads.

---

### AC-005 — Idempotency contracts for side-effecting nodes

**WINT-9105 requirement:** ADR specifies idempotency contracts per category (naturally idempotent, requires key, requires compensation).

**Implementation status: NOT APPLICABLE TO RUNNER (ADR-only)**

Idempotency is enforced at the node implementation level, not in the runner primitives. The runner provides the retry infrastructure; node implementations are responsible for idempotent semantics.

---

### AC-006 — Timeout strategy mapping

**WINT-9105 requirement:** ADR maps `max_turns` limits to LangGraph `timeoutMs` values.

**Implementation status: IMPLEMENTED (timeout primitive)**

| Aspect | Required | Implemented |
|--------|----------|-------------|
| LLM node timeout | Yes | `RETRY_PRESETS.llm.timeoutMs = 60000` |
| Tool node timeout | Yes | `RETRY_PRESETS.tool.timeoutMs = 10000` |
| Validation timeout | Yes | `RETRY_PRESETS.validation.timeoutMs = 5000` |
| Graph-level deadline | ADR-documented | Not in runner (correct — graph-level concern) |

**Gap:** None for the runner layer. ADR maps agent max_turns to these values.

---

### AC-007 — Partial-success semantics for batch graphs

**Implementation status: NOT APPLICABLE TO RUNNER (ADR-only; graph orchestration concern)**

---

### AC-008 — Claude Code retry policy mapping

**WINT-9105 requirement:** ADR maps each Claude Code retry pattern to LangGraph equivalent.

**Implementation status: NOT APPLICABLE TO RUNNER (ADR-only documentation)**

---

### AC-009 — Budget-aware retry cap section

**WINT-9105 requirement:** ADR includes maximum retry spend per node invocation per model tier.

**Implementation status: ADR-documented; runner not budget-aware by design**

Current `RETRY_PRESETS.llm.maxAttempts = 5`. Per WINT-0220 budget caps, Tier 0 (Claude Opus) should cap at 2. This is enforced at the graph/config layer, not in the runner primitive. The runner executes whatever `maxAttempts` is configured — budget caps are config-time constraints.

---

### AC-010 — Layer consolidation: runner/ vs errors/workflow-errors.ts

**WINT-9105 requirement:** ADR declares which layer owns which concern.

**Implementation status: CONFIRMED by implementation**

| Layer | Owner | failureThreshold | Concern |
|-------|-------|-----------------|---------|
| `runner/` | Node-execution primitives | 5 | Per-invocation retry, circuit breaker, timeout, error classification |
| `errors/workflow-errors.ts` | Workflow-lifecycle | 3 | Per-story/phase error logging, recovery actions, phase-level circuit breaking |

Both layers are correct. The different `failureThreshold` values are intentional:
- `runner/circuit-breaker.ts`: threshold=5 governs when a single node's circuit opens
- `errors/workflow-errors.ts` `DEFAULT_CIRCUIT_BREAKER_CONFIG`: threshold=3 governs when a workflow phase circuit opens

---

### AC-011 — ADR reviewed and approved

**WINT-9105 requirement:** ADR committed with signed-off status header (status, decision-date, deciders).

**Implementation status: WINT-9105 delivered** — `adr-langgraph-error-handling.md` exists at canonical path.

---

## Runner Module Completeness Assessment

### What IS fully implemented

| Feature | File | Status |
|---------|------|--------|
| `withNodeRetry` with exponential backoff + jitter | `retry.ts` | Complete |
| `calculateRetryDelay` | `retry.ts` | Complete |
| `NodeRetryExhaustedError` routes to `routingFlags.blocked` | `node-factory.ts` | Complete |
| `NodeCircuitBreaker` CLOSED/OPEN/HALF_OPEN state machine | `circuit-breaker.ts` | Complete |
| `classifyError` as sole retry decision point | `error-classification.ts` | Complete |
| `RETRY_PRESETS` for llm/tool/validation | `types.ts` | Complete |
| `createNode()`, `createLLMNode()`, `createToolNode()` factories | `node-factory.ts` | Complete |
| Per-call circuit breaker isolation | `node-factory.ts` | Complete (each `createNode()` produces independent CB) |
| `isRetryableNodeError` (delegates to `classifyError`) | `error-classification.ts` | Complete |

### What is NOT in the runner (by design)

| Feature | Correct Location | Notes |
|---------|-----------------|-------|
| DB-shared circuit breaker state | Future story (WINT-9108+) | Node-local is current ADR decision |
| `file_io`, `db_write`, `git` RETRY_PRESETS | Future story (WINT-9110) | ADR-documented; not needed for current tests |
| Budget-aware maxAttempts enforcement | Config/graph layer | Runner executes configured maxAttempts |
| Graph-level DLQ writes | Graph orchestration layer | Runner signals via `routingFlags.blocked` |
| Idempotency key management | Node implementations | Runner is idempotency-agnostic |

---

## Test Coverage Gaps (WINT-9107 scope)

The following gaps in test coverage are addressed by WINT-9107 subtasks ST-2 and ST-3:

### ST-2 targets (node-factory.test.ts)

1. **Circuit breaker isolation per `createNode()` call** — existing tests cover a single node's circuit breaker. No test asserts that two independent `createNode()` calls produce isolated circuit breakers (openning one does not affect the other).

2. **RETRY_PRESETS distinct values** — `createLLMNode` and `createToolNode` are tested but no assertion verifies that their preset values are distinct (llm.maxAttempts=5 ≠ tool.maxAttempts=2).

3. **`classifyError` as sole retry decision** — `isRetryableNodeError` delegates entirely to `classifyError`. No explicit test isolates this delegation path.

### ST-3 targets (integration.test.ts)

1. **HALF_OPEN recovery path** — existing "allows recovery after timeout" test in node-factory.test.ts covers this, but integration.test.ts "Circuit breaker end-to-end" only tests CIRCUIT_OPEN state, not the full OPEN → HALF_OPEN → CLOSED recovery cycle. Missing: explicit assertion of circuit state names during transition.

2. **HALF_OPEN probe failure re-opens circuit** — not tested anywhere. When in HALF_OPEN, a failing probe should return to OPEN.

3. **`NodeRetryExhaustedError` routes to `routingFlags.blocked`** — covered by "sets blocked flag after exhausting retries" but can be strengthened with explicit `code: RETRY_EXHAUSTED` assertion.

4. **`CIRCUIT_OPEN` state has `code: CIRCUIT_OPEN`** — covered by "opens circuit after threshold failures" but only checks `result.errors?.[0].code`, not the full state update shape.

---

## Conclusion

**WINT-9107 implementation scope is CONFIRMED as verification + documentation only.** No new production code primitives are needed. The existing runner implementation satisfies the node-execution layer requirements. The gaps identified (HALF_OPEN tests, circuit isolation test) are test coverage gaps, not implementation gaps.

**Downstream impact:** WINT-9106 (checkpointer) and WINT-9110 (full workflow graphs) can proceed. The node-local circuit breaker decision (AC-003) is satisfied. DB-shared state remains a future story concern.
