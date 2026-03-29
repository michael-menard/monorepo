/**
 * story-generation-v2 graph tests
 */

import { describe, it, expect, vi } from 'vitest'
import { createStoryGenerationV2Graph } from '../story-generation-v2.js'
import type { NormalizedPlan } from '../../state/plan-refinement-state.js'
import type { EnrichedStory } from '../../state/story-generation-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeNormalizedPlan(): NormalizedPlan {
  return {
    planSlug: 'test-plan',
    title: 'Test Plan',
    summary: 'A test plan',
    problemStatement: 'Problem here',
    proposedSolution: 'Solution here',
    goals: ['Goal 1'],
    nonGoals: [],
    flows: [
      {
        id: 'flow-1',
        name: 'User Registers',
        actor: 'Visitor',
        trigger: 'Clicks sign up',
        steps: [
          { index: 1, description: 'Fill registration form' },
          { index: 2, description: 'Submit credentials' },
        ],
        successOutcome: 'Account created',
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
    tags: [],
  }
}

function makeEnrichment() {
  return {
    relevantFiles: ['src/auth/register.ts'],
    relevantFunctions: ['src/auth/register.ts: createUser()'],
    implementationHints: ['Use Zod for validation'],
    scopeBoundary: {
      inScope: ['Registration form', 'Validation logic'],
      outOfScope: ['Email verification'],
    },
    acceptance_criteria: [
      'Given valid input, createUser() is called at src/auth/register.ts',
      'Given invalid input, validation errors are shown inline',
    ],
    subtasks: ['Update src/auth/register.ts: createUser() to handle new fields'],
    acFlowTraceability: [
      { acIndex: 0, flowStepRef: 'flow-1/step-1' },
      { acIndex: 1, flowStepRef: 'flow-1/step-2' },
    ],
    inputTokens: 100,
    outputTokens: 75,
  }
}

// ============================================================================
// Graph instantiation tests
// ============================================================================

describe('createStoryGenerationV2Graph', () => {
  it('creates graph without config (all no-op adapters)', () => {
    const graph = createStoryGenerationV2Graph()
    expect(graph).toBeDefined()
  })

  it('creates graph with all adapters provided', () => {
    const graph = createStoryGenerationV2Graph({
      planLoader: vi.fn(),
      searchCodebase: vi.fn(),
      slicerLlmAdapter: vi.fn(),
      enricherLlmAdapter: vi.fn(),
      dependencyWirerLlmAdapter: vi.fn(),
      kbWriter: vi.fn(),
      tokenLogger: vi.fn(),
    })
    expect(graph).toBeDefined()
  })
})

// ============================================================================
// Full pipeline integration tests
// ============================================================================

describe('story-generation-v2 graph: full pipeline', () => {
  it('reaches complete phase with all adapters wired', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const searchCodebase = vi.fn().mockResolvedValue(['src/auth/register.ts'])
    const slicerLlmAdapter = vi.fn().mockResolvedValue({
      slices: [
        {
          flowId: 'flow-1',
          stepIndices: [1, 2],
          scopeDescription: 'Handle registration form submission',
          rationale: 'Isolated UI concern',
        },
      ],
      inputTokens: 80,
      outputTokens: 40,
    })
    const enricherLlmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const dependencyWirerLlmAdapter = vi.fn().mockResolvedValue({
      edges: [],
      minimumPath: ['User Registers: Handle registration form submission'],
      inputTokens: 60,
      outputTokens: 30,
    })
    const kbWriter = vi.fn().mockResolvedValue({
      storiesWritten: 1,
      storiesFailed: 0,
      errors: [],
    })
    const tokenLogger = vi.fn().mockResolvedValue(undefined)

    const graph = createStoryGenerationV2Graph({
      planLoader,
      searchCodebase,
      slicerLlmAdapter,
      enricherLlmAdapter,
      dependencyWirerLlmAdapter,
      kbWriter,
      tokenLogger,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationV2Phase).toBe('complete')
    expect(result.bakeOffVersion).toBe('v2-agentic')
    expect(result.writeResult?.storiesWritten).toBe(1)
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(planLoader).toHaveBeenCalledWith('test-plan')
    expect(kbWriter).toHaveBeenCalledOnce()
  })

  it('short-circuits to error when plan load fails', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const graph = createStoryGenerationV2Graph({ planLoader })

    const result = await graph.invoke({ planSlug: 'missing-plan' })

    expect(result.generationV2Phase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('missing-plan'))).toBe(true)
  })

  it('runs with no adapters and produces empty result', async () => {
    const graph = createStoryGenerationV2Graph()
    const result = await graph.invoke({ planSlug: 'no-adapters-plan' })

    // No plan loader → error phase
    expect(result.generationV2Phase).toBe('error')
  })

  it('proceeds through pipeline without LLM adapters using fallbacks', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const kbWriter = vi.fn().mockResolvedValue({
      storiesWritten: 0,
      storiesFailed: 0,
      errors: [],
    })

    const graph = createStoryGenerationV2Graph({
      planLoader,
      kbWriter,
      // No LLM adapters — uses fallback heuristics
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })

    // Should complete even without LLM adapters
    expect(result.generationV2Phase).toBe('complete')
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('accumulates token usage across agentic nodes', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const slicerLlmAdapter = vi.fn().mockResolvedValue({
      slices: [
        {
          flowId: 'flow-1',
          stepIndices: [1],
          scopeDescription: 'Register user',
          rationale: 'Test',
        },
      ],
      inputTokens: 100,
      outputTokens: 50,
    })
    const enricherLlmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const dependencyWirerLlmAdapter = vi.fn().mockResolvedValue({
      edges: [],
      minimumPath: [],
      inputTokens: 60,
      outputTokens: 30,
    })
    const kbWriter = vi.fn().mockResolvedValue({
      storiesWritten: 1,
      storiesFailed: 0,
      errors: [],
    })

    const graph = createStoryGenerationV2Graph({
      planLoader,
      slicerLlmAdapter,
      enricherLlmAdapter,
      dependencyWirerLlmAdapter,
      kbWriter,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })

    // Token usage should be accumulated from all agentic nodes
    expect(result.tokenUsage.length).toBeGreaterThan(0)
    const totalInput = result.tokenUsage.reduce(
      (sum: number, t: { inputTokens: number }) => sum + t.inputTokens,
      0,
    )
    expect(totalInput).toBeGreaterThan(0)
  })

  it('handles cycle in dependency graph with hard error', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)

    // Wire a dependency cycle via the dependency wirer
    const slicerLlmAdapter = vi.fn().mockResolvedValue({
      slices: [
        {
          flowId: 'flow-1',
          stepIndices: [1],
          scopeDescription: 'Story A',
          rationale: 'Test',
        },
        {
          flowId: 'flow-1',
          stepIndices: [2],
          scopeDescription: 'Story B',
          rationale: 'Test',
        },
      ],
      inputTokens: 50,
      outputTokens: 25,
    })
    const enricherLlmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const dependencyWirerLlmAdapter = vi.fn().mockResolvedValue({
      // Cycle: A → B → A
      edges: [
        { from: 'User Registers: Story A', to: 'User Registers: Story B', type: 'flow_order', rationale: '' },
        { from: 'User Registers: Story B', to: 'User Registers: Story A', type: 'flow_order', rationale: '' },
      ],
      minimumPath: [],
      inputTokens: 40,
      outputTokens: 20,
    })

    const graph = createStoryGenerationV2Graph({
      planLoader,
      slicerLlmAdapter,
      enricherLlmAdapter,
      dependencyWirerLlmAdapter,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })

    // Cycle → validation node fires hard error
    expect(result.generationV2Phase).toBe('error')
  })
})
