/**
 * Unit Tests: shimUpdateStoryStatus
 * WINT-1011 AC-2
 *
 * Test scenarios:
 * - DB write success → return updated story record
 * - DB unavailable (null returned) → return null + warn log, NO filesystem write [AC-2]
 * - DB write fails (non-existent story) → return null (delegated to storyUpdateStatus)
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

// Mock fs module to detect any accidental filesystem writes (AC-2 hard constraint)
const { mockFsWriteFile } = vi.hoisted(() => ({
  mockFsWriteFile: vi.fn(),
}))

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    writeFile: mockFsWriteFile,
  }
})

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
  it('should return updated story record on successful DB write (AC-2)', async () => {
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
    // AC-2 hard constraint: NO filesystem write on success either
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  // AC-2: DB unavailable → null + warn, NO filesystem write
  it('should return null and log warning when DB is unavailable (AC-2)', async () => {
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'WINT-1011',
      newState: 'ready_for_qa',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("DB write failed for story 'WINT-1011'"),
    )
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('no filesystem fallback'))
    // AC-2 HARD CONSTRAINT: no filesystem write ever
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  // AC-2: Non-existent story → null from storyUpdateStatus → null from shim
  it('should return null when story does not exist in DB (AC-2)', async () => {
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'NONEX-0001',
      newState: 'completed',
    })

    expect(result).toBeNull()
    // AC-2 HARD CONSTRAINT: no filesystem write
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  // AC-2: DB error (exception propagated as null from storyUpdateStatus) → null, no FS write
  it('should return null and NOT write to filesystem on DB error (AC-2)', async () => {
    // storyUpdateStatus catches errors and returns null
    mockStoryUpdateStatus.mockResolvedValue(null)

    const result = await shimUpdateStoryStatus({
      storyId: 'WINT-0090',
      newState: 'blocked',
      reason: 'Waiting for dependency',
    })

    expect(result).toBeNull()
    expect(mockFsWriteFile).not.toHaveBeenCalled()
  })

  // Options parameter accepted without error (API consistency)
  it('should accept options parameter without error (API consistency)', async () => {
    mockStoryUpdateStatus.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000002',
      storyId: 'TEST-0001',
      state: 'completed' as const,
      updatedAt: new Date(),
    })

    const result = await shimUpdateStoryStatus(
      { storyId: 'TEST-0001', newState: 'completed' },
      { storiesRoot: '/some/path' },
    )

    expect(result).not.toBeNull()
    expect(result?.state).toBe('completed')
  })
})
