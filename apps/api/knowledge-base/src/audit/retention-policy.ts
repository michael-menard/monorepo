/**
 * Audit Log Retention Policy
 *
 * Retention cleanup logic with batch deletion for efficient removal
 * of old audit log entries.
 *
 * @see KNOW-018 AC9-AC10, AC12 for retention requirements
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { lt, sql } from 'drizzle-orm'
import { auditLog } from '../db/schema.js'
import {
  AuditRetentionInputSchema,
  type AuditRetentionInput,
  type RetentionCleanupResult,
} from './__types__/index.js'

/**
 * Dependencies for retention cleanup.
 */
export interface RetentionCleanupDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Configuration for batch deletion.
 */
const BATCH_SIZE = 10000

/**
 * Calculate the cutoff date for retention cleanup.
 *
 * @param retentionDays - Number of days to retain logs
 * @returns Date before which logs should be deleted
 */
export function calculateCutoffDate(retentionDays: number): Date {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - retentionDays)
  // Set to start of day for consistent boundary behavior
  cutoff.setHours(0, 0, 0, 0)
  return cutoff
}

/**
 * Run retention cleanup to delete old audit log entries.
 *
 * Uses batch deletion to avoid long table locks:
 * - Deletes 10,000 rows at a time
 * - Logs progress every batch
 * - Supports dry-run mode for cost estimation
 *
 * Boundary behavior: Entries with timestamp < cutoff are deleted.
 * This means entries exactly at the retention boundary are preserved.
 *
 * @param input - Retention days and dry_run flag
 * @param deps - Database dependencies
 * @param correlationId - Optional correlation ID for logging
 * @returns Cleanup result with statistics
 *
 * @see KNOW-018 AC9-AC10 for batch deletion requirements
 * @see KNOW-018 AC12 for boundary behavior
 */
export async function runRetentionCleanup(
  input: AuditRetentionInput,
  deps: RetentionCleanupDeps,
  correlationId?: string,
): Promise<RetentionCleanupResult> {
  const startTime = Date.now()

  // Validate input
  const validated = AuditRetentionInputSchema.parse(input)

  const { db } = deps
  const cutoffDate = calculateCutoffDate(validated.retention_days)

  logger.info('Starting retention cleanup', {
    retention_days: validated.retention_days,
    cutoff_date: cutoffDate.toISOString(),
    dry_run: validated.dry_run,
    correlation_id: correlationId,
  })

  // Dry run: just count without deleting
  if (validated.dry_run) {
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(lt(auditLog.timestamp, cutoffDate))

    const count = countResult[0]?.count ?? 0
    const durationMs = Date.now() - startTime

    logger.info('Retention cleanup dry run completed', {
      would_delete: count,
      retention_days: validated.retention_days,
      cutoff_date: cutoffDate.toISOString(),
      duration_ms: durationMs,
      correlation_id: correlationId,
    })

    return {
      deleted_count: count,
      retention_days: validated.retention_days,
      cutoff_date: cutoffDate.toISOString(),
      dry_run: true,
      duration_ms: durationMs,
      batches_processed: 0,
      correlation_id: correlationId,
    }
  }

  // Actual deletion with batching
  let totalDeleted = 0
  let batchNumber = 0

  while (true) {
    batchNumber++

    // Delete a batch of old entries
    // Using subquery to select IDs first, then delete
    const deletedResult = await db.execute(sql`
      DELETE FROM audit_log
      WHERE id IN (
        SELECT id FROM audit_log
        WHERE timestamp < ${cutoffDate}
        LIMIT ${BATCH_SIZE}
      )
      RETURNING id
    `)

    const deletedCount = deletedResult.rowCount ?? 0
    totalDeleted += deletedCount

    logger.debug('Retention cleanup batch completed', {
      batch: batchNumber,
      deleted_in_batch: deletedCount,
      total_deleted: totalDeleted,
      correlation_id: correlationId,
    })

    // If we deleted less than batch size, we're done
    if (deletedCount < BATCH_SIZE) {
      break
    }
  }

  const durationMs = Date.now() - startTime

  logger.info('Retention cleanup completed', {
    deleted_count: totalDeleted,
    retention_days: validated.retention_days,
    cutoff_date: cutoffDate.toISOString(),
    batches_processed: batchNumber,
    duration_ms: durationMs,
    correlation_id: correlationId,
  })

  return {
    deleted_count: totalDeleted,
    retention_days: validated.retention_days,
    cutoff_date: cutoffDate.toISOString(),
    dry_run: false,
    duration_ms: durationMs,
    batches_processed: batchNumber,
    correlation_id: correlationId,
  }
}
