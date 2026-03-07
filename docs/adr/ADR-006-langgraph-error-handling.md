---
id: ADR-006
title: "LangGraph Error Handling & Retry Strategy"
status: accepted
decision-date: "2026-03-03"
deciders: ["Michael Menard", "dev-execute-leader (claude-sonnet-4-6)"]
story: WINT-9105
supersedes: []
downstream:
  - WINT-9106  # checkpointer — must implement DLQ table
  - WINT-9107  # middleware — must implement circuit breaker DB state + idempotency keys
  - WINT-9110  # full graph assembly — must wire retry + timeout config
---

# ADR-006: LangGraph Error Handling & Retry Strategy

## Status

Accepted — 2026-03-03

## Context

The LangGraph parity phase (Phase 9) is assembling production-grade workflow graphs to mirror and eventually replace Claude Code agent-based orchestration. Before any graph assembly story can begin, the error handling, retry, and fault-tolerance contracts must be defined in a single authoritative document.

The codebase contains **two partially overlapping error handling foundations**:

1. **Node runner module** (`packages/backend/orchestrator/src/runner/`) — implements `NodeCircuitBreaker` (failureThreshold=5, recoveryTimeoutMs=60000ms), `withNodeRetry` (exponential backoff + jitter), `classifyError` (retryable vs terminal), and `RETRY_PRESETS` covering `llm`, `tool`, `validation` operation categories.

2. **Workflow error schema module** (`packages/backend/orchestrator/src/errors/workflow-errors.ts`) — implements `WorkflowErrorTypeSchema` (AGENT_SPAWN_FAILED, AGENT_TIMEOUT, MALFORMED_OUTPUT, PRECONDITION_FAILED, EXTERNAL_SERVICE_DOWN), `ERROR_RETRY_DEFAULTS`, and a second `CircuitBreakerConfigSchema` (failureThreshold=3, failureWindowMs=300000ms).

Neither was designed as the comprehensive LangGraph error strategy. They are building blocks that this ADR synthesizes into a binding contract.

Additionally, WINT-0220 (Model-per-Task Strategy) defines a 3-provider escalation chain (ollama → openrouter → anthropic) across 4 model tiers with cost ranges from $0/1M (Ollama) to $75/1M output (Claude Opus 4.6). Any LangGraph retry strategy must be budget-aware at the model tier level.

---

## Table of Contents

1. [Layer Consolidation Decision (AC-010)](#1-layer-consolidation-decision-ac-010)
2. [Node-Level Retry Policy (AC-001)](#2-node-level-retry-policy-ac-001)
3. [Error Classification Table (AC-002)](#3-error-classification-table-ac-002)
4. [Graph-Level Error Propagation (AC-002)](#4-graph-level-error-propagation-ac-002)
5. [Circuit Breaker Strategy (AC-003)](#5-circuit-breaker-strategy-ac-003)
6. [Dead-Letter Queue Strategy (AC-004)](#6-dead-letter-queue-strategy-ac-004)
7. [Idempotency Contracts (AC-005)](#7-idempotency-contracts-ac-005)
8. [Timeout Strategy (AC-006)](#8-timeout-strategy-ac-006)
9. [Partial-Success Semantics (AC-007)](#9-partial-success-semantics-ac-007)
10. [Claude Code Agent Parity Mapping (AC-008)](#10-claude-code-agent-parity-mapping-ac-008)
11. [Budget-Aware Retry Caps (AC-009)](#11-budget-aware-retry-caps-ac-009)
12. [Migration Path](#12-migration-path)
13. [Consequences](#13-consequences)

---

## 1. Layer Consolidation Decision (AC-010)

### Decision

The two existing error-handling foundations are **not unified** — they are **partitioned by layer**. Both sets of values are correct for their respective semantic scopes.

| Layer | Module | Scope | failureThreshold | Concept |
|-------|--------|-------|-----------------|---------|
| **Node-execution layer** | `runner/` | Per-invocation | 5 | Single node call failing 5 times before the in-memory circuit opens |
| **Workflow-lifecycle layer** | `errors/workflow-errors.ts` | Per-story/phase | 3 | Phase-level failures within a 5-minute window that trigger story blocking |

### Rationale

A `runner/` circuit threshold of 5 reflects the expected noise of transient LLM timeouts within a single node invocation loop. A `workflow-errors.ts` threshold of 3 reflects the higher-severity signal that three story-phase-level failures in 5 minutes indicate a systemic problem requiring human review.

Merging them into a single value would either make node-level retries too aggressive or workflow-level blocking too permissive.

### Ownership Table

| Concern | Owner Module | Key Exports |
|---------|-------------|------------|
| Per-invocation retry | `runner/retry.ts` | `withNodeRetry`, `calculateRetryDelay`, `createRetryWrapper` |
| Per-invocation circuit breaker | `runner/circuit-breaker.ts` | `NodeCircuitBreaker` |
| Per-invocation error classification | `runner/error-classification.ts` | `classifyError`, `isRetryableNodeError` |
| Per-invocation error types | `runner/errors.ts` | `NodeTimeoutError`, `NodeCircuitOpenError`, `NodeRetryExhaustedError` |
| Per-invocation config schemas | `runner/types.ts` | `NodeRetryConfigSchema`, `CircuitBreakerConfigSchema`, `RETRY_PRESETS` |
| Workflow-lifecycle error types | `errors/workflow-errors.ts` | `WorkflowErrorTypeSchema`, `ERROR_RETRY_DEFAULTS`, `ErrorLogSchema` |
| Workflow-lifecycle circuit config | `errors/workflow-errors.ts` | `DEFAULT_CIRCUIT_BREAKER_CONFIG` (threshold=3) |
| Workflow-lifecycle error log | `errors/workflow-errors.ts` | `createWorkflowError`, `createErrorLog`, `shouldOpenCircuit` |

LangGraph middleware (WINT-9107) builds on the `runner/` layer for per-node execution and uses `workflow-errors.ts` types for workflow-state reporting. **The two layers must not share or merge their `CircuitBreakerConfig` schemas.**

---

## 2. Node-Level Retry Policy (AC-001)

### Canonical Retry Config Schema

All retry configuration is expressed using the existing `NodeRetryConfigSchema` from `runner/types.ts`:

```typescript
import { z } from 'zod'

// Canonical schema — do not redeclare; import from runner/types.ts
const NodeRetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).default(3),
  backoffMs: z.number().min(0).default(1000),
  backoffMultiplier: z.number().min(1).default(2),
  maxBackoffMs: z.number().min(0).default(30000),
  timeoutMs: z.number().min(0).optional(),
  jitterFactor: z.number().min(0).max(1).default(0.25),
})
```

### Extended RETRY_PRESETS Registry

The existing `RETRY_PRESETS` in `runner/types.ts` covers `llm`, `tool`, and `validation`. This ADR extends the registry with three additional categories. WINT-9107 MUST add these presets to `runner/types.ts` without altering existing entries:

```typescript
import { z } from 'zod'

const NodeRetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).default(3),
  backoffMs: z.number().min(0).default(1000),
  backoffMultiplier: z.number().min(1).default(2),
  maxBackoffMs: z.number().min(0).default(30000),
  timeoutMs: z.number().min(0).optional(),
  jitterFactor: z.number().min(0).max(1).default(0.25),
})

// Existing entries (do not change)
const RETRY_PRESETS_EXISTING = {
  llm: NodeRetryConfigSchema.parse({
    maxAttempts: 5,
    backoffMs: 2000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 60000,
    jitterFactor: 0.25,
  }),
  tool: NodeRetryConfigSchema.parse({
    maxAttempts: 2,
    backoffMs: 500,
    backoffMultiplier: 2,
    maxBackoffMs: 10000,
    timeoutMs: 10000,
    jitterFactor: 0.25,
  }),
  validation: NodeRetryConfigSchema.parse({
    maxAttempts: 1,
    backoffMs: 0,
    backoffMultiplier: 1,
    maxBackoffMs: 0,
    timeoutMs: 5000,
    jitterFactor: 0,
  }),
} as const

// New entries added by WINT-9107
const RETRY_PRESETS_NEW = {
  git: NodeRetryConfigSchema.parse({
    maxAttempts: 3,
    backoffMs: 1000,
    backoffMultiplier: 2,
    maxBackoffMs: 15000,
    timeoutMs: 30000,
    jitterFactor: 0.25,
  }),
  db_write: NodeRetryConfigSchema.parse({
    maxAttempts: 3,
    backoffMs: 500,
    backoffMultiplier: 2,
    maxBackoffMs: 10000,
    timeoutMs: 15000,
    jitterFactor: 0.25,
  }),
  file_io: NodeRetryConfigSchema.parse({
    maxAttempts: 3,
    backoffMs: 500,
    backoffMultiplier: 2,
    maxBackoffMs: 10000,
    timeoutMs: 10000,
    jitterFactor: 0.25,
  }),
} as const
```

### Full Preset Summary Table

| Category | maxAttempts | backoffMs | backoffMultiplier | maxBackoffMs | timeoutMs | jitterFactor | Idempotent? |
|----------|-------------|-----------|-------------------|-------------|-----------|--------------|-------------|
| `llm` | 5 | 2000 | 2 | 60000 | 60000 | 0.25 | No — see budget caps (§11) |
| `tool` | 2 | 500 | 2 | 10000 | 10000 | 0.25 | Varies by tool |
| `validation` | 1 | 0 | 1 | 0 | 5000 | 0 | Yes (read-only) |
| `git` | 3 | 1000 | 2 | 15000 | 30000 | 0.25 | Yes (content-hash idempotent) |
| `db_write` | 3 | 500 | 2 | 10000 | 15000 | 0.25 | Requires idempotency key |
| `file_io` | 3 | 500 | 2 | 10000 | 10000 | 0.25 | Requires atomic write pattern |

### Note on `llm` maxAttempts vs. Budget Caps

The `llm` preset allows 5 attempts at the node-execution layer. Budget-aware caps (§11) impose a lower per-tier ceiling for Tier 0 and Tier 1 models. WINT-9107 middleware MUST enforce the budget cap as an override of `maxAttempts` when the node's model tier is known.

---

## 3. Error Classification Table (AC-002)

The existing `classifyError()` in `runner/error-classification.ts` covers node-execution error types. This ADR extends the retryability table to cover LangGraph node categories:

| Error Type | Source | Retryable | Category | Action | Rationale |
|-----------|--------|-----------|----------|--------|-----------|
| `ZodError` | `runner/error-classification.ts` | No | `validation` | `fail` | Structural mismatch — retrying same input will fail again |
| `TypeError` | `runner/error-classification.ts` | No | `programming` | `fail` | Programming error |
| `ReferenceError` | `runner/error-classification.ts` | No | `programming` | `fail` | Programming error |
| `SyntaxError` | `runner/error-classification.ts` | No | `programming` | `fail` | Programming error |
| `NodeTimeoutError` | `runner/errors.ts` | Yes | `timeout` | `retry` | Transient — may succeed with more time |
| `NodeCancellationError` | `runner/errors.ts` | No | `cancellation` | `cancel` | Intentional — do not retry |
| `NodeCircuitOpenError` | `runner/errors.ts` | No | `circuit_open` | `fail` | Circuit must recover before retry |
| `NodeRetryExhaustedError` | `runner/errors.ts` | No | `exhausted` | `fail` | Max attempts consumed |
| Network errors (ECONNREFUSED, ETIMEDOUT, etc.) | `runner/error-classification.ts` | Yes | `network` | `retry` | Infrastructure transient |
| Rate limit errors (429, quota exceeded) | `runner/error-classification.ts` | Yes | `rate_limit` | `retry` | Backoff and retry |
| `AGENT_SPAWN_FAILED` | `workflow-errors.ts` | Yes (1x) | `spawn` | `retry` | Agent process failure is transient |
| `AGENT_TIMEOUT` | `workflow-errors.ts` | No | `agent_timeout` | `fail` | Timeout is terminal at workflow level |
| `MALFORMED_OUTPUT` | `workflow-errors.ts` | Yes (2x) | `output` | `retry` | Schema mismatch — LLM may produce valid output on retry |
| `PRECONDITION_FAILED` | `workflow-errors.ts` | No | `precondition` | `fail` | Missing dependency — retrying will not fix it |
| `EXTERNAL_SERVICE_DOWN` | `workflow-errors.ts` | Yes (3x) | `external` | `fallback` | Infrastructure — use fallback or retry with long backoff |

---

## 4. Graph-Level Error Propagation (AC-002)

### Propagation Rules

LangGraph uses conditional edges to route errors. This ADR defines two graph-level error semantics:

#### Fail-Fast Graphs

Used for: single-story elaboration, single-story implementation, code review.

```
If any node throws NodeRetryExhaustedError → propagate to ERROR state → write WorkflowError → set story status = blocked
```

Rationale: In single-story graphs, a node failure is typically story-specific. No compensation is possible because the story artifact is incomplete.

#### Saga-Style (Compensate and Continue) Graphs

Used for: batch elaboration, batch implementation (multi-story pipelines).

```
If node N fails for story S:
  → write S to dead-letter queue (graph.deadLetterQueue)
  → record failure in WorkflowError log
  → continue graph execution for remaining stories
  → at graph completion, report N-of-M success rate
```

Rationale: In batch graphs, story S's failure should not block story T. The graph continues with compensation (DLQ write) and reports aggregate outcomes.

### Graph Type to Semantics Mapping

| Graph Type | Semantics | Failure Routing |
|-----------|-----------|----------------|
| `elab-story` | Fail-fast | `ERROR` terminal state |
| `dev-implement` | Fail-fast | `ERROR` terminal state |
| `qa-verify` | Fail-fast | `ERROR` terminal state |
| `elab-epic` (batch) | Saga-style | DLQ + continue |
| `dev-batch-implement` | Saga-style | DLQ + continue |
| `code-audit` | Saga-style | DLQ + continue |

### Error Bubble Rule

Node-layer `NodeRetryExhaustedError` MUST be caught at graph boundary and translated to a `WorkflowError` using `createWorkflowError()` from `workflow-errors.ts`. Raw node errors must not escape to the calling orchestrator without translation.

---

## 5. Circuit Breaker Strategy (AC-003)

### Decision: Hybrid — DB-Shared for LLM Provider Calls, Node-Local for All Others

**Decision Impact for WINT-9107**: WINT-9107 MUST implement the `workflow.circuitBreakerState` DB table to support cross-graph LLM provider circuit breaking.

#### Rationale

Concurrent graph executions share LLM provider quota. If Graph A exhausts the Anthropic rate limit, Graph B's independent node-local circuit breaker will not know and will immediately attempt more Anthropic calls — amplifying the rate-limit failure. DB-shared state allows all concurrent graphs to detect the shared provider circuit-open condition.

For `file_io`, `git`, and `db_write` nodes, failures are story-local and do not represent shared infrastructure exhaustion. Node-local circuit breaking is appropriate.

#### Circuit Breaker Scope Table

| Node Category | Circuit State | failureThreshold | recoveryTimeoutMs | Rationale |
|--------------|--------------|-----------------|------------------|-----------|
| `llm` (Tier 0: Claude Opus) | DB-shared, per-provider | 5 | 60000 | Cross-graph protection; expensive provider |
| `llm` (Tier 1: Claude Sonnet) | DB-shared, per-provider | 5 | 60000 | Cross-graph protection |
| `llm` (Tier 2: Ollama) | Node-local | 5 | 60000 | Local; failures are instance-specific |
| `llm` (Tier 3: OpenRouter) | DB-shared, per-provider | 5 | 60000 | Shared external provider |
| `file_io` | Node-local | 5 | 60000 | Story-local failures |
| `git` | Node-local | 5 | 60000 | Story-local failures |
| `db_write` | Node-local | 5 | 60000 | Story-local; connection pool managed separately |
| `tool` | Node-local | 5 | 60000 | Tool failures are node-specific |
| `validation` | No circuit breaker | — | — | Validation never retries |

#### DB-Shared Circuit State Schema (WINT-9107 implements)

```typescript
import { z } from 'zod'

const CircuitBreakerStateRowSchema = z.object({
  id: z.string().uuid(),
  provider: z.string().min(1),          // e.g., 'anthropic', 'openrouter'
  state: z.enum(['CLOSED', 'OPEN', 'HALF_OPEN']),
  failureCount: z.number().int().min(0),
  lastFailureAt: z.string().datetime().nullable(),
  recoveryAttemptAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
})

type CircuitBreakerStateRow = z.infer<typeof CircuitBreakerStateRowSchema>
```

Table: `workflow.circuitBreakerState` — deferred to WINT-9107 migration.

#### Node-Local Circuit Breaker (existing — no change)

The existing `NodeCircuitBreaker` from `runner/circuit-breaker.ts` is used for node-local scopes without modification:

```typescript
// failureThreshold=5, recoveryTimeoutMs=60000
// Do not change these values — they are correct for per-invocation semantics
const breaker = new NodeCircuitBreaker({ failureThreshold: 5, recoveryTimeoutMs: 60000 })
```

#### Workflow-Lifecycle Circuit Breaker (existing — no change)

The `DEFAULT_CIRCUIT_BREAKER_CONFIG` in `workflow-errors.ts` (failureThreshold=3, failureWindowMs=300000ms) governs when a story phase is considered circuit-open and requires human intervention. This is a DIFFERENT concept from the node-execution circuit breaker. **Do not merge these values.**

---

## 6. Dead-Letter Queue Strategy (AC-004)

### Decision

All unrecoverable batch workflow failures MUST be written to `graph.deadLetterQueue` before the graph continues to the next story.

### DLQ Entry Schema (WINT-9107 implements)

```typescript
import { z } from 'zod'

const DlqEntrySchema = z.object({
  id: z.string().uuid(),
  storyId: z.string().min(1),
  graphExecutionId: z.string().min(1),
  failedNodeName: z.string().min(1),
  errorType: z.string().min(1),          // NodeErrorCode or WorkflowErrorType
  errorMessage: z.string().min(1),
  errorContext: z.record(z.unknown()).optional(),
  retryEligible: z.boolean(),
  retryCount: z.number().int().min(0).default(0),
  maxRetries: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolution: z.enum(['retried_success', 'manual_review', 'abandoned']).nullable(),
})

type DlqEntry = z.infer<typeof DlqEntrySchema>
```

Table: `graph.deadLetterQueue` — deferred to WINT-9107 migration.

### Retry Eligibility Rules

| Condition | retryEligible |
|-----------|--------------|
| `isRetryable: true` and `retryCount < maxRetries` | true |
| `isRetryable: false` (e.g., ZodError, PRECONDITION_FAILED) | false |
| Budget cap exceeded (see §11) | false |
| Circuit open for provider | false — re-evaluate after recovery |

### Manual Review Path

DLQ entries with `retryEligible: false` require manual review. The orchestrator MUST expose a DLQ admin command that:
1. Lists unresolved DLQ entries grouped by story
2. Allows marking a story for retry (`resolution: null`, `retryCount` reset)
3. Allows marking a story as abandoned (`resolution: 'abandoned'`)

---

## 7. Idempotency Contracts (AC-005)

### Decision

Side-effecting node categories carry explicit idempotency contracts. WINT-9107 MUST enforce these contracts in the LangGraph middleware layer.

### Idempotency Category Table

| Node Category | Idempotency Mechanism | Contract |
|--------------|----------------------|---------|
| `git` | Naturally idempotent | Git operations are idempotent by content hash. Committing the same content twice produces the same commit hash. No idempotency key required. |
| `db_write` | Requires idempotency key | Each DB write node invocation MUST include an `idempotencyKey` (UUID) in the payload. The `workflow.idempotencyKeys` table (WINT-9107) deduplicates re-submissions. |
| `file_io` | Requires atomic write | File writes MUST use write-to-temp-then-rename pattern. Partial writes are non-idempotent and must be detected by checksum comparison before retry. |
| `llm` | Not idempotent | LLM calls produce different outputs per invocation. Caller MUST discard previous LLM output on retry and treat each response as authoritative. |
| `tool` | Varies — declare per tool | Each tool node MUST declare `idempotent: true/false` in its `NodeConfig`. Read-only tools are idempotent. Write tools require per-tool analysis. |
| `validation` | Naturally idempotent | Read-only schema checks. No side effects. |

### Idempotency Key Schema (WINT-9107 implements)

```typescript
import { z } from 'zod'

const IdempotencyKeyRowSchema = z.object({
  key: z.string().uuid(),                // Caller-generated UUID
  nodeType: z.string().min(1),
  storyId: z.string().min(1),
  graphExecutionId: z.string().min(1),
  status: z.enum(['pending', 'complete', 'failed']),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
})

type IdempotencyKeyRow = z.infer<typeof IdempotencyKeyRowSchema>
```

Table: `workflow.idempotencyKeys` — deferred to WINT-9107 migration.

---

## 8. Timeout Strategy (AC-006)

### Decision

All LangGraph nodes MUST declare explicit `timeoutMs` values in their `NodeConfig`. The existing `max_turns` limits in Claude Code agent `.md` files are mapped to LangGraph `timeoutMs` values as follows:

### Timeout Mapping Table

| Agent / Concept | Current Limit | LangGraph Equivalent | Scope | Value |
|----------------|--------------|---------------------|-------|-------|
| `dev-implement` agent | 10 turns | LLM node timeout | per-node | 60000ms |
| `dev-implement` type-error retry | 1 retry | Node retry (ZodError excluded) | per-node | via `withNodeRetry` |
| `elab-story` agent | varies | LLM node timeout | per-node | 60000ms |
| `elab-story` parse/write retry | 1 retry | Node retry (network/output) | per-node | via `withNodeRetry` |
| `elab-epic` worker timeout | 1 retry per worker | LLM node retry + checkpointer | per-node | 120000ms |
| `elab-epic` save & resume | CHECKPOINT.yaml | LangGraph checkpointer (WINT-9106) | per-graph | persistent |
| Graph-level deadline | None (unbounded) | Graph-level timeout | per-graph | 1800000ms (30 min) |
| Batch story pipeline | None | Batch graph deadline | per-graph | 7200000ms (2 hr) |

### Timeout Hierarchy

```
Graph-level deadline (1800000ms single / 7200000ms batch)
  └── Node-level timeout (per RETRY_PRESETS category)
        ├── llm:       60000ms
        ├── tool:      10000ms
        ├── validation: 5000ms
        ├── git:       30000ms
        ├── db_write:  15000ms
        └── file_io:   10000ms
```

A node timeout triggers `NodeTimeoutError`, which is retryable (see §3). If all retries exhaust within the graph deadline, the graph-level deadline is the terminal gate.

### Implementation Note

Node timeout enforcement is handled by `withNodeRetry` via the `timeoutMs` field in `NodeRetryConfig`. WINT-9107 middleware MUST wire `NodeConfig.retry.timeoutMs` from the `RETRY_PRESETS` entry for the node's operation category.

---

## 9. Partial-Success Semantics (AC-007)

### Decision for Batch Graphs

Batch graphs (epic elaboration, batch implementation, code audit) MUST report partial-success outcomes. The minimum success threshold before a batch is considered "failing" is **50% of stories successfully processed**.

### Outcome Reporting Schema

```typescript
import { z } from 'zod'

const BatchOutcomeSchema = z.object({
  graphExecutionId: z.string().min(1),
  totalStories: z.number().int().min(1),
  successCount: z.number().int().min(0),
  failureCount: z.number().int().min(0),
  dlqCount: z.number().int().min(0),      // Written to dead-letter queue
  successRate: z.number().min(0).max(1),   // successCount / totalStories
  passingThreshold: z.number().min(0).max(1).default(0.5),
  batchPassing: z.boolean(),               // successRate >= passingThreshold
  completedAt: z.string().datetime(),
})

type BatchOutcome = z.infer<typeof BatchOutcomeSchema>
```

### Commit Independence

In saga-style batch graphs, each story's successful artifacts (KB writes, file writes, git commits) are committed independently as they complete. A later story's failure does NOT roll back earlier successful commits.

### Minimum Success Threshold Rules

| Batch Graph | Threshold | Rationale |
|------------|-----------|-----------|
| `elab-epic` | 50% | Epic elaboration can proceed with majority of stories |
| `dev-batch-implement` | 50% | Batch dev can ship passing stories |
| `code-audit` | 0% (informational) | Audit results are always informational; never blocks |

---

## 10. Claude Code Agent Parity Mapping (AC-008)

### Decision

Each existing Claude Code retry policy is mapped to its LangGraph equivalent. WINT-9107 MUST implement these mappings in the middleware layer.

### Parity Table

| Claude Code Agent | Current Retry Policy | LangGraph Equivalent |
|------------------|---------------------|---------------------|
| `dev-implement` | 1 retry on type errors (ZodError) | Node retry is DISABLED for ZodError (non-retryable per `classifyError`). Type errors must be fixed in prompt or schema, not retried. Error forwarded to parent graph as `MALFORMED_OUTPUT`. |
| `dev-implement` | 1 retry with error context forwarding | `withNodeRetry` forwards last error as context to `onRetryAttempt` callback. Middleware passes error message in next node invocation's state. |
| `elab-story` | 1 retry on parse/write errors | `MALFORMED_OUTPUT`: retryable 2x per `ERROR_RETRY_DEFAULTS`. `EXTERNAL_SERVICE_DOWN`: retryable 3x. Node-level retry via `withNodeRetry` with `tool`/`db_write` presets. |
| `elab-epic` | 1 retry per worker timeout + save & resume via CHECKPOINT.yaml | LangGraph checkpointer (WINT-9106) replaces CHECKPOINT.yaml. `NodeTimeoutError` retried via `withNodeRetry` (llm preset, 5 attempts). Graph state persisted to PostgreSQL between retries. |
| `phase-contracts` (on_failure: block transition) | Block next phase transition | LangGraph conditional edge: if node result contains `phaseBlocked: true`, edge routes to `ERROR` terminal state rather than next phase node. |

### Error Context Forwarding

For `dev-implement` retry with error context, the middleware MUST inject the previous node's error into graph state:

```typescript
import { z } from 'zod'

const GraphStateSchema = z.object({
  storyId: z.string().min(1),
  currentPhase: z.string().min(1),
  lastNodeError: z.string().nullable().default(null),  // Error message from previous failed attempt
  retryCount: z.number().int().min(0).default(0),
  // ... other state fields
})

type GraphState = z.infer<typeof GraphStateSchema>
```

---

## 11. Budget-Aware Retry Caps (AC-009)

### Decision

Unlimited retries on Tier 0 and Tier 1 LLM models are prohibited. The `llm` RETRY_PRESET's `maxAttempts: 5` is the node-layer ceiling, but budget-aware middleware MUST apply a lower per-tier cap.

### Budget Cap Table

From WINT-0220-STRATEGY.md (§1 Model Tier Specifications):

| Tier | Provider | Model | Input $/1M | Output $/1M | Max LLM Retries | Cap Basis |
|------|----------|-------|------------|-------------|----------------|-----------|
| 0 | Anthropic | Claude Opus 4.6 | $15.00 | $75.00 | **2** | Cost cap — 3+ retries on a 100K-token call costs >$22.50 output alone |
| 1 | Anthropic | Claude Sonnet 4.5 | $3.00 | $15.00 | **3** | Cost cap — moderate; 4 retries still reasonable at $4.50/call |
| 2 | Ollama | local | $0.00 | $0.00 | **5** | Latency-bound, not cost-bound — uses full `llm` preset ceiling |
| 3 | OpenRouter | claude-3.5-haiku | $0.08 | $0.08 | **5** | Latency-bound, not cost-bound — negligible cost per retry |

**Important**: Tier 2 and Tier 3 retry caps are governed by **latency tolerance**, not cost. Ollama local models incur no monetary cost. The cap of 5 reflects `llm` preset defaults; operators may reduce this if latency is unacceptable.

### Budget-Aware Retry Preset Extensions

WINT-9107 MUST extend the `llm` preset with per-tier overrides:

```typescript
import { z } from 'zod'

const NodeRetryConfigSchema = z.object({
  maxAttempts: z.number().int().min(1).default(3),
  backoffMs: z.number().min(0).default(1000),
  backoffMultiplier: z.number().min(1).default(2),
  maxBackoffMs: z.number().min(0).default(30000),
  timeoutMs: z.number().min(0).optional(),
  jitterFactor: z.number().min(0).max(1).default(0.25),
})

// Budget-aware LLM retry caps by model tier
const LLM_RETRY_BY_TIER = {
  tier0: NodeRetryConfigSchema.parse({
    maxAttempts: 2,       // Cost cap: $75/1M output × 2 retries is acceptable ceiling
    backoffMs: 5000,      // Longer backoff for expensive model — reduce thundering cost
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 120000,    // Opus may take longer for complex tasks
    jitterFactor: 0.25,
  }),
  tier1: NodeRetryConfigSchema.parse({
    maxAttempts: 3,       // Cost cap: $15/1M output × 3 retries is acceptable
    backoffMs: 3000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 60000,
    jitterFactor: 0.25,
  }),
  tier2: NodeRetryConfigSchema.parse({
    maxAttempts: 5,       // Latency-bound — full llm preset ceiling
    backoffMs: 2000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 60000,
    jitterFactor: 0.25,
  }),
  tier3: NodeRetryConfigSchema.parse({
    maxAttempts: 5,       // Latency-bound — negligible cost per retry
    backoffMs: 2000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 60000,
    jitterFactor: 0.25,
  }),
} as const
```

### Middleware Resolution Order

```
1. Determine node's model tier from model-assignments.yaml
2. Look up LLM_RETRY_BY_TIER[tier]
3. Use tier-specific config in withNodeRetry()
4. If tier is unknown, fall back to RETRY_PRESETS.llm (maxAttempts: 5)
```

---

## 12. Migration Path

### WINT-9106 (Checkpointer)

- Implement PostgreSQL-backed LangGraph checkpointer to replace CHECKPOINT.yaml
- Required by `elab-epic` parity mapping (§10)

### WINT-9107 (Middleware Implementation)

All decisions in this ADR that require code changes are deferred to WINT-9107:

| Item | Action |
|------|--------|
| Add `git`, `db_write`, `file_io` presets to `runner/types.ts` | Extend `RETRY_PRESETS` — do not modify existing entries |
| Add `LLM_RETRY_BY_TIER` to `runner/types.ts` | New export — budget-aware tier overrides |
| Create `workflow.circuitBreakerState` table | DB migration — DB-shared circuit state for LLM providers |
| Create `graph.deadLetterQueue` table | DB migration — batch failure queue |
| Create `workflow.idempotencyKeys` table | DB migration — dedup for `db_write` nodes |
| Implement LangGraph middleware that wires `NodeConfig` | Use `runner/` layer primitives |
| Implement batch graph saga routing | DLQ write + continue edge |
| Implement `BatchOutcome` reporting | End-of-graph aggregation node |
| Implement `phaseBlocked` conditional edge | Phase contract enforcement |

### Source File Change Prohibition (this story)

`git diff --name-only` after WINT-9105 completion MUST show only:
- `docs/adr/ADR-006-langgraph-error-handling.md`

No `src/` files may be modified in WINT-9105.

---

## 13. Consequences

### Positive

- Single authoritative document prevents WINT-9107 implementers from incorrectly merging the two circuit breaker thresholds (3 vs 5)
- Budget caps prevent runaway LLM costs in retry loops on Tier 0/1 models
- Explicit layer partition (runner/ vs workflow-errors.ts) eliminates ownership ambiguity
- DLQ design allows batch pipelines to continue on individual story failures without losing work
- Idempotency contracts make retry-safe node implementations discoverable without reading source code
- Saga-style batch semantics enable partial-success reporting required for production monitoring

### Negative

- DB-shared circuit breaker state adds a DB round-trip per LLM call (WINT-9107 must measure and optimize)
- Three new DB tables (circuitBreakerState, deadLetterQueue, idempotencyKeys) add operational surface
- `LLM_RETRY_BY_TIER` requires model-tier resolution at node-invocation time — WINT-9107 must wire this lookup

### Neutral

- `workflow-errors.ts` `DEFAULT_CIRCUIT_BREAKER_CONFIG` (threshold=3) remains unchanged; its semantics are story-phase-level, not node-level. The apparent discrepancy with runner/ (threshold=5) is intentional and documented.
- Tier 2 and Tier 3 Ollama retries are latency-bound, not cost-bound. Operators may tune `maxAttempts` downward for local resource-constrained environments.

---

*This ADR is binding for WINT-9106, WINT-9107, and WINT-9110. Changes to these decisions require a new ADR with supersedes reference.*
