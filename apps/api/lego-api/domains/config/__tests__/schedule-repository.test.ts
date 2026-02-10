import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createScheduleRepository } from '../adapters/schedule-repository.js'

describe('ScheduleRepository', () => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    execute: vi.fn(),
  }

  const mockSchema = {
    featureFlagSchedules: {},
    featureFlags: {},
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create schedule with pending status (AC2)', async () => {
    const mockSchedule = {
      id: 'schedule-123',
      flagId: 'flag-123',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Mock flag exists check
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 'flag-123' }]),
      }),
    })

    // Mock insert
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSchedule]),
      }),
    })

    const repo = createScheduleRepository(mockDb, mockSchema)
    const result = await repo.create({
      flagId: 'flag-123',
      scheduledAt: new Date(),
      updates: { enabled: true },
    })

    expect(result.ok).toBe(true)
  })

  it('should return error when flag not found on create (AC2)', async () => {
    // Mock flag does not exist
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const repo = createScheduleRepository(mockDb, mockSchema)
    const result = await repo.create({
      flagId: 'non-existent',
      scheduledAt: new Date(),
      updates: { enabled: true },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('INVALID_FLAG')
    }
  })

  it('should find pending schedules with lock (AC7, AC10)', async () => {
    const mockSchedules = [
      {
        id: 'schedule-1',
        flagId: 'flag-123',
        scheduledAt: new Date(),
        status: 'pending',
        updates: { enabled: true },
        appliedAt: null,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    mockDb.execute.mockResolvedValue(mockSchedules)

    const repo = createScheduleRepository(mockDb, mockSchema)
    const schedules = await repo.findPendingWithLock(100)

    expect(schedules).toHaveLength(1)
    expect(mockDb.execute).toHaveBeenCalled()
  })
})
