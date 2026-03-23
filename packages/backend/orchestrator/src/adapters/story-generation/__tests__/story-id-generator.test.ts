/**
 * Unit tests for story-id-generator adapter
 *
 * @see APRS-5030 AC-9
 */

import { describe, it, expect, vi } from 'vitest'
import {
  createStoryIdGeneratorAdapter,
  extractNumericSuffix,
  findMaxSuffix,
} from '../story-id-generator.js'
import type { KbListStoriesFn } from '../story-id-generator.js'

// ============================================================================
// extractNumericSuffix
// ============================================================================

describe('extractNumericSuffix', () => {
  it('extracts numeric suffix from story ID', () => {
    expect(extractNumericSuffix('AUTH-1020')).toBe(1020)
    expect(extractNumericSuffix('MYPLAN-2030')).toBe(2030)
    expect(extractNumericSuffix('APRS-5030')).toBe(5030)
  })

  it('returns null if no numeric suffix', () => {
    expect(extractNumericSuffix('MYPLAN')).toBeNull()
    expect(extractNumericSuffix('no-numbers-here-abc')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractNumericSuffix('')).toBeNull()
  })
})

// ============================================================================
// findMaxSuffix
// ============================================================================

describe('findMaxSuffix', () => {
  it('returns max suffix from a list of story IDs', () => {
    expect(findMaxSuffix(['AUTH-1010', 'AUTH-1020', 'AUTH-1030'])).toBe(1030)
  })

  it('returns DEFAULT_START - STEP (1000) when list is empty', () => {
    expect(findMaxSuffix([])).toBe(1000) // 1010 - 10 = 1000
  })

  it('returns DEFAULT_START - STEP when no IDs have numeric suffixes', () => {
    expect(findMaxSuffix(['PLAN', 'FEATURE', 'epic-abc'])).toBe(1000)
  })

  it('handles mixed valid and invalid IDs', () => {
    expect(findMaxSuffix(['AUTH-1010', 'no-suffix', 'AUTH-1050', 'plain'])).toBe(1050)
  })
})

// ============================================================================
// createStoryIdGeneratorAdapter
// ============================================================================

describe('createStoryIdGeneratorAdapter', () => {
  it('returns a StoryIdGeneratorFn', () => {
    const kbListStories: KbListStoriesFn = vi.fn()
    const generator = createStoryIdGeneratorAdapter(kbListStories)
    expect(typeof generator).toBe('function')
  })

  it('generates IDs starting from 1010 when no existing stories', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([])
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    const ids = await generator('AUTH', 3)

    expect(ids).toEqual(['AUTH-1010', 'AUTH-1020', 'AUTH-1030'])
  })

  it('generates IDs from max + 10 when existing stories present', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([
      { story_id: 'AUTH-1010' },
      { story_id: 'AUTH-1020' },
      { story_id: 'AUTH-1030' },
    ])
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    const ids = await generator('AUTH', 2)

    expect(ids).toEqual(['AUTH-1040', 'AUTH-1050'])
  })

  it('calls kbListStories with prefix', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([])
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    await generator('MYPLAN', 1)

    expect(kbListStories).toHaveBeenCalledWith({ prefix: 'MYPLAN', limit: 1000 })
  })

  it('generates correct count of IDs', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([])
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    const ids = await generator('PLAN', 5)

    expect(ids).toHaveLength(5)
  })

  it('falls back to 1010 start when kbListStories throws', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockRejectedValue(new Error('KB error'))
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    const ids = await generator('AUTH', 2)

    expect(ids).toEqual(['AUTH-1010', 'AUTH-1020'])
  })

  it('generates IDs with step=10 spacing', async () => {
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([])
    const generator = createStoryIdGeneratorAdapter(kbListStories)

    const ids = await generator('X', 4)

    expect(ids).toEqual(['X-1010', 'X-1020', 'X-1030', 'X-1040'])
  })
})
