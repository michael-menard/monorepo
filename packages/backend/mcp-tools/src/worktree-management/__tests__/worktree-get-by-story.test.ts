/**
 * Unit Tests for worktree-get-by-story
 * WINT-1130 AC-6, AC-9, AC-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { worktreeGetByStory } from '../worktree-get-by-story'

// Hoist mock functions
const { mockLimit, mockWhere, mockInnerJoin, mockFrom, mockSelect, mockWarn } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
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

describe('worktreeGetByStory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockInnerJoin.mockReturnValue({ where: mockWhere })
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValue({ from: mockFrom })
  })

  it('should retrieve worktree by UUID (AC-6)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt',
      branchName: 'feature/test',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      mergedAt: null,
      abandonedAt: null,
      metadata: { sessionId: 'session-1' },
    }
    mockLimit.mockResolvedValue([mockWorktree])

    const result = await worktreeGetByStory({
      storyId: '123e4567-e89b-12d3-a456-426614174000',
    })

    expect(result).toEqual({
      ...mockWorktree,
      metadata: { sessionId: 'session-1' },
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should retrieve worktree by human-readable ID (AC-6)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt',
      branchName: 'feature/test',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      mergedAt: null,
      abandonedAt: null,
      metadata: null,
    }
    mockLimit.mockResolvedValue([mockWorktree])

    const result = await worktreeGetByStory({
      storyId: 'WINT-1130',
    })

    expect(result).toEqual({
      ...mockWorktree,
      metadata: {}, // null converted to empty object
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should return null when no active worktree found (AC-6)', async () => {
    mockLimit.mockResolvedValue([])

    const result = await worktreeGetByStory({
      storyId: 'WINT-1130',
    })

    expect(result).toBeNull()
    expect(mockWarn).not.toHaveBeenCalled() // Not found is not an error
  })

  it('should fail validation with invalid storyId format', async () => {
    await expect(
      worktreeGetByStory({
        storyId: 'invalid',
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database connection failure', async () => {
    const dbError = new Error('Database connection failed')
    mockLimit.mockRejectedValue(dbError)

    const result = await worktreeGetByStory({
      storyId: 'WINT-1130',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to get worktree for story 'WINT-1130':",
      'Database connection failed',
    )
  })
})
