/**
 * Unit Tests: shimGetStoriesByStatus
 * WINT-1011 AC-3, AC-10, AC-12
 *
 * Test scenarios:
 * - DB returns results → return DB results, NO directory scan [AC-10]
 * - DB returns empty [] → fall back to directory scan [AC-3]
 * - DB-only states (blocked, cancelled) → return [] immediately (no directory for those)
 * - storiesRoot injection via ShimOptions [AC-12]
 * - Pagination applied to directory results
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

function makeTempStoriesRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shim-status-test-'))
}

function makeStoryInLane(storiesRoot: string, laneDir: string, storyId: string): void {
  const lanePath = path.join(storiesRoot, laneDir)
  fs.mkdirSync(lanePath, { recursive: true })
  fs.mkdirSync(path.join(lanePath, storyId), { recursive: true })
}

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

  // AC-10: DB returns results → return immediately, no directory scan
  it('should return DB results without directory scan when DB has stories (AC-10)', async () => {
    const dbStories = [
      makeDbStory('WINT-0090', 'in_progress'),
      makeDbStory('WINT-0091', 'in_progress'),
    ]
    mockStoryGetByStatus.mockResolvedValue(dbStories)

    const storiesRoot = makeTempStoriesRoot()

    const result = await shimGetStoriesByStatus({ state: 'in_progress' }, { storiesRoot })

    expect(result).toEqual(dbStories)
    expect(result).toHaveLength(2)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockStoryGetByStatus).toHaveBeenCalledOnce()

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-3: DB returns empty [] → trigger directory fallback
  it('should fall back to directory scan when DB returns empty array (AC-3)', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-1011')
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-1012')
    // A story in a different state should not appear
    makeStoryInLane(storiesRoot, 'backlog', 'WINT-1013')

    const result = await shimGetStoriesByStatus({ state: 'in_progress' }, { storiesRoot })

    expect(result).toHaveLength(2)
    expect(result.every(s => s.state === 'in_progress')).toBe(true)
    const storyIds = result.map(s => s.storyId)
    expect(storyIds).toContain('WINT-1011')
    expect(storyIds).toContain('WINT-1012')
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('DB returned empty for state'))

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-3: empty directory → return []
  it('should return empty array when DB empty and no directory stories match (AC-3)', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'backlog', 'WINT-0001')
    // No 'in-progress' stories

    const result = await shimGetStoriesByStatus({ state: 'in_progress' }, { storiesRoot })

    expect(result).toEqual([])

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // DB-only states (blocked, cancelled) → no directory fallback possible
  it('should return empty array for blocked state (DB-only, no directory equivalent)', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()

    const result = await shimGetStoriesByStatus({ state: 'blocked' }, { storiesRoot })

    expect(result).toEqual([])
    // No warn about directory fallback — silently return []
    expect(mockWarn).not.toHaveBeenCalled()

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  it('should return empty array for cancelled state (DB-only, no directory equivalent)', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()

    const result = await shimGetStoriesByStatus({ state: 'cancelled' }, { storiesRoot })

    expect(result).toEqual([])
    expect(mockWarn).not.toHaveBeenCalled()

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Pagination applied to directory results
  it('should apply pagination (limit/offset) to directory fallback results', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    // Create 5 ready-to-work stories
    for (let i = 1; i <= 5; i++) {
      makeStoryInLane(storiesRoot, 'ready-to-work', `WINT-200${i}`)
    }

    // Get page 2 (offset=2, limit=2)
    const result = await shimGetStoriesByStatus(
      { state: 'ready', limit: 2, offset: 2 },
      { storiesRoot },
    )

    expect(result).toHaveLength(2)
    expect(result.every(s => s.state === 'ready')).toBe(true)

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-12: storiesRoot injection
  it('should use injected storiesRoot from ShimOptions (AC-12)', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'ready-for-qa', 'TEST-0055')

    const result = await shimGetStoriesByStatus({ state: 'ready_for_qa' }, { storiesRoot })

    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('TEST-0055')
    expect(result[0].state).toBe('ready_for_qa')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // UAT (in_qa) state mapping
  it('should find stories in UAT directory when state is in_qa', async () => {
    mockStoryGetByStatus.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'UAT', 'WINT-0099')

    const result = await shimGetStoriesByStatus({ state: 'in_qa' }, { storiesRoot })

    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('WINT-0099')
    expect(result[0].state).toBe('in_qa')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })
})
