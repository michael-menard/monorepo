/**
 * validate_graph node tests
 * APRS-4020: ST-3 (AC-5/6)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  defaultGraphValidatorFn,
  createValidateGraphNode,
} from '../validate-graph.js'
import type { GeneratedStory, DependencyEdge } from '../../../state/story-generation-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStory(title: string, flowId: string): GeneratedStory {
  return {
    title,
    description: `Desc ${title}`,
    acceptance_criteria: ['AC1'],
    subtasks: [],
    tags: [],
    risk: 'low',
    minimum_path: false,
    parent_plan_slug: 'test-plan',
    parent_flow_id: flowId,
    flow_step_reference: `${flowId}/step-1`,
  }
}

const BASE_STATE = {
  planSlug: 'test-plan',
  refinedPlan: null,
  flows: [],
  slicedFlows: [],
  generatedStories: [],
  dependencyEdges: [] as DependencyEdge[],
  parallelGroups: [],
  orderedStories: [],
  validationResult: null,
  generatedStoriesWithDeps: [],
  generationPhase: 'wire_dependencies' as const,
  errors: [],
  warnings: [],
}

// ============================================================================
// defaultGraphValidatorFn
// ============================================================================

describe('defaultGraphValidatorFn', () => {
  it('always returns passed=true with empty errors/warnings', () => {
    const result = defaultGraphValidatorFn([], [])
    expect(result).toEqual({ passed: true, errors: [], warnings: [] })
  })

  it('passes with stories and edges', () => {
    const stories = [makeStory('A', 'flow-1')]
    const edges: DependencyEdge[] = [{ from: 'A|flow-1', to: 'B|flow-1', type: 'flow_order' }]
    const result = defaultGraphValidatorFn(stories, edges)
    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// createValidateGraphNode
// ============================================================================

describe('createValidateGraphNode', () => {
  it('sets generationPhase=complete when validation passes (default no-op)', async () => {
    const node = createValidateGraphNode()
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('A', 'flow-1')],
    })

    expect(result.generationPhase).toBe('complete')
    expect(result.validationResult).toEqual({ passed: true, errors: [], warnings: [] })
  })

  it('sets generationPhase=error when validation fails (cycle detected)', async () => {
    const graphValidator = vi.fn().mockReturnValue({
      passed: false,
      errors: ['Cycle detected: A → B → A'],
      warnings: [],
    })

    const node = createValidateGraphNode({ graphValidator })
    const result = await node(BASE_STATE)

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toContain('Cycle detected: A → B → A')
    expect(result.validationResult?.passed).toBe(false)
  })

  it('sets generationPhase=complete with warnings when validation passes with warnings', async () => {
    const graphValidator = vi.fn().mockReturnValue({
      passed: true,
      errors: [],
      warnings: ['Orphan story detected: X'],
    })

    const node = createValidateGraphNode({ graphValidator })
    const result = await node(BASE_STATE)

    expect(result.generationPhase).toBe('complete')
    expect(result.warnings).toContain('Orphan story detected: X')
  })

  it('propagates both errors and warnings when validation fails', async () => {
    const graphValidator = vi.fn().mockReturnValue({
      passed: false,
      errors: ['Cycle: A→B→A'],
      warnings: ['Duplicate: X'],
    })

    const node = createValidateGraphNode({ graphValidator })
    const result = await node(BASE_STATE)

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toContain('Cycle: A→B→A')
    expect(result.warnings).toContain('Duplicate: X')
  })

  it('uses injectable graphValidator instead of default', async () => {
    const customValidator = vi.fn().mockReturnValue({
      passed: true,
      errors: [],
      warnings: ['min-path coverage low'],
    })

    const node = createValidateGraphNode({ graphValidator: customValidator })
    await node(BASE_STATE)

    expect(customValidator).toHaveBeenCalledOnce()
  })

  it('sets generationPhase=error on unexpected exception', async () => {
    const graphValidator = vi.fn().mockImplementation(() => {
      throw new Error('validator crashed')
    })

    const node = createValidateGraphNode({ graphValidator })
    const result = await node(BASE_STATE)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('validate_graph failed')
  })
})
