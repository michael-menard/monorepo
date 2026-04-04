/**
 * story_picker node tests (pipeline-orchestrator)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createStoryPickerNode,
  isDone,
  isPipelineBlocked,
  isEligibleState,
  isTransitivelyBlocked,
  sortByPriorityThenId,
  pickNextStory,
  type StoryEntry,
  type StoryListAdapterFn,
} from '../story-picker.js'

// ============================================================================
// Helpers
// ============================================================================

function story(
  storyId: string,
  state: string,
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | null = null,
  blockedByStory: string | null = null,
): StoryEntry {
  return { storyId, state, priority, blockedByStory }
}

function mockAdapter(stories: StoryEntry[]): StoryListAdapterFn {
  return async () => stories
}

// ============================================================================
// isDone tests
// ============================================================================

describe('isDone', () => {
  it('returns true for completed', () => {
    expect(isDone('completed')).toBe(true)
  })

  it('returns true for cancelled', () => {
    expect(isDone('cancelled')).toBe(true)
  })

  it('returns false for ready', () => {
    expect(isDone('ready')).toBe(false)
  })

  it('returns false for blocked', () => {
    expect(isDone('blocked')).toBe(false)
  })
})

// ============================================================================
// isPipelineBlocked tests
// ============================================================================

describe('isPipelineBlocked', () => {
  it('returns true for blocked', () => {
    expect(isPipelineBlocked('blocked')).toBe(true)
  })

  it('returns false for ready', () => {
    expect(isPipelineBlocked('ready')).toBe(false)
  })
})

// ============================================================================
// isEligibleState tests
// ============================================================================

describe('isEligibleState', () => {
  it('returns true for ready', () => {
    expect(isEligibleState('ready')).toBe(true)
  })

  it('returns true for backlog', () => {
    expect(isEligibleState('backlog')).toBe(true)
  })

  it('returns false for in_progress', () => {
    expect(isEligibleState('in_progress')).toBe(false)
  })

  it('returns false for blocked', () => {
    expect(isEligibleState('blocked')).toBe(false)
  })
})

// ============================================================================
// sortByPriorityThenId tests
// ============================================================================

describe('sortByPriorityThenId', () => {
  it('sorts P1 before P2', () => {
    const a = story('A', 'ready', 'P1')
    const b = story('B', 'ready', 'P2')
    expect(sortByPriorityThenId(a, b)).toBeLessThan(0)
  })

  it('sorts by storyId when priority is equal', () => {
    const a = story('ORCH-001', 'ready', 'P1')
    const b = story('ORCH-002', 'ready', 'P1')
    expect(sortByPriorityThenId(a, b)).toBeLessThan(0)
  })

  it('sorts null priority after P5', () => {
    const a = story('A', 'ready', 'P5')
    const b = story('B', 'ready', null)
    expect(sortByPriorityThenId(a, b)).toBeLessThan(0)
  })
})

// ============================================================================
// isTransitivelyBlocked tests
// ============================================================================

describe('isTransitivelyBlocked', () => {
  it('returns false for a story with no blocker', () => {
    const stories = new Map([['A', story('A', 'ready')]])
    expect(isTransitivelyBlocked('A', stories)).toBe(false)
  })

  it('returns false when blocker is completed', () => {
    const stories = new Map([
      ['A', story('A', 'ready', null, 'B')],
      ['B', story('B', 'completed')],
    ])
    expect(isTransitivelyBlocked('A', stories)).toBe(false)
  })

  it('returns true when blocker is pipeline-blocked', () => {
    const stories = new Map([
      ['A', story('A', 'ready', null, 'B')],
      ['B', story('B', 'blocked')],
    ])
    expect(isTransitivelyBlocked('A', stories)).toBe(true)
  })

  it('returns true for transitive blocking (A -> B -> C blocked)', () => {
    const stories = new Map([
      ['A', story('A', 'ready', null, 'B')],
      ['B', story('B', 'ready', null, 'C')],
      ['C', story('C', 'blocked')],
    ])
    expect(isTransitivelyBlocked('A', stories)).toBe(true)
  })

  it('returns false when transitive chain resolves to completed', () => {
    const stories = new Map([
      ['A', story('A', 'ready', null, 'B')],
      ['B', story('B', 'ready', null, 'C')],
      ['C', story('C', 'completed')],
    ])
    expect(isTransitivelyBlocked('A', stories)).toBe(false)
  })

  it('handles circular dependencies safely', () => {
    const stories = new Map([
      ['A', story('A', 'ready', null, 'B')],
      ['B', story('B', 'ready', null, 'A')],
    ])
    // Should not hang; treats cycle as blocked
    expect(isTransitivelyBlocked('A', stories)).toBe(true)
  })

  it('returns false for unknown blocker reference', () => {
    const stories = new Map([['A', story('A', 'ready', null, 'MISSING')]])
    expect(isTransitivelyBlocked('A', stories)).toBe(false)
  })

  it('returns true for a directly pipeline-blocked story', () => {
    const stories = new Map([['A', story('A', 'blocked')]])
    expect(isTransitivelyBlocked('A', stories)).toBe(true)
  })
})

// ============================================================================
// pickNextStory tests — basic scenarios
// ============================================================================

describe('pickNextStory — basic scenarios', () => {
  it('returns pipeline_complete for empty story list', () => {
    const result = pickNextStory([])
    expect(result.signal).toBe('pipeline_complete')
    expect(result.storyId).toBeNull()
    expect(result.completedCount).toBe(0)
  })

  it('returns pipeline_complete when all stories are completed', () => {
    const result = pickNextStory([
      story('A', 'completed', 'P1'),
      story('B', 'cancelled', 'P2'),
    ])
    expect(result.signal).toBe('pipeline_complete')
    expect(result.storyId).toBeNull()
    expect(result.completedCount).toBe(2)
  })

  it('picks the only eligible story', () => {
    const result = pickNextStory([
      story('A', 'completed', 'P1'),
      story('B', 'ready', 'P2'),
    ])
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('B')
    expect(result.eligibleCount).toBe(1)
    expect(result.completedCount).toBe(1)
  })

  it('picks by priority — P1 before P3', () => {
    const result = pickNextStory([
      story('SLOW', 'ready', 'P3'),
      story('FAST', 'ready', 'P1'),
    ])
    expect(result.storyId).toBe('FAST')
  })

  it('picks by storyId when priority is equal', () => {
    const result = pickNextStory([
      story('ORCH-2020', 'ready', 'P2'),
      story('ORCH-2010', 'ready', 'P2'),
    ])
    expect(result.storyId).toBe('ORCH-2010')
  })

  it('treats backlog as eligible', () => {
    const result = pickNextStory([story('A', 'backlog', 'P1')])
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('A')
  })
})

// ============================================================================
// pickNextStory tests — dependency blocking
// ============================================================================

describe('pickNextStory — dependency blocking', () => {
  it('skips story whose blocker is not completed', () => {
    const result = pickNextStory([
      story('A', 'in_progress', 'P1'),
      story('B', 'ready', 'P2', 'A'),
    ])
    // B depends on A which is in_progress, so B is not eligible
    // A is in_progress so not eligible either
    expect(result.signal).toBe('pipeline_stalled')
    expect(result.storyId).toBeNull()
  })

  it('picks story whose blocker is completed', () => {
    const result = pickNextStory([
      story('A', 'completed', 'P1'),
      story('B', 'ready', 'P2', 'A'),
    ])
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('B')
  })

  it('skips transitively blocked story', () => {
    const result = pickNextStory([
      story('A', 'blocked', 'P1'),
      story('B', 'ready', 'P2', 'A'),
      story('C', 'ready', 'P3'),
    ])
    // B is transitively blocked (depends on blocked A)
    // C is eligible
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('C')
    expect(result.eligibleCount).toBe(1)
  })

  it('handles deep transitive blocking chain', () => {
    const result = pickNextStory([
      story('A', 'blocked', 'P1'),
      story('B', 'ready', 'P2', 'A'),
      story('C', 'ready', 'P3', 'B'),
    ])
    // C -> B -> A(blocked): all blocked transitively
    expect(result.signal).toBe('pipeline_stalled')
    expect(result.storyId).toBeNull()
  })
})

// ============================================================================
// pickNextStory tests — pipeline_stalled
// ============================================================================

describe('pickNextStory — pipeline_stalled', () => {
  it('returns pipeline_stalled when all remaining are pipeline-blocked', () => {
    const result = pickNextStory([
      story('A', 'completed', 'P1'),
      story('B', 'blocked', 'P2'),
      story('C', 'blocked', 'P3'),
    ])
    expect(result.signal).toBe('pipeline_stalled')
    expect(result.storyId).toBeNull()
    expect(result.blockedCount).toBe(2)
    expect(result.completedCount).toBe(1)
  })

  it('returns pipeline_stalled when stories are in non-eligible non-done states', () => {
    const result = pickNextStory([
      story('A', 'in_progress', 'P1'),
      story('B', 'in_review', 'P2'),
    ])
    expect(result.signal).toBe('pipeline_stalled')
    expect(result.storyId).toBeNull()
  })
})

// ============================================================================
// pickNextStory tests — mixed scenarios
// ============================================================================

describe('pickNextStory — mixed scenarios', () => {
  it('handles realistic plan with multiple states and dependencies', () => {
    const result = pickNextStory([
      story('ORCH-2010', 'completed', 'P1'),
      story('ORCH-2020', 'ready', 'P1', 'ORCH-2010'),
      story('ORCH-2030', 'backlog', 'P2', 'ORCH-2020'),
      story('ORCH-3010', 'blocked', 'P1'),
      story('ORCH-3020', 'ready', 'P2', 'ORCH-3010'),
      story('ORCH-4010', 'ready', 'P3'),
    ])
    // ORCH-2020: blocker completed, eligible (P1)
    // ORCH-2030: blocker not completed, skipped
    // ORCH-3020: transitively blocked via ORCH-3010
    // ORCH-4010: no blocker, eligible (P3)
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('ORCH-2020')
    expect(result.eligibleCount).toBe(2)
  })

  it('picks lower priority story when higher priority is blocked', () => {
    const result = pickNextStory([
      story('HIGH', 'ready', 'P1', 'BLOCKER'),
      story('BLOCKER', 'in_progress', 'P1'),
      story('LOW', 'ready', 'P5'),
    ])
    expect(result.storyId).toBe('LOW')
  })
})

// ============================================================================
// createStoryPickerNode factory tests
// ============================================================================

describe('createStoryPickerNode', () => {
  it('calls adapter with planSlug and returns result', async () => {
    const adapter = vi.fn().mockResolvedValue([
      story('A', 'ready', 'P1'),
      story('B', 'ready', 'P2'),
    ])

    const node = createStoryPickerNode(
      { planSlug: 'my-plan' },
      { storyListAdapter: adapter },
    )

    const result = await node()

    expect(adapter).toHaveBeenCalledWith('my-plan')
    expect(result.signal).toBe('story_ready')
    expect(result.storyId).toBe('A')
  })

  it('returns pipeline_complete for empty plan', async () => {
    const adapter = vi.fn().mockResolvedValue([])

    const node = createStoryPickerNode(
      { planSlug: 'empty-plan' },
      { storyListAdapter: adapter },
    )

    const result = await node()
    expect(result.signal).toBe('pipeline_complete')
  })

  it('validates config — rejects empty planSlug', () => {
    expect(() =>
      createStoryPickerNode(
        { planSlug: '' },
        { storyListAdapter: mockAdapter([]) },
      ),
    ).toThrow()
  })
})
