/**
 * Unit Tests: shimGetStoriesByStatus
 * WINT-1011 AC-3, CDBN-3010: DB-only operations
 *
 * Test scenarios:
 * - DB returns results → return DB results
 * - DB returns empty [] → return empty array
 */

/* eslint-disable import/order */
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// ---------------------------------------------------------------------------
// Hoist mock setup
// ---------------------------------------------------------------------------
const { mockStoryGetByStatus, mockWarn } = vi.hoisted(() => ({
  mockStoryGetByStatus: vi.fn(),
  mockWarn: vi.fn(),
}))

// Prevent @repo/db from initializing at module load (no DB needed for unit tests)
vi.mock('@repo/db', () => ({
  db: {},
}))

vi.mock('../../story-management/story-get-by-status.js', () => ({
  storyGetByStatus: mockStoryGetByStatus,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

// Import AFTER mocks
import { shimGetStoriesByStatus } from '../index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbStory(storyId: string, state: 'in_progress' | 'ready' | 'backlog') {
  return {
    id: `00000000-0000-0000-0000-${storyId.replace('-', '').padStart(12, '0')}`,
    storyId,
    title: `Story ${storyId}`,
    state,
    priority: 'P2' as const,
    storyType: 'feature',
    epic: 'WINT',
    wave: 1,
    createdAt: new Date('2026-02-15T00:00:00Z'),
    updatedAt: new Date('2026-02-15T12:00:00Z'),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shimGetStoriesByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // DB returns results → return immediately
  it('should return DB results when database has stories', async () => {
    const dbStories = [
      makeDbStory('WINT-0090', 'in_progress'),
      makeDbStory('WINT-0091', 'in_progress'),
    ]
    mockStoryGetByStatus.mockResolvedValue(dbStories)

    const result = await shimGetStoriesByStatus({ state: 'in_progress', limit: 50, offset: 0 })

    expect(result).toEqual(dbStories)
    expect(result).toHaveLength(2)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockStoryGetByStatus).toHaveBeenCalledOnce()
  })

  // DB returns empty [] → return empty array
  it('should return empty array when DB returns empty', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const result = await shimGetStoriesByStatus({ state: 'in_progress', limit: 50, offset: 0 })

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("No stories found in database for state 'in_progress'"),
    )
  })

  // Pagination
  it('should pass pagination parameters to DB query', async () => {
    const dbStories = [makeDbStory('WINT-0090', 'ready')]
    mockStoryGetByStatus.mockResolvedValue(dbStories)

    const result = await shimGetStoriesByStatus({ state: 'ready', limit: 10, offset: 5 })

    expect(result).toEqual(dbStories)
    expect(mockStoryGetByStatus).toHaveBeenCalledWith({ state: 'ready', limit: 10, offset: 5 })
  })
})
