import { eq, sql } from 'drizzle-orm'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { ScheduleRepository } from '../ports/index.js'
import type { Schedule, ScheduleStatus, ScheduleUpdates } from '../types.js'

/**
 * Schedule Repository Adapter (WISH-2119, WISH-20260)
 *
 * Database adapter for schedule CRUD operations with automatic retry mechanism.
 * Implements row-level locking (FOR UPDATE SKIP LOCKED) for concurrent processing (AC10).
 */

/**
 * Type alias for Drizzle operations
 * Uses 'any' to avoid complex Drizzle type inference issues.
 */
type DrizzleAny = any

/**
 * Create a schedule repository adapter
 */
export function createScheduleRepository(db: unknown, schema: unknown): ScheduleRepository {
  const typedDb = db as DrizzleAny
  const typedSchema = schema as DrizzleAny
  const schedules = typedSchema.featureFlagSchedules
  const flags = typedSchema.featureFlags

  /**
   * Map database row to Schedule type (WISH-20260: includes retry fields)
   */
  function mapToSchedule(row: unknown): Schedule {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      flagId: r.flagId as string,
      scheduledAt: r.scheduledAt as Date,
      status: r.status as ScheduleStatus,
      updates: r.updates as ScheduleUpdates,
      appliedAt: (r.appliedAt as Date | null) ?? null,
      errorMessage: (r.errorMessage as string | null) ?? null,
      retryCount: (r.retryCount as number) ?? 0,
      maxRetries: (r.maxRetries as number) ?? 3,
      nextRetryAt: (r.nextRetryAt as Date | null) ?? null,
      lastError: (r.lastError as string | null) ?? null,
      createdBy: (r.createdBy as string | null) ?? null,
      cancelledBy: (r.cancelledBy as string | null) ?? null,
      cancelledAt: (r.cancelledAt as Date | null) ?? null,
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
    }
  }

  return {
    /**
     * Create a new schedule (AC2)
     */
    async create(input) {
      try {
        // Validate that flag exists (AC2 - returns 404 if flag not found)
        const flagRows = await typedDb.select().from(flags).where(eq(flags.id, input.flagId))

        if (flagRows.length === 0) {
          logger.warn('Schedule creation failed: flag not found', { flagId: input.flagId })
          return err('INVALID_FLAG')
        }

        const rows = await typedDb
          .insert(schedules)
          .values({
            flagId: input.flagId,
            createdBy: input.createdBy,
            scheduledAt: input.scheduledAt,
            status: 'pending',
            updates: input.updates,
          })
          .returning()

        const schedule = mapToSchedule(rows[0])
        logger.info('Schedule created', {
          scheduleId: schedule.id,
          flagId: schedule.flagId,
          scheduledAt: schedule.scheduledAt,
        })

        return ok(schedule)
      } catch (error) {
        logger.error('Failed to create schedule', { error, input })
        return err('DB_ERROR')
      }
    },

    /**
     * Find all schedules for a flag (AC3)
     */
    async findAllByFlag(flagId) {
      try {
        const rows = await typedDb
          .select()
          .from(schedules)
          .where(eq(schedules.flagId, flagId))
          .orderBy(sql`${schedules.scheduledAt} ASC`)

        return rows.map(mapToSchedule)
      } catch (error) {
        logger.error('Failed to find schedules by flag', { error, flagId })
        return []
      }
    },

    /**
     * Find schedule by ID
     */
    async findById(scheduleId) {
      try {
        const rows = await typedDb.select().from(schedules).where(eq(schedules.id, scheduleId))

        if (rows.length === 0) {
          return err('NOT_FOUND')
        }

        return ok(mapToSchedule(rows[0]))
      } catch (error) {
        logger.error('Failed to find schedule by ID', { error, scheduleId })
        return err('NOT_FOUND')
      }
    },

    /**
     * Find pending schedules with row-level locking (AC7, AC10, WISH-20260: AC2)
     *
     * Query: WHERE (status = 'pending' AND scheduled_at <= NOW())
     *           OR (status = 'failed' AND next_retry_at <= NOW() AND retry_count < max_retries)
     * Locking: FOR UPDATE SKIP LOCKED prevents concurrent processing
     * Ordering: Prioritize retries (failed status) over new schedules
     * Limit: Default 100 to prevent timeout
     */
    async findPendingWithLock(limit = 100) {
      try {
        const now = new Date()

        // Execute raw SQL for row-level locking and complex WHERE clause
        // (Drizzle doesn't support FOR UPDATE SKIP LOCKED directly)
        const rows = await typedDb.execute(sql`
          SELECT * FROM feature_flag_schedules
          WHERE (
            (status = 'pending' AND scheduled_at <= ${now})
            OR
            (status = 'failed' AND next_retry_at IS NOT NULL AND next_retry_at <= ${now} AND retry_count < max_retries)
          )
          ORDER BY
            CASE WHEN status = 'failed' THEN 0 ELSE 1 END,
            next_retry_at ASC NULLS LAST,
            scheduled_at ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `)

        logger.info('Found pending schedules with lock', { count: rows.length, limit })
        return rows.map(mapToSchedule)
      } catch (error) {
        logger.error('Failed to find pending schedules', { error })
        return []
      }
    },

    /**
     * Update schedule status (AC8, AC9)
     */
    async updateStatus(scheduleId, status, options = {}) {
      try {
        const updateData: Record<string, unknown> = {
          status,
          updatedAt: new Date(),
        }

        if (options.appliedAt) {
          updateData.appliedAt = options.appliedAt
        }
        if (options.errorMessage) {
          updateData.errorMessage = options.errorMessage
        }

        const rows = await typedDb
          .update(schedules)
          .set(updateData)
          .where(eq(schedules.id, scheduleId))
          .returning()

        if (rows.length === 0) {
          return err('NOT_FOUND')
        }

        logger.info('Schedule status updated', {
          scheduleId,
          status,
          appliedAt: options.appliedAt,
          errorMessage: options.errorMessage,
        })

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to update schedule status', { error, scheduleId, status })
        return err('NOT_FOUND')
      }
    },

    /**
     * Update retry metadata for failed schedules (WISH-20260: AC3, AC5)
     *
     * @param scheduleId - Schedule ID to update
     * @param retryCount - Current retry count (incremented on failure)
     * @param nextRetryAt - Next retry timestamp (null if max retries exceeded)
     * @param lastError - Error message from latest failure
     */
    async updateRetryMetadata(scheduleId, retryCount, nextRetryAt, lastError) {
      try {
        const updateData: Record<string, unknown> = {
          status: 'failed',
          retryCount,
          nextRetryAt,
          lastError,
          updatedAt: new Date(),
        }

        await typedDb.update(schedules).set(updateData).where(eq(schedules.id, scheduleId))

        logger.info('Schedule retry metadata updated', {
          scheduleId,
          retryCount,
          nextRetryAt,
        })

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to update retry metadata', { error, scheduleId })
        return err('DB_ERROR')
      }
    },

    /**
     * Cancel a schedule (AC4)
     */
    async cancel(scheduleId, cancelledBy) {
      try {
        // First check if schedule exists and get current status
        const existingRows = await typedDb
          .select()
          .from(schedules)
          .where(eq(schedules.id, scheduleId))

        if (existingRows.length === 0) {
          logger.warn('Cancel failed: schedule not found', { scheduleId })
          return err('NOT_FOUND')
        }

        const existing = mapToSchedule(existingRows[0])

        // AC4: Cannot cancel if already applied or failed
        if (existing.status === 'applied' || existing.status === 'failed') {
          logger.warn('Cancel failed: schedule already processed', {
            scheduleId,
            status: existing.status,
          })
          return err('ALREADY_APPLIED')
        }

        // Update to cancelled
        const rows = await typedDb
          .update(schedules)
          .set({
            status: 'cancelled',
            cancelledBy,
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schedules.id, scheduleId))
          .returning()

        const cancelled = mapToSchedule(rows[0])
        logger.info('Schedule cancelled', { scheduleId, previousStatus: existing.status })

        return ok(cancelled)
      } catch (error) {
        logger.error('Failed to cancel schedule', { error, scheduleId })
        return err('DB_ERROR')
      }
    },
  }
}
