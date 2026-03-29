/**
 * validation_node tests (v2)
 */

import { describe, it, expect } from 'vitest'
import {
  detectCycles,
  findOrphans,
  findDuplicates,
  validateStorySet,
  createValidationNode,
} from '../validation-node.js'
import type {
  EnrichedStory,
  DependencyEdgeV2,
  StoryGenerationV2State,
} from '../../../state/story-generation-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeEnrichedStory(overrides: Partial<EnrichedStory> = {}): EnrichedStory {
  return {
    title: 'Default Story',
    description: 'Default description',
    acceptance_criteria: ['AC 1', 'AC 2'],
    subtasks: ['Update src/foo.ts: doSomething()'],
    tags: [],
    risk: 'medium',
    minimum_path: true,
    parent_plan_slug: 'test-plan',
    parent_flow_id: 'flow-1',
    flow_step_reference: 'flow-1/step-1',
    relevantFiles: ['src/foo.ts'],
    relevantFunctions: ['src/foo.ts: doSomething()'],
    implementationHints: ['Use async/await'],
    scopeBoundary: {
      inScope: ['Create handler'],
      outOfScope: ['Unrelated feature'],
    },
    acFlowTraceability: [{ acIndex: 0, flowStepRef: 'flow-1/step-1' }],
    postconditionsPassed: true,
    enrichmentFailures: [],
    ...overrides,
  }
}

function makeEdge(from: string, to: string, type = 'flow_order'): DependencyEdgeV2 {
  return { from, to, type }
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
    orderedStories: [makeEnrichedStory()],
    validationResult: null,
    writeResult: null,
    generationV2Phase: 'validation',
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
// detectCycles tests
// ============================================================================

describe('detectCycles', () => {
  it('returns empty array for acyclic graph', () => {
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C')]
    const cycles = detectCycles(edges)
    expect(cycles).toHaveLength(0)
  })

  it('detects a simple cycle', () => {
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'A')]
    const cycles = detectCycles(edges)
    expect(cycles.length).toBeGreaterThan(0)
    // Cycle should include at least A, B, C
    const allNodes = cycles.flat()
    expect(allNodes).toContain('A')
  })

  it('returns empty array for empty edges', () => {
    expect(detectCycles([])).toHaveLength(0)
  })

  it('handles self-loop', () => {
    const edges = [makeEdge('A', 'A')]
    const cycles = detectCycles(edges)
    expect(cycles.length).toBeGreaterThan(0)
  })

  it('detects cycle in diamond with back-edge', () => {
    const edges = [
      makeEdge('A', 'B'),
      makeEdge('A', 'C'),
      makeEdge('B', 'D'),
      makeEdge('C', 'D'),
      makeEdge('D', 'A'), // back edge creating cycle
    ]
    const cycles = detectCycles(edges)
    expect(cycles.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// findOrphans tests
// ============================================================================

describe('findOrphans', () => {
  it('returns stories not in any edge and not on minimum path', () => {
    const stories = [
      makeEnrichedStory({ title: 'Connected Story', minimum_path: false }),
      makeEnrichedStory({ title: 'Orphan Story', minimum_path: false }),
    ]
    const edges = [makeEdge('Connected Story', 'Some Other')]

    const orphans = findOrphans(stories, edges)
    expect(orphans).toContain('Orphan Story')
    expect(orphans).not.toContain('Connected Story')
  })

  it('does not mark minimum_path stories as orphans', () => {
    const stories = [makeEnrichedStory({ title: 'Min Path Story', minimum_path: true })]
    const orphans = findOrphans(stories, [])
    expect(orphans).not.toContain('Min Path Story')
  })

  it('returns empty when all stories are connected or on minimum path', () => {
    const stories = [
      makeEnrichedStory({ title: 'A', minimum_path: false }),
      makeEnrichedStory({ title: 'B', minimum_path: false }),
    ]
    const edges = [makeEdge('A', 'B')]
    const orphans = findOrphans(stories, edges)
    expect(orphans).toHaveLength(0)
  })
})

// ============================================================================
// findDuplicates tests
// ============================================================================

describe('findDuplicates', () => {
  it('returns duplicate titles', () => {
    const stories = [
      makeEnrichedStory({ title: 'Story A' }),
      makeEnrichedStory({ title: 'Story A' }), // duplicate
      makeEnrichedStory({ title: 'Story B' }),
    ]
    const dups = findDuplicates(stories)
    expect(dups).toContain('Story A')
    expect(dups).not.toContain('Story B')
  })

  it('returns empty when no duplicates', () => {
    const stories = [
      makeEnrichedStory({ title: 'Unique A' }),
      makeEnrichedStory({ title: 'Unique B' }),
    ]
    expect(findDuplicates(stories)).toHaveLength(0)
  })
})

// ============================================================================
// validateStorySet tests
// ============================================================================

describe('validateStorySet', () => {
  it('passes for valid story set', () => {
    const stories = [makeEnrichedStory({ title: 'Story A', minimum_path: true })]
    const result = validateStorySet(stories, [])
    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('adds hard error for cycles', () => {
    const stories = [
      makeEnrichedStory({ title: 'A' }),
      makeEnrichedStory({ title: 'B' }),
    ]
    const edges = [makeEdge('A', 'B'), makeEdge('B', 'A')]
    const result = validateStorySet(stories, edges)
    expect(result.passed).toBe(false)
    expect(result.errors.some(e => e.includes('cycle'))).toBe(true)
  })

  it('adds warning for orphan stories', () => {
    const stories = [
      makeEnrichedStory({ title: 'Orphan', minimum_path: false }),
    ]
    const result = validateStorySet(stories, [])
    expect(result.passed).toBe(true) // orphan is a warning, not error
    expect(result.warnings.some(w => w.toLowerCase().includes('orphan'))).toBe(true)
  })

  it('adds warning for duplicate titles', () => {
    const stories = [
      makeEnrichedStory({ title: 'Dup Story' }),
      makeEnrichedStory({ title: 'Dup Story' }),
    ]
    const result = validateStorySet(stories, [])
    expect(result.passed).toBe(true)
    expect(result.warnings.some(w => w.includes('Dup Story'))).toBe(true)
  })

  it('adds warning when no minimum_path story', () => {
    const stories = [makeEnrichedStory({ title: 'Story', minimum_path: false })]
    const result = validateStorySet(stories, [])
    expect(result.warnings.some(w => w.includes('minimum_path'))).toBe(true)
  })

  it('adds warning for stories with < 2 AC', () => {
    const stories = [makeEnrichedStory({ acceptance_criteria: ['Only one'] })]
    const result = validateStorySet(stories, [])
    expect(result.warnings.some(w => w.includes('AC'))).toBe(true)
  })

  it('adds warning for stories with empty relevantFiles', () => {
    const stories = [makeEnrichedStory({ relevantFiles: [] })]
    const result = validateStorySet(stories, [])
    expect(result.warnings.some(w => w.includes('relevantFiles'))).toBe(true)
  })

  it('adds warning for stories with empty scopeBoundary.inScope', () => {
    const stories = [
      makeEnrichedStory({ scopeBoundary: { inScope: [], outOfScope: ['something'] } }),
    ]
    const result = validateStorySet(stories, [])
    expect(result.warnings.some(w => w.includes('inScope'))).toBe(true)
  })
})

// ============================================================================
// createValidationNode tests
// ============================================================================

describe('createValidationNode', () => {
  it('sets generationV2Phase to write_to_kb on passing validation', async () => {
    const node = createValidationNode()
    const state = makeState({
      orderedStories: [makeEnrichedStory({ title: 'Valid Story', minimum_path: true })],
      dependencyEdges: [],
    })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('write_to_kb')
    expect(result.validationResult?.passed).toBe(true)
  })

  it('sets generationV2Phase to error on cycle detection', async () => {
    const node = createValidationNode()
    const state = makeState({
      orderedStories: [
        makeEnrichedStory({ title: 'A', minimum_path: true }),
        makeEnrichedStory({ title: 'B', minimum_path: false }),
      ],
      dependencyEdges: [makeEdge('A', 'B'), makeEdge('B', 'A')],
    })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('error')
    expect(result.validationResult?.passed).toBe(false)
    expect(result.errors?.some(e => e.includes('cycle'))).toBe(true)
  })

  it('proceeds to write_to_kb with warnings when no hard errors', async () => {
    const node = createValidationNode()
    const state = makeState({
      orderedStories: [
        makeEnrichedStory({ title: 'Story', minimum_path: true, relevantFiles: [] }),
      ],
      dependencyEdges: [],
    })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('write_to_kb')
    expect(result.warnings?.some(w => w.includes('relevantFiles'))).toBe(true)
  })

  it('handles empty story set gracefully', async () => {
    const node = createValidationNode()
    const state = makeState({ orderedStories: [], dependencyEdges: [] })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('write_to_kb')
  })
})
