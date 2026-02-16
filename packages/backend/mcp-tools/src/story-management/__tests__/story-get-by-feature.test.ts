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
    asc: vi.fn(col => ({ asc: col })),
  }
})

import { storyGetByFeature } from '../story-get-by-feature'
import type { StoryGetByFeatureInput } from '../__types__/index'

describe('storyGetByFeature', () => {
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

  it('should retrieve stories by epic (AC-7)', async () => {
    const mockStories = [
      {
        id: randomUUID(),
        storyId: 'WINT-0010',
        title: 'First WINT Story',
        state: 'done' as const,
        priority: 'P1' as const,
        storyType: 'feature',
        epic: 'WINT',
        wave: 1,
        createdAt: new Date('2026-02-01T00:00:00Z'),
        updatedAt: new Date('2026-02-01T12:00:00Z'),
        description: null,
        complexity: null,
        storyPoints: null,
        metadata: null,
      },
      {
        id: randomUUID(),
        storyId: 'WINT-0090',
        title: 'Create Story Management MCP Tools',
        state: 'in_progress' as const,
        priority: 'P1' as const,
        storyType: 'feature',
        epic: 'WINT',
        wave: 2,
        createdAt: new Date('2026-02-15T00:00:00Z'),
        updatedAt: new Date('2026-02-15T12:00:00Z'),
        description: null,
        complexity: null,
        storyPoints: null,
        metadata: null,
      },
    ]

    mockOffset.mockResolvedValue(mockStories)

    const input: StoryGetByFeatureInput = { epic: 'WINT' }
    const result = await storyGetByFeature(input)

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      storyId: 'WINT-0010',
      epic: 'WINT',
    })
    expect(result[1]).toMatchObject({
      storyId: 'WINT-0090',
      epic: 'WINT',
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should support pagination (AC-8)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByFeatureInput = {
      epic: 'KBAR',
      limit: 20,
      offset: 10,
    }

    await storyGetByFeature(input)

    expect(mockLimit).toHaveBeenCalledWith(20)
    expect(mockOffset).toHaveBeenCalledWith(10)
  })

  it('should use default pagination values (AC-8)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByFeatureInput = { epic: 'WINT' }

    await storyGetByFeature(input)

    expect(mockLimit).toHaveBeenCalledWith(50)
    expect(mockOffset).toHaveBeenCalledWith(0)
  })

  it('should return empty array for no matches (AC-7)', async () => {
    mockOffset.mockResolvedValue([])

    const input: StoryGetByFeatureInput = { epic: 'NONEXIST' }
    const result = await storyGetByFeature(input)

    expect(result).toEqual([])
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully (AC-9)', async () => {
    mockOffset.mockRejectedValue(new Error('Database connection failed'))

    const input: StoryGetByFeatureInput = { epic: 'WINT' }
    const result = await storyGetByFeature(input)

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to query stories by epic 'WINT':",
      'Database connection failed',
    )
  })

  it('should validate input schema (AC-6)', async () => {
    const input = {
      epic: '',
    } as any

    await expect(storyGetByFeature(input)).rejects.toThrow()
  })

  it('should enforce max limit (AC-6)', async () => {
    const input = {
      epic: 'WINT',
      limit: 2000,
    } as any

    await expect(storyGetByFeature(input)).rejects.toThrow()
  })
})
