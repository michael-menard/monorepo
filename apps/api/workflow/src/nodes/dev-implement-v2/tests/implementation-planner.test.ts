/**
 * implementation_planner node tests (dev-implement-v2)
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
  buildPlannerPrompt,
  checkPlannerPostconditions,
  createImplementationPlannerNode,
} from '../implementation-planner.js'
import type { StoryGroundingContext, ImplementationPlan, DevImplementV2State } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeGrounding(overrides: Partial<StoryGroundingContext> = {}): StoryGroundingContext {
  return {
    storyId: 'WINT-1234',
    storyTitle: 'Add User Auth',
    acceptanceCriteria: ['User can log in', 'Invalid credentials shows error'],
    subtasks: ['Build login form', 'Add validation'],
    relevantFiles: ['src/auth/login.ts'],
    relevantFunctions: [{ file: 'src/auth/login.ts', name: 'authenticateUser' }],
    existingPatterns: ['Zod validation'],
    relatedStories: [],
    ...overrides,
  }
}

function makeState(overrides: Partial<DevImplementV2State> = {}): DevImplementV2State {
  return {
    storyId: 'WINT-1234',
    storyGroundingContext: makeGrounding(),
    implementationPlan: null,
    testRunResult: null,
    implementationEvidence: null,
    postconditionResult: null,
    devImplementV2Phase: 'implementation_planner',
    selfCorrectionRetryCount: 0,
    maxSelfCorrectionRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeValidPlan(overrides: Partial<ImplementationPlan> = {}): ImplementationPlan {
  return {
    approach: 'Implement login form with Zod validation',
    filesToCreate: ['src/components/LoginForm.tsx'],
    filesToModify: ['src/auth/login.ts'],
    testFilesToCreate: ['src/components/LoginForm.test.tsx'],
    estimatedSubtasks: [],
    risks: [],
    ...overrides,
  }
}

// ============================================================================
// buildPlannerPrompt tests
// ============================================================================

describe('buildPlannerPrompt', () => {
  it('includes story title in prompt', () => {
    const prompt = buildPlannerPrompt(makeGrounding())
    expect(prompt).toContain('Add User Auth')
  })

  it('includes acceptance criteria', () => {
    const prompt = buildPlannerPrompt(makeGrounding())
    expect(prompt).toContain('User can log in')
  })

  it('includes previous failures when provided', () => {
    const prompt = buildPlannerPrompt(makeGrounding(), [
      { check: 'tests_planned', reason: 'No test files specified' },
    ])
    expect(prompt).toContain('tests_planned')
    expect(prompt).toContain('No test files specified')
  })

  it('includes relevant files', () => {
    const prompt = buildPlannerPrompt(makeGrounding())
    expect(prompt).toContain('src/auth/login.ts')
  })
})

// ============================================================================
// checkPlannerPostconditions tests
// ============================================================================

describe('checkPlannerPostconditions', () => {
  it('passes for valid plan', () => {
    const result = checkPlannerPostconditions(makeValidPlan())
    expect(result.passed).toBe(true)
  })

  it('fails when no files planned', () => {
    const result = checkPlannerPostconditions(makeValidPlan({ filesToCreate: [], filesToModify: [] }))
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'files_planned')).toBe(true)
  })

  it('fails when no test files planned', () => {
    const result = checkPlannerPostconditions(makeValidPlan({ testFilesToCreate: [] }))
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'tests_planned')).toBe(true)
  })

  it('fails when approach is empty', () => {
    const result = checkPlannerPostconditions(makeValidPlan({ approach: '' }))
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'approach_documented')).toBe(true)
  })

  it('passes when filesToModify has items but filesToCreate is empty', () => {
    const result = checkPlannerPostconditions(makeValidPlan({ filesToCreate: [] }))
    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// createImplementationPlannerNode tests
// ============================================================================

describe('createImplementationPlannerNode', () => {
  it('runs with no-op adapter and produces valid plan', async () => {
    const node = createImplementationPlannerNode()
    const result = await node(makeState())
    expect(result.implementationPlan).not.toBeNull()
    expect(result.devImplementV2Phase).toBe('implementation_executor')
  })

  it('calls llmAdapter', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        tool: 'complete',
        args: {
          plan: {
            approach: 'Test approach',
            filesToCreate: ['src/new.ts'],
            filesToModify: [],
            testFilesToCreate: ['src/new.test.ts'],
            estimatedSubtasks: [],
            risks: [],
          },
        },
      }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createImplementationPlannerNode({ llmAdapter })
    const result = await node(makeState())
    expect(llmAdapter).toHaveBeenCalled()
    expect(result.implementationPlan?.approach).toBe('Test approach')
  })

  it('tracks token usage', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        tool: 'complete',
        args: {
          plan: {
            approach: 'A',
            filesToCreate: ['src/a.ts'],
            filesToModify: [],
            testFilesToCreate: ['src/a.test.ts'],
            estimatedSubtasks: [],
            risks: [],
          },
        },
      }),
      inputTokens: 100,
      outputTokens: 50,
    })
    const node = createImplementationPlannerNode({ llmAdapter })
    const result = await node(makeState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
    expect((result.tokenUsage as Array<{ inputTokens: number }>)[0]?.inputTokens).toBe(100)
  })

  it('degrades gracefully when LLM throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM offline'))
    const node = createImplementationPlannerNode({ llmAdapter })
    const result = await node(makeState())
    expect(result.implementationPlan).not.toBeNull()
    expect(result.devImplementV2Phase).toBe('implementation_executor')
  })

  it('handles null grounding context gracefully', async () => {
    const node = createImplementationPlannerNode()
    const result = await node(makeState({ storyGroundingContext: null }))
    expect(result.implementationPlan).not.toBeNull()
  })
})
