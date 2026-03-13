/**
 * Unit Tests: shimUpdateStoryStatus
 * WINT-1011 AC-2, CDBN-3010: DB-only operations
 *
 * Test scenarios:
 * - DB write success → return updated story record
 * - DB unavailable (null returned) → return null + warn log
 * - DB write fails (non-existent story) → return null
 */

/* eslint-disable import/order */
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// ---------------------------------------------------------------------------
// Hoist mock setup
// ---------------------------------------------------------------------------
const { mockStoryUpdateStatus, mockWarn } = vi.hoisted(() => ({
  mockStoryUpdateStatus: vi.fn(),
  mockWarn: vi.fn(),
}))

// Prevent @repo/db from initializing at module load (no DB needed for unit tests)
vi.mock('@repo/db', () => ({
  db: {},
}))

vi.mock('../../story-management/story-update-status.js', () => ({
  storyUpdateStatus: mockStoryUpdateStatus,
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

// Import AFTER mocks
import { shimUpdateStoryStatus } from '../index.js'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shimUpdateStoryStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC-2: DB write success
  it('should return updated story record on successful DB write', async () => {
    const updatedStory = {
      id: '00000000-0000-0000-0000-000000000001',
      storyId: 'WINT-1011',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-17T10:00:00Z'),
    }
    mockStoryUpdateStatus.mockResolvedValue(updatedStory)

    const result = await shimUpdateStoryStatus({
      storyId: 'WINT-1011',
      newState: 'in_progress',
      reason: 'Starting implementation',
      triggeredBy: 'dev-execute-leader',
    })

    expect(result).toEqual(updatedStory)
    expect(mockStoryUpdateStatus).toHaveBeenCalledOnce()
    expect(mockStoryUpdateStatus).toHaveBeenCalledWith({
      storyId: 'WINT-1011',
      newState: 'in_progress',
      reason: 'Starting implementation',
      triggeredBy: 'dev-execute-leader',
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  // DB unavailable → null + warn
  it('should return null and log warning when DB is unavailable', async () => {
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'WINT-1011',
      newState: 'ready_for_qa',
      triggeredBy: 'test',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Story 'WINT-1011' not found in database"),
    )
  })

  // Non-existent story → null from storyUpdateStatus → null from shim
  it('should return null when story does not exist in DB', async () => {
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'NONEX-0001',
      newState: 'completed',
      triggeredBy: 'test',
    })

    expect(result).toBeNull()
  })

  // DB error (exception propagated as null from storyUpdateStatus) → null
  it('should return null on DB error', async () => {
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'WINT-0090',
      newState: 'blocked',
      reason: 'Waiting for dependency',
      triggeredBy: 'test',
    })

    expect(result).toBeNull()
  })
})
