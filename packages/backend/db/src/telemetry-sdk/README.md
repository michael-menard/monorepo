# Telemetry SDK (INFR-0050)

**Event SDK for automatic telemetry event emission** with hook-based API, auto-enrichment, and buffered ingestion.

## Overview

The Telemetry SDK provides a **reusable, hook-based API** for orchestrator nodes (and future LangGraph nodes) to emit telemetry events automatically. It replaces manual `insertWorkflowEvent()` calls with composable functions that:

- **Auto-emit events** on operation completion or state changes
- **Extract correlation IDs** from active OpenTelemetry spans
- **Buffer events in-memory** and flush in batches for performance
- **Degrade gracefully** on errors (never crashes orchestrator)
- **Handle shutdown** with SIGTERM/SIGINT signal handlers

## Quick Start

```typescript
import { initTelemetrySdk } from '@repo/db'

// Initialize SDK (singleton pattern)
const sdk = initTelemetrySdk({ source: 'orchestrator' })

// Track a step with automatic event emission
const result = await sdk.withStepTracking('analyze', async () => {
  // Your step logic here
  const analysis = await analyzeStory()
  return analysis
}, { tokensUsed: 500, model: 'sonnet' })

// Track state transitions
await sdk.withStateTracking('STORY-001', 'backlog', 'in-progress', {
  reason: 'User started work'
})

// Graceful shutdown (flushes remaining events)
await sdk.shutdown()
```

## Configuration

### Configuration Options

```typescript
interface TelemetrySdkConfig {
  source: string              // Event source identifier (required)
  enableBuffering?: boolean   // Enable buffering (default: true)
  bufferSize?: number         // Max events before flush (default: 100)
  flushIntervalMs?: number    // Flush interval in ms (default: 5000)
  overflowStrategy?: 'drop-oldest' | 'error' | 'block'  // Default: 'drop-oldest'
}
```

### Configuration Examples

**Default Configuration (Recommended)**
```typescript
const sdk = initTelemetrySdk({
  source: 'orchestrator'
})
// Uses: bufferSize=100, flushIntervalMs=5000, overflowStrategy='drop-oldest'
```

**Custom Configuration**
```typescript
const sdk = initTelemetrySdk({
  source: 'my-service',
  bufferSize: 200,
  flushIntervalMs: 10000,
  overflowStrategy: 'error'
})
```

**Disable Buffering (Immediate Inserts)**
```typescript
const sdk = initTelemetrySdk({
  source: 'critical-service',
  enableBuffering: false
})
```

## API Documentation

### `initTelemetrySdk(config)`

Initialize the telemetry SDK. Returns a singleton instance (subsequent calls return cached instance).

**Parameters:**
- `config: TelemetrySdkConfig` - SDK configuration

**Returns:** `TelemetrySdk` instance with hook functions and shutdown method

**Example:**
```typescript
const sdk = initTelemetrySdk({ source: 'orchestrator' })
```

---

### `sdk.withStepTracking(stepName, operation, options?)`

Wrap a step operation, automatically emit `step_completed` event on success/error.

**Parameters:**
- `stepName: string` - Name of the step
- `operation: () => Promise<T>` - Async operation to execute
- `options?: StepTrackingOptions` - Optional metadata

**StepTrackingOptions:**
```typescript
{
  tokensUsed?: number      // Tokens consumed by LLM
  model?: string           // Model name (e.g., 'sonnet', 'opus')
  runId?: string           // Workflow run identifier
  workflowName?: string    // Workflow name
  agentRole?: string       // Agent role (e.g., 'dev-execute-leader')
  emittedBy?: string       // Emitter identifier
}
```

**Returns:** Result of the operation (transparent wrapper)

**Behavior:**
- Measures duration automatically (start → end timestamp)
- Captures tokens/model if provided
- Emits event on completion (success or error)
- Extracts `correlation_id` from active OTel span
- Re-throws error after emitting event (caller handles error)

**Example:**
```typescript
const result = await sdk.withStepTracking('analyze', async () => {
  return await analyzeStory()
}, { tokensUsed: 500, model: 'sonnet' })
```

---

### `sdk.withStateTracking(itemId, fromState, toState, options?)`

Emit `item_state_changed` event for state transitions. **Bypasses buffer** (emits immediately).

**Parameters:**
- `itemId: string` - ID of the item changing state
- `fromState: string` - Previous state
- `toState: string` - New state
- `options?: StateTrackingOptions` - Optional metadata

**StateTrackingOptions:**
```typescript
{
  itemType?: string        // Item type (default: 'story')
  reason?: string          // Reason for state change
  runId?: string           // Workflow run identifier
  workflowName?: string    // Workflow name
  agentRole?: string       // Agent role
  emittedBy?: string       // Emitter identifier
}
```

**Returns:** `Promise<void>`

**Example:**
```typescript
await sdk.withStateTracking('STORY-001', 'backlog', 'in-progress', {
  reason: 'User started work'
})
```

---

### `sdk.flush()`

Manually flush buffered events to database (useful for testing or critical checkpoints).

**Returns:** `Promise<void>`

**Example:**
```typescript
await sdk.flush()
```

---

### `sdk.shutdown()`

Gracefully shutdown SDK: flush remaining events, stop timer, cleanup handlers.

**Timeout:** 5s max to prevent hanging process exit

**Returns:** `Promise<void>`

**Example:**
```typescript
await sdk.shutdown()
```

## Migration Guide

### From Manual `insertWorkflowEvent()` Calls

**Before (Manual):**
```typescript
import { insertWorkflowEvent, createStepCompletedEvent } from '@repo/db'

const startTime = Date.now()
try {
  const result = await executeStep()
  await insertWorkflowEvent(createStepCompletedEvent({
    stepName: 'analyze',
    durationMs: Date.now() - startTime,
    status: 'success',
    source: 'orchestrator'
  }))
  return result
} catch (error) {
  await insertWorkflowEvent(createStepCompletedEvent({
    stepName: 'analyze',
    durationMs: Date.now() - startTime,
    status: 'error',
    errorMessage: error.message,
    source: 'orchestrator'
  }))
  throw error
}
```

**After (SDK):**
```typescript
import { initTelemetrySdk } from '@repo/db'

const sdk = initTelemetrySdk({ source: 'orchestrator' })

const result = await sdk.withStepTracking('analyze', async () => {
  return await executeStep()
})
```

**Benefits:**
- 50% less code (boilerplate eliminated)
- Automatic duration measurement
- Automatic OTel correlation ID extraction
- Buffered inserts (10x faster)
- No manual error handling for event emission

## Performance Characteristics

### Batch vs Individual Inserts

| Metric | Individual Inserts | Batch Inserts | Improvement |
|--------|-------------------|---------------|-------------|
| 100 events | ~1000ms (10ms/event) | ~100ms (1ms/event) | **10x faster** |
| DB round-trips | 100 | 1-2 (chunked if >6500) | **50-100x fewer** |
| Buffer overhead | None | ~5KB per 100 events | Negligible |

### Buffer Flush Triggers

Events are flushed when **any** of these conditions are met:

1. **Size threshold reached:** Buffer contains `bufferSize` events (default: 100)
2. **Time interval elapsed:** `flushIntervalMs` since last flush (default: 5s)
3. **Manual flush:** `sdk.flush()` called
4. **Shutdown:** `sdk.shutdown()` or SIGTERM/SIGINT received

### PostgreSQL Parameter Limit

Large batches (>6500 events) are automatically chunked to avoid PostgreSQL's ~65535 parameter limit:

- **Chunk size:** 6500 events per INSERT
- **Fields per event:** 10
- **Params per chunk:** 65,000 (safe margin below 65,535)

## Error Handling Behavior

The SDK follows **resilient error handling** principles:

### Event Logging Must Never Crash Orchestrator

✅ **Correct Behavior:**
- DB errors are caught and logged as warnings
- Operation continues normally
- No exceptions thrown to caller

❌ **Incorrect Behavior:**
- Throwing DB errors to orchestrator
- Crashing workflow on telemetry failure

### Buffer Overflow Strategies

**drop-oldest (default, recommended):**
- Removes oldest event when buffer is full
- Logs warning with dropped event ID
- **Use case:** Most scenarios (graceful degradation)

**error:**
- Throws error when buffer is full
- **Use case:** Fail-fast testing environments

**block:**
- Blocks new events until flush completes
- Logs warning but doesn't add event
- **Use case:** Critical telemetry where loss is unacceptable

## Shutdown Behavior

### Automatic Shutdown on Process Signals

The SDK registers handlers for graceful shutdown:

```typescript
process.on('SIGTERM', async () => {
  await sdk.shutdown()  // Flush buffer, stop timer
  process.exit(0)
})

process.on('SIGINT', async () => {
  await sdk.shutdown()
  process.exit(0)
})
```

### Shutdown Sequence

1. **Stop flush timer** (no new scheduled flushes)
2. **Flush remaining events** (with 5s timeout)
3. **Clear state** (reset singleton)

### Shutdown Timeout

**5 seconds max** to prevent hanging process exit:

```typescript
const flushPromise = flushBuffer()
const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000))
await Promise.race([flushPromise, timeoutPromise])
```

If flush exceeds timeout, remaining events are **lost** (acceptable tradeoff for orchestrator availability).

## Advanced Usage

### Access Underlying Batch Insert

For advanced scenarios (e.g., bulk imports), use the batch insert function directly:

```typescript
import { insertWorkflowEventsBatch } from '@repo/db'

const events = [/* WorkflowEventInput[] */]
await insertWorkflowEventsBatch(events)
```

### Custom Chunking

```typescript
import { chunkArray, BATCH_CHUNK_SIZE } from '@repo/db'

const largeArray = [/* ... */]
const chunks = chunkArray(largeArray, BATCH_CHUNK_SIZE)
```

## Troubleshooting

### Events Not Being Inserted

**Check:**
1. Buffer size threshold not reached (default: 100 events)
2. Flush interval not elapsed (default: 5s)
3. DB connection issues (check logs for warnings)

**Solution:** Call `sdk.flush()` manually or wait for next auto-flush.

### High Memory Usage

**Cause:** Large buffer size with slow flush interval

**Solution:** Reduce `bufferSize` or `flushIntervalMs`:
```typescript
const sdk = initTelemetrySdk({
  source: 'orchestrator',
  bufferSize: 50,
  flushIntervalMs: 2000
})
```

### Correlation IDs Missing

**Cause:** No active OpenTelemetry span when event is created

**Check:**
1. OTel SDK initialized (`initializeTracing()` called)
2. Operation wrapped in active span context
3. `getCurrentSpan()` returns valid span

**Fallback:** `correlation_id` is `null` when no active span (expected behavior).

## Related Documentation

- [INFR-0040: Workflow Events Table](../../../docs/stories/INFR-0040.md)
- [INFR-0041: Event SDK Schemas](../../../docs/stories/INFR-0041.md)
- [INFR-0051: Orchestrator SDK Adoption](../../../docs/stories/INFR-0051.md) (follow-up)
- [@repo/observability](../../../packages/backend/observability/README.md)

## License

MIT
