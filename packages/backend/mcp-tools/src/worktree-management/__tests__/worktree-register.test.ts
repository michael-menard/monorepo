/**
 * Unit Tests for worktree-register
 * WINT-1130 AC-5, AC-9, AC-10, AC-12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { worktreeRegister } from '../worktree-register'

// Hoist mock functions
const { mockReturning, mockValues, mockInsert, mockSelectLimit, mockSelectFrom, mockSelectWhere, mockSelect, mockWarn } = vi.hoisted(() => ({
  mockReturning: vi.fn(),
  mockValues: vi.fn(),
  mockInsert: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockSelectFrom: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockSelect: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
  },
  worktrees: { id: 'id', storyId: 'story_id', worktreePath: 'worktree_path', branchName: 'branch_name' },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn },
}))

describe('worktreeRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([])
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })
    // Mock select chain for human-readable ID resolution
    mockSelectLimit.mockResolvedValue([{ id: '00000000-0000-0000-0000-000000000001' }])
    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit })
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere })
    mockSelect.mockReturnValue({ from: mockSelectFrom })
  })

  it('should register new worktree (AC-5)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt',
      branchName: 'feature/test',
      status: 'active' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([mockWorktree])

    const result = await worktreeRegister({
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt',
      branchName: 'feature/test',
    })

    expect(result).toEqual({
      id: mockWorktree.id,
      storyId: mockWorktree.storyId,
      worktreePath: mockWorktree.worktreePath,
      branchName: mockWorktree.branchName,
      status: 'active',
      createdAt: mockWorktree.createdAt,
      updatedAt: mockWorktree.updatedAt,
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle FK constraint violation (story does not exist) (AC-12)', async () => {
    const fkError = new Error('violates foreign key constraint')
    mockReturning.mockRejectedValue(fkError)

    const result = await worktreeRegister({
      storyId: 'NONEXIST-0001',
      worktreePath: '/tmp/wt',
      branchName: 'test',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to register worktree for story 'NONEXIST-0001':",
      'violates foreign key constraint',
    )
  })

  it('should handle unique constraint violation (concurrent registration)', async () => {
    const uniqueError = new Error('duplicate key value violates unique constraint')
    mockReturning.mockRejectedValue(uniqueError)

    const result = await worktreeRegister({
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt-2',
      branchName: 'branch-2',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to register worktree for story 'WINT-1130':",
      'duplicate key value violates unique constraint',
    )
  })

  it('should fail validation with invalid storyId format', async () => {
    await expect(
      worktreeRegister({
        storyId: 'invalid',
        worktreePath: '/tmp/wt',
        branchName: 'test',
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should fail validation with empty worktreePath', async () => {
    await expect(
      worktreeRegister({
        storyId: 'WINT-1130',
        worktreePath: '',
        branchName: 'test',
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should fail validation with empty branchName', async () => {
    await expect(
      worktreeRegister({
        storyId: 'WINT-1130',
        worktreePath: '/tmp/wt',
        branchName: '',
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database connection failure', async () => {
    const dbError = new Error('Database connection failed')
    mockReturning.mockRejectedValue(dbError)

    const result = await worktreeRegister({
      storyId: 'WINT-1130',
      worktreePath: '/tmp/wt',
      branchName: 'test',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to register worktree for story 'WINT-1130':",
      'Database connection failed',
    )
  })
})
