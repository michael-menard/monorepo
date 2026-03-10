/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const { mockTransaction, mockWarn } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    transaction: mockTransaction,
  },
  stories: {
    id: 'id',
    storyId: 'story_id',
    state: 'state',
    updatedAt: 'updated_at',
  },
  storyStates: {
    storyId: 'story_id',
    state: 'state',
    exitedAt: 'exited_at',
    updatedAt: 'updated_at',
  },
  storyTransitions: {},
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm')
  return {
    ...actual,
    or: vi.fn((...args) => ({ or: args })),
    eq: vi.fn((col, val) => ({ eq: [col, val] })),
  }
})

import { storyUpdateStatus } from '../story-update-status'
import type { StoryUpdateStatusInput } from '../__types__/index'

describe('storyUpdateStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWarn.mockClear()
  })

  it('should update story state with full transaction (AC-2, AC-3)', async () => {
    const storyUuid = randomUUID()
    const currentStory = {
      id: storyUuid,
      storyId: 'WINT-0090',
      state: 'ready' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }

    const updatedStory = {
      id: storyUuid,
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    }

    // Mock transaction callback execution with proper chaining
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([currentStory]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedStory]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
      reason: 'Starting implementation',
      triggeredBy: 'dev-execute-leader',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toEqual({
      id: storyUuid,
      storyId: 'WINT-0090',
      state: 'in_progress',
      updatedAt: updatedStory.updatedAt,
    })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should skip update if state unchanged (AC-2)', async () => {
    const storyUuid = randomUUID()
    const currentStory = {
      id: storyUuid,
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }

    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([currentStory]),
            }),
          }),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toEqual({
      id: storyUuid,
      storyId: 'WINT-0090',
      state: 'in_progress',
      updatedAt: currentStory.updatedAt,
    })
  })

  it('should return null for non-existent story (AC-2)', async () => {
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'NOEXIST-001',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Story 'NOEXIST-001' not found for status update",
    )
  })

  it('should handle transaction errors gracefully (AC-9)', async () => {
    mockTransaction.mockRejectedValue(new Error('Transaction failed'))

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to update status for story 'WINT-0090':",
      'Transaction failed',
    )
  })

  it('should validate input schema (AC-6)', async () => {
    const input = {
      storyId: 'invalid',
      newState: 'invalid_state',
    } as any

    await expect(storyUpdateStatus(input)).rejects.toThrow()
  })
})
