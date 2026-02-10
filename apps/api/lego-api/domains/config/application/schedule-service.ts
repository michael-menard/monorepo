import { ok, err, type Result } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { ScheduleRepository, FeatureFlagRepository } from '../ports/index.js'
import type { AuditLoggerPort } from '../../../core/audit/ports.js'
import type {
  Schedule,
  ScheduleError,
  CreateScheduleRequest,
  ScheduleResponse,
  ScheduleListResponse,
} from '../types.js'

/**
 * Admin context for audit logging (WISH-20280)
 */
export interface AdminContext {
  userId: string
  email?: string
}

/**
 * Schedule Service (WISH-2119, WISH-20280)
 *
 * Business logic for schedule CRUD operations.
 * Orchestrates repository calls, data transformations, and audit logging.
 */

export interface ScheduleServiceDeps {
  scheduleRepo: ScheduleRepository
  flagRepo: FeatureFlagRepository
  auditLogger: AuditLoggerPort // NEW (WISH-20280)
}

export interface ScheduleService {
  /**
   * Create a new schedule for a flag (AC1, AC2)
   */
  createSchedule(
    flagKey: string,
    input: CreateScheduleRequest,
    adminContext?: AdminContext, // NEW (WISH-20280)
  ): Promise<Result<ScheduleResponse, ScheduleError>>

  /**
   * List all schedules for a flag (AC3, AC8)
   */
  listSchedules(flagKey: string): Promise<Result<ScheduleListResponse, ScheduleError>>

  /**
   * Cancel a schedule (AC3, AC4)
   */
  cancelSchedule(
    flagKey: string,
    scheduleId: string,
    adminContext?: AdminContext, // NEW (WISH-20280)
  ): Promise<Result<ScheduleResponse, ScheduleError>>
}

/**
 * Create the Schedule Service
 */
export function createScheduleService(deps: ScheduleServiceDeps): ScheduleService {
  const { scheduleRepo, flagRepo, auditLogger } = deps

  /**
   * Map Schedule entity to API response
   */
  function mapToResponse(schedule: Schedule, flagKey: string): ScheduleResponse {
    return {
      id: schedule.id,
      flagKey,
      scheduledAt: schedule.scheduledAt.toISOString(),
      status: schedule.status,
      updates: schedule.updates,
      appliedAt: schedule.appliedAt ? schedule.appliedAt.toISOString() : null,
      errorMessage: schedule.errorMessage,
      createdBy: schedule.createdBy ?? undefined, // NEW (WISH-20280)
      cancelledBy: schedule.cancelledBy ?? undefined, // NEW (WISH-20280)
      cancelledAt: schedule.cancelledAt ? schedule.cancelledAt.toISOString() : undefined, // NEW (WISH-20280)
      createdAt: schedule.createdAt.toISOString(),
    }
  }

  return {
    /**
     * Create a new schedule for a flag (AC1, AC2)
     */
    async createSchedule(flagKey, input, adminContext) {
      // Find flag by key
      const flagResult = await flagRepo.findByKey(flagKey)

      if (!flagResult.ok) {
        logger.warn('Create schedule failed: flag not found', { flagKey })
        return err('INVALID_FLAG')
      }

      const flag = flagResult.data

      // Parse and validate scheduledAt (Zod validation happens in route layer)
      const scheduledAt = new Date(input.scheduledAt)

      // Create schedule with admin tracking (WISH-20280)
      const result = await scheduleRepo.create({
        flagId: flag.id,
        scheduledAt,
        updates: input.updates,
        createdBy: adminContext?.userId, // NEW (WISH-20280)
      })

      if (!result.ok) {
        return err(result.error)
      }

      const schedule = result.data

      // Audit logging (WISH-20280, AC2, AC7)
      // Fire-and-forget: Audit failures don't block schedule creation
      if (adminContext) {
        try {
          await auditLogger.logEvent('flag_schedule.created', {
            scheduleId: schedule.id,
            flagKey,
            scheduledAt: schedule.scheduledAt.toISOString(),
            updates: schedule.updates,
            adminUserId: adminContext.userId,
            adminEmail: adminContext.email,
          })
        } catch (error) {
          logger.error('Audit logging failed for schedule creation', {
            error: error instanceof Error ? error.message : 'Unknown error',
            scheduleId: schedule.id,
            flagKey,
          })
          // Don't fail the operation - audit is fire-and-forget
        }
      }

      logger.info('Schedule created', {
        scheduleId: schedule.id,
        flagKey,
        scheduledAt: schedule.scheduledAt,
        updates: schedule.updates,
        createdBy: adminContext?.userId,
      })

      return ok(mapToResponse(schedule, flagKey))
    },

    /**
     * List all schedules for a flag (AC3, AC8)
     */
    async listSchedules(flagKey) {
      // Find flag by key
      const flagResult = await flagRepo.findByKey(flagKey)

      if (!flagResult.ok) {
        logger.warn('List schedules failed: flag not found', { flagKey })
        return err('INVALID_FLAG')
      }

      const flag = flagResult.data

      // Fetch all schedules for flag
      const schedules = await scheduleRepo.findAllByFlag(flag.id)

      const response = schedules.map(schedule => mapToResponse(schedule, flagKey))

      logger.debug('Listed schedules for flag', { flagKey, count: schedules.length })

      return ok(response)
    },

    /**
     * Cancel a schedule (AC3, AC4)
     */
    async cancelSchedule(flagKey, scheduleId, adminContext) {
      // Find flag by key (to validate flagKey and get flagId)
      const flagResult = await flagRepo.findByKey(flagKey)

      if (!flagResult.ok) {
        logger.warn('Cancel schedule failed: flag not found', { flagKey })
        return err('INVALID_FLAG')
      }

      const flag = flagResult.data

      // Verify schedule belongs to this flag
      const scheduleResult = await scheduleRepo.findById(scheduleId)

      if (!scheduleResult.ok) {
        logger.warn('Cancel schedule failed: schedule not found', { scheduleId })
        return err('NOT_FOUND')
      }

      const schedule = scheduleResult.data

      if (schedule.flagId !== flag.id) {
        logger.warn('Cancel schedule failed: schedule does not belong to flag', {
          scheduleId,
          flagKey,
          scheduleFlagId: schedule.flagId,
          flagId: flag.id,
        })
        return err('NOT_FOUND')
      }

      // Cancel the schedule with admin tracking (WISH-20280)
      const cancelResult = await scheduleRepo.cancel(scheduleId, adminContext?.userId)

      if (!cancelResult.ok) {
        return err(cancelResult.error)
      }

      const cancelled = cancelResult.data

      // Audit logging (WISH-20280, AC3, AC7)
      // Fire-and-forget: Audit failures don't block schedule cancellation
      if (adminContext) {
        try {
          await auditLogger.logEvent('flag_schedule.cancelled', {
            scheduleId,
            flagKey,
            scheduledAt: schedule.scheduledAt.toISOString(),
            adminUserId: adminContext.userId,
            adminEmail: adminContext.email,
            reason: 'manual_cancellation',
          })
        } catch (error) {
          logger.error('Audit logging failed for schedule cancellation', {
            error: error instanceof Error ? error.message : 'Unknown error',
            scheduleId,
            flagKey,
          })
          // Don't fail the operation - audit is fire-and-forget
        }
      }

      logger.info('Schedule cancelled', {
        scheduleId,
        flagKey,
        previousStatus: schedule.status,
        cancelledBy: adminContext?.userId,
      })

      return ok(mapToResponse(cancelled, flagKey))
    },
  }
}
