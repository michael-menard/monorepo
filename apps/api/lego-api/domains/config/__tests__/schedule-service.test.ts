import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '@repo/api-core'
import { createScheduleService } from '../application/schedule-service.js'
import type { ScheduleRepository, FeatureFlagRepository } from '../ports/index.js'
import type { AuditLoggerPort } from '../../../core/audit/ports.js'

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
    retryCount: 0,
    maxRetries: 3,
    nextRetryAt: null,
    lastError: null,
    createdBy: null,
    cancelledBy: null,
    cancelledAt: null,
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

    const mockAuditLogger: AuditLoggerPort = {
      logEvent: vi.fn().mockResolvedValue(ok(undefined)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
      auditLogger: mockAuditLogger,
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

    const mockAuditLogger: AuditLoggerPort = {
      logEvent: vi.fn().mockResolvedValue(ok(undefined)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
      auditLogger: mockAuditLogger,
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

    const mockAuditLogger: AuditLoggerPort = {
      logEvent: vi.fn().mockResolvedValue(ok(undefined)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
      auditLogger: mockAuditLogger,
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

    const mockAuditLogger: AuditLoggerPort = {
      logEvent: vi.fn().mockResolvedValue(ok(undefined)),
    }

    const service = createScheduleService({
      scheduleRepo: mockScheduleRepo as ScheduleRepository,
      flagRepo: mockFlagRepo as FeatureFlagRepository,
      auditLogger: mockAuditLogger,
    })

    const result = await service.cancelSchedule('test-flag', 'schedule-123')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('cancelled')
    }
  })

  // WISH-20280: Audit Logging Tests
  describe('Audit Logging (WISH-20280)', () => {
    it('should log audit event with admin context on schedule creation', async () => {
      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        create: vi.fn().mockResolvedValue(ok({ ...mockSchedule, createdBy: 'admin-123' })),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const adminContext = {
        userId: 'admin-123',
        email: 'admin@example.com',
      }

      const result = await service.createSchedule(
        'test-flag',
        {
          scheduledAt: mockSchedule.scheduledAt.toISOString(),
          updates: { enabled: true },
        },
        adminContext,
      )

      expect(result.ok).toBe(true)
      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith('flag_schedule.created', {
        scheduleId: 'schedule-123',
        flagKey: 'test-flag',
        scheduledAt: expect.any(String),
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      })
    })

    it('should log audit event on schedule cancellation', async () => {
      const cancelledSchedule = {
        ...mockSchedule,
        status: 'cancelled' as const,
        cancelledBy: 'admin-456',
        cancelledAt: new Date(),
      }

      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        findById: vi.fn().mockResolvedValue(ok(mockSchedule)),
        cancel: vi.fn().mockResolvedValue(ok(cancelledSchedule)),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const adminContext = {
        userId: 'admin-456',
        email: 'admin2@example.com',
      }

      const result = await service.cancelSchedule('test-flag', 'schedule-123', adminContext)

      expect(result.ok).toBe(true)
      expect(mockAuditLogger.logEvent).toHaveBeenCalledWith('flag_schedule.cancelled', {
        scheduleId: 'schedule-123',
        flagKey: 'test-flag',
        scheduledAt: expect.any(String),
        adminUserId: 'admin-456',
        adminEmail: 'admin2@example.com',
        reason: 'manual_cancellation',
      })
    })

    it('should not fail schedule creation if audit logging fails', async () => {
      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        create: vi.fn().mockResolvedValue(ok(mockSchedule)),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockRejectedValue(new Error('CloudWatch error')),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const adminContext = {
        userId: 'admin-123',
        email: 'admin@example.com',
      }

      const result = await service.createSchedule(
        'test-flag',
        {
          scheduledAt: mockSchedule.scheduledAt.toISOString(),
          updates: { enabled: true },
        },
        adminContext,
      )

      // Operation should succeed despite audit failure
      expect(result.ok).toBe(true)
      expect(mockScheduleRepo.create).toHaveBeenCalled()
    })

    it('should persist createdBy to database on schedule creation', async () => {
      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const createSpy = vi.fn().mockResolvedValue(ok(mockSchedule))
      const mockScheduleRepo: Partial<ScheduleRepository> = {
        create: createSpy,
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const adminContext = {
        userId: 'admin-123',
        email: 'admin@example.com',
      }

      await service.createSchedule(
        'test-flag',
        {
          scheduledAt: mockSchedule.scheduledAt.toISOString(),
          updates: { enabled: true },
        },
        adminContext,
      )

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'admin-123',
        }),
      )
    })

    it('should persist cancelledBy to database on schedule cancellation', async () => {
      const cancelledSchedule = { ...mockSchedule, status: 'cancelled' as const }

      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const cancelSpy = vi.fn().mockResolvedValue(ok(cancelledSchedule))
      const mockScheduleRepo: Partial<ScheduleRepository> = {
        findById: vi.fn().mockResolvedValue(ok(mockSchedule)),
        cancel: cancelSpy,
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const adminContext = {
        userId: 'admin-456',
        email: 'admin2@example.com',
      }

      await service.cancelSchedule('test-flag', 'schedule-123', adminContext)

      expect(cancelSpy).toHaveBeenCalledWith('schedule-123', 'admin-456')
    })
  })

  // WISH-20280: Backward Compatibility Tests
  describe('Backward Compatibility (WISH-20280 AC13)', () => {
    it('should handle schedule with NULL admin fields in response', async () => {
      const scheduleWithNullFields = {
        ...mockSchedule,
        createdBy: null,
        cancelledBy: null,
        cancelledAt: null,
      }

      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        findAllByFlag: vi.fn().mockResolvedValue([scheduleWithNullFields]),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const result = await service.listSchedules('test-flag')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].createdBy).toBeUndefined()
        expect(result.data[0].cancelledBy).toBeUndefined()
        expect(result.data[0].cancelledAt).toBeUndefined()
      }
    })

    it('should create schedule without admin context', async () => {
      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        create: vi.fn().mockResolvedValue(ok(mockSchedule)),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const result = await service.createSchedule('test-flag', {
        scheduledAt: mockSchedule.scheduledAt.toISOString(),
        updates: { enabled: true },
      })

      expect(result.ok).toBe(true)
      // Audit logger should not be called when no admin context
      expect(mockAuditLogger.logEvent).not.toHaveBeenCalled()
    })

    it('should include admin tracking fields in GET response when present', async () => {
      const scheduleWithCreatedBy = {
        ...mockSchedule,
        createdBy: 'admin-789',
      }

      const mockFlagRepo: Partial<FeatureFlagRepository> = {
        findByKey: vi.fn().mockResolvedValue(ok(mockFlag)),
      }

      const mockScheduleRepo: Partial<ScheduleRepository> = {
        findAllByFlag: vi.fn().mockResolvedValue([scheduleWithCreatedBy]),
      }

      const mockAuditLogger: AuditLoggerPort = {
        logEvent: vi.fn().mockResolvedValue(ok(undefined)),
      }

      const service = createScheduleService({
        scheduleRepo: mockScheduleRepo as ScheduleRepository,
        flagRepo: mockFlagRepo as FeatureFlagRepository,
        auditLogger: mockAuditLogger,
      })

      const result = await service.listSchedules('test-flag')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].createdBy).toBe('admin-789')
      }
    })
  })
})
