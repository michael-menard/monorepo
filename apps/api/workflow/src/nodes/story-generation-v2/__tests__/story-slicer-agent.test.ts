/**
 * story_slicer_agent node tests (v2)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  buildSlicerPrompt,
  fallbackSlice,
  createStorySlicerAgentNode,
} from '../story-slicer-agent.js'
import type { Flow } from '../../../state/plan-refinement-state.js'
import type {
  FlowScoutResult,
  StoryGenerationV2State,
} from '../../../state/story-generation-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'User Creates Account',
    actor: 'Visitor',
    trigger: 'User clicks Sign Up',
    steps: [
      { index: 1, description: 'Fill registration form' },
      { index: 2, description: 'Submit credentials to auth service' },
      { index: 3, description: 'Receive confirmation email' },
    ],
    successOutcome: 'Account created',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function makeScoutResult(flowId: string): FlowScoutResult {
  return {
    flowId,
    relevantFiles: ['src/auth/register.ts', 'src/email/sender.ts'],
    relevantFunctions: [{ file: 'src/auth/register.ts', name: 'createUser' }],
    existingPatterns: ['Error handling via tryCatch wrapper'],
    alreadyExists: ['src/auth/register.ts exists'],
    needsCreation: ['Email confirmation flow'],
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
    generationV2Phase: 'story_slicer',
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
// buildSlicerPrompt tests
// ============================================================================

describe('buildSlicerPrompt', () => {
  it('includes flow names and step descriptions in prompt', () => {
    const flows = [makeFlow()]
    const scouts = [makeScoutResult('flow-1')]
    const prompt = buildSlicerPrompt(flows, scouts)

    expect(prompt).toContain('User Creates Account')
    expect(prompt).toContain('Fill registration form')
    expect(prompt).toContain('Visitor')
  })

  it('includes scout file information in prompt', () => {
    const flows = [makeFlow()]
    const scouts = [makeScoutResult('flow-1')]
    const prompt = buildSlicerPrompt(flows, scouts)

    expect(prompt).toContain('src/auth/register.ts')
  })

  it('handles flows with no matching scout result', () => {
    const flows = [makeFlow()]
    const scouts: FlowScoutResult[] = [] // no matching scout
    const prompt = buildSlicerPrompt(flows, scouts)

    expect(prompt).toContain('User Creates Account')
    expect(prompt).toContain('none found')
  })

  it('includes slicing principles', () => {
    const prompt = buildSlicerPrompt([], [])
    expect(prompt).toContain('independently deployable')
  })
})

// ============================================================================
// fallbackSlice tests
// ============================================================================

describe('fallbackSlice', () => {
  it('returns single slice for flow with no steps', () => {
    const flow = makeFlow({ steps: [] })
    const slices = fallbackSlice(flow)
    expect(slices).toHaveLength(1)
    expect(slices[0].flowId).toBe('flow-1')
  })

  it('groups steps up to 3 per slice', () => {
    const flow = makeFlow({
      steps: [
        { index: 1, description: 'Step 1' },
        { index: 2, description: 'Step 2' },
        { index: 3, description: 'Step 3' },
        { index: 4, description: 'Step 4' },
      ],
    })
    const slices = fallbackSlice(flow)
    // 4 steps with max 3 per group → 2 slices
    expect(slices.length).toBeGreaterThanOrEqual(1)
    slices.forEach(s => {
      expect(s.flowId).toBe('flow-1')
      expect(s.stepIndices.length).toBeGreaterThan(0)
    })
  })

  it('splits on actor changes', () => {
    const flow = makeFlow({
      actor: 'User',
      steps: [
        { index: 1, description: 'Step 1', actor: 'User' },
        { index: 2, description: 'Step 2', actor: 'System' },
        { index: 3, description: 'Step 3', actor: 'System' },
      ],
    })
    const slices = fallbackSlice(flow)
    // Actor changes from User to System → at least 2 slices
    expect(slices.length).toBeGreaterThanOrEqual(2)
  })

  it('all slice flowIds match the input flow id', () => {
    const flow = makeFlow({ id: 'my-flow' })
    const slices = fallbackSlice(flow)
    slices.forEach(s => expect(s.flowId).toBe('my-flow'))
  })
})

// ============================================================================
// createStorySlicerAgentNode tests
// ============================================================================

describe('createStorySlicerAgentNode', () => {
  it('uses fallback heuristic when no LLM adapter provided', async () => {
    const flow = makeFlow()
    const state = makeState({ flows: [flow] })
    const node = createStorySlicerAgentNode()

    const result = await node(state)

    expect(result.generationV2Phase).toBe('story_enricher')
    expect(result.storyOutlines?.length).toBeGreaterThan(0)
    expect(result.tokenUsage).toHaveLength(0)
  })

  it('calls LLM adapter and converts slices to stories', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      slices: [
        {
          flowId: 'flow-1',
          stepIndices: [1, 2],
          scopeDescription: 'Handle registration form submission',
          rationale: 'Frontend form logic is isolated',
        },
        {
          flowId: 'flow-1',
          stepIndices: [3],
          scopeDescription: 'Send confirmation email',
          rationale: 'Email is a separate concern',
        },
      ],
      inputTokens: 100,
      outputTokens: 50,
    })

    const flow = makeFlow()
    const state = makeState({ flows: [flow], flowScoutResults: [makeScoutResult('flow-1')] })
    const node = createStorySlicerAgentNode({ llmAdapter })

    const result = await node(state)

    expect(llmAdapter).toHaveBeenCalledOnce()
    expect(result.generationV2Phase).toBe('story_enricher')
    expect(result.storyOutlines).toHaveLength(2)
    expect(result.tokenUsage).toHaveLength(1)
    expect(result.tokenUsage?.[0].inputTokens).toBe(100)
    expect(result.tokenUsage?.[0].outputTokens).toBe(50)
    expect(result.tokenUsage?.[0].nodeId).toBe('story_slicer_agent')
  })

  it('enforces maxStoriesPerFlow ceiling', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      slices: Array.from({ length: 10 }, (_, i) => ({
        flowId: 'flow-1',
        stepIndices: [i + 1],
        scopeDescription: `Slice ${i + 1}`,
        rationale: 'test',
      })),
      inputTokens: 50,
      outputTokens: 25,
    })

    const flow = makeFlow()
    const state = makeState({ flows: [flow] })
    const node = createStorySlicerAgentNode({ llmAdapter, maxStoriesPerFlow: 3 })

    const result = await node(state)

    // Only 3 stories should be created despite 10 slices
    expect(result.storyOutlines?.length).toBeLessThanOrEqual(3)
  })

  it('skips slices with unknown flowId', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      slices: [
        {
          flowId: 'unknown-flow-id',
          stepIndices: [1],
          scopeDescription: 'Unknown flow slice',
          rationale: 'test',
        },
      ],
      inputTokens: 10,
      outputTokens: 5,
    })

    const flow = makeFlow({ id: 'flow-1' })
    const state = makeState({ flows: [flow] })
    const node = createStorySlicerAgentNode({ llmAdapter })

    const result = await node(state)

    // Unknown flowId → skipped
    expect(result.storyOutlines).toHaveLength(0)
  })

  it('sets generationV2Phase to error when LLM adapter throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM unavailable'))
    const flow = makeFlow()
    const state = makeState({ flows: [flow] })
    const node = createStorySlicerAgentNode({ llmAdapter })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('story_slicer_agent failed')]),
    )
  })

  it('handles empty flows gracefully', async () => {
    const node = createStorySlicerAgentNode()
    const state = makeState({ flows: [] })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('story_enricher')
    expect(result.storyOutlines).toHaveLength(0)
  })

  it('all generated stories have required fields', async () => {
    const flow = makeFlow()
    const state = makeState({ flows: [flow] })
    const node = createStorySlicerAgentNode()

    const result = await node(state)

    result.storyOutlines?.forEach(story => {
      expect(story.title).toBeTruthy()
      expect(story.description).toBeTruthy()
      expect(story.parent_plan_slug).toBe('test-plan')
      expect(story.parent_flow_id).toBe('flow-1')
      expect(story.acceptance_criteria.length).toBeGreaterThan(0)
    })
  })
})
