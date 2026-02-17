/**
 * Unit Tests: shimGetStoriesByFeature
 * WINT-1011 AC-4, AC-10, AC-12
 *
 * Test scenarios:
 * - DB returns results → return DB results, NO directory scan [AC-10]
 * - DB returns empty [] → fall back to directory scan by epic prefix [AC-4]
 * - No stories found in DB or directory → return []
 * - storiesRoot injection via ShimOptions [AC-12]
 * - Epic prefix matching (storyId starts with "<epic>-") [AC-4]
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

function makeTempStoriesRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'shim-feature-test-'))
}

function makeStoryInLane(storiesRoot: string, laneDir: string, storyId: string): void {
  const lanePath = path.join(storiesRoot, laneDir)
  fs.mkdirSync(lanePath, { recursive: true })
  fs.mkdirSync(path.join(lanePath, storyId), { recursive: true })
}

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

  // AC-10: DB returns results → return immediately without scanning directory
  it('should return DB results without directory scan when DB has stories (AC-10)', async () => {
    const dbStories = [makeDbStory('WINT-0090', 'WINT'), makeDbStory('WINT-1011', 'WINT')]
    mockStoryGetByFeature.mockResolvedValue(dbStories)

    const storiesRoot = makeTempStoriesRoot()

    const result = await shimGetStoriesByFeature({ epic: 'WINT' }, { storiesRoot })

    expect(result).toEqual(dbStories)
    expect(result).toHaveLength(2)
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockStoryGetByFeature).toHaveBeenCalledOnce()
    expect(mockStoryGetByFeature).toHaveBeenCalledWith({ epic: 'WINT' })

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-4: DB returns empty [] → trigger directory fallback using epic prefix
  it('should fall back to directory scan when DB returns empty array (AC-4)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'in-progress', 'KBAR-0010')
    makeStoryInLane(storiesRoot, 'ready-for-qa', 'KBAR-0020')
    // A story from a different epic should NOT appear
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-0090')

    const result = await shimGetStoriesByFeature({ epic: 'KBAR' }, { storiesRoot })

    expect(result).toHaveLength(2)
    const storyIds = result.map(s => s.storyId)
    expect(storyIds).toContain('KBAR-0010')
    expect(storyIds).toContain('KBAR-0020')
    expect(storyIds).not.toContain('WINT-0090')
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("DB returned empty for epic 'KBAR'"),
    )

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-4: epic field set correctly in directory fallback results
  it('should set epic field from input.epic in directory fallback results (AC-4)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'backlog', 'MODL-0010')

    const result = await shimGetStoriesByFeature({ epic: 'MODL' }, { storiesRoot })

    expect(result).toHaveLength(1)
    expect(result[0].epic).toBe('MODL')
    expect(result[0].storyId).toBe('MODL-0010')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // No stories matching epic prefix in any directory
  it('should return empty array when DB empty and no directory stories match epic (AC-4)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-1011')
    // No KBAR stories in directory

    const result = await shimGetStoriesByFeature({ epic: 'KBAR' }, { storiesRoot })

    expect(result).toEqual([])

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // AC-12: storiesRoot injection
  it('should use injected storiesRoot from ShimOptions (AC-12)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'done', 'TEST-0001')

    const result = await shimGetStoriesByFeature({ epic: 'TEST' }, { storiesRoot })

    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('TEST-0001')
    expect(result[0].state).toBe('done')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Pagination applied to directory results
  it('should apply pagination (limit/offset) to directory fallback results', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    // Create 6 WINT stories across different swim lanes
    makeStoryInLane(storiesRoot, 'backlog', 'WINT-3001')
    makeStoryInLane(storiesRoot, 'backlog', 'WINT-3002')
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-3003')
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-3004')
    makeStoryInLane(storiesRoot, 'done', 'WINT-3005')
    makeStoryInLane(storiesRoot, 'done', 'WINT-3006')

    // Get page 2 with limit=2, offset=2
    const result = await shimGetStoriesByFeature(
      { epic: 'WINT', limit: 2, offset: 2 },
      { storiesRoot },
    )

    expect(result).toHaveLength(2)
    expect(result.every(s => s.storyId.startsWith('WINT-'))).toBe(true)

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Stories from multiple swim lanes under same epic
  it('should gather stories from all swim-lane directories for the requested epic (AC-4)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    makeStoryInLane(storiesRoot, 'backlog', 'LNGG-0010')
    makeStoryInLane(storiesRoot, 'ready-to-work', 'LNGG-0020')
    makeStoryInLane(storiesRoot, 'in-progress', 'LNGG-0030')
    makeStoryInLane(storiesRoot, 'ready-for-qa', 'LNGG-0040')
    makeStoryInLane(storiesRoot, 'UAT', 'LNGG-0050')
    makeStoryInLane(storiesRoot, 'done', 'LNGG-0060')

    const result = await shimGetStoriesByFeature({ epic: 'LNGG' }, { storiesRoot })

    expect(result).toHaveLength(6)
    const storyIds = result.map(s => s.storyId)
    expect(storyIds).toContain('LNGG-0010')
    expect(storyIds).toContain('LNGG-0020')
    expect(storyIds).toContain('LNGG-0030')
    expect(storyIds).toContain('LNGG-0040')
    expect(storyIds).toContain('LNGG-0050')
    expect(storyIds).toContain('LNGG-0060')

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })

  // Should NOT match stories from another epic with similar prefix
  it('should not include stories from epics with overlapping prefixes (prefix isolation)', async () => {
    mockStoryGetByFeature.mockResolvedValue([])

    const storiesRoot = makeTempStoriesRoot()
    // WINT stories — should NOT appear when searching for WIN (different epic)
    makeStoryInLane(storiesRoot, 'in-progress', 'WINT-0090')

    const result = await shimGetStoriesByFeature({ epic: 'WIN' }, { storiesRoot })

    // WINT-0090 starts with 'WINT-', not 'WIN-', so should not match
    expect(result).toEqual([])

    fs.rmSync(storiesRoot, { recursive: true, force: true })
  })
})
