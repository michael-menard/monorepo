/**
 * Batch Insert Function (INFR-0050 AC-4)
 *
 * Efficiently insert multiple workflow events using Drizzle batch insert API.
 * Handles chunking for PostgreSQL param limits and provides resilient error handling.
 */

import { logger } from '@repo/logger'
import { db } from '../client'
import { workflowEvents } from '../schema'
import type { WorkflowEventInput } from '../workflow-events'
import { chunkArray } from './utils/batch-chunker'

/**
 * Insert multiple workflow events in a single batch operation
 * AC-4: Use Drizzle batch insert with ON CONFLICT DO NOTHING for idempotency
 *
 * Resilient error handling: catches DB errors, logs warnings, never crashes
 * Chunking: splits large batches (>6500 events) to avoid PostgreSQL param limit
 *
 * @param events - Array of events to insert
 * @returns Promise that resolves when insert completes (or fails gracefully)
 */
export async function insertWorkflowEventsBatch(events: WorkflowEventInput[]): Promise<void> {
  if (events.length === 0) {
    return
  }

  try {
    // Chunk large batches to avoid PostgreSQL parameter limit
    const chunks = chunkArray(events)

    logger.debug('[telemetry-sdk] Batch inserting workflow events', {
      totalEvents: events.length,
      chunks: chunks.length,
    })

    // Process each chunk
    for (const chunk of chunks) {
      try {
        await db
          .insert(workflowEvents)
          .values(
            chunk.map((event) => ({
              eventId: event.eventId,
              eventType: event.eventType,
              eventVersion: event.eventVersion ?? 1,
              ts: event.ts ?? new Date(),
              runId: event.runId ?? null,
              itemId: event.itemId ?? null,
              workflowName: event.workflowName ?? null,
              agentRole: event.agentRole ?? null,
              status: event.status ?? null,
              payload: event.payload ?? null,
              correlationId: event.correlationId ?? null,
              source: event.source ?? null,
              emittedBy: event.emittedBy ?? null,
            })),
          )
          .onConflictDoNothing({ target: workflowEvents.eventId })

        logger.debug('[telemetry-sdk] Batch insert chunk complete', {
          chunkSize: chunk.length,
        })
      } catch (chunkError) {
        // Log chunk-level error but continue with next chunk
        logger.warn('[telemetry-sdk] Failed to insert event chunk', {
          chunkSize: chunk.length,
          error: chunkError instanceof Error ? chunkError.message : String(chunkError),
        })
      }
    }
  } catch (error) {
    // Resilient error handling: log warning, don't crash orchestrator
    logger.warn('[telemetry-sdk] Failed to batch insert workflow events', {
      eventCount: events.length,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
