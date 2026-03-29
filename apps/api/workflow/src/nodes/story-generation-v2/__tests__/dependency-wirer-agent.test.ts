/**
 * dependency_wirer_agent node tests (v2)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  buildDependencyPrompt,
  topologicalSort,
  computeParallelGroups,
  fallbackWireDependencies,
  createDependencyWirerAgentNode,
} from '../dependency-wirer-agent.js'
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
    minimum_path: false,
    parent_plan_slug: 'test-plan',
    parent_flow_id: 'flow-1',
    flow_step_reference: 'flow-1/step-1',
    relevantFiles: ['src/foo.ts'],
    relevantFunctions: ['src/foo.ts: doSomething()'],
    implementationHints: ['Use async/await'],
    scopeBoundary: {
      inScope: ['Create foo handler'],
      outOfScope: ['Bar handler'],
    },
    acFlowTraceability: [{ acIndex: 0, flowStepRef: 'flow-1/step-1' }],
    postconditionsPassed: true,
    enrichmentFailures: [],
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
    generationV2Phase: 'dependency_wirer',
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
// buildDependencyPrompt tests
// ============================================================================

describe('buildDependencyPrompt', () => {
  it('includes story titles in prompt', () => {
    const stories = [
      makeEnrichedStory({ title: 'Create user model' }),
      makeEnrichedStory({ title: 'Build registration form' }),
    ]
    const prompt = buildDependencyPrompt(stories)

    expect(prompt).toContain('Create user model')
    expect(prompt).toContain('Build registration form')
  })

  it('includes scope boundaries in prompt', () => {
    const story = makeEnrichedStory({
      scopeBoundary: {
        inScope: ['Database schema changes'],
        outOfScope: ['API endpoints'],
      },
    })
    const prompt = buildDependencyPrompt([story])

    expect(prompt).toContain('Database schema changes')
    expect(prompt).toContain('API endpoints')
  })

  it('includes dependency rules about parallel execution', () => {
    const prompt = buildDependencyPrompt([])
    expect(prompt).toContain('parallel')
  })
})

// ============================================================================
// topologicalSort tests
// ============================================================================

describe('topologicalSort', () => {
  it('returns sorted order for acyclic graph', () => {
    const titles = ['A', 'B', 'C']
    const edges: DependencyEdgeV2[] = [
      { from: 'A', to: 'B', type: 'flow_order' },
      { from: 'B', to: 'C', type: 'flow_order' },
    ]
    const result = topologicalSort(titles, edges)
    expect(result).not.toBeNull()
    // A must come before B, B before C
    expect(result!.indexOf('A')).toBeLessThan(result!.indexOf('B'))
    expect(result!.indexOf('B')).toBeLessThan(result!.indexOf('C'))
  })

  it('returns null for cyclic graph', () => {
    const titles = ['A', 'B', 'C']
    const edges: DependencyEdgeV2[] = [
      { from: 'A', to: 'B', type: 'flow_order' },
      { from: 'B', to: 'C', type: 'flow_order' },
      { from: 'C', to: 'A', type: 'flow_order' }, // cycle
    ]
    const result = topologicalSort(titles, edges)
    expect(result).toBeNull()
  })

  it('returns all nodes for empty edges', () => {
    const titles = ['A', 'B', 'C']
    const result = topologicalSort(titles, [])
    expect(result).not.toBeNull()
    expect(result).toHaveLength(3)
  })

  it('handles single node with no edges', () => {
    const result = topologicalSort(['A'], [])
    expect(result).toEqual(['A'])
  })
})

// ============================================================================
// computeParallelGroups tests
// ============================================================================

describe('computeParallelGroups', () => {
  it('groups independent stories in layer 0', () => {
    const titles = ['A', 'B', 'C']
    const edges: DependencyEdgeV2[] = [] // no dependencies
    const groups = computeParallelGroups(titles, edges)

    expect(groups).toHaveLength(1)
    expect(groups[0]).toHaveLength(3)
  })

  it('creates sequential layers for linear chain', () => {
    const titles = ['A', 'B', 'C']
    const edges: DependencyEdgeV2[] = [
      { from: 'A', to: 'B', type: 'flow_order' },
      { from: 'B', to: 'C', type: 'flow_order' },
    ]
    const groups = computeParallelGroups(titles, edges)

    expect(groups).toHaveLength(3)
    expect(groups[0]).toContain('A')
    expect(groups[1]).toContain('B')
    expect(groups[2]).toContain('C')
  })

  it('puts parallel branches in same layer', () => {
    // A → B, A → C (B and C can run in parallel)
    const titles = ['A', 'B', 'C']
    const edges: DependencyEdgeV2[] = [
      { from: 'A', to: 'B', type: 'flow_order' },
      { from: 'A', to: 'C', type: 'flow_order' },
    ]
    const groups = computeParallelGroups(titles, edges)

    expect(groups).toHaveLength(2)
    expect(groups[0]).toContain('A')
    expect(groups[1]).toContain('B')
    expect(groups[1]).toContain('C')
  })
})

// ============================================================================
// fallbackWireDependencies tests
// ============================================================================

describe('fallbackWireDependencies', () => {
  it('creates sequential edges within same flow', () => {
    const stories = [
      makeEnrichedStory({ title: 'Story A', parent_flow_id: 'flow-1' }),
      makeEnrichedStory({ title: 'Story B', parent_flow_id: 'flow-1' }),
      makeEnrichedStory({ title: 'Story C', parent_flow_id: 'flow-1' }),
    ]
    const edges = fallbackWireDependencies(stories)

    expect(edges).toHaveLength(2)
    expect(edges[0]).toEqual({ from: 'Story A', to: 'Story B', type: 'flow_order' })
    expect(edges[1]).toEqual({ from: 'Story B', to: 'Story C', type: 'flow_order' })
  })

  it('does not create cross-flow edges', () => {
    const stories = [
      makeEnrichedStory({ title: 'Flow 1 Story', parent_flow_id: 'flow-1' }),
      makeEnrichedStory({ title: 'Flow 2 Story', parent_flow_id: 'flow-2' }),
    ]
    const edges = fallbackWireDependencies(stories)

    // No cross-flow edges in fallback
    expect(edges).toHaveLength(0)
  })

  it('returns empty for single story per flow', () => {
    const stories = [makeEnrichedStory({ title: 'Only Story', parent_flow_id: 'flow-1' })]
    const edges = fallbackWireDependencies(stories)
    expect(edges).toHaveLength(0)
  })
})

// ============================================================================
// createDependencyWirerAgentNode tests
// ============================================================================

describe('createDependencyWirerAgentNode', () => {
  it('uses fallback when no LLM adapter provided', async () => {
    const stories = [
      makeEnrichedStory({ title: 'Story A', parent_flow_id: 'flow-1' }),
      makeEnrichedStory({ title: 'Story B', parent_flow_id: 'flow-1' }),
    ]
    const node = createDependencyWirerAgentNode()
    const state = makeState({ enrichedStories: stories })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('validation')
    expect(result.dependencyEdges).toHaveLength(1)
    expect(result.orderedStories).toHaveLength(2)
    expect(result.parallelGroups?.length).toBeGreaterThan(0)
  })

  it('calls LLM adapter and builds dependency graph', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      edges: [
        { from: 'Story A', to: 'Story B', type: 'flow_order', rationale: 'B needs A' },
      ],
      minimumPath: ['Story A', 'Story B'],
      inputTokens: 100,
      outputTokens: 50,
    })

    const stories = [
      makeEnrichedStory({ title: 'Story A', parent_flow_id: 'flow-1' }),
      makeEnrichedStory({ title: 'Story B', parent_flow_id: 'flow-1' }),
    ]
    const node = createDependencyWirerAgentNode({ llmAdapter })
    const state = makeState({ enrichedStories: stories })

    const result = await node(state)

    expect(llmAdapter).toHaveBeenCalledOnce()
    expect(result.generationV2Phase).toBe('validation')
    expect(result.dependencyEdges).toHaveLength(1)
    expect(result.tokenUsage).toHaveLength(1)
    expect(result.tokenUsage?.[0].nodeId).toBe('dependency_wirer_agent')
  })

  it('marks minimum_path stories based on LLM response', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      edges: [],
      minimumPath: ['Story A'], // only Story A is on minimum path
      inputTokens: 50,
      outputTokens: 25,
    })

    const stories = [
      makeEnrichedStory({ title: 'Story A', minimum_path: false }),
      makeEnrichedStory({ title: 'Story B', minimum_path: false }),
    ]
    const node = createDependencyWirerAgentNode({ llmAdapter })
    const state = makeState({ enrichedStories: stories })

    const result = await node(state)

    const storyA = result.orderedStories?.find(s => s.title === 'Story A')
    const storyB = result.orderedStories?.find(s => s.title === 'Story B')
    expect(storyA?.minimum_path).toBe(true)
    expect(storyB?.minimum_path).toBe(false)
  })

  it('sets generationV2Phase to error when adapter throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM failed'))
    const stories = [makeEnrichedStory()]
    const node = createDependencyWirerAgentNode({ llmAdapter })
    const state = makeState({ enrichedStories: stories })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('error')
  })

  it('handles empty story list gracefully', async () => {
    const node = createDependencyWirerAgentNode()
    const state = makeState({ enrichedStories: [] })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('validation')
    expect(result.orderedStories).toHaveLength(0)
    expect(result.dependencyEdges).toHaveLength(0)
  })
})
