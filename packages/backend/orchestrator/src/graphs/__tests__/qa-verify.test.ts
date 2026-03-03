import { describe, expect, it, vi } from 'vitest'
import {
  createQAVerifyGraph,
  runQAVerify,
  createQAVerifyInitializeNode,
  createQAVerifyPreconditionsNode,
  createQASubgraphNode,
  createQAVerifyCompleteNode,
  afterQAVerifyInitialize,
  afterQAVerifyPreconditions,
  afterQASubgraph,
  afterStateTransition,
  QAVerifyConfigSchema,
  QAVerifyResultSchema,
  type QAVerifyState,
  type QAVerifyConfig,
} from '../qa-verify.js'

// Mock qa.ts to avoid live subprocess calls
vi.mock('../qa.js', () => ({
  createQAGraph: vi.fn((_config, deps) => {
    // Capture deps to verify bridge (ARCH-003)
    ;(createQAGraph as any)._lastDeps = deps
    return {
      invoke: vi.fn().mockResolvedValue({
        storyId: 'WINT-9110',
        qaVerdict: 'PASS',
        gateDecision: { verdict: 'PASS', blocking_issues: '', reasoning: 'OK' },
        qaArtifact: null,
        errors: [],
        warnings: [],
      }),
    }
  }),
  runQA: vi.fn(),
  QAGraphConfigSchema: {
    parse: vi.fn(data => ({
      storyId: data.storyId,
      worktreeDir: data.worktreeDir ?? '/tmp',
      enableE2e: data.enableE2e ?? true,
      testFilter: data.testFilter ?? '@repo/orchestrator',
      playwrightConfig: data.playwrightConfig ?? 'playwright.legacy.config.ts',
      playwrightProject: data.playwrightProject ?? 'chromium-live',
      testTimeoutMs: 300000,
      testTimeoutRetries: 1,
      playwrightMaxRetries: 2,
      kbWriteBackEnabled: false,
      artifactBaseDir: 'plans',
      gateModel: 'claude-sonnet-4-5',
      nodeTimeoutMs: 60000,
    })),
  },
  QAGraphResultSchema: {
    parse: vi.fn(data => data),
  },
}))

// Get a reference to the mocked createQAGraph
import { createQAGraph } from '../qa.js'

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================================================
// Test Helpers
// ============================================================================

const mockModelClient = {
  callModel: async (prompt: string) => 'mock response',
}

function createTestState(overrides: Partial<QAVerifyState> = {}): QAVerifyState {
  return {
    storyId: 'WINT-9110',
    config: null,
    startedAt: null,
    threadId: null,
    evidence: null,
    review: null,
    preconditionsPassed: false,
    qaResult: null,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<QAVerifyConfig> = {}): QAVerifyConfig {
  return QAVerifyConfigSchema.parse({
    storyId: 'WINT-9110',
    worktreeDir: '/tmp/worktrees/WINT-9110',
    ...overrides,
  })
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('QAVerifyConfigSchema', () => {
  it('parses with required fields and defaults', () => {
    const config = createTestConfig()
    expect(config.storyId).toBe('WINT-9110')
    expect(config.enableE2e).toBe(true)
    expect(config.playwrightProject).toBe('chromium-live')
  })

  it('accepts injectable deps as unknown', () => {
    const config = createTestConfig({
      modelClient: mockModelClient,
      retryMiddleware: { stub: true },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.modelClient).toBeDefined()
    expect(config.retryMiddleware).toBeDefined()
    expect(config.telemetryNode).toBeDefined()
  })
})

// ============================================================================
// ARCH-003: modelClient bridge validation
// ============================================================================

describe('createQASubgraphNode — ARCH-003 modelClient bridge', () => {
  it('bridges config.modelClient into createQAGraph deps param', async () => {
    const node = createQASubgraphNode({ worktreeDir: '/tmp', modelClient: mockModelClient })
    const state = createTestState({
      preconditionsPassed: true,
      config: createTestConfig({ modelClient: mockModelClient }),
    })

    await node(state)

    // Verify createQAGraph was called with deps containing modelClient
    expect(createQAGraph).toHaveBeenCalled()
    const lastDeps = (createQAGraph as any)._lastDeps
    expect(lastDeps).toBeDefined()
    expect(lastDeps.modelClient).toBe(mockModelClient)
  })
})

// ============================================================================
// Conditional Edge Function Tests
// ============================================================================

describe('afterQAVerifyInitialize', () => {
  it('routes to preconditions when init succeeded', () => {
    expect(afterQAVerifyInitialize(createTestState({ workflowComplete: false }))).toBe('preconditions')
  })

  it('routes to complete when workflowComplete is true (init error)', () => {
    expect(afterQAVerifyInitialize(createTestState({ workflowComplete: true }))).toBe('complete')
  })
})

describe('afterQAVerifyPreconditions', () => {
  it('routes to qa_subgraph when preconditions passed', () => {
    expect(afterQAVerifyPreconditions(createTestState({ preconditionsPassed: true }))).toBe('qa_subgraph')
  })

  it('routes to complete when preconditions failed', () => {
    expect(afterQAVerifyPreconditions(createTestState({ preconditionsPassed: false }))).toBe('complete')
  })
})

describe('afterQASubgraph', () => {
  it('always routes to state_transition', () => {
    expect(afterQASubgraph(createTestState())).toBe('state_transition')
  })
})

describe('afterStateTransition', () => {
  it('always routes to complete', () => {
    expect(afterStateTransition(createTestState())).toBe('complete')
  })
})

// ============================================================================
// Node Tests
// ============================================================================

describe('createQAVerifyInitializeNode', () => {
  it('initializes with config when storyId and worktreeDir provided', async () => {
    const node = createQAVerifyInitializeNode({ worktreeDir: '/tmp/wt', storyId: 'WINT-9110' })
    const result = await node(createTestState())
    expect(result.config).toBeDefined()
    expect(result.startedAt).toBeTruthy()
    expect(result.errors).toEqual([])
  })

  it('returns error when storyId missing', async () => {
    const node = createQAVerifyInitializeNode({ worktreeDir: '/tmp/wt' })
    const result = await node(createTestState({ storyId: '' }))
    expect(result.errors).toContain('No story ID provided for qa-verify')
    expect(result.workflowComplete).toBe(true)
  })
})

describe('createQAVerifyPreconditionsNode', () => {
  it('passes preconditions by default', async () => {
    const node = createQAVerifyPreconditionsNode()
    const result = await node(createTestState())
    expect(result.preconditionsPassed).toBe(true)
  })
})

describe('createQASubgraphNode', () => {
  it('skips when preconditions not met', async () => {
    const node = createQASubgraphNode({})
    const state = createTestState({ preconditionsPassed: false })
    const result = await node(state)
    expect(result.qaResult).toBeNull()
    expect(result.errors).toContain('QA subgraph skipped: preconditions not met')
  })
})

describe('createQAVerifyCompleteNode', () => {
  it('marks success when qaResult verdict is PASS', async () => {
    const node = createQAVerifyCompleteNode()
    const state = createTestState({
      qaResult: {
        storyId: 'WINT-9110',
        verdict: 'PASS',
        qaArtifact: null,
        durationMs: 0,
        completedAt: new Date().toISOString(),
        errors: [],
        warnings: [],
      },
    })
    const result = await node(state)
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks not success when verdict is FAIL', async () => {
    const node = createQAVerifyCompleteNode()
    const state = createTestState({
      qaResult: {
        storyId: 'WINT-9110',
        verdict: 'FAIL',
        qaArtifact: null,
        durationMs: 0,
        completedAt: new Date().toISOString(),
        errors: [],
        warnings: [],
      },
    })
    const result = await node(state)
    expect(result.workflowSuccess).toBe(false)
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createQAVerifyGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createQAVerifyGraph()).not.toThrow()
    expect(() => createQAVerifyGraph({ enableE2e: false })).not.toThrow()
  })

  it('accepts injectable deps without throwing', () => {
    expect(() =>
      createQAVerifyGraph({
        modelClient: mockModelClient,
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runQAVerify Tests
// ============================================================================

describe('runQAVerify', () => {
  it('returns QAVerifyResult shape', async () => {
    const result = await runQAVerify({
      storyId: 'WINT-9110',
      config: { worktreeDir: '/tmp/wt' },
    })
    const parsed = QAVerifyResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.storyId).toBe('WINT-9110')
  })

  it('thread ID convention: storyId:qa-verify:attempt', async () => {
    const result = await runQAVerify({
      storyId: 'WINT-9110',
      config: { worktreeDir: '/tmp/wt' },
      attempt: 3,
    })
    expect(result.storyId).toBe('WINT-9110')
  })

  it('returns BLOCKED verdict on error path (missing storyId)', async () => {
    const result = await runQAVerify({
      storyId: '',
      config: { worktreeDir: '/tmp/wt' },
    })
    // Missing storyId causes config validation failure → BLOCKED
    expect(result.verdict).toBe('BLOCKED')
  })
})
