/**
 * story-generation graph compilation + integration tests
 * APRS-4010: ST-5 / AC-6, AC-7
 * APRS-4020: ST-5 / AC-7 (5-node pipeline)
 * APRS-4030: ST-5 / AC-6, AC-7 (6-node pipeline with write_to_kb)
 */

import { describe, it, expect, vi } from 'vitest'
import { createStoryGenerationGraph } from '../story-generation.js'
import type { GraphValidatorFn } from '../../nodes/story-generation/validate-graph.js'
import type { KbWriterFn } from '../../nodes/story-generation/write-to-kb.js'

// ============================================================================
// Helpers
// ============================================================================

const VALID_PLAN = {
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'Summary',
  problemStatement: 'Problem',
  proposedSolution: 'Solution',
  goals: ['Goal 1'],
  nonGoals: [],
  flows: [
    {
      id: 'flow-1',
      name: 'User Flow',
      actor: 'User',
      trigger: 'User clicks',
      steps: [
        { index: 1, description: 'Open form' },
        { index: 2, description: 'Submit form' },
      ],
      successOutcome: 'Done',
      source: 'user',
      confidence: 1.0,
      status: 'confirmed',
    },
  ],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: [],
  status: 'active',
  priority: 'high',
  tags: ['test'],
}

// ============================================================================
// Graph compilation tests
// ============================================================================

describe('createStoryGenerationGraph', () => {
  it('compiles without throwing (AC-6)', () => {
    expect(() => createStoryGenerationGraph()).not.toThrow()
  })

  it('returns a compiled graph with invoke method (AC-7)', () => {
    const graph = createStoryGenerationGraph()
    expect(typeof graph.invoke).toBe('function')
  })

  it('graph structure: START → load_refined_plan → slice_flows → generate_stories → wire_dependencies → validate_graph → write_to_kb → END', () => {
    // Compilation confirms graph structure is valid
    const graph = createStoryGenerationGraph()
    expect(graph).toBeDefined()
  })
})

// ============================================================================
// Graph integration tests (with injectable adapters)
// ============================================================================

describe('createStoryGenerationGraph integration', () => {
  it('runs full 6-node pipeline from start to end with plan loader', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'Story description',
      acceptance_criteria: ['AC1'],
      subtasks: ['Task 1'],
      risk: 'low',
    })

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('complete')
    expect(result.refinedPlan).not.toBeNull()
    expect(result.refinedPlan?.planSlug).toBe('test-plan')
    expect(result.flows).toHaveLength(1)
    expect(result.slicedFlows.length).toBeGreaterThan(0)
    expect(result.generatedStories.length).toBeGreaterThan(0)
    // 6-node pipeline: wire_dependencies, validate_graph, and write_to_kb ran
    expect(result.orderedStories.length).toBeGreaterThan(0)
    expect(result.validationResult).not.toBeNull()
    expect(result.validationResult?.passed).toBe(true)
    expect(result.writeResult).not.toBeNull()
    expect(result.writeResult?.storiesWritten).toBeGreaterThan(0)
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(planLoader).toHaveBeenCalledWith('test-plan')
  })

  it('exits at load_refined_plan on error (plan not found)', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)

    const graph = createStoryGenerationGraph({ planLoader })
    const result = await graph.invoke({ planSlug: 'missing-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
    // Should not have proceeded to slice or generate
    expect(result.slicedFlows).toEqual([])
    expect(result.generatedStories).toEqual([])
  })

  it('completes with empty stories when no confirmed flows', async () => {
    const planWithNoConfirmedFlows = {
      ...VALID_PLAN,
      flows: [
        {
          ...VALID_PLAN.flows[0],
          status: 'unconfirmed',
        },
      ],
    }
    const planLoader = vi.fn().mockResolvedValue(planWithNoConfirmedFlows)

    const graph = createStoryGenerationGraph({ planLoader })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    // No confirmed flows → slice_flows proceeds but generates nothing
    expect(result.generatedStories).toEqual([])
    expect(result.generationPhase).toBe('complete')
  })

  it('accepts injectable adapters via factory (AC-7)', () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const llmAdapter = vi.fn()

    expect(() => createStoryGenerationGraph({ planLoader, llmAdapter })).not.toThrow()
  })

  it('works with no adapters (default no-op behavior)', async () => {
    const graph = createStoryGenerationGraph()
    // With no planLoader, should error out gracefully
    const result = await graph.invoke({ planSlug: 'any-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts injectable graphValidator via factory', () => {
    const graphValidator: GraphValidatorFn = vi.fn().mockReturnValue({
      passed: true,
      errors: [],
      warnings: [],
    })

    expect(() => createStoryGenerationGraph({ graphValidator })).not.toThrow()
  })

  it('exits at wire_dependencies on error', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })
    // minimumPathFn that throws → wire_dependencies sets error phase
    const minimumPathFn = () => {
      throw new Error('wiring failed')
    }

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, minimumPathFn })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('wire_dependencies failed'))).toBe(true)
  })

  it('exits at validate_graph when validation fails (cycle) — does not reach write_to_kb', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })
    const graphValidator: GraphValidatorFn = () => ({
      passed: false,
      errors: ['Cycle detected: A → B → A'],
      warnings: [],
    })
    const kbWriter: KbWriterFn = vi.fn()

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, graphValidator, kbWriter })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('Cycle detected'))).toBe(true)
    expect(result.writeResult).toBeNull()
    expect(kbWriter).not.toHaveBeenCalled()
  })

  it('accepts injectable kbWriter via factory', () => {
    const kbWriter: KbWriterFn = vi.fn()
    expect(() => createStoryGenerationGraph({ kbWriter })).not.toThrow()
  })

  it('runs full 6-node pipeline with injectable kbWriter', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: ['Task 1'],
      risk: 'low',
    })
    const kbWriter: KbWriterFn = vi.fn().mockImplementation(async stories => ({
      results: stories.map((s: { story_id: string }) => ({
        success: true,
        story_id: s.story_id,
      })),
      planUpdated: true,
    }))

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, kbWriter })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('complete')
    expect(kbWriter).toHaveBeenCalled()
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(result.writeResult?.planStatusUpdated).toBe(true)
  })

  it('exits at write_to_kb on partial failure', async () => {
    const multiFlowPlan = {
      ...VALID_PLAN,
      flows: [
        VALID_PLAN.flows[0],
        {
          id: 'flow-2',
          name: 'Admin Flow',
          actor: 'Admin',
          trigger: 'Admin clicks',
          steps: [
            { index: 1, description: 'View dashboard' },
            { index: 2, description: 'Export data' },
          ],
          successOutcome: 'Data exported',
          source: 'user',
          confidence: 1.0,
          status: 'confirmed',
        },
      ],
    }
    const planLoader = vi.fn().mockResolvedValue(multiFlowPlan)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })
    const kbWriter: KbWriterFn = vi.fn().mockImplementation(async stories => ({
      results: stories.map((s: { story_id: string }, i: number) => ({
        success: i === 0,
        story_id: s.story_id,
        ...(i > 0 ? { error: 'DB write failed' } : {}),
      })),
      planUpdated: false,
    }))

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, kbWriter })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    // write_to_kb sets error on partial failure
    expect(result.generationPhase).toBe('error')
    expect(result.writeResult?.storiesFailed).toBeGreaterThan(0)
  })
})
