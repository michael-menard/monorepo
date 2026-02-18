/**
 * Telemetry Hook Functions (INFR-0050 AC-1, AC-2, AC-5)
 *
 * Hook-based API for automatic event emission with OTel auto-enrichment.
 * - withStepTracking: Wraps step operations, emits step_completed events
 * - withStateTracking: Emits item_state_changed events immediately
 */

import { logger } from '@repo/logger'
import type {
  StepTrackingOptions,
  StateTrackingOptions,
  TelemetrySdkConfig,
  BufferState,
} from './__types__/index.js'
import { createStepCompletedEvent, createItemStateChangedEvent } from '../workflow-events/helpers.js'
import { addEventToBuffer } from './utils/buffer.js'
import { insertWorkflowEventsBatch } from './batch-insert.js'

/**
 * Extract correlation ID from active OpenTelemetry span
 * AC-5: Auto-enrich events with OTel context at event creation time
 *
 * @returns Trace ID from active span, or null if no active span
 */
function extractCorrelationId(): string | null {
  try {
    // Dynamically import to avoid hard dependency on @repo/observability
    // This allows the SDK to work even if observability is not initialized
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCurrentSpan } = require('@repo/observability') as {
      getCurrentSpan: () => { spanContext: () => { traceId?: string } } | undefined
    }
    const span = getCurrentSpan()
    if (span) {
      const spanContext = span.spanContext()
      return spanContext.traceId || null
    }
  } catch (error) {
    // Gracefully handle OTel errors or missing dependency
    logger.debug('[telemetry-sdk] Failed to extract correlation ID from span', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return null
}

/**
 * AC-1: Create withStepTracking hook function
 * Wraps a step operation, auto-emits step_completed event on success/error
 *
 * @param stepName - Name of the step being tracked
 * @param operation - Async operation to execute
 * @param options - Optional metadata (tokens, model, etc.)
 * @param config - SDK configuration
 * @param bufferState - Buffer state for event buffering
 * @returns Result of the operation (transparent wrapper)
 */
export async function withStepTracking<T>(
  stepName: string,
  operation: () => Promise<T>,
  options: StepTrackingOptions = {},
  config: TelemetrySdkConfig,
  bufferStateRef: { current: BufferState },
): Promise<T> {
  const startTime = Date.now()
  const correlationId = extractCorrelationId()

  try {
    // Execute operation
    const result = await operation()

    // Measure duration
    const durationMs = Date.now() - startTime

    // Create step_completed event (success)
    const event = createStepCompletedEvent({
      stepName,
      durationMs,
      tokensUsed: options.tokensUsed,
      model: options.model,
      status: 'success',
      runId: options.runId,
      workflowName: options.workflowName,
      agentRole: options.agentRole,
      correlationId: correlationId ?? undefined,
      source: config.source,
      emittedBy: options.emittedBy,
    })

    // Add to buffer if buffering enabled, otherwise insert immediately
    if (config.enableBuffering) {
      bufferStateRef.current = addEventToBuffer(bufferStateRef.current, event, config)
    } else {
      await insertWorkflowEventsBatch([event])
    }

    return result
  } catch (error) {
    // Measure duration even on error
    const durationMs = Date.now() - startTime

    // Create step_completed event (error)
    const event = createStepCompletedEvent({
      stepName,
      durationMs,
      tokensUsed: options.tokensUsed,
      model: options.model,
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
      runId: options.runId,
      workflowName: options.workflowName,
      agentRole: options.agentRole,
      correlationId: correlationId ?? undefined,
      source: config.source,
      emittedBy: options.emittedBy,
    })

    // Add to buffer if buffering enabled, otherwise insert immediately
    if (config.enableBuffering) {
      bufferStateRef.current = addEventToBuffer(bufferStateRef.current, event, config)
    } else {
      await insertWorkflowEventsBatch([event])
    }

    // Re-throw error (transparent wrapper)
    throw error
  }
}

/**
 * AC-2: Create withStateTracking function
 * Emits item_state_changed event immediately (bypasses buffer)
 *
 * @param itemId - ID of the item changing state
 * @param fromState - Previous state
 * @param toState - New state
 * @param options - Optional metadata (reason, etc.)
 * @param config - SDK configuration
 * @returns Promise that resolves when event is emitted
 */
export async function withStateTracking(
  itemId: string,
  fromState: string,
  toState: string,
  options: Partial<StateTrackingOptions> = {},
  config: TelemetrySdkConfig,
): Promise<void> {
  const correlationId = extractCorrelationId()

  // Create item_state_changed event
  const event = createItemStateChangedEvent({
    itemId,
    fromState,
    toState,
    itemType: options.itemType ?? 'story',
    reason: options.reason,
    runId: options.runId,
    workflowName: options.workflowName,
    agentRole: options.agentRole,
    correlationId: correlationId ?? undefined,
    source: config.source,
    emittedBy: options.emittedBy,
  })

  // AC-2: State changes are critical, emit immediately (bypass buffer)
  await insertWorkflowEventsBatch([event])
}
