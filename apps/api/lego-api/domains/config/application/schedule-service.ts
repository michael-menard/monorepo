import { ok, err, type Result } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { ScheduleRepository } from '../ports/index.js'
import type { FeatureFlagRepository } from '../ports/index.js'
import type {
  Schedule,
  ScheduleError,
  CreateScheduleRequest,
  ScheduleResponse,
  ScheduleListResponse,
} from '../types.js'

/**
 * Schedule Service (WISH-2119)
 *
 * Business logic for schedule CRUD operations.
 * Orchestrates repository calls and data transformations.
 */

export interface ScheduleServiceDeps {
  scheduleRepo: ScheduleRepository
  flagRepo: FeatureFlagRepository
}

export interface ScheduleService {
  /**
   * Create a new schedule for a flag (AC1)
   */
  createSchedule(
    flagKey: string,
    input: CreateScheduleRequest,
  ): Promise<Result<ScheduleResponse, ScheduleError>>

  /**
   * List all schedules for a flag (AC3)
   */
  listSchedules(flagKey: string): Promise<Result<ScheduleListResponse, ScheduleError>>

  /**
   * Cancel a schedule (AC4)
   */
  cancelSchedule(
    flagKey: string,
    scheduleId: string,
  ): Promise<Result<ScheduleResponse, ScheduleError>>
}

/**
 * Create the Schedule Service
 */
export function createScheduleService(deps: ScheduleServiceDeps): ScheduleService {
  const { scheduleRepo, flagRepo } = deps

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
      createdAt: schedule.createdAt.toISOString(),
    }
  }

  return {
    /**
     * Create a new schedule for a flag (AC1)
     */
    async createSchedule(flagKey, input) {
      // Find flag by key
      const flagResult = await flagRepo.findByKey(flagKey)

      if (!flagResult.ok) {
        logger.warn('Create schedule failed: flag not found', { flagKey })
        return err('INVALID_FLAG')
      }

      const flag = flagResult.data

      // Parse and validate scheduledAt (Zod validation happens in route layer)
      const scheduledAt = new Date(input.scheduledAt)

      // Create schedule
      const result = await scheduleRepo.create({
        flagId: flag.id,
        scheduledAt,
        updates: input.updates,
      })

      if (!result.ok) {
        return err(result.error)
      }

      const schedule = result.data

      logger.info('Schedule created', {
        scheduleId: schedule.id,
        flagKey,
        scheduledAt: schedule.scheduledAt,
        updates: schedule.updates,
      })

      return ok(mapToResponse(schedule, flagKey))
    },

    /**
     * List all schedules for a flag (AC3)
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
     * Cancel a schedule (AC4)
     */
    async cancelSchedule(flagKey, scheduleId) {
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

      // Cancel the schedule
      const cancelResult = await scheduleRepo.cancel(scheduleId)

      if (!cancelResult.ok) {
        return err(cancelResult.error)
      }

      const cancelled = cancelResult.data

      logger.info('Schedule cancelled', { scheduleId, flagKey, previousStatus: schedule.status })

      return ok(mapToResponse(cancelled, flagKey))
    },
  }
}
