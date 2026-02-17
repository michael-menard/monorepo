/**
 * Unit Tests for worktree-mark-complete
 * WINT-1130 AC-8, AC-9, AC-10
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { worktreeMarkComplete } from '../worktree-mark-complete'

// Hoist mock functions
const { mockReturning, mockWhere, mockSet, mockUpdate, mockWarn } = vi.hoisted(() => ({
  mockReturning: vi.fn(),
  mockWhere: vi.fn(),
  mockSet: vi.fn(),
  mockUpdate: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: { update: mockUpdate },
  worktrees: { id: 'id', metadata: 'metadata' },
}))

vi.mock('@repo/logger', () => ({
  logger: { warn: mockWarn },
}))

describe('worktreeMarkComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([])
    mockWhere.mockReturnValue({ returning: mockReturning })
    mockSet.mockReturnValue({ where: mockWhere })
    mockUpdate.mockReturnValue({ set: mockSet })
  })

  it('should mark worktree as merged (AC-8)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'merged',
      mergedAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([mockWorktree])

    const result = await worktreeMarkComplete({
      worktreeId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'merged',
    })

    expect(result).toEqual({ success: true })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should mark worktree as abandoned (AC-8)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'abandoned',
      abandonedAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([mockWorktree])

    const result = await worktreeMarkComplete({
      worktreeId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'abandoned',
    })

    expect(result).toEqual({ success: true })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should mark worktree with metadata merge (AC-8)', async () => {
    const mockWorktree = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      status: 'merged',
      mergedAt: new Date(),
      updatedAt: new Date(),
      metadata: { prNumber: 123, reason: 'Merged to main' },
    }
    mockReturning.mockResolvedValue([mockWorktree])

    const result = await worktreeMarkComplete({
      worktreeId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'merged',
      metadata: { prNumber: 123, reason: 'Merged to main' },
    })

    expect(result).toEqual({ success: true })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should return null when worktree not found (AC-8)', async () => {
    mockReturning.mockResolvedValue([]) // Empty array = not found

    const result = await worktreeMarkComplete({
      worktreeId: '00000000-0000-0000-0000-000000000000',
      status: 'merged',
    })

    expect(result).toBeNull()
    expect(mockWarn).not.toHaveBeenCalled() // Not found is not an error
  })

  it('should fail validation with invalid worktreeId (not UUID)', async () => {
    await expect(
      worktreeMarkComplete({
        worktreeId: 'invalid-id',
        status: 'merged',
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should fail validation with invalid status (not merged/abandoned)', async () => {
    await expect(
      worktreeMarkComplete({
        worktreeId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'active' as any,
      }),
    ).rejects.toThrow()

    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database connection failure', async () => {
    const dbError = new Error('Database connection failed')
    mockReturning.mockRejectedValue(dbError)

    const result = await worktreeMarkComplete({
      worktreeId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'merged',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to mark worktree '123e4567-e89b-12d3-a456-426614174000' as merged:",
      'Database connection failed',
    )
  })
})
