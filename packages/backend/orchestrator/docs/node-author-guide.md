# Node Author Guide

**Last updated:** 2026-03-03
**Story:** WINT-9107 — Runner Verification & Documentation

This guide explains how to create LangGraph-compatible nodes using the `@repo/orchestrator` runner module. All node infrastructure (retry, circuit breaker, timeout, error handling) is provided — node authors only need to implement the business logic.

---

## Import Path

All node infrastructure is exported from a single entry point:

```typescript
import {
  createNode,
  createLLMNode,
  createToolNode,
  createSimpleNode,
  createLLMPoweredNode,
  RETRY_PRESETS,
  type NodeFunction,
  type NodeImplementation,
} from '@repo/orchestrator/runner'
```

The canonical path is `packages/backend/orchestrator/src/runner/index.ts`. Do NOT import from individual module files (`circuit-breaker.ts`, `retry.ts`, etc.) — the index provides the stable public API.

---

## Factory Functions

### `createNode(config, implementation)` — Generic factory

Use when you need full control over retry and circuit breaker configuration.

```typescript
import { createNode } from '@repo/orchestrator/runner'
import type { GraphState } from '@repo/orchestrator/state'

const myNode = createNode(
  {
    name: 'my-node',                         // required, used in logs and errors
    retry: {
      maxAttempts: 3,                        // default: 3
      backoffMs: 1000,                       // base delay ms (default: 1000)
      backoffMultiplier: 2,                  // exponential multiplier (default: 2)
      maxBackoffMs: 30000,                   // cap on delay ms (default: 30000)
      timeoutMs: 15000,                      // per-attempt timeout (optional)
      jitterFactor: 0.25,                    // jitter 0-25% (default: 0.25)
    },
    circuitBreaker: {
      failureThreshold: 5,                   // failures before OPEN (default: 5)
      recoveryTimeoutMs: 60000,              // ms before HALF_OPEN probe (default: 60000)
    },
  },
  async (state: GraphState) => {
    // Your node logic here
    return { routingFlags: { proceed: true } }
  },
)
```

### `createLLMNode(name, implementation)` — LLM preset

Use for nodes that call an LLM (high retry budget, 60s timeout).

```typescript
import { createLLMNode } from '@repo/orchestrator/runner'

const analyzeNode = createLLMNode('analyze-story', async (state, config) => {
  // LLM retry preset applied:
  //   maxAttempts: 5, backoffMs: 2000, maxBackoffMs: 60000, timeoutMs: 60000
  const analysis = await callLLM(state.storyId)
  return { routingFlags: { proceed: true } }
})
```

### `createToolNode(name, implementation)` — Tool/API preset

Use for nodes that call external APIs, file I/O, or DB operations (lower retry budget, 10s timeout).

```typescript
import { createToolNode } from '@repo/orchestrator/runner'

const fetchNode = createToolNode('fetch-data', async (state) => {
  // Tool retry preset applied:
  //   maxAttempts: 2, backoffMs: 500, maxBackoffMs: 10000, timeoutMs: 10000
  const data = await fetchFromAPI(state.storyId)
  return { routingFlags: { proceed: true } }
})
```

### `createSimpleNode(name, implementation)` — No retry

Use for validation nodes or nodes where retry is counterproductive (e.g., idempotent checks).

```typescript
import { createSimpleNode } from '@repo/orchestrator/runner'

const validateNode = createSimpleNode('validate-input', async (state) => {
  // maxAttempts: 1, no retry
  if (!state.storyId) {
    throw new Error('Missing storyId')
  }
  return { routingFlags: { proceed: true } }
})
```

### `createLLMPoweredNode(config, implementation)` — LLM injection

Use when the node needs an LLM instance resolved from model-assignments.yaml at runtime.

```typescript
import { createLLMPoweredNode } from '@repo/orchestrator/runner'

const codeReviewNode = createLLMPoweredNode(
  { name: 'code-review-lint' },
  async (state, config) => {
    const llmResult = config.configurable?.llm
    if (llmResult?.provider === 'ollama') {
      const response = await llmResult.llm.invoke([...])
      return { routingFlags: { proceed: true } }
    }
    // Claude model — return signal for external invocation
    return { pendingClaudeCall: { model: llmResult?.model, prompt: '...' } }
  },
)
```

---

## RETRY_PRESETS Reference

Preset registry from `runner/types.ts`. All values are `NodeRetryConfig` objects.

| Preset | `maxAttempts` | `backoffMs` | `maxBackoffMs` | `timeoutMs` | `jitterFactor` | Use when |
|--------|-------------|------------|--------------|-----------|-------------|---------|
| `llm` | 5 | 2000 | 60000 | 60000 | 0.25 | LLM API calls |
| `tool` | 2 | 500 | 10000 | 10000 | 0.25 | External API/file/DB calls |
| `validation` | 1 | 0 | 0 | 5000 | 0 | Schema validation (no retry) |

Access directly when building custom configs:

```typescript
import { RETRY_PRESETS } from '@repo/orchestrator/runner'

const customNode = createNode(
  {
    name: 'custom',
    retry: {
      ...RETRY_PRESETS.llm,
      maxAttempts: 3,  // override just maxAttempts
    },
  },
  implementation,
)
```

**Note on budget caps:** Per WINT-9105 ADR, `RETRY_PRESETS.llm.maxAttempts=5` is the runner default. At graph configuration time, override to respect per-tier budget caps (Tier 0 Claude Opus: max 2 retries, Tier 1 Claude Sonnet: max 3 retries). The runner executes whatever `maxAttempts` is configured.

---

## Circuit Breaker Isolation

Each `createNode()` / `createLLMNode()` / `createToolNode()` call produces an **independent circuit breaker instance**. Opening the circuit on node A does NOT affect node B, even if they use the same config:

```typescript
// nodeA and nodeB have completely independent circuit breakers
const nodeA = createNode({ name: 'nodeA', circuitBreaker: { failureThreshold: 5 } }, implA)
const nodeB = createNode({ name: 'nodeB', circuitBreaker: { failureThreshold: 5 } }, implB)
```

The current circuit breaker is **node-local** (in-memory state per `NodeCircuitBreaker` instance). Cross-graph shared state is a future story concern — see WINT-9105 ADR for the explicit decision.

---

## Error Handling Contracts

### How errors are handled

1. **Retryable errors** (network, timeout, rate limit, unknown): retried up to `maxAttempts`
2. **Non-retryable errors** (ZodError, TypeError, ReferenceError, SyntaxError, cancellation): fail immediately, returned in `state.errors`
3. **Retry exhaustion**: `routingFlags.blocked = true` is set, `code: RETRY_EXHAUSTED`
4. **Circuit OPEN**: `routingFlags.blocked = true`, `code: CIRCUIT_OPEN`

### Return contract

Node implementations MUST return a `Partial<GraphState>`. Returning `undefined` is an error.

```typescript
// Correct
return { routingFlags: { proceed: true } }

// Correct — only changed fields
return { artifactPaths: { story: '/path/to/story.md' } }

// WRONG — never return undefined
return undefined // throws error
```

### classifyError is the sole retry decision point

`isRetryableNodeError(error)` → delegates entirely to `classifyError(error)`. You can call `classifyError` directly if you need the category:

```typescript
import { classifyError } from '@repo/orchestrator/runner'

const { isRetryable, category, reason } = classifyError(someError)
// category: 'validation' | 'programming' | 'timeout' | 'network' | 'rate_limit' | 'unknown'
```

---

## Gap Analysis Summary (WINT-9107)

The gap analysis in `docs/architecture/wint-9107-gap-analysis.md` confirms:

- **Implementation complete**: retry, circuit breaker (node-local), error classification, RETRY_PRESETS (llm/tool/validation)
- **ADR-documented, not in runner**: `file_io`, `db_write`, `git` presets; DB-shared circuit breaker state; graph-level DLQ; idempotency
- **Test gaps filled by WINT-9107**: circuit isolation test, RETRY_PRESETS distinct-values assertion, HALF_OPEN recovery/re-open tests, CIRCUIT_OPEN code assertion

---

## Testing Patterns

Follow these patterns for node tests (per ADR-005):

```typescript
import { beforeEach, afterEach, vi } from 'vitest'

describe('MyNode', () => {
  beforeEach(() => {
    vi.useFakeTimers()  // REQUIRED for timeout/circuit breaker tests
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('advances fake timers for recovery', async () => {
    // Use vi.advanceTimersByTimeAsync for HALF_OPEN recovery
    await vi.advanceTimersByTimeAsync(recoveryTimeoutMs + 1)
  })
})
```

Never use real wall-clock timers for `recoveryTimeoutMs`-dependent tests — use `vi.useFakeTimers()` per the ADR-005 testing strategy.
