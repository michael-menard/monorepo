/**
 * Partition Manager Implementation
 *
 * Implements runPartitionManager() which pre-creates monthly range partitions
 * for telemetry.workflow_events on the ts column.
 *
 * CDBE-5020: Partition workflow_events Table and Partition Management Job
 * ARCH-001: Partition key is ts (timestamptz) — confirmed by schema.ts
 * ARCH-002: Table is telemetry.workflow_events (confirmed by schema.ts)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Pool } from 'pg'

// =============================================================================
// Config Schema (AC-8: Zod schema, no TypeScript interfaces)
// =============================================================================

/**
 * Configuration schema for the partition manager.
 * monthsAhead: number of upcoming months to pre-create partitions for (default: 2)
 */
export const PartitionManagerConfigSchema = z.object({
  monthsAhead: z.number().int().positive().max(12).default(2),
})

export type PartitionManagerConfig = z.infer<typeof PartitionManagerConfigSchema>

// =============================================================================
// Date Arithmetic Helpers
// =============================================================================

/**
 * Add N months to a given year/month pair, handling year rollover correctly.
 * Returns { year, month } (1-indexed month).
 *
 * Examples:
 *   addMonths(2026, 11, 1) -> { year: 2026, month: 12 }
 *   addMonths(2026, 12, 1) -> { year: 2027, month: 1 }
 *   addMonths(2026, 12, 2) -> { year: 2027, month: 2 }
 */
function addMonths(
  year: number,
  month: number,
  monthsToAdd: number,
): { year: number; month: number } {
  const totalMonths = month - 1 + monthsToAdd
  return {
    year: year + Math.floor(totalMonths / 12),
    month: (totalMonths % 12) + 1,
  }
}

/**
 * Format a year/month pair into a zero-padded ISO date string (YYYY-MM-DD).
 * Always the first day of the month.
 */
function formatMonthStart(year: number, month: number): string {
  const mm = String(month).padStart(2, '0')
  return `${year}-${mm}-01`
}

/**
 * Format a year/month pair into the canonical partition table name.
 * Convention: workflow_events_y<YYYY>m<MM>
 * Example: workflow_events_y2026m03
 */
function formatPartitionName(year: number, month: number): string {
  const mm = String(month).padStart(2, '0')
  const name = `workflow_events_y${year}m${mm}`
  if (!/^workflow_events_y\d{4}m\d{2}$/.test(name)) {
    throw new Error(`Invalid partition name: ${name}`)
  }
  return name
}

// =============================================================================
// runPartitionManager
// =============================================================================

/**
 * Pre-create monthly range partitions for telemetry.workflow_events.
 *
 * For each of the next `monthsAhead` months (starting from next month),
 * executes:
 *   CREATE TABLE IF NOT EXISTS telemetry.<partition_name>
 *     PARTITION OF telemetry.workflow_events
 *     FOR VALUES FROM ('<month_start>') TO ('<month_end>');
 *
 * The IF NOT EXISTS guard makes this operation idempotent — if the partition
 * already exists, the statement succeeds and logs a skip notice.
 *
 * Errors are caught and logged via logger.error; they do not crash the caller.
 *
 * @param dbClient - PostgreSQL Pool connection (from tryAcquireAdvisoryLock)
 * @param config - Optional configuration (defaults: { monthsAhead: 2 })
 */
export async function runPartitionManager(
  dbClient: Pool,
  config?: Partial<PartitionManagerConfig>,
): Promise<void> {
  const { monthsAhead } = PartitionManagerConfigSchema.parse(config ?? {})

  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1 // 1-indexed

  logger.info('cron.partition-manager.starting', {
    currentYear,
    currentMonth,
    monthsAhead,
  })

  for (let i = 1; i <= monthsAhead; i++) {
    const { year: partYear, month: partMonth } = addMonths(currentYear, currentMonth, i)
    const { year: nextYear, month: nextMonth } = addMonths(currentYear, currentMonth, i + 1)

    const partitionName = formatPartitionName(partYear, partMonth)
    const rangeFrom = formatMonthStart(partYear, partMonth)
    const rangeTo = formatMonthStart(nextYear, nextMonth)

    const sql = `
      CREATE TABLE IF NOT EXISTS telemetry.${partitionName}
        PARTITION OF telemetry.workflow_events
        FOR VALUES FROM ('${rangeFrom}') TO ('${rangeTo}')
    `

    try {
      await dbClient.query(sql)
      logger.info('cron.partition-manager.partition-ensured', {
        partitionName,
        rangeFrom,
        rangeTo,
      })
    } catch (err) {
      // AC-6: DB errors are logged and do not crash the orchestrator process
      logger.error('cron.partition-manager.partition-failed', {
        partitionName,
        rangeFrom,
        rangeTo,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  logger.info('cron.partition-manager.completed', { monthsAhead })
}
