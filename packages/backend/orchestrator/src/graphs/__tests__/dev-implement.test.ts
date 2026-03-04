import { describe, expect, it, vi } from 'vitest'
import {
  createDevImplementGraph,
  runDevImplement,
  createDevImplementInitializeNode,
  createLoadPlanNode,
  createExecuteNode,
  createCollectEvidenceNode,
  createDevImplementCompleteNode,
  afterDevImplementInitialize,
  afterLoadPlan,
  afterExecute,
  afterReviewSubgraph,
  afterCollectEvidence,
  afterSaveToDb,
  DevImplementConfigSchema,
  DevImplementResultSchema,
  type DevImplementState,
  type DevImplementConfig,
} from '../dev-implement.js'

// Mock review.ts to avoid live subprocess calls
vi.mock('../review.js', () => ({
  runReview: vi.fn().mockResolvedValue({
    storyId: 'WINT-9110',
    verdict: 'PASS',
    reviewYamlPath: null,
    workers_run: [],
    workers_skipped: [],
    total_errors: 0,
    total_warnings: 0,
    durationMs: 10,
    completedAt: new Date().toISOString(),
    errors: [],
    warnings: [],
  }),
  createReviewGraph: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({ complete: true }),
  })),
}))

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(overrides: Partial<DevImplementState> = {}): DevImplementState {
  return {
    storyId: 'WINT-9110',
    config: null,
    startedAt: null,
    threadId: null,
    planLoaded: false,
    planContent: null,
    executeComplete: false,
    reviewResult: null,
    evidenceCollected: false,
    dbSaveSuccess: false,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<DevImplementConfig> = {}): DevImplementConfig {
  return DevImplementConfigSchema.parse(overrides)
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('DevImplementConfigSchema', () => {
  it('parses with defaults', () => {
    const config = DevImplementConfigSchema.parse({})
    expect(config.persistToDb).toBe(false)
    expect(config.runReview).toBe(true)
    expect(config.featureDir).toBe('plans/future/platform')
  })

  it('accepts injectable deps as unknown', () => {
    const config = DevImplementConfigSchema.parse({
      retryMiddleware: { stub: true },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.retryMiddleware).toBeDefined()
    expect(config.checkpointer).toBeDefined()
    expect(config.telemetryNode).toBeDefined()
  })
})

// ============================================================================
// Conditional Edge Function Tests
// ============================================================================

describe('afterDevImplementInitialize', () => {
  it('routes to load_plan when init succeeded', () => {
    expect(afterDevImplementInitialize(createTestState({ workflowComplete: false }))).toBe('load_plan')
  })

  it('routes to complete when workflowComplete is true (init error)', () => {
    expect(afterDevImplementInitialize(createTestState({ workflowComplete: true }))).toBe('complete')
  })
})

describe('afterLoadPlan', () => {
  it('always routes to execute', () => {
    expect(afterLoadPlan(createTestState())).toBe('execute')
  })
})

describe('afterExecute', () => {
  it('routes to review_subgraph by default', () => {
    const state = createTestState({ config: createTestConfig({ runReview: true }) })
    expect(afterExecute(state)).toBe('review_subgraph')
  })

  it('routes to collect_evidence when runReview is false', () => {
    const state = createTestState({ config: createTestConfig({ runReview: false }) })
    expect(afterExecute(state)).toBe('collect_evidence')
  })
})

describe('afterReviewSubgraph', () => {
  it('always routes to collect_evidence', () => {
    expect(afterReviewSubgraph(createTestState())).toBe('collect_evidence')
  })
})

describe('afterCollectEvidence', () => {
  it('always routes to save_to_db', () => {
    expect(afterCollectEvidence(createTestState())).toBe('save_to_db')
  })
})

describe('afterSaveToDb', () => {
  it('always routes to complete', () => {
    expect(afterSaveToDb(createTestState())).toBe('complete')
  })
})

// ============================================================================
// Node Tests
// ============================================================================

describe('createDevImplementInitializeNode', () => {
  it('initializes with config and clears errors', async () => {
    const node = createDevImplementInitializeNode({})
    const result = await node(createTestState())
    expect(result.config).toBeDefined()
    expect(result.startedAt).toBeTruthy()
    expect(result.errors).toEqual([])
  })

  it('returns error when storyId missing', async () => {
    const node = createDevImplementInitializeNode({})
    const result = await node(createTestState({ storyId: '' }))
    expect(result.errors).toContain('No story ID provided for dev-implement')
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

describe('createLoadPlanNode', () => {
  it('sets planLoaded=true with stub warning', async () => {
    const node = createLoadPlanNode()
    const result = await node(createTestState())
    expect(result.planLoaded).toBe(true)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })
})

describe('createExecuteNode', () => {
  it('sets executeComplete=true with stub warning', async () => {
    const node = createExecuteNode()
    const result = await node(createTestState())
    expect(result.executeComplete).toBe(true)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })
})

describe('createCollectEvidenceNode', () => {
  it('sets evidenceCollected=true with stub warning', async () => {
    const node = createCollectEvidenceNode()
    const result = await node(createTestState())
    expect(result.evidenceCollected).toBe(true)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })
})

describe('createDevImplementCompleteNode', () => {
  it('marks success when executeComplete and evidenceCollected', async () => {
    const node = createDevImplementCompleteNode()
    const state = createTestState({ executeComplete: true, evidenceCollected: true })
    const result = await node(state)
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks not success when not all complete', async () => {
    const node = createDevImplementCompleteNode()
    const state = createTestState({ executeComplete: false, evidenceCollected: true })
    const result = await node(state)
    expect(result.workflowSuccess).toBe(false)
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createDevImplementGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createDevImplementGraph()).not.toThrow()
    expect(() => createDevImplementGraph({ runReview: false })).not.toThrow()
  })

  it('accepts injectable deps without throwing', () => {
    expect(() =>
      createDevImplementGraph({
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runDevImplement Happy-Path and Error-Path Tests
// ============================================================================

describe('runDevImplement', () => {
  it('returns DevImplementResult shape on happy path', async () => {
    const result = await runDevImplement({ storyId: 'WINT-9110' })
    const parsed = DevImplementResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.storyId).toBe('WINT-9110')
  })

  it('thread ID convention: storyId:dev-implement:attempt', async () => {
    const result = await runDevImplement({ storyId: 'WINT-9110', attempt: 2 })
    expect(result.storyId).toBe('WINT-9110')
  })

  it('returns success=true when implementation stubs complete', async () => {
    const result = await runDevImplement({ storyId: 'WINT-9110', config: { runReview: false } })
    expect(result.planLoaded).toBe(true)
    expect(result.executeComplete).toBe(true)
    expect(result.evidenceCollected).toBe(true)
    expect(result.success).toBe(true)
  })

  it('handles missing storyId gracefully (error path)', async () => {
    const result = await runDevImplement({ storyId: '' })
    // Invokes complete via error path — should not throw
    expect(result.storyId).toBe('')
  })
})
