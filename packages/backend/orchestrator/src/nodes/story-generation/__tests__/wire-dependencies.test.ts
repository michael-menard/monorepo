/**
 * wire_dependencies node tests
 * APRS-4020: ST-2 (AC-2/3/4)
 */

import { describe, it, expect } from 'vitest'
import {
  storyKey,
  defaultMinimumPathFn,
  inferDependencyEdges,
  computeParallelGroups,
  orderStories,
  createWireDependenciesNode,
} from '../wire-dependencies.js'
import type { GeneratedStory } from '../../../state/story-generation-state.js'
import type { Flow } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStory(
  title: string,
  flowId: string,
  stepRef: string,
  minPath = false,
): GeneratedStory {
  return {
    title,
    description: `Desc for ${title}`,
    acceptance_criteria: ['AC1'],
    subtasks: [],
    tags: [],
    risk: 'low',
    minimum_path: minPath,
    parent_plan_slug: 'test-plan',
    parent_flow_id: flowId,
    flow_step_reference: stepRef,
  }
}

function makeFlow(id: string, stepCount: number): Flow {
  return {
    id,
    name: `Flow ${id}`,
    actor: 'User',
    trigger: 'User action',
    steps: Array.from({ length: stepCount }, (_, i) => ({
      index: i + 1,
      description: `Step ${i + 1}`,
    })),
    successOutcome: 'Done',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
  }
}

// ============================================================================
// storyKey
// ============================================================================

describe('storyKey', () => {
  it('returns "title|flow_id" composite key', () => {
    const story = makeStory('My Story', 'flow-1', 'flow-1/step-1')
    expect(storyKey(story)).toBe('My Story|flow-1')
  })
})

// ============================================================================
// defaultMinimumPathFn
// ============================================================================

describe('defaultMinimumPathFn', () => {
  it('returns stories from the flow with fewest steps', () => {
    const stories = [
      makeStory('Story A', 'flow-1', 'flow-1/step-1'),
      makeStory('Story B', 'flow-2', 'flow-2/step-1'),
      makeStory('Story C', 'flow-2', 'flow-2/step-2'),
    ]
    const flows = [makeFlow('flow-1', 1), makeFlow('flow-2', 3)]

    const result = defaultMinimumPathFn(stories, flows)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Story A')
  })

  it('includes all flows tied for minimum step count', () => {
    const stories = [
      makeStory('Story A', 'flow-1', 'flow-1/step-1'),
      makeStory('Story B', 'flow-2', 'flow-2/step-1'),
    ]
    const flows = [makeFlow('flow-1', 2), makeFlow('flow-2', 2)]

    const result = defaultMinimumPathFn(stories, flows)
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no flows', () => {
    expect(defaultMinimumPathFn([], [])).toEqual([])
  })
})

// ============================================================================
// inferDependencyEdges
// ============================================================================

describe('inferDependencyEdges', () => {
  it('infers sequential edges within the same flow', () => {
    const stories = [
      makeStory('Story 1', 'flow-1', 'flow-1/step-1'),
      makeStory('Story 2', 'flow-1', 'flow-1/step-2'),
      makeStory('Story 3', 'flow-1', 'flow-1/step-3'),
    ]

    const edges = inferDependencyEdges(stories)
    expect(edges).toHaveLength(2)
    expect(edges[0]).toEqual({
      from: 'Story 1|flow-1',
      to: 'Story 2|flow-1',
      type: 'flow_order',
    })
    expect(edges[1]).toEqual({
      from: 'Story 2|flow-1',
      to: 'Story 3|flow-1',
      type: 'flow_order',
    })
  })

  it('produces no edges for single-story flows', () => {
    const stories = [makeStory('Solo Story', 'flow-1', 'flow-1/step-1')]
    expect(inferDependencyEdges(stories)).toHaveLength(0)
  })

  it('handles stories from multiple flows independently', () => {
    const stories = [
      makeStory('A1', 'flow-1', 'flow-1/step-1'),
      makeStory('A2', 'flow-1', 'flow-1/step-2'),
      makeStory('B1', 'flow-2', 'flow-2/step-1'),
    ]

    const edges = inferDependencyEdges(stories)
    expect(edges).toHaveLength(1)
    expect(edges[0].type).toBe('flow_order')
  })
})

// ============================================================================
// computeParallelGroups
// ============================================================================

describe('computeParallelGroups', () => {
  it('returns a single layer when no edges', () => {
    const keys = ['A|f1', 'B|f2', 'C|f3']
    const groups = computeParallelGroups(keys, [])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toEqual(expect.arrayContaining(keys))
  })

  it('returns sequential layers for chain A→B→C', () => {
    const keys = ['A|f1', 'B|f1', 'C|f1']
    const edges = [
      { from: 'A|f1', to: 'B|f1', type: 'flow_order' },
      { from: 'B|f1', to: 'C|f1', type: 'flow_order' },
    ]
    const groups = computeParallelGroups(keys, edges)
    expect(groups).toHaveLength(3)
    expect(groups[0]).toEqual(['A|f1'])
    expect(groups[1]).toEqual(['B|f1'])
    expect(groups[2]).toEqual(['C|f1'])
  })

  it('groups independent stories in same layer', () => {
    // A→C, B→C: A and B are independent (same layer), C depends on both
    const keys = ['A|f1', 'B|f2', 'C|f1']
    const edges = [
      { from: 'A|f1', to: 'C|f1', type: 'flow_order' },
      { from: 'B|f2', to: 'C|f1', type: 'flow_order' },
    ]
    const groups = computeParallelGroups(keys, edges)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual(expect.arrayContaining(['A|f1', 'B|f2']))
    expect(groups[1]).toEqual(['C|f1'])
  })

  it('returns empty for empty input', () => {
    expect(computeParallelGroups([], [])).toEqual([])
  })
})

// ============================================================================
// orderStories
// ============================================================================

describe('orderStories', () => {
  it('places minimum-path stories first within each layer', () => {
    const stories = [
      makeStory('Regular', 'flow-1', 'flow-1/step-1', false),
      makeStory('MinPath', 'flow-2', 'flow-2/step-1', true),
    ]
    const groups = [['Regular|flow-1', 'MinPath|flow-2']]

    const ordered = orderStories(stories, groups)
    expect(ordered[0].title).toBe('MinPath')
    expect(ordered[1].title).toBe('Regular')
  })

  it('appends stories not in any parallel group', () => {
    const stories = [
      makeStory('A', 'flow-1', 'flow-1/step-1'),
      makeStory('Orphan', 'flow-99', 'flow-99/step-1'),
    ]
    const groups = [['A|flow-1']]

    const ordered = orderStories(stories, groups)
    expect(ordered).toHaveLength(2)
    expect(ordered[1].title).toBe('Orphan')
  })
})

// ============================================================================
// createWireDependenciesNode (integration)
// ============================================================================

describe('createWireDependenciesNode', () => {
  const baseState = {
    planSlug: 'test-plan',
    refinedPlan: null,
    flows: [makeFlow('flow-1', 1), makeFlow('flow-2', 3)],
    slicedFlows: [],
    generatedStories: [],
    dependencyEdges: [],
    parallelGroups: [],
    orderedStories: [],
    validationResult: null,
    generatedStoriesWithDeps: [],
    writeResult: null,
    generationPhase: 'generate_stories' as const,
    errors: [],
    warnings: [],
  }

  it('returns empty state and validate_graph phase when no stories', async () => {
    const node = createWireDependenciesNode()
    const result = await node({ ...baseState, generatedStories: [] })

    expect(result.generationPhase).toBe('validate_graph')
    expect(result.dependencyEdges).toEqual([])
    expect(result.parallelGroups).toEqual([])
    expect(result.orderedStories).toEqual([])
  })

  it('infers edges and computes parallel groups for stories in same flow', async () => {
    const stories = [
      makeStory('Story 1', 'flow-1', 'flow-1/step-1'),
      makeStory('Story 2', 'flow-1', 'flow-1/step-2'),
    ]
    const node = createWireDependenciesNode()
    const result = await node({ ...baseState, generatedStories: stories })

    expect(result.generationPhase).toBe('validate_graph')
    expect(result.dependencyEdges).toHaveLength(1)
    expect(result.parallelGroups).toHaveLength(2) // chain: [Story 1], [Story 2]
    expect(result.orderedStories).toHaveLength(2)
  })

  it('assigns minimum_path=true to stories in the flow with fewest steps', async () => {
    const stories = [
      makeStory('A', 'flow-1', 'flow-1/step-1'), // flow-1 has 1 step → min path
      makeStory('B', 'flow-2', 'flow-2/step-1'), // flow-2 has 3 steps
    ]
    const node = createWireDependenciesNode()
    const result = await node({ ...baseState, generatedStories: stories })

    const minPathStories = (result.generatedStories ?? []).filter(s => s.minimum_path)
    expect(minPathStories).toHaveLength(1)
    expect(minPathStories[0].title).toBe('A')
  })

  it('uses injectable minimumPathFn when provided', async () => {
    const stories = [
      makeStory('A', 'flow-1', 'flow-1/step-1'),
      makeStory('B', 'flow-2', 'flow-2/step-1'),
    ]
    // Override: always return story B as minimum path
    const minimumPathFn = () => [stories[1]]

    const node = createWireDependenciesNode({ minimumPathFn })
    const result = await node({ ...baseState, generatedStories: stories })

    const minPath = (result.generatedStories ?? []).filter(s => s.minimum_path)
    expect(minPath).toHaveLength(1)
    expect(minPath[0].title).toBe('B')
  })

  it('sets generationPhase to error on unexpected failure', async () => {
    const throwingFn = () => {
      throw new Error('boom')
    }
    const node = createWireDependenciesNode({ minimumPathFn: throwingFn })
    const stories = [makeStory('A', 'flow-1', 'flow-1/step-1')]
    const result = await node({ ...baseState, generatedStories: stories })

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain('wire_dependencies failed')
  })
})
