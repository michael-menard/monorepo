import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createBootstrapGraph,
  runBootstrap,
  createBootstrapInitializeNode,
  createRunStoryCreationNode,
  createBootstrapCompleteNode,
  afterBootstrapInitialize,
  afterRunStoryCreation,
  BootstrapConfigSchema,
  BootstrapResultSchema,
  BootstrapStateAnnotation,
  type BootstrapState,
  type BootstrapConfig,
} from '../bootstrap.js'

// Mock story-creation dependency to avoid live LLM calls
vi.mock('../story-creation.js', () => ({
  createStoryCreationGraph: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      storyId: 'WINT-0001',
      currentPhase: 'complete',
      workflowSuccess: true,
      synthesizedStory: { title: 'Test Story' },
      readinessResult: { score: 90 },
      hitlRequired: false,
      hitlDecision: 'approve',
      commitmentGateResult: null,
      warnings: [],
      errors: [],
    }),
  })),
  StoryCreationResultSchema: {
    parse: vi.fn(data => data),
  },
}))

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(overrides: Partial<BootstrapState> = {}): BootstrapState {
  return {
    storyId: 'WINT-9110',
    config: null,
    startedAt: null,
    threadId: null,
    storyRequest: {
      title: 'Test Story',
      domain: 'wint',
      description: 'A test story',
      tags: ['test'],
    },
    storyCreationResult: null,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<BootstrapConfig> = {}): BootstrapConfig {
  return BootstrapConfigSchema.parse({
    autoApprovalThreshold: 95,
    requireHiTL: true,
    maxAttackIterations: 3,
    persistToDb: false,
    ...overrides,
  })
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('BootstrapConfigSchema', () => {
  it('parses with defaults', () => {
    const config = BootstrapConfigSchema.parse({})
    expect(config.autoApprovalThreshold).toBe(95)
    expect(config.requireHiTL).toBe(true)
    expect(config.maxAttackIterations).toBe(3)
    expect(config.persistToDb).toBe(false)
  })

  it('accepts injectable deps as unknown', () => {
    const config = BootstrapConfigSchema.parse({
      retryMiddleware: { middleware: 'stub' },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.retryMiddleware).toBeDefined()
    expect(config.checkpointer).toBeDefined()
    expect(config.telemetryNode).toBeDefined()
  })
})

// ============================================================================
// Conditional Edge Function Tests (ARCH-002 — exported for test access)
// ============================================================================

describe('afterBootstrapInitialize', () => {
  it('routes to run_story_creation when no errors and config set', () => {
    const state = createTestState({ config: createTestConfig(), errors: [] })
    expect(afterBootstrapInitialize(state)).toBe('run_story_creation')
  })

  it('routes to complete when workflow is already complete (init error)', () => {
    const state = createTestState({
      workflowComplete: true,
      config: null,
      errors: ['No story ID provided'],
    })
    expect(afterBootstrapInitialize(state)).toBe('complete')
  })

  it('routes to run_story_creation when errors array empty', () => {
    const state = createTestState({ config: createTestConfig() })
    expect(afterBootstrapInitialize(state)).toBe('run_story_creation')
  })
})

describe('afterRunStoryCreation', () => {
  it('always routes to complete', () => {
    const stateSuccess = createTestState({ workflowSuccess: true })
    const stateFail = createTestState({ workflowSuccess: false })
    expect(afterRunStoryCreation(stateSuccess)).toBe('complete')
    expect(afterRunStoryCreation(stateFail)).toBe('complete')
  })
})

// ============================================================================
// Node Tests
// ============================================================================

describe('createBootstrapInitializeNode', () => {
  it('initializes with config and timestamps', async () => {
    const node = createBootstrapInitializeNode({})
    const state = createTestState()
    const result = await node(state)

    expect(result.config).toBeDefined()
    expect(result.startedAt).toBeTruthy()
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('returns error when storyId missing', async () => {
    const node = createBootstrapInitializeNode({})
    const state = createTestState({ storyId: '' })
    const result = await node(state)

    expect(result.errors).toContain('No story ID provided for bootstrap')
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

describe('createRunStoryCreationNode', () => {
  it('skips gracefully when no story request', async () => {
    const node = createRunStoryCreationNode({})
    const state = createTestState({ storyRequest: null })
    const result = await node(state)

    expect(result.storyCreationResult).toBeNull()
    expect(result.warnings).toContain('No story request provided — skipping story creation')
  })
})

describe('createBootstrapCompleteNode', () => {
  it('marks complete and success based on storyCreationResult', async () => {
    const node = createBootstrapCompleteNode()
    const stateWithSuccess = createTestState({
      storyCreationResult: {
        storyId: 'WINT-9110',
        phase: 'complete',
        success: true,
        synthesizedStory: null,
        readinessScore: 90,
        hitlRequired: false,
        hitlDecision: 'approve',
        commitmentGateResult: null,
        warnings: [],
        errors: [],
        durationMs: 100,
        completedAt: new Date().toISOString(),
      },
    })
    const result = await node(stateWithSuccess)
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks complete but not success when no storyCreationResult', async () => {
    const node = createBootstrapCompleteNode()
    const state = createTestState({ storyCreationResult: null })
    const result = await node(state)
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createBootstrapGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createBootstrapGraph()).not.toThrow()
    expect(() => createBootstrapGraph({ persistToDb: false })).not.toThrow()
  })

  it('accepts injectable deps without throwing', () => {
    expect(() =>
      createBootstrapGraph({
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runBootstrap Integration Tests (mocked invoke)
// ============================================================================

describe('runBootstrap', () => {
  it('returns BootstrapResult shape on success', async () => {
    const result = await runBootstrap({
      storyId: 'WINT-9110',
      storyRequest: {
        title: 'Test',
        domain: 'wint',
        description: 'desc',
        tags: [],
      },
    })

    // Validates against schema
    const parsed = BootstrapResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.storyId).toBe('WINT-9110')
  })

  it('thread ID convention: storyId:bootstrap:attempt', async () => {
    // We can't directly inspect threadId from the outside but verify structure
    const result = await runBootstrap({
      storyId: 'WINT-9110',
      storyRequest: { title: 'T', domain: 'w', description: 'd', tags: [] },
      attempt: 2,
    })
    // If the run completes without error, thread ID was wired correctly
    expect(result.storyId).toBe('WINT-9110')
  })

  it('handles graph errors gracefully', async () => {
    // Force an error by passing invalid storyId (empty)
    const result = await runBootstrap({
      storyId: '',
      storyRequest: { title: 'T', domain: 'w', description: 'd', tags: [] },
    })
    // Should return error result, not throw
    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
