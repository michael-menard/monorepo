/**
 * Unit Tests: shimGetStoriesByFeature
 * WINT-1011 AC-4, CDBN-3010: DB-only operations
 *
 * Test scenarios:
 * - DB returns results → return DB results
 * - DB returns empty [] → return empty array
 * - No stories found in DB → return []
 */

/* eslint-disable import/order */
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// ---------------------------------------------------------------------------
// Hoist mock setup
// ---------------------------------------------------------------------------
const { mockStoryGetByFeature, mockWarn } = vi.hoisted(() => ({
  mockStoryGetByFeature: vi.fn(),
  mockWarn: vi.fn(),
}))

// Prevent @repo/db from initializing at module load (no DB needed for unit tests)
vi.mock('@repo/db', () => ({
  db: {},
}))

vi.mock('../../story-management/story-get-by-feature.js', () => ({
  storyGetByFeature: mockStoryGetByFeature,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

// Import AFTER mocks
import { shimGetStoriesByFeature } from '../index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbStory(storyId: string, epic: string) {
  return {
    id: `00000000-0000-0000-0000-${storyId.replace('-', '').padStart(12, '0')}`,
    storyId,
    title: `Story ${storyId}`,
    state: 'in_progress' as const,
    priority: 'P2' as const,
    storyType: 'feature',
    epic,
    wave: 1,
    createdAt: new Date('2026-02-15T00:00:00Z'),
    updatedAt: new Date('2026-02-15T12:00:00Z'),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shimGetStoriesByFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // DB returns results → return immediately
  it('should return DB results when database has stories', async () => {
    const dbStories = [makeDbStory('WINT-0090', 'WINT'), makeDbStory('WINT-1011', 'WINT')]
    mockStoryGetByFeature.mockResolvedValue(dbStories)

    const result = await shimGetStoriesByFeature({ epic: 'WINT', limit: 50, offset: 0 })

    expect(result).toEqual(dbStories)
    expect(result).toHaveLength(2)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockStoryGetByFeature).toHaveBeenCalledOnce()
    expect(mockStoryGetByFeature).toHaveBeenCalledWith({ epic: 'WINT', limit: 50, offset: 0 })
  })

  // DB returns empty [] → return empty array
  it('should return empty array when DB returns empty', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const result = await shimGetStoriesByFeature({ epic: 'KBAR', limit: 50, offset: 0 })

    expect(result).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("No stories found in database for epic 'KBAR'"),
    )
  })

  // Pagination
  it('should pass pagination parameters to DB query', async () => {
    const dbStories = [makeDbStory('WINT-0090', 'WINT')]
    mockStoryGetByFeature.mockResolvedValue(dbStories)

    const result = await shimGetStoriesByFeature({ epic: 'WINT', limit: 10, offset: 5 })

    expect(result).toEqual(dbStories)
    expect(mockStoryGetByFeature).toHaveBeenCalledWith({ epic: 'WINT', limit: 10, offset: 5 })
  })
})
