/**
 * story_enricher_agent node tests (v2)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  buildEnrichmentPrompt,
  mergeEnrichment,
  checkStoryPostconditions,
  createStoryEnricherAgentNode,
  type LlmEnrichment,
} from '../story-enricher-agent.js'
import type { GeneratedStory } from '../../../state/story-generation-state.js'
import type {
  FlowScoutResult,
  EnrichedStory,
  StoryGenerationV2State,
} from '../../../state/story-generation-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStoryOutline(overrides: Partial<GeneratedStory> = {}): GeneratedStory {
  return {
    title: 'User Registration Form',
    description: 'Implement the user registration form with validation',
    acceptance_criteria: ['Form submits correctly'],
    subtasks: ['Build form component'],
    tags: ['auth', 'frontend'],
    risk: 'medium',
    minimum_path: true,
    parent_plan_slug: 'auth-plan',
    parent_flow_id: 'flow-1',
    flow_step_reference: 'flow-1/steps-1-2',
    ...overrides,
  }
}

function makeScoutResult(overrides: Partial<FlowScoutResult> = {}): FlowScoutResult {
  return {
    flowId: 'flow-1',
    relevantFiles: ['src/auth/register.ts', 'src/components/RegisterForm.tsx'],
    relevantFunctions: [
      { file: 'src/auth/register.ts', name: 'createUser', signature: 'createUser(data: UserInput): Promise<User>' },
    ],
    existingPatterns: ['Use Zod for form validation', 'useForm hook for state management'],
    alreadyExists: ['RegisterForm skeleton exists'],
    needsCreation: ['Form validation logic', 'Submit handler'],
    ...overrides,
  }
}

function makeEnrichment(overrides: Partial<LlmEnrichment> = {}): LlmEnrichment {
  return {
    relevantFiles: ['src/auth/register.ts', 'src/components/RegisterForm.tsx'],
    relevantFunctions: ['src/auth/register.ts: createUser()'],
    implementationHints: ['Use Zod schema for validation', 'Handle 422 errors from API'],
    scopeBoundary: {
      inScope: ['Registration form UI', 'Client-side validation', 'Submit handler'],
      outOfScope: ['Email verification flow', 'OAuth integration'],
    },
    acceptance_criteria: [
      'Given visitor fills form correctly, form submits to src/auth/register.ts: createUser()',
      'Given invalid input, Zod validation shows inline errors without submitting',
    ],
    subtasks: [
      'Update src/components/RegisterForm.tsx: add validation logic',
      'Update src/auth/register.ts: createUser() to return structured errors',
    ],
    acFlowTraceability: [
      { acIndex: 0, flowStepRef: 'flow-1/step-1' },
      { acIndex: 1, flowStepRef: 'flow-1/step-2' },
    ],
    inputTokens: 200,
    outputTokens: 150,
    ...overrides,
  }
}

function makeEnrichedStory(overrides: Partial<EnrichedStory> = {}): EnrichedStory {
  const outline = makeStoryOutline()
  const enrichment = makeEnrichment()
  return {
    ...outline,
    ...enrichment,
    postconditionsPassed: true,
    enrichmentFailures: [],
    ...overrides,
  }
}

function makeState(overrides: Partial<StoryGenerationV2State> = {}): StoryGenerationV2State {
  return {
    planSlug: 'auth-plan',
    refinedPlan: null,
    flows: [],
    flowScoutResults: [makeScoutResult()],
    storyOutlines: [makeStoryOutline()],
    enrichedStories: [],
    dependencyEdges: [],
    parallelGroups: [],
    orderedStories: [],
    validationResult: null,
    writeResult: null,
    generationV2Phase: 'story_enricher',
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
// buildEnrichmentPrompt tests
// ============================================================================

describe('buildEnrichmentPrompt', () => {
  it('includes story title and description', () => {
    const story = makeStoryOutline()
    const scout = makeScoutResult()
    const prompt = buildEnrichmentPrompt(story, scout, [])

    expect(prompt).toContain('User Registration Form')
    expect(prompt).toContain('implementation specifics')
  })

  it('includes scout file context', () => {
    const story = makeStoryOutline()
    const scout = makeScoutResult()
    const prompt = buildEnrichmentPrompt(story, scout, [])

    expect(prompt).toContain('src/auth/register.ts')
    expect(prompt).toContain('createUser')
  })

  it('includes previous failures when retrying', () => {
    const story = makeStoryOutline()
    const scout = makeScoutResult()
    const failures = ['ac_count: Expected >= 2 acceptance criteria, got 1']
    const prompt = buildEnrichmentPrompt(story, scout, failures)

    expect(prompt).toContain('PREVIOUS FAILURES TO FIX')
    expect(prompt).toContain('ac_count')
  })

  it('includes postconditions in prompt', () => {
    const story = makeStoryOutline()
    const scout = makeScoutResult()
    const prompt = buildEnrichmentPrompt(story, scout, [])

    expect(prompt).toContain('POSTCONDITIONS')
    expect(prompt).toContain('acceptance_criteria')
    expect(prompt).toContain('relevantFiles')
  })
})

// ============================================================================
// mergeEnrichment tests
// ============================================================================

describe('mergeEnrichment', () => {
  it('merges enrichment fields into story', () => {
    const outline = makeStoryOutline()
    const enrichment = makeEnrichment()
    const scout = makeScoutResult()

    const result = mergeEnrichment(outline, enrichment, scout)

    expect(result.relevantFiles).toEqual(enrichment.relevantFiles)
    expect(result.implementationHints).toEqual(enrichment.implementationHints)
    expect(result.scopeBoundary).toEqual(enrichment.scopeBoundary)
    expect(result.acFlowTraceability).toEqual(enrichment.acFlowTraceability)
  })

  it('uses enriched acceptance_criteria when non-empty', () => {
    const outline = makeStoryOutline({ acceptance_criteria: ['Original AC'] })
    const enrichment = makeEnrichment({
      acceptance_criteria: ['Enriched AC 1', 'Enriched AC 2'],
    })
    const result = mergeEnrichment(outline, enrichment, makeScoutResult())
    expect(result.acceptance_criteria).toEqual(['Enriched AC 1', 'Enriched AC 2'])
  })

  it('falls back to outline acceptance_criteria when enrichment has empty array', () => {
    const outline = makeStoryOutline({ acceptance_criteria: ['Original AC 1', 'Original AC 2'] })
    const enrichment = makeEnrichment({ acceptance_criteria: [] })
    const result = mergeEnrichment(outline, enrichment, makeScoutResult())
    expect(result.acceptance_criteria).toEqual(['Original AC 1', 'Original AC 2'])
  })

  it('sets postconditionsPassed to false by default (checked separately)', () => {
    const result = mergeEnrichment(makeStoryOutline(), makeEnrichment(), makeScoutResult())
    expect(result.postconditionsPassed).toBe(false)
  })
})

// ============================================================================
// checkStoryPostconditions tests
// ============================================================================

describe('checkStoryPostconditions', () => {
  it('passes when all conditions met', () => {
    const story = makeEnrichedStory()
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  it('fails when AC count < 2', () => {
    const story = makeEnrichedStory({ acceptance_criteria: ['Only one AC'] })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'ac_count')).toBe(true)
  })

  it('fails when acFlowTraceability is empty', () => {
    const story = makeEnrichedStory({ acFlowTraceability: [] })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'ac_traceability')).toBe(true)
  })

  it('fails when relevantFiles is empty', () => {
    const story = makeEnrichedStory({ relevantFiles: [] })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'relevant_files')).toBe(true)
  })

  it('fails when no subtask has a file reference', () => {
    const story = makeEnrichedStory({ subtasks: ['Do something vague'] })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'subtask_file_ref')).toBe(true)
  })

  it('fails when scopeBoundary.inScope is empty', () => {
    const story = makeEnrichedStory({
      scopeBoundary: { inScope: [], outOfScope: ['Something out of scope'] },
    })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'scope_in')).toBe(true)
  })

  it('fails when scopeBoundary.outOfScope is empty', () => {
    const story = makeEnrichedStory({
      scopeBoundary: { inScope: ['Something in scope'], outOfScope: [] },
    })
    const result = checkStoryPostconditions(story)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'scope_out')).toBe(true)
  })

  it('reports storyTitle in result', () => {
    const story = makeEnrichedStory({ title: 'My Story Title' })
    const result = checkStoryPostconditions(story)
    expect(result.storyTitle).toBe('My Story Title')
  })
})

// ============================================================================
// createStoryEnricherAgentNode tests
// ============================================================================

describe('createStoryEnricherAgentNode', () => {
  it('returns passthrough enriched stories when no adapter provided', async () => {
    const node = createStoryEnricherAgentNode()
    const state = makeState()

    const result = await node(state)

    expect(result.generationV2Phase).toBe('dependency_wirer')
    expect(result.enrichedStories).toHaveLength(1)
    expect(result.enrichedStories?.[0].postconditionsPassed).toBe(true)
  })

  it('calls LLM adapter per story and merges enrichment', async () => {
    const llmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const node = createStoryEnricherAgentNode({ llmAdapter })
    const state = makeState()

    const result = await node(state)

    expect(llmAdapter).toHaveBeenCalledOnce()
    expect(result.enrichedStories).toHaveLength(1)
    expect(result.tokenUsage).toHaveLength(1)
    expect(result.tokenUsage?.[0].nodeId).toBe('story_enricher_agent')
  })

  it('advances to dependency_wirer when all stories pass postconditions', async () => {
    const llmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const node = createStoryEnricherAgentNode({ llmAdapter })
    const state = makeState()

    const result = await node(state)

    expect(result.generationV2Phase).toBe('dependency_wirer')
  })

  it('stays in story_enricher phase when stories fail and retries remain', async () => {
    const badEnrichment = makeEnrichment({
      relevantFiles: [], // will fail relevant_files check
      acFlowTraceability: [], // will fail ac_traceability check
      scopeBoundary: { inScope: [], outOfScope: [] }, // will fail scope checks
    })
    const llmAdapter = vi.fn().mockResolvedValue(badEnrichment)
    const node = createStoryEnricherAgentNode({ llmAdapter })
    const state = makeState({ enricherRetryCount: 0, maxEnricherRetries: 2 })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('story_enricher')
    expect(result.enricherRetryCount).toBe(1)
  })

  it('advances to dependency_wirer when max retries reached despite failures', async () => {
    const badEnrichment = makeEnrichment({ relevantFiles: [] })
    const llmAdapter = vi.fn().mockResolvedValue(badEnrichment)
    const node = createStoryEnricherAgentNode({ llmAdapter })
    // At max retries
    const state = makeState({ enricherRetryCount: 2, maxEnricherRetries: 2 })

    const result = await node(state)

    expect(result.generationV2Phase).toBe('dependency_wirer')
  })

  it('sets generationV2Phase to error on unexpected exception', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('Catastrophic failure'))
    const node = createStoryEnricherAgentNode({ llmAdapter })
    const state = makeState()

    const result = await node(state)

    expect(result.generationV2Phase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('story_enricher_agent failed')]),
    )
  })

  it('skips already-passing stories on retry', async () => {
    const llmAdapter = vi.fn().mockResolvedValue(makeEnrichment())
    const node = createStoryEnricherAgentNode({ llmAdapter })

    // Simulate a retry state where the story already passed
    const passingStory = makeEnrichedStory({ title: 'User Registration Form', postconditionsPassed: true })
    const state = makeState({
      enricherRetryCount: 1,
      enrichedStories: [passingStory],
    })

    const result = await node(state)

    // Should not call LLM for already-passing story
    expect(llmAdapter).not.toHaveBeenCalled()
    expect(result.enrichedStories?.[0].postconditionsPassed).toBe(true)
  })
})
