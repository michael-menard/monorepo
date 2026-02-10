import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db, schema } from '../composition/index.js'
import { createScheduleRepository } from '../domains/config/adapters/schedule-repository.js'
import { createFeatureFlagRepository } from '../domains/config/adapters/repositories.js'
import { getRedisClient } from '../core/cache/index.js'
import { createInMemoryCache } from '../domains/config/adapters/cache.js'
import { createRedisCacheAdapter } from '../domains/config/adapters/redis-cache.js'

/**
 * Process Flag Schedules Cron Job (WISH-2119, WISH-20260)
 *
 * Lambda handler triggered by EventBridge every 1 minute.
 * Processes pending schedules and applies flag updates automatically.
 * Automatically retries failed schedules with exponential backoff.
 *
 * Configuration (AC6):
 * - Schedule expression: rate(1 minute)
 * - Lambda timeout: 2 minutes
 * - Lambda memory: 512 MB
 * - Environment: DATABASE_URL, REDIS_URL, FLAG_SCHEDULE_MAX_RETRIES
 */

/**
 * Default max retries for failed schedules (WISH-20260: AC7)
 * Configurable via FLAG_SCHEDULE_MAX_RETRIES environment variable
 */
const DEFAULT_MAX_RETRIES = parseInt(process.env.FLAG_SCHEDULE_MAX_RETRIES ?? '3', 10)

// Validate range 0-10
if (DEFAULT_MAX_RETRIES < 0 || DEFAULT_MAX_RETRIES > 10) {
  logger.warn('FLAG_SCHEDULE_MAX_RETRIES out of range (0-10), using default 3', {
    configured: DEFAULT_MAX_RETRIES,
  })
}

/**
 * Calculate next retry time using exponential backoff with jitter (WISH-20260: AC3)
 *
 * Backoff formula: 2^(retry_count + 1) minutes + jitter (0-30 seconds)
 * - Retry 0 (first failure): 2 minutes + jitter
 * - Retry 1 (second attempt): 4 minutes + jitter
 * - Retry 2 (third attempt): 8 minutes + jitter
 *
 * @param retryCount - Current retry count (0-based)
 * @returns Next retry timestamp
 */
export function calculateNextRetryAt(retryCount: number): Date {
  // Exponential backoff: 2^(retry_count + 1) minutes
  const backoffMinutes = Math.pow(2, retryCount + 1)

  // Add jitter: random 0-30 seconds
  const jitterSeconds = Math.random() * 30

  // Convert to milliseconds
  const backoffMs = backoffMinutes * 60 * 1000
  const jitterMs = jitterSeconds * 1000

  return new Date(Date.now() + backoffMs + jitterMs)
}

/**
 * Lambda handler event (EventBridge scheduled event)
 */
interface ScheduledEvent {
  'detail-type': 'Scheduled Event'
  source: 'aws.events'
  time: string
}

/**
 * Main handler function (AC6, AC7, AC8, AC9, AC10)
 */
export async function handler(event: ScheduledEvent) {
  const startTime = Date.now()

  logger.info('Starting schedule processing cron job', {
    time: event.time,
    source: event.source,
  })

  try {
    // Setup dependencies
    const scheduleRepo = createScheduleRepository(db, schema)
    const flagRepo = createFeatureFlagRepository(db, schema)
    const redisClient = getRedisClient()
    const cache = redisClient ? createRedisCacheAdapter(redisClient) : createInMemoryCache()

    // AC7: Fetch pending schedules with row-level locking (WISH-20260: includes failed schedules ready for retry)
    // Query: WHERE (status = 'pending' AND scheduled_at <= NOW())
    //           OR (status = 'failed' AND next_retry_at <= NOW() AND retry_count < max_retries)
    // Locking: FOR UPDATE SKIP LOCKED (prevents concurrent processing)
    // Limit: 100 schedules per execution
    const pendingSchedules = await scheduleRepo.findPendingWithLock(100)

    logger.info('Found pending schedules', { count: pendingSchedules.length })

    if (pendingSchedules.length === 0) {
      logger.info('No pending schedules to process')
      return {
        statusCode: 200,
        body: JSON.stringify({ processed: 0, failed: 0, duration: Date.now() - startTime }),
      }
    }

    let processedCount = 0
    let failedCount = 0

    // Type cast for Drizzle access
    const typedDb = db as any
    const typedSchema = schema as any
    const flags = typedSchema.featureFlags

    // Process each schedule (AC8, AC9)
    for (const schedule of pendingSchedules) {
      try {
        // Get the flag by ID (direct database query since repository only has findByKey)
        const flagRows = await typedDb.select().from(flags).where(eq(flags.id, schedule.flagId))

        if (flagRows.length === 0) {
          // Flag was deleted - mark schedule as failed (no retry for permanent failures)
          logger.error('Schedule processing failed: flag not found', {
            scheduleId: schedule.id,
            flagId: schedule.flagId,
          })

          const errorMessage = 'Flag not found (may have been deleted)'
          const currentRetryCount = schedule.retryCount ?? 0

          // Don't retry if flag is deleted (permanent failure)
          await scheduleRepo.updateRetryMetadata(
            schedule.id,
            currentRetryCount,
            null, // No retry
            errorMessage,
          )

          failedCount++
          continue
        }

        const flag = flagRows[0]

        // AC8: Apply flag updates atomically
        // Update flag in database using repository
        const updateResult = await flagRepo.update(flag.flagKey, schedule.updates, flag.environment)

        if (!updateResult.ok) {
          // Update failed - this is retryable (WISH-20260)
          logger.error('Schedule processing failed: flag update error', {
            scheduleId: schedule.id,
            flagKey: flag.flagKey,
            error: updateResult.error,
          })

          const errorMessage = `Flag update failed: ${updateResult.error}`
          const currentRetryCount = schedule.retryCount ?? 0
          const maxRetries = schedule.maxRetries ?? DEFAULT_MAX_RETRIES

          // Retry transient errors (AC3, AC5)
          if (currentRetryCount < maxRetries) {
            const nextRetryCount = currentRetryCount + 1
            const nextRetryAt = calculateNextRetryAt(currentRetryCount)

            await scheduleRepo.updateRetryMetadata(
              schedule.id,
              nextRetryCount,
              nextRetryAt,
              errorMessage,
            )

            // AC4: Structured logging for retry attempts
            logger.info('Flag update failed, retry scheduled', {
              scheduleId: schedule.id,
              flagKey: flag.flagKey,
              retryCount: nextRetryCount,
              nextRetryAt: nextRetryAt.toISOString(),
              error: errorMessage,
            })
          } else {
            // Max retries exceeded (AC5)
            await scheduleRepo.updateRetryMetadata(
              schedule.id,
              currentRetryCount,
              null, // Clear next_retry_at
              errorMessage,
            )

            logger.error('Flag update retry limit exceeded', {
              scheduleId: schedule.id,
              flagKey: flag.flagKey,
              retryCount: currentRetryCount,
              maxRetries,
              lastError: errorMessage,
            })
          }

          failedCount++
          continue
        }

        // Invalidate cache for the flag (cache invalidation)
        await Promise.resolve(cache.invalidate(flag.environment))

        // AC8: Mark schedule as applied
        await scheduleRepo.updateStatus(schedule.id, 'applied', {
          appliedAt: new Date(),
        })

        // AC6: Clear retry metadata on success (log differently if this was a retry)
        if (schedule.retryCount && schedule.retryCount > 0) {
          logger.info('Schedule applied on retry', {
            scheduleId: schedule.id,
            flagKey: flag.flagKey,
            retryCount: schedule.retryCount,
            originalScheduledAt: schedule.scheduledAt,
            appliedAt: new Date(),
          })
        } else {
          // AC9: Log success to CloudWatch
          logger.info('Schedule applied successfully', {
            scheduleId: schedule.id,
            flagKey: flag.flagKey,
            updates: schedule.updates,
            scheduledAt: schedule.scheduledAt,
          })
        }

        processedCount++
      } catch (error) {
        // AC9: Error isolation - failed schedule does NOT block others
        logger.error('Schedule processing failed with exception', {
          scheduleId: schedule.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        const currentRetryCount = schedule.retryCount ?? 0
        const maxRetries = schedule.maxRetries ?? DEFAULT_MAX_RETRIES

        // Check if we should retry (AC5)
        if (currentRetryCount < maxRetries) {
          const nextRetryCount = currentRetryCount + 1
          const nextRetryAt = calculateNextRetryAt(currentRetryCount)

          // Update retry metadata (AC3, AC4)
          await scheduleRepo.updateRetryMetadata(
            schedule.id,
            nextRetryCount,
            nextRetryAt,
            errorMessage,
          )

          logger.info('Schedule failed, retry scheduled', {
            scheduleId: schedule.id,
            flagId: schedule.flagId,
            retryCount: nextRetryCount,
            nextRetryAt: nextRetryAt.toISOString(),
            error: errorMessage,
          })
        } else {
          // Max retries exceeded (AC5)
          await scheduleRepo.updateRetryMetadata(
            schedule.id,
            currentRetryCount,
            null, // Clear next_retry_at
            errorMessage,
          )

          logger.error('Schedule retry limit exceeded', {
            scheduleId: schedule.id,
            flagId: schedule.flagId,
            retryCount: currentRetryCount,
            maxRetries,
            lastError: errorMessage,
          })
        }

        failedCount++
      }
    }

    const duration = Date.now() - startTime

    logger.info('Schedule processing complete', {
      total: pendingSchedules.length,
      processed: processedCount,
      failed: failedCount,
      duration,
    })

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: processedCount,
        failed: failedCount,
        duration,
      }),
    }
  } catch (error) {
    logger.error('Cron job failed with critical error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Cron job failed',
        message: error instanceof Error ? error.message : String(error),
      }),
    }
  }
}

/**
 * For local testing
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEvent: ScheduledEvent = {
    'detail-type': 'Scheduled Event',
    source: 'aws.events',
    time: new Date().toISOString(),
  }

  handler(testEvent)
    .then(result => {
      console.log('Cron job result:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('Cron job error:', error)
      process.exit(1)
    })
}
