/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const { mockOffset, mockLimit, mockOrderBy, mockWhere, mockFrom, mockSelect, mockWarn } = vi.hoisted(() => ({
  mockOffset: vi.fn(),
  mockLimit: vi.fn(),
  mockOrderBy: vi.fn(),
  mockWhere: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
  },
  stories: {
    id: 'id',
    storyId: 'story_id',
    title: 'title',
    state: 'state',
    priority: 'priority',
    storyType: 'story_type',
    epic: 'epic',
    wave: 'wave',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
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
    eq: vi.fn((col, val) => ({ eq: [col, val] })),
    desc: vi.fn(col => ({ desc: col })),
  }
})

import { storyGetByStatus } from '../story-get-by-status'
import type { StoryGetByStatusInput } from '../__types__/index'

describe('storyGetByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOffset.mockResolvedValue([])
    mockLimit.mockReturnValue({ offset: mockOffset })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })
    mockWarn.mockClear()
  })

  it('should retrieve stories by status (AC-4)', async () => {
    const mockStories = [
      {
        id: randomUUID(),
        storyId: 'WINT-0090',
        title: 'Create Story Management MCP Tools',
        state: 'in_progress' as const,
        priority: 'P1' as const,
        storyType: 'feature',
        epic: 'WINT',
        wave: 1,
        createdAt: new Date('2026-02-15T00:00:00Z'),
        updatedAt: new Date('2026-02-15T12:00:00Z'),
        description: null,
        complexity: null,
        storyPoints: null,
        metadata: null,
      },
      {
        id: randomUUID(),
        storyId: 'WINT-0100',
        title: 'Another Story',
        state: 'in_progress' as const,
        priority: 'P2' as const,
        storyType: 'feature',
        epic: 'WINT',
        wave: 2,
        createdAt: new Date('2026-02-14T00:00:00Z'),
        updatedAt: new Date('2026-02-14T12:00:00Z'),
        description: null,
        complexity: null,
        storyPoints: null,
        metadata: null,
      },
    ]

    mockOffset.mockResolvedValue(mockStories)

    const input: StoryGetByStatusInput = { state: 'in_progress' }
    const result = await storyGetByStatus(input)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      storyId: 'WINT-0090',
      state: 'in_progress',
    })
    expect(result[1]).toMatchObject({
      storyId: 'WINT-0100',
      state: 'in_progress',
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should support pagination (AC-5)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByStatusInput = {
      state: 'ready_to_work',
      limit: 100,
      offset: 50,
    }

    await storyGetByStatus(input)

    expect(mockLimit).toHaveBeenCalledWith(100)
    expect(mockOffset).toHaveBeenCalledWith(50)
  })

  it('should use default pagination values (AC-5)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByStatusInput = { state: 'backlog' }

    await storyGetByStatus(input)

    expect(mockLimit).toHaveBeenCalledWith(50)
    expect(mockOffset).toHaveBeenCalledWith(0)
  })

  it('should return empty array for no matches (AC-4)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByStatusInput = { state: 'cancelled' }
    const result = await storyGetByStatus(input)

    expect(result).toEqual([])
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully (AC-9)', async () => {
    mockOffset.mockRejectedValue(new Error('Database connection failed'))

    const input: StoryGetByStatusInput = { state: 'in_progress' }
    const result = await storyGetByStatus(input)

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to query stories by status 'in_progress':",
      'Database connection failed',
    )
  })

  it('should validate input schema (AC-6)', async () => {
    const input = {
      state: 'invalid_state',
    } as any

    await expect(storyGetByStatus(input)).rejects.toThrow()
  })

  it('should enforce max limit (AC-6)', async () => {
    const input = {
      state: 'backlog',
      limit: 2000,
    } as any

    await expect(storyGetByStatus(input)).rejects.toThrow()
  })
})
