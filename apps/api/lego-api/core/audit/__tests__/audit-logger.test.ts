/**
 * Audit Logger Tests (WISH-20280)
 *
 * Tests for CloudWatch audit logger implementation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AuditLogger } from '../audit-logger.js'
import type {
  CreatedEventMetadata,
  CancelledEventMetadata,
  AppliedEventMetadata,
  FailedEventMetadata,
} from '../types.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Import mocked logger after mock setup
import { logger } from '@repo/logger'

describe('AuditLogger', () => {
  let auditLogger: AuditLogger

  beforeEach(() => {
    auditLogger = new AuditLogger()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logEvent - created events', () => {
    it('should log created event at INFO level', async () => {
      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      await auditLogger.logEvent('flag_schedule.created', metadata)

      expect(logger.info).toHaveBeenCalledWith(
        'Audit event: flag_schedule.created',
        expect.objectContaining({
          eventType: 'flag_schedule.created',
          scheduleId: '550e8400-e29b-41d4-a716-446655440000',
          flagKey: 'test-flag',
          scheduledAt: '2026-02-10T12:00:00.000Z',
          updates: { enabled: true },
          adminUserId: 'admin-123',
          adminEmail: 'admin@example.com',
          timestamp: expect.any(String),
        }),
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('logEvent - cancelled events', () => {
    it('should log cancelled event at INFO level', async () => {
      const metadata: CancelledEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440001',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        adminUserId: 'admin-456',
        adminEmail: 'admin2@example.com',
        reason: 'manual_cancellation',
      }

      await auditLogger.logEvent('flag_schedule.cancelled', metadata)

      expect(logger.info).toHaveBeenCalledWith(
        'Audit event: flag_schedule.cancelled',
        expect.objectContaining({
          eventType: 'flag_schedule.cancelled',
          scheduleId: '550e8400-e29b-41d4-a716-446655440001',
          flagKey: 'test-flag',
          scheduledAt: '2026-02-10T12:00:00.000Z',
          adminUserId: 'admin-456',
          adminEmail: 'admin2@example.com',
          reason: 'manual_cancellation',
          timestamp: expect.any(String),
        }),
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('logEvent - applied events', () => {
    it('should log applied event at INFO level', async () => {
      const metadata: AppliedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440002',
        flagKey: 'test-flag',
        updates: { enabled: true, rolloutPercentage: 50 },
        appliedAt: '2026-02-10T12:00:00.000Z',
        flagState: {
          enabled: true,
          rolloutPercentage: 50,
        },
      }

      await auditLogger.logEvent('flag_schedule.applied', metadata)

      expect(logger.info).toHaveBeenCalledWith(
        'Audit event: flag_schedule.applied',
        expect.objectContaining({
          eventType: 'flag_schedule.applied',
          scheduleId: '550e8400-e29b-41d4-a716-446655440002',
          flagKey: 'test-flag',
          updates: { enabled: true, rolloutPercentage: 50 },
          appliedAt: '2026-02-10T12:00:00.000Z',
          flagState: {
            enabled: true,
            rolloutPercentage: 50,
          },
          timestamp: expect.any(String),
        }),
      )
      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('logEvent - failed events', () => {
    it('should log failed event at ERROR level', async () => {
      const metadata: FailedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440003',
        flagKey: 'test-flag',
        errorMessage: 'Database connection failed',
        failedAt: '2026-02-10T12:00:00.000Z',
      }

      await auditLogger.logEvent('flag_schedule.failed', metadata)

      expect(logger.error).toHaveBeenCalledWith(
        'Audit event: flag_schedule.failed',
        expect.objectContaining({
          eventType: 'flag_schedule.failed',
          scheduleId: '550e8400-e29b-41d4-a716-446655440003',
          flagKey: 'test-flag',
          errorMessage: 'Database connection failed',
          failedAt: '2026-02-10T12:00:00.000Z',
          timestamp: expect.any(String),
        }),
      )
      expect(logger.info).not.toHaveBeenCalled()
    })
  })

  describe('logEvent - fire-and-forget pattern', () => {
    it('should not throw on success', async () => {
      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      await expect(auditLogger.logEvent('flag_schedule.created', metadata)).resolves.toBeUndefined()
    })
  })

  describe('logEvent - error handling', () => {
    it('should not throw when logging throws (fire-and-forget)', async () => {
      vi.mocked(logger.info).mockImplementationOnce(() => {
        throw new Error('CloudWatch API error')
      })

      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      // Should not throw despite logger throwing
      await expect(auditLogger.logEvent('flag_schedule.created', metadata)).resolves.toBeUndefined()
    })

    it('should log audit logging failure to CloudWatch', async () => {
      const error = new Error('CloudWatch API error')
      vi.mocked(logger.info).mockImplementationOnce(() => {
        throw error
      })

      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      await auditLogger.logEvent('flag_schedule.created', metadata)

      // Verify error was logged (second call to logger.error)
      expect(logger.error).toHaveBeenCalledWith('Audit logging failed', {
        error: 'CloudWatch API error',
        eventType: 'flag_schedule.created',
        metadata,
      })
    })

    it('should handle non-Error exceptions when logging failure', async () => {
      vi.mocked(logger.info).mockImplementationOnce(() => {
        throw 'string error'
      })

      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      await auditLogger.logEvent('flag_schedule.created', metadata)

      expect(logger.error).toHaveBeenCalledWith('Audit logging failed', {
        error: 'Unknown error',
        eventType: 'flag_schedule.created',
        metadata,
      })
    })
  })

  describe('logEvent - timestamp handling', () => {
    it('should include timestamp in structured metadata', async () => {
      const beforeCall = new Date().toISOString()

      const metadata: CreatedEventMetadata = {
        scheduleId: '550e8400-e29b-41d4-a716-446655440000',
        flagKey: 'test-flag',
        scheduledAt: '2026-02-10T12:00:00.000Z',
        updates: { enabled: true },
        adminUserId: 'admin-123',
        adminEmail: 'admin@example.com',
      }

      await auditLogger.logEvent('flag_schedule.created', metadata)

      const afterCall = new Date().toISOString()

      expect(logger.info).toHaveBeenCalledWith(
        'Audit event: flag_schedule.created',
        expect.objectContaining({
          timestamp: expect.any(String),
        }),
      )

      // Verify timestamp is in ISO format and within expected range
      const call = vi.mocked(logger.info).mock.calls[0]
      const loggedMetadata = call[1] as { timestamp: string }
      const timestamp = loggedMetadata.timestamp

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(timestamp >= beforeCall && timestamp <= afterCall).toBe(true)
    })
  })
})
