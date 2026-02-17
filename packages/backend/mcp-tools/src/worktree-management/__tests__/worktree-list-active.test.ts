/**
 * Unit Tests for worktree-list-active
 * WINT-1130 AC-7, AC-9, AC-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { worktreeListActive } from '../worktree-list-active'

// Hoist mock functions
const { mockOffset, mockLimit, mockOrderBy, mockWhere, mockInnerJoin, mockFrom, mockSelect, mockWarn } = vi.hoisted(() => ({
  mockOffset: vi.fn(),
  mockLimit: vi.fn(),
  mockOrderBy: vi.fn(),
  mockWhere: vi.fn(),
  mockInnerJoin: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: { select: mockSelect },
  worktrees: { id: 'id', storyId: 'story_id', status: 'status' },
  stories: { id: 'id', storyId: 'story_id' },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn },
}))

describe('worktreeListActive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOffset.mockResolvedValue([])
    mockLimit.mockReturnValue({ offset: mockOffset })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockInnerJoin.mockReturnValue({ where: mockWhere })
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValue({ from: mockFrom })
  })

  it('should list active worktrees with default pagination (AC-7)', async () => {
    const mockWorktrees = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        storyId: 'WINT-1130',
        worktreePath: '/tmp/wt-1',
        branchName: 'feature/test-1',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        abandonedAt: null,
        metadata: null,
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174000',
        storyId: 'WINT-1140',
        worktreePath: '/tmp/wt-2',
        branchName: 'feature/test-2',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        abandonedAt: null,
        metadata: { sessionId: 'session-2' },
      },
    ]
    mockOffset.mockResolvedValue(mockWorktrees)

    const result = await worktreeListActive({})

    expect(result).toHaveLength(2)
    expect(result[0].metadata).toEqual({}) // null converted to empty object
    expect(result[1].metadata).toEqual({ sessionId: 'session-2' })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should list active worktrees with custom limit/offset (AC-7)', async () => {
    const mockWorktrees = [
      {
        id: '323e4567-e89b-12d3-a456-426614174000',
        storyId: 'WINT-1150',
        worktreePath: '/tmp/wt-3',
        branchName: 'feature/test-3',
        status: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        mergedAt: null,
        abandonedAt: null,
        metadata: null,
      },
    ]
    mockOffset.mockResolvedValue(mockWorktrees)

    const result = await worktreeListActive({
      limit: 100,
      offset: 50,
    })

    expect(result).toHaveLength(1)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should return empty array when offset beyond total count (AC-7)', async () => {
    mockOffset.mockResolvedValue([])

    const result = await worktreeListActive({
      offset: 999999,
    })

    expect(result).toEqual([])
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should fail validation when limit exceeds max (1000)', async () => {
    await expect(
      worktreeListActive({
        limit: 1001,
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should fail validation when offset is negative', async () => {
    await expect(
      worktreeListActive({
        offset: -1,
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database connection failure', async () => {
    const dbError = new Error('Database connection failed')
    mockOffset.mockRejectedValue(dbError)

    const result = await worktreeListActive({})

    expect(result).toEqual([]) // Returns empty array on error
    expect(mockWarn).toHaveBeenCalledWith(
      '[mcp-tools] Failed to list active worktrees:',
      'Database connection failed',
    )
  })
})
