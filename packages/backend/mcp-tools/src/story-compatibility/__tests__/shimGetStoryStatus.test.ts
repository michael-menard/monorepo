/**
 * Unit Tests: shimGetStoryStatus
 * WINT-1011 AC-1, CDBN-3010: DB-only operations
 *
 * Test scenarios:
 * - DB returns result → return immediately
 * - DB returns null → return null
 */

/* eslint-disable import/order */
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// ---------------------------------------------------------------------------
// Hoist mock setup
// ---------------------------------------------------------------------------
const { mockStoryGetStatus, mockWarn } = vi.hoisted(() => ({
  mockStoryGetStatus: vi.fn(),
  mockWarn: vi.fn(),
}))

// Prevent @repo/db from initializing at module load (no DB needed for unit tests)
vi.mock('@repo/db', () => ({
  db: {},
}))

vi.mock('../../story-management/story-get-status.js', () => ({
  storyGetStatus: mockStoryGetStatus,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

// Import AFTER mocks
import { shimGetStoryStatus } from '../index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDbStory(storyId: string) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    storyId,
    title: 'DB Story Title',
    state: 'in_progress' as const,
    priority: 'P1' as const,
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

describe('shimGetStoryStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // DB returns result → return immediately
  it('should return DB result when database has the story', async () => {
    const dbStory = makeDbStory('WINT-0090')
    mockStoryGetStatus.mockResolvedValue(dbStory)

    const result = await shimGetStoryStatus({ storyId: 'WINT-0090' })

    expect(result).toEqual(dbStory)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockStoryGetStatus).toHaveBeenCalledOnce()
    expect(mockStoryGetStatus).toHaveBeenCalledWith({ storyId: 'WINT-0090' })
  })

  // DB returns null → return null
  it('should return null when story is not found in database', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    const result = await shimGetStoryStatus({ storyId: 'WINT-9999' })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Story 'WINT-9999' not found in database"),
    )
  })

  // Query by UUID
  it('should query by UUID format', async () => {
    const dbStory = makeDbStory('WINT-0090')
    mockStoryGetStatus.mockResolvedValue(dbStory)

    const result = await shimGetStoryStatus({ storyId: '00000000-0000-0000-0000-000000000001' })

    expect(result).toEqual(dbStory)
  })
})
