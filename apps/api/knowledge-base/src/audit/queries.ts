/**
 * Audit Log Query Functions
 *
 * Query functions for retrieving audit log entries by entry ID or time range.
 * Supports pagination and filtering.
 *
 * @see KNOW-018 AC6-AC8 for query requirements
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm'
import { auditLog } from '../db/schema.js'
import {
  AuditByEntryInputSchema,
  AuditQueryInputSchema,
  type AuditByEntryInput,
  type AuditQueryInput,
  type AuditLogResponse,
  type AuditQueryResult,
  type AuditOperation,
} from './__types__/index.js'

/**
 * Dependencies for audit queries.
 */
export interface AuditQueryDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof import('../db/schema.js')>
}

/**
 * Query audit logs by entry ID.
 *
 * Returns all audit events for a specific entry, sorted by timestamp (oldest first).
 * Supports pagination with limit/offset.
 *
 * @param input - Entry ID and pagination options
 * @param deps - Database dependencies
 * @param correlationId - Optional correlation ID for logging
 * @returns Audit query result with metadata
 *
 * @see KNOW-018 AC6 for query by entry requirements
 */
export async function queryAuditByEntry(
  input: AuditByEntryInput,
  deps: AuditQueryDeps,
  correlationId?: string,
): Promise<AuditQueryResult> {
  const startTime = Date.now()

  // Validate input
  const validated = AuditByEntryInputSchema.parse(input)

  const { db } = deps

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(eq(auditLog.entryId, validated.entry_id))

  const total = countResult[0]?.count ?? 0

  // Query audit logs with pagination
  const results = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.entryId, validated.entry_id))
    .orderBy(asc(auditLog.timestamp)) // Oldest first for entry history
    .limit(validated.limit)
    .offset(validated.offset)

  const durationMs = Date.now() - startTime

  logger.info('Audit query by entry completed', {
    entry_id: validated.entry_id,
    result_count: results.length,
    total,
    duration_ms: durationMs,
    correlation_id: correlationId,
  })

  // Transform to response format
  const responseResults: AuditLogResponse[] = results.map(row => ({
    id: row.id,
    entry_id: row.entryId,
    operation: row.operation as AuditOperation,
    previous_value: row.previousValue as Record<string, unknown> | null,
    new_value: row.newValue as Record<string, unknown> | null,
    timestamp: row.timestamp.toISOString(),
    user_context: row.userContext as Record<string, unknown> | null,
  }))

  return {
    results: responseResults,
    metadata: {
      total,
      limit: validated.limit,
      offset: validated.offset,
      correlation_id: correlationId,
    },
  }
}

/**
 * Query audit logs by time range.
 *
 * Returns audit events within the specified date range, sorted by timestamp (newest first).
 * Supports filtering by operation type and pagination.
 *
 * @param input - Time range, optional operation filter, and pagination options
 * @param deps - Database dependencies
 * @param correlationId - Optional correlation ID for logging
 * @returns Audit query result with metadata
 *
 * @see KNOW-018 AC7-AC8 for time range and filter requirements
 */
export async function queryAuditByTimeRange(
  input: AuditQueryInput,
  deps: AuditQueryDeps,
  correlationId?: string,
): Promise<AuditQueryResult> {
  const startTime = Date.now()

  // Validate input (includes end_date >= start_date check)
  const validated = AuditQueryInputSchema.parse(input)

  const { db } = deps

  // Build where conditions
  const conditions = [
    gte(auditLog.timestamp, validated.start_date),
    lte(auditLog.timestamp, validated.end_date),
  ]

  if (validated.operation) {
    conditions.push(eq(auditLog.operation, validated.operation))
  }

  // Get total count for pagination
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLog)
    .where(and(...conditions))

  const total = countResult[0]?.count ?? 0

  // Query audit logs with pagination
  const results = await db
    .select()
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.timestamp)) // Newest first for time range queries
    .limit(validated.limit)
    .offset(validated.offset)

  const durationMs = Date.now() - startTime

  logger.info('Audit query by time range completed', {
    start_date: validated.start_date.toISOString(),
    end_date: validated.end_date.toISOString(),
    operation_filter: validated.operation,
    result_count: results.length,
    total,
    duration_ms: durationMs,
    correlation_id: correlationId,
  })

  // Transform to response format
  const responseResults: AuditLogResponse[] = results.map(row => ({
    id: row.id,
    entry_id: row.entryId,
    operation: row.operation as AuditOperation,
    previous_value: row.previousValue as Record<string, unknown> | null,
    new_value: row.newValue as Record<string, unknown> | null,
    timestamp: row.timestamp.toISOString(),
    user_context: row.userContext as Record<string, unknown> | null,
  }))

  return {
    results: responseResults,
    metadata: {
      total,
      limit: validated.limit,
      offset: validated.offset,
      correlation_id: correlationId,
    },
  }
}
