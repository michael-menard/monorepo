/**
 * Audit Query Tests
 *
 * Unit tests for audit log query functions.
 *
 * @see KNOW-018 AC6-AC8 for query requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryAuditByEntry, queryAuditByTimeRange } from '../queries.js'

// Mock the logger
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('queryAuditByEntry', () => {
  let mockDb: any

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should query audit logs for a specific entry', async () => {
    const mockResults = [
      {
        id: 'audit-1',
        entryId: '123e4567-e89b-12d3-a456-426614174000',
        operation: 'add',
        previousValue: null,
        newValue: { id: '123e4567-e89b-12d3-a456-426614174000', content: 'Test' },
        timestamp: new Date('2026-01-25T10:00:00Z'),
        userContext: { correlation_id: 'test-123' },
      },
      {
        id: 'audit-2',
        entryId: '123e4567-e89b-12d3-a456-426614174000',
        operation: 'update',
        previousValue: { content: 'Test' },
        newValue: { content: 'Updated' },
        timestamp: new Date('2026-01-25T11:00:00Z'),
        userContext: null,
      },
    ]

    // Create mock chain
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockResults),
              }),
            }),
          }),
        }),
      }),
    }

    // Mock count query
    const countSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      }),
    })

    // Override select for count query first time, then results second time
    let callCount = 0
    mockDb.select = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return countSelect()
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockResults),
              }),
            }),
          }),
        }),
      }
    })

    const result = await queryAuditByEntry(
      {
        entry_id: '123e4567-e89b-12d3-a456-426614174000',
        limit: 100,
        offset: 0,
      },
      { db: mockDb },
      'test-correlation',
    )

    expect(result.results).toHaveLength(2)
    expect(result.results[0].operation).toBe('add')
    expect(result.results[1].operation).toBe('update')
    expect(result.metadata.total).toBe(2)
    expect(result.metadata.correlation_id).toBe('test-correlation')
  })

  it('should return empty results for non-existent entry', async () => {
    let callCount = 0
    mockDb = {
      select: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }
      }),
    }

    const result = await queryAuditByEntry(
      {
        entry_id: '00000000-0000-0000-0000-000000000000',
      },
      { db: mockDb },
    )

    expect(result.results).toHaveLength(0)
    expect(result.metadata.total).toBe(0)
  })

  it('should validate entry_id is a valid UUID', async () => {
    mockDb = { select: vi.fn() }

    await expect(
      queryAuditByEntry({ entry_id: 'not-a-uuid' }, { db: mockDb }),
    ).rejects.toThrow()
  })

  it('should apply pagination correctly', async () => {
    let callCount = 0
    const limitMock = vi.fn()
    const offsetMock = vi.fn().mockResolvedValue([])

    mockDb = {
      select: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 50 }]),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: limitMock.mockReturnValue({
                  offset: offsetMock,
                }),
              }),
            }),
          }),
        }
      }),
    }

    await queryAuditByEntry(
      {
        entry_id: '123e4567-e89b-12d3-a456-426614174000',
        limit: 10,
        offset: 20,
      },
      { db: mockDb },
    )

    expect(limitMock).toHaveBeenCalledWith(10)
    expect(offsetMock).toHaveBeenCalledWith(20)
  })
})

describe('queryAuditByTimeRange', () => {
  let mockDb: any

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should query audit logs within time range', async () => {
    const mockResults = [
      {
        id: 'audit-1',
        entryId: '123e4567-e89b-12d3-a456-426614174000',
        operation: 'delete',
        previousValue: { content: 'Deleted' },
        newValue: null,
        timestamp: new Date('2026-01-15T10:00:00Z'),
        userContext: null,
      },
    ]

    let callCount = 0
    mockDb = {
      select: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue(mockResults),
                }),
              }),
            }),
          }),
        }
      }),
    }

    const result = await queryAuditByTimeRange(
      {
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
      },
      { db: mockDb },
    )

    expect(result.results).toHaveLength(1)
    expect(result.results[0].operation).toBe('delete')
    expect(result.metadata.total).toBe(1)
  })

  it('should filter by operation type', async () => {
    let callCount = 0
    mockDb = {
      select: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
          }
        }
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }
      }),
    }

    const result = await queryAuditByTimeRange(
      {
        start_date: new Date('2026-01-01'),
        end_date: new Date('2026-01-31'),
        operation: 'update',
      },
      { db: mockDb },
    )

    expect(result.results).toHaveLength(0)
  })

  it('should reject if end_date is before start_date', async () => {
    mockDb = { select: vi.fn() }

    await expect(
      queryAuditByTimeRange(
        {
          start_date: new Date('2026-01-31'),
          end_date: new Date('2026-01-01'),
        },
        { db: mockDb },
      ),
    ).rejects.toThrow('end_date must be after start_date')
  })

  it('should validate limit is within bounds', async () => {
    mockDb = { select: vi.fn() }

    // Limit too high
    await expect(
      queryAuditByTimeRange(
        {
          start_date: new Date('2026-01-01'),
          end_date: new Date('2026-01-31'),
          limit: 2000,
        },
        { db: mockDb },
      ),
    ).rejects.toThrow()

    // Limit too low
    await expect(
      queryAuditByTimeRange(
        {
          start_date: new Date('2026-01-01'),
          end_date: new Date('2026-01-31'),
          limit: 0,
        },
        { db: mockDb },
      ),
    ).rejects.toThrow()
  })
})
