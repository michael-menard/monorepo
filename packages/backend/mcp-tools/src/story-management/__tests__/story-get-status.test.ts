/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const { mockLimit, mockWhere, mockFrom, mockSelect, mockWarn } = vi.hoisted(() => ({
  mockLimit: vi.fn(),
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
    or: vi.fn((...args) => ({ or: args })),
    eq: vi.fn((col, val) => ({ eq: [col, val] })),
  }
})

import { storyGetStatus } from '../story-get-status'
import type { StoryGetStatusInput } from '../__types__/index'

describe('storyGetStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLimit.mockResolvedValue([])
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockSelect.mockReturnValue({ from: mockFrom })
    mockWarn.mockClear()
  })

  it('should retrieve story by UUID (AC-1)', async () => {
    const storyUuid = randomUUID()
    const mockStory = {
      id: storyUuid,
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
    }

    mockLimit.mockResolvedValue([mockStory])

    const input: StoryGetStatusInput = { storyId: storyUuid }
    const result = await storyGetStatus(input)

    expect(result).toEqual({
      id: storyUuid,
      storyId: 'WINT-0090',
      title: 'Create Story Management MCP Tools',
      state: 'in_progress',
      priority: 'P1',
      storyType: 'feature',
      epic: 'WINT',
      wave: 1,
      createdAt: mockStory.createdAt,
      updatedAt: mockStory.updatedAt,
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should retrieve story by human-readable ID (AC-1)', async () => {
    const storyUuid = randomUUID()
    const mockStory = {
      id: storyUuid,
      storyId: 'WINT-0090',
      title: 'Create Story Management MCP Tools',
      state: 'ready' as const,
      priority: 'P2' as const,
      storyType: 'feature',
      epic: 'WINT',
      wave: null,
      createdAt: new Date('2026-02-15T00:00:00Z'),
      updatedAt: new Date('2026-02-15T00:00:00Z'),
      description: null,
      complexity: null,
      storyPoints: null,
      metadata: null,
    }

    mockLimit.mockResolvedValue([mockStory])

    const input: StoryGetStatusInput = { storyId: 'WINT-0090' }
    const result = await storyGetStatus(input)

    expect(result).toEqual({
      id: storyUuid,
      storyId: 'WINT-0090',
      title: 'Create Story Management MCP Tools',
      state: 'ready',
      priority: 'P2',
      storyType: 'feature',
      epic: 'WINT',
      wave: null,
      createdAt: mockStory.createdAt,
      updatedAt: mockStory.updatedAt,
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should return null for non-existent story (AC-1)', async () => {
    mockLimit.mockResolvedValue([])

    const input: StoryGetStatusInput = { storyId: 'NONEXIST-0001' }
    const result = await storyGetStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should handle database errors gracefully (AC-9)', async () => {
    mockLimit.mockRejectedValue(new Error('Database connection failed'))

    const input: StoryGetStatusInput = { storyId: 'WINT-0090' }
    const result = await storyGetStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to get status for story 'WINT-0090':",
      'Database connection failed',
    )
  })

  it('should validate storyId format (AC-6)', async () => {
    const input: StoryGetStatusInput = { storyId: 'invalid-format' }

    await expect(storyGetStatus(input)).rejects.toThrow()
  })
})
