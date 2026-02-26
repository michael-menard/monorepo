# LangGraph Error Handling & Retry Stories

**Created:** 2026-02-25
**Context:** Gap analysis of Wave 9 stories (WINT-9110 through WINT-9140, KBAR-0230, KBAR-0240) revealed that WINT-9110 has no error handling, retry, checkpoint, or fault-tolerance specifications. These three stories fill that gap and become prerequisites for WINT-9110.

**Dependency chain:**
```
WINT-9010 (Shared Business Logic)
  |
  +---> WINT-9105 (Error Handling ADR)
  |       |
  |       +---> WINT-9106 (Checkpointer & State Recovery)  --+
  |       |                                                    |--> WINT-9110 (Full Workflow Graphs)
  |       +---> WINT-9107 (Retry & Circuit Breaker)         --+
  |
  +---> WINT-0070 (Workflow Tracking Tables) ---> WINT-9106
```

---

## WINT-9105: Define LangGraph Error Handling & Retry Strategy

**Status:** pending
**Depends On:** WINT-9010
**Phase:** 9
**Story Type:** architecture
**Priority:** P0
**Touches:** backend

**Feature:** Design and document the cross-cutting error handling, retry, and fault-tolerance strategy for all LangGraph graphs and nodes. Produces a binding architecture decision record (ADR) that all subsequent graph/node stories must follow.

### Acceptance Criteria

- **AC-001:** ADR defines node-level retry policy with configurable exponential backoff (base delay, max delay, max attempts) per node category (LLM call, file I/O, DB write, git operation)
- **AC-002:** ADR defines graph-level error propagation rules — which node failures are retryable vs terminal, and how errors bubble to the parent graph
- **AC-003:** ADR defines circuit breaker pattern for LLM provider calls — open/half-open/closed states, failure thresholds, cooldown periods
- **AC-004:** ADR defines dead-letter queue (DLQ) strategy for batch workflows — failed stories written to `graph.deadLetterQueue` table with error context, retry eligibility, and manual review path
- **AC-005:** ADR defines idempotency contracts for side-effecting nodes (KB writes, git commits, file writes, index updates) — each must be safe to retry without duplication
- **AC-006:** ADR defines timeout strategy mapping from current `max_turns` to LangGraph node/graph timeouts
- **AC-007:** ADR defines partial-success semantics for batch graphs — how N-of-M failures are reported, whether successful items commit independently
- **AC-008:** ADR maps each existing Claude Code retry policy (dev-implement, elab-story, elab-epic) to its LangGraph equivalent, ensuring parity
- **AC-009:** ADR reviewed and approved (design doc committed to docs/architecture/)

### Infrastructure

- docs/architecture/adr-langgraph-error-handling.md

### Goal

Single source of truth for error handling patterns before any graph assembly begins.

### Risk Notes

Must balance resilience with cost — unlimited retries on LLM calls burn tokens. ADR must include budget-aware retry caps.

### Parity Mapping (existing Claude Code retry policies)

| Workflow | Current Retry | LangGraph Equivalent (to define) |
|----------|--------------|----------------------------------|
| dev-implement | 1 retry for type errors, then BLOCKERS.md + stop | Node retry with error context forwarding |
| elab-story | 1 retry for parse/write errors | Node retry with backoff |
| elab-epic | 1 retry per worker timeout, save & resume via CHECKPOINT.md | Checkpointer + node retry |
| phase-contracts | `on_failure`: block transition, return to prior phase | Graph-level conditional edges |

---

## WINT-9106: Implement LangGraph Checkpointer & State Recovery

**Status:** pending
**Depends On:** WINT-9105, WINT-0070
**Phase:** 9
**Story Type:** feature
**Priority:** P0
**Touches:** backend, database

**Feature:** Implement PostgreSQL-backed LangGraph checkpointer that enables graph pause/resume and crash recovery, replacing the current CHECKPOINT.yaml file-based pattern.

### Acceptance Criteria

- **AC-001:** PostgreSQL checkpointer configured using `workflow.checkpoints` table (or LangGraph's native `langgraph-checkpoint-postgres`) with connection pooling
- **AC-002:** All graph state is serializable and restorable — a graph interrupted mid-execution can resume from the last committed checkpoint
- **AC-003:** Checkpoint includes full node execution history, current state, retry counts, and error context — sufficient to diagnose failures without re-running
- **AC-004:** State rollback implemented — when a node fails after partial side effects, the checkpointer records the rollback actions needed (compensating transactions)
- **AC-005:** Resume CLI command (`resume-graph --thread-id <id>`) restores graph from checkpoint and continues execution
- **AC-006:** Checkpoint TTL and cleanup — stale checkpoints (>7 days) auto-archived, configurable retention
- **AC-007:** Integration test: start graph, kill process mid-node, resume, verify identical final state vs uninterrupted run
- **AC-008:** Maps to existing CHECKPOINT.yaml semantics — `resume_from` phase number translates to LangGraph thread checkpoint

### Infrastructure

- packages/backend/orchestrator/src/checkpointer/
- packages/backend/orchestrator/src/checkpointer/__tests__/

### Goal

Crash-safe, resumable workflow execution that replaces file-based checkpointing.

### Risk Notes

PostgreSQL checkpointer adds DB load per node execution. Must benchmark write latency and consider async checkpointing for non-critical nodes.

---

## WINT-9107: Implement Node-Level Retry & Circuit Breaker Middleware

**Status:** pending
**Depends On:** WINT-9105, WINT-9010
**Phase:** 9
**Story Type:** feature
**Priority:** P0
**Touches:** backend

**Feature:** Implement reusable LangGraph middleware for retry logic (exponential backoff) and circuit breaker pattern, following the ADR from WINT-9105. All LangGraph nodes wrap their execution through this middleware.

### Acceptance Criteria

- **AC-001:** `withRetry(config)` higher-order function wraps any node function, adding configurable retry with exponential backoff (default: 3 attempts, 1s base, 30s max, 2x multiplier)
- **AC-002:** Retry config per node category defined in a central registry: LLM calls (3 retries, backoff), file I/O (2 retries, no backoff), DB writes (2 retries, backoff), git ops (1 retry, no backoff)
- **AC-003:** `withCircuitBreaker(config)` wraps LLM provider calls — opens after 5 consecutive failures within 60s, half-open probe after 30s cooldown, closes after 2 consecutive successes
- **AC-004:** Circuit breaker state stored in `workflow.circuitBreakerState` table — shared across concurrent graph executions so one graph's provider failure protects all graphs
- **AC-005:** Dead-letter queue writer — when max retries exhausted, failed item written to `graph.deadLetterQueue` with full error stack, node state snapshot, and graph thread ID
- **AC-006:** Retry telemetry — each retry attempt emits a workflow event (via WINT-9100 telemetry nodes) with attempt number, delay, error category
- **AC-007:** Idempotency guard — `withIdempotency(key)` decorator checks `workflow.idempotencyKeys` table before executing side effects, skips if key exists within TTL window
- **AC-008:** Unit tests for retry (success after N failures), circuit breaker (state transitions), DLQ (write on exhaustion), idempotency (skip on duplicate key)
- **AC-009:** Integration test: batch graph with 5 items, 2 configured to fail — verify 3 succeed, 2 land in DLQ, graph reports partial success

### Infrastructure

- packages/backend/orchestrator/src/middleware/retry.ts
- packages/backend/orchestrator/src/middleware/circuit-breaker.ts
- packages/backend/orchestrator/src/middleware/idempotency.ts
- packages/backend/orchestrator/src/middleware/__tests__/

### Goal

Reusable, tested error handling primitives that every LangGraph node uses — no ad-hoc try/catch in individual nodes.

### Risk Notes

Middleware overhead per node call must be <5ms. Circuit breaker false positives during transient network blips could stall all graphs — tune thresholds carefully.

---

## Impact on WINT-9110

WINT-9110 ("Create Full Workflow LangGraph Graphs") should be updated to:

1. **Add dependencies:** WINT-9106, WINT-9107 (in addition to existing WINT-9060, 9070, 9080, 9100)
2. **Update feature description:** "All graphs use the checkpointer (WINT-9106) and retry/circuit-breaker middleware (WINT-9107) per the error handling ADR (WINT-9105)."
3. **Add AC:** Each graph must demonstrate retry and checkpoint behavior in integration tests

## Impact on WINT-9120

WINT-9120 ("Create Workflow Parity Test Suite") should be updated to include failure-mode parity testing:

- Test same retry behavior under identical error conditions
- Test same checkpoint/resume behavior
- Test same batch partial-failure outcomes
