/**
 * story_scout node tests (dev-implement-v2)
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
  extractSearchTerms,
  createStoryScoutNode,
} from '../story-scout.js'
import type { DevImplementV2State } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<DevImplementV2State> = {}): DevImplementV2State {
  return {
    storyId: 'WINT-1234',
    storyGroundingContext: null,
    implementationPlan: null,
    testRunResult: null,
    implementationEvidence: null,
    postconditionResult: null,
    devImplementV2Phase: 'story_scout',
    selfCorrectionRetryCount: 0,
    maxSelfCorrectionRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// extractSearchTerms tests
// ============================================================================

describe('extractSearchTerms', () => {
  it('extracts camelCase identifiers', () => {
    const terms = extractSearchTerms(['When user calls createUserProfile, it saves to DB'])
    expect(terms).toContain('createUserProfile')
  })

  it('extracts file references', () => {
    const terms = extractSearchTerms(['Update src/auth/login.ts: addLoginHandler()'])
    expect(terms.some(t => t.includes('.ts'))).toBe(true)
  })

  it('extracts quoted strings', () => {
    const terms = extractSearchTerms(['Calls "registerUser" function'])
    expect(terms).toContain('registerUser')
  })

  it('deduplicates terms', () => {
    const terms = extractSearchTerms(['createUser', 'createUser'])
    const count = terms.filter(t => t === 'createUser').length
    expect(count).toBeLessThanOrEqual(1)
  })

  it('limits to 20 terms', () => {
    const longAC = Array.from({ length: 30 }, (_, i) => `camelCaseTerm${i}`)
    const terms = extractSearchTerms([longAC.join(' ')])
    expect(terms.length).toBeLessThanOrEqual(20)
  })

  it('returns empty array for empty input', () => {
    expect(extractSearchTerms([])).toEqual([])
  })
})

// ============================================================================
// createStoryScoutNode tests
// ============================================================================

describe('createStoryScoutNode', () => {
  it('returns empty grounding context when no adapters provided', async () => {
    const node = createStoryScoutNode()
    const result = await node(makeState())
    expect(result.storyGroundingContext).not.toBeNull()
    expect(result.storyGroundingContext?.storyId).toBe('WINT-1234')
    expect(result.storyGroundingContext?.relevantFiles).toEqual([])
  })

  it('calls kbAdapter with the storyId', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      title: 'My Story',
      acceptanceCriteria: ['AC1', 'AC2'],
      subtasks: ['Subtask 1'],
    })
    const node = createStoryScoutNode({ kbAdapter })
    await node(makeState())
    expect(kbAdapter).toHaveBeenCalledWith('WINT-1234')
  })

  it('sets storyTitle from KB adapter response', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      title: 'My Story Title',
      acceptanceCriteria: [],
      subtasks: [],
    })
    const node = createStoryScoutNode({ kbAdapter })
    const result = await node(makeState())
    expect(result.storyGroundingContext?.storyTitle).toBe('My Story Title')
  })

  it('sets acceptanceCriteria from KB adapter', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      title: 'T',
      acceptanceCriteria: ['AC-1', 'AC-2'],
      subtasks: [],
    })
    const node = createStoryScoutNode({ kbAdapter })
    const result = await node(makeState())
    expect(result.storyGroundingContext?.acceptanceCriteria).toEqual(['AC-1', 'AC-2'])
  })

  it('calls codebaseSearch with extracted terms', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      title: 'T',
      acceptanceCriteria: ['Update createUserProfile function'],
      subtasks: [],
    })
    const codebaseSearch = vi.fn().mockResolvedValue({
      files: ['src/auth/user.ts'],
      functions: [],
      patterns: [],
    })
    const node = createStoryScoutNode({ kbAdapter, codebaseSearch })
    const result = await node(makeState())
    expect(codebaseSearch).toHaveBeenCalled()
    expect(result.storyGroundingContext?.relevantFiles).toContain('src/auth/user.ts')
  })

  it('degrades gracefully when KB adapter throws', async () => {
    const kbAdapter = vi.fn().mockRejectedValue(new Error('KB offline'))
    const node = createStoryScoutNode({ kbAdapter })
    const result = await node(makeState())
    expect(result.storyGroundingContext).not.toBeNull()
    expect(result.storyGroundingContext?.storyId).toBe('WINT-1234')
  })

  it('degrades gracefully when codebaseSearch throws', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      title: 'T',
      acceptanceCriteria: ['createUser'],
      subtasks: [],
    })
    const codebaseSearch = vi.fn().mockRejectedValue(new Error('search offline'))
    const node = createStoryScoutNode({ kbAdapter, codebaseSearch })
    const result = await node(makeState())
    expect(result.storyGroundingContext?.relevantFiles).toEqual([])
  })

  it('sets phase to implementation_planner', async () => {
    const node = createStoryScoutNode()
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('implementation_planner')
  })
})
