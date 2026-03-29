/**
 * flow_codebase_scout node tests (v2)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  extractSearchTerms,
  buildFlowScoutResult,
  extractFunctionHints,
  createFlowCodebaseScoutNode,
} from '../flow-codebase-scout.js'
import type { Flow } from '../../../state/plan-refinement-state.js'
import type { StoryGenerationV2State } from '../../../state/story-generation-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'User Uploads Image',
    actor: 'Authenticated User',
    trigger: 'User clicks upload',
    steps: [
      { index: 1, description: 'Select file from filesystem' },
      { index: 2, description: 'Call uploadImage handler to store in S3' },
      { index: 3, description: 'Update imageRepository with metadata' },
    ],
    successOutcome: 'Image stored and accessible',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function makeState(overrides: Partial<StoryGenerationV2State> = {}): StoryGenerationV2State {
  return {
    planSlug: 'test-plan',
    refinedPlan: null,
    flows: [],
    flowScoutResults: [],
    storyOutlines: [],
    enrichedStories: [],
    dependencyEdges: [],
    parallelGroups: [],
    orderedStories: [],
    validationResult: null,
    writeResult: null,
    generationV2Phase: 'flow_codebase_scout',
    enricherRetryCount: 0,
    maxEnricherRetries: 2,
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
  it('extracts terms from flow name, actor, and step descriptions', () => {
    const flow = makeFlow()
    const terms = extractSearchTerms(flow)

    // Should include words from flow name
    expect(terms).toContain('user')
    expect(terms).toContain('uploads')

    // Should include words from steps
    expect(terms.some(t => t.includes('upload') || t.includes('image'))).toBe(true)
  })

  it('filters out short words (< 3 chars)', () => {
    const flow = makeFlow({
      name: 'Do It Now',
      actor: 'UI',
      steps: [{ index: 1, description: 'Go to DB' }],
    })
    const terms = extractSearchTerms(flow)
    // 'Do', 'It', 'UI', 'Go', 'to', 'DB' are all < 3 chars or exactly 2 chars
    terms.forEach(t => {
      expect(t.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('deduplicates terms', () => {
    const flow = makeFlow({
      name: 'Upload Upload Upload',
      actor: 'User',
      steps: [{ index: 1, description: 'Upload the file' }],
    })
    const terms = extractSearchTerms(flow)
    const uploadTerms = terms.filter(t => t === 'upload')
    expect(uploadTerms).toHaveLength(1)
  })
})

// ============================================================================
// extractFunctionHints tests
// ============================================================================

describe('extractFunctionHints', () => {
  it('extracts camelCase function-like names from descriptions', () => {
    const descriptions = [
      'Call uploadImage handler to store in S3',
      'Update imageRepository with metadata',
    ]
    const hints = extractFunctionHints(descriptions)
    expect(hints.some(h => h.includes('upload') || h.includes('image') || h.includes('Image'))).toBe(true)
  })

  it('deduplicates function hints', () => {
    const descriptions = ['Call uploadImage twice', 'Also call uploadImage again']
    const hints = extractFunctionHints(descriptions)
    const uploadImageCount = hints.filter(h => h === 'uploadImage').length
    expect(uploadImageCount).toBeLessThanOrEqual(1)
  })

  it('returns empty array for empty descriptions', () => {
    const hints = extractFunctionHints([])
    expect(hints).toEqual([])
  })
})

// ============================================================================
// buildFlowScoutResult tests
// ============================================================================

describe('buildFlowScoutResult', () => {
  it('deduplicates and sorts relevant files', () => {
    const searchResults = [
      ['src/upload.ts', 'src/image.ts'],
      ['src/upload.ts', 'src/storage.ts'],
      ['src/image.ts'],
    ]
    const result = buildFlowScoutResult('flow-1', searchResults, [])
    const unique = [...new Set(result.relevantFiles)]
    expect(result.relevantFiles).toEqual(unique.sort())
    expect(result.relevantFiles).toHaveLength(3)
  })

  it('sets alreadyExists when files found', () => {
    const result = buildFlowScoutResult('flow-1', [['src/foo.ts']], [])
    expect(result.alreadyExists.length).toBeGreaterThan(0)
    expect(result.needsCreation).toHaveLength(0)
  })

  it('sets needsCreation when no files found', () => {
    const result = buildFlowScoutResult('flow-1', [[], []], [])
    expect(result.alreadyExists).toHaveLength(0)
    expect(result.needsCreation.length).toBeGreaterThan(0)
  })

  it('sets flowId correctly', () => {
    const result = buildFlowScoutResult('flow-42', [['src/foo.ts']], [])
    expect(result.flowId).toBe('flow-42')
  })
})

// ============================================================================
// createFlowCodebaseScoutNode tests
// ============================================================================

describe('createFlowCodebaseScoutNode', () => {
  it('returns empty scout results when no adapter provided', async () => {
    const flow = makeFlow()
    const node = createFlowCodebaseScoutNode()
    const state = makeState({ flows: [flow] })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('story_slicer')
    expect(result.flowScoutResults).toHaveLength(1)
    expect(result.flowScoutResults?.[0].flowId).toBe('flow-1')
    expect(result.flowScoutResults?.[0].relevantFiles).toHaveLength(0)
  })

  it('calls searchCodebase for each term and builds scout results', async () => {
    const searchCodebase = vi.fn().mockResolvedValue(['src/upload.ts'])
    const flow = makeFlow()
    const node = createFlowCodebaseScoutNode({ searchCodebase })
    const state = makeState({ flows: [flow] })

    const result = await node(state)

    expect(searchCodebase).toHaveBeenCalled()
    expect(result.generationV2Phase).toBe('story_slicer')
    expect(result.flowScoutResults?.[0].relevantFiles).toContain('src/upload.ts')
  })

  it('handles multiple flows independently', async () => {
    const searchCodebase = vi.fn().mockResolvedValue([])
    const flows = [
      makeFlow({ id: 'flow-1', name: 'Flow One' }),
      makeFlow({ id: 'flow-2', name: 'Flow Two' }),
    ]
    const node = createFlowCodebaseScoutNode({ searchCodebase })
    const state = makeState({ flows })

    const result = await node(state)

    expect(result.flowScoutResults).toHaveLength(2)
    expect(result.flowScoutResults?.[0].flowId).toBe('flow-1')
    expect(result.flowScoutResults?.[1].flowId).toBe('flow-2')
  })

  it('handles empty flows array', async () => {
    const node = createFlowCodebaseScoutNode()
    const state = makeState({ flows: [] })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('story_slicer')
    expect(result.flowScoutResults).toHaveLength(0)
  })

  it('recovers from search errors and proceeds to story_slicer', async () => {
    const searchCodebase = vi.fn().mockRejectedValue(new Error('Search failed'))
    const flow = makeFlow()
    const node = createFlowCodebaseScoutNode({ searchCodebase })
    const state = makeState({ flows: [flow] })

    const result = await node(state)

    // Should still produce a scout result (empty) and proceed
    expect(result.generationV2Phase).toBe('story_slicer')
    expect(result.flowScoutResults).toHaveLength(1)
  })
})
