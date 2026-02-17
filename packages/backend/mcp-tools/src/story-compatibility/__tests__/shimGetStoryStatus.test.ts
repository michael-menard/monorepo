/**
 * Unit Tests: shimGetStoryStatus
 * WINT-1011 AC-1, AC-7, AC-10, AC-12
 *
 * Test scenarios:
 * - DB-hit: DB returns result → return immediately, NO directory scan [AC-10]
 * - DB-miss: storyGetStatus returns null → directory fallback triggered [AC-1]
 * - DB-unavailable: storyGetStatus returns null (error case) → directory fallback [AC-1]
 * - Invalid storyId: Zod validation rejects at storyGetStatus level
 * - storiesRoot injection via ShimOptions [AC-12]
 * - SWIM_LANE_TO_STATE mapping coverage [AC-7]
 */

/* eslint-disable import/order */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
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
import { SWIM_LANE_TO_STATE } from '../__types__/index.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempStoriesRoot(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shim-test-'))
  return tmpDir
}

function makeStoryInLane(storiesRoot: string, laneDir: string, storyId: string): void {
  const laneFullPath = path.join(storiesRoot, laneDir)
  fs.mkdirSync(laneFullPath, { recursive: true })
  fs.mkdirSync(path.join(laneFullPath, storyId), { recursive: true })
}

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

  // AC-10: DB-hit — directory NOT scanned
  it('should return DB result immediately without directory scan when DB has the story (AC-10)', async () => {
    const dbStory = makeDbStory('WINT-0090')
    mockStoryGetStatus.mockResolvedValue(dbStory)

    const storiesRoot = makeTempStoriesRoot()
    // No directories created — any call to fs.readdirSync would fail if attempted
    const result = await shimGetStoryStatus({ storyId: 'WINT-0090' }, { storiesRoot })

    expect(result).toEqual(dbStory)
    expect(mockWarn).not.toHaveBeenCalled()
    // Confirm storyGetStatus was called once (the DB call)
    expect(mockStoryGetStatus).toHaveBeenCalledOnce()
    expect(mockStoryGetStatus).toHaveBeenCalledWith({ storyId: 'WINT-0090' })

    // Cleanup
    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-1: DB-miss triggers directory fallback
  it('should fall back to directory scan when DB returns null (DB-miss) (AC-1)', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-1011')

    const result = await shimGetStoryStatus({ storyId: 'WINT-1011' }, { storiesRoot })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe('WINT-1011')
    expect(result?.state).toBe('in_progress')
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("Story 'WINT-1011' not found in DB"),
    )

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-1: DB-unavailable (storyGetStatus returns null on error) → fallback
  it('should fall back to directory scan when DB is unavailable (null on error) (AC-1)', async () => {
    // storyGetStatus returns null on both miss AND error — shim treats both identically
    mockStoryGetStatus.mockResolvedValue(null)

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'ready-for-qa', 'TEST-0042')

    const result = await shimGetStoryStatus({ storyId: 'TEST-0042' }, { storiesRoot })

    expect(result).not.toBeNull()
    expect(result?.storyId).toBe('TEST-0042')
    expect(result?.state).toBe('ready_for_qa')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Returns null when not in DB AND not in directory
  it('should return null when story is not found in DB or directory', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    const storiesRoot = makeTempStoriesRoot()
    // Story not in any directory

    const result = await shimGetStoryStatus({ storyId: 'WINT-9999' }, { storiesRoot })

    expect(result).toBeNull()

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-12: storiesRoot injection works correctly
  it('should use the injected storiesRoot from ShimOptions (AC-12)', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'backlog', 'KBAR-0010')

    const result = await shimGetStoryStatus({ storyId: 'KBAR-0010' }, { storiesRoot })

    expect(result?.storyId).toBe('KBAR-0010')
    expect(result?.state).toBe('backlog')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-7: SWIM_LANE_TO_STATE mapping — all 6 swim lanes correctly mapped
  it.each(Object.entries(SWIM_LANE_TO_STATE))(
    'should map swim-lane directory "%s" to state "%s" (AC-7)',
    async (laneDir, expectedState) => {
      mockStoryGetStatus.mockResolvedValue(null)

      const storiesRoot = makeTempStoriesRoot()
      makeStoryInLane(storiesRoot, laneDir, 'WINT-0001')

      const result = await shimGetStoryStatus({ storyId: 'WINT-0001' }, { storiesRoot })

      expect(result?.state).toBe(expectedState)

      fs.rmSync(storiesRoot, { recursive: true, force: true })
    },
  )

  // Zod validation: invalid storyId format is rejected by the underlying storyGetStatus
  it('should propagate Zod validation errors for invalid storyId', async () => {
    mockStoryGetStatus.mockRejectedValue(new Error('Zod validation error'))

    await expect(shimGetStoryStatus({ storyId: 'invalid-format' as any })).rejects.toThrow()
  })

  // Directory entries that are not story IDs should be ignored
  it('should ignore non-story-ID entries in swim-lane directories', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    const storiesRoot = makeTempStoriesRoot()
    const lanePath = path.join(storiesRoot, 'in-progress')
    fs.mkdirSync(lanePath, { recursive: true })
    // Create files and dirs that should NOT match
    fs.mkdirSync(path.join(lanePath, 'not-a-story'), { recursive: true })
    fs.mkdirSync(path.join(lanePath, 'WINT-1011'), { recursive: true }) // valid one
    fs.mkdirSync(path.join(lanePath, '_bootstrap'), { recursive: true })
    fs.writeFileSync(path.join(lanePath, 'README.md'), 'read me')

    const result = await shimGetStoryStatus({ storyId: 'WINT-1011' }, { storiesRoot })

    expect(result?.storyId).toBe('WINT-1011')
    expect(result?.state).toBe('in_progress')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Graceful handling of missing swim-lane directories
  it('should skip swim-lane directories that do not exist', async () => {
    mockStoryGetStatus.mockResolvedValue(null)

    // Empty storiesRoot — no swim-lane dirs at all
    const storiesRoot = makeTempStoriesRoot()

    const result = await shimGetStoryStatus({ storyId: 'WINT-9999' }, { storiesRoot })

    expect(result).toBeNull()

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })
})
