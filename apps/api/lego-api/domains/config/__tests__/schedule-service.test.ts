import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '@repo/api-core'
import { createScheduleService } from '../application/schedule-service.js'
import type { ScheduleRepository, FeatureFlagRepository } from '../ports/index.js'

describe('ScheduleService', () => {
  const mockFlag = {
    id: 'flag-123',
    flagKey: 'test-flag',
    enabled: false,
    rolloutPercentage: 0,
    description: 'Test flag',
    environment: 'production',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSchedule = {
    id: 'schedule-123',
    flagId: 'flag-123',
    scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
    status: 'pending' as const,
    updates: { enabled: true },
    appliedAt: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('should create schedule successfully (AC1)', async () => {
    const mockFlagRepo: Partial<FeatureFlagRepository> = {
      findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
    }

    const mockScheduleRepo: Partial<ScheduleRepository> = {
      create: vi.fn().mockResolvedValue(ok(mockSchedule)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
    })

    const result = await service.createSchedule('test-flag', {
      scheduledAt: mockSchedule.scheduledAt.toISOString(),
      updates: { enabled: true },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('schedule-123')
      expect(result.data.flagKey).toBe('test-flag')
      expect(result.data.status).toBe('pending')
    }
  })

  it('should return error when flag not found (AC1)', async () => {
    const mockFlagRepo: Partial<FeatureFlagRepository> = {
      findByKey: vi.fn().mockResolvedValue(err('NOT_FOUND')),
    }

    const mockScheduleRepo: Partial<ScheduleRepository> = {
      create: vi.fn(),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
    })

    const result = await service.createSchedule('non-existent', {
      scheduledAt: new Date(Date.now() + 3600000).toISOString(),
      updates: { enabled: true },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('INVALID_FLAG')
    }
    expect(mockScheduleRepo.create).not.toHaveBeenCalled()
  })

  it('should list all schedules for a flag (AC3)', async () => {
    const mockFlagRepo: Partial<FeatureFlagRepository> = {
      findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
    }

    const mockScheduleRepo: Partial<ScheduleRepository> = {
      findAllByFlag: vi.fn().mockResolvedValue([mockSchedule]),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
    })

    const result = await service.listSchedules('test-flag')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].flagKey).toBe('test-flag')
    }
  })

  it('should cancel schedule successfully (AC4)', async () => {
    const cancelledSchedule = { ...mockSchedule, status: 'cancelled' as const }

    const mockFlagRepo: Partial<FeatureFlagRepository> = {
      findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
    }

    const mockScheduleRepo: Partial<ScheduleRepository> = {
      findById: vi.fn().mockResolvedValue(ok(mockSchedule)),
      cancel: vi.fn().mockResolvedValue(ok(cancelledSchedule)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
    })

    const result = await service.cancelSchedule('test-flag', 'schedule-123')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('cancelled')
    }
  })
})
