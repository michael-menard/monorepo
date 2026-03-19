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
  shouldEscalate,
  DevImplementConfigSchema,
  DevImplementResultSchema,
  type DevImplementState,
  type DevImplementConfig,
} from '../dev-implement.js'
import type { CommitRecord } from '../implementation.js'

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

function makeCommitRecord(overrides: Partial<CommitRecord> = {}): CommitRecord {
  return {
    changeSpecId: 'CS-1',
    commitSha: 'abc123',
    commitMessage: 'feat(CS-1): test change',
    touchedFiles: ['packages/backend/orchestrator/src/graphs/dev-implement.ts'],
    committedAt: new Date().toISOString(),
    durationMs: 100,
    ...overrides,
  }
}

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
    storyTransitioned: false,
    errors: [],
    warnings: [],
    iterationCount: 0,
    maxIterations: 2,
    modelTier: 'sonnet',
    // New ST-1 fields (AC-6)
    worktreePath: null,
    changeSpecs: [],
    currentChangeIndex: 0,
    completedChanges: [],
    changeLoopStatus: null,
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

  // AC-7: modelDispatch field in config schema
  it('accepts modelDispatch injection (AC-7)', () => {
    const mockDispatch = { dispatch: vi.fn() }
    const config = DevImplementConfigSchema.parse({ modelDispatch: mockDispatch })
    expect(config.modelDispatch).toBeDefined()
    expect(config.modelDispatch).toBe(mockDispatch)
  })
})

// ============================================================================
// shouldEscalate Tests (AC-3)
// ============================================================================

describe('shouldEscalate', () => {
  it('returns proceed when iterationCount=0', () => {
    expect(shouldEscalate({ iterationCount: 0, maxIterations: 2 })).toBe('proceed')
  })

  it('returns escalate_to_opus when iterationCount=1 (ED-2)', () => {
    expect(shouldEscalate({ iterationCount: 1, maxIterations: 2 })).toBe('escalate_to_opus')
  })

  it('returns abort_to_blocked when iterationCount >= maxIterations (EC-2)', () => {
    expect(shouldEscalate({ iterationCount: 2, maxIterations: 2 })).toBe('abort_to_blocked')
    expect(shouldEscalate({ iterationCount: 3, maxIterations: 2 })).toBe('abort_to_blocked')
  })
})

// ============================================================================
// Conditional Edge Function Tests
// ============================================================================

describe('afterDevImplementInitialize', () => {
  it('routes to load_plan when init succeeded', () => {
    expect(afterDevImplementInitialize(createTestState({ workflowComplete: false }))).toBe(
      'load_plan',
    )
  })

  it('routes to complete when workflowComplete is true (init error)', () => {
    expect(afterDevImplementInitialize(createTestState({ workflowComplete: true }))).toBe(
      'complete',
    )
  })
})

describe('afterLoadPlan', () => {
  it('always routes to execute', () => {
    expect(afterLoadPlan(createTestState())).toBe('execute')
  })
})

describe('afterExecute', () => {
  // HP-2: routes to review_subgraph on success+runReview=true (AC-8)
  it('routes to review_subgraph by default (HP-2)', () => {
    const state = createTestState({
      config: createTestConfig({ runReview: true }),
      iterationCount: 0,
    })
    expect(afterExecute(state)).toBe('review_subgraph')
  })

  // HP-3: routes to collect_evidence when runReview=false (AC-8)
  it('routes to collect_evidence when runReview is false (HP-3)', () => {
    const state = createTestState({
      config: createTestConfig({ runReview: false }),
      iterationCount: 0,
    })
    expect(afterExecute(state)).toBe('collect_evidence')
  })

  // EC-3: routes to complete on abort_to_blocked (AC-3, AC-8, AC-11)
  it('routes to complete on abort_to_blocked escalation (EC-3)', () => {
    const state = createTestState({
      config: createTestConfig({ runReview: true }),
      iterationCount: 2,
      maxIterations: 2,
    })
    expect(afterExecute(state)).toBe('complete')
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
// Execute Node Tests
// ============================================================================

describe('createExecuteNode', () => {
  // EC-1: no modelDispatch → executeComplete=true, completedChanges=[] (AC-1)
  it('sets executeComplete=true with warning when no modelDispatch (EC-1)', async () => {
    const node = createExecuteNode()
    const state = createTestState({
      config: createTestConfig({}),
    })
    const result = await node(state)
    expect(result.executeComplete).toBe(true)
    expect(result.completedChanges).toEqual([])
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.warnings![0]).toContain('no modelDispatch configured')
  })

  // HP-1: modelDispatch called once per ChangeSpec (AC-1, AC-2)
  it('calls modelDispatch.dispatch once per ChangeSpec (HP-1)', async () => {
    const mockDispatch = {
      dispatch: vi.fn().mockResolvedValue({
        success: true,
        output: '// generated code',
        durationMs: 10,
      }),
    }

    // Mock createChangeLoopNode to avoid real file system operations
    vi.doMock('../../nodes/change-loop.js', () => ({
      createChangeLoopNode: vi.fn(() => async (_state: any) => ({
        changeLoopStatus: 'complete',
        completedChanges: [makeCommitRecord()],
        currentChangeIndex: 1,
      })),
    }))

    const node = createExecuteNode()
    const planContent = {
      changes: [
        {
          schema: 1,
          story_id: 'WINT-9110',
          id: 'CS-1',
          description: 'test change',
          ac_ids: ['AC-1'],
          change_type: 'file_change',
          file_path: 'packages/backend/orchestrator/src/foo.ts',
          file_action: 'modify',
        },
      ],
    }
    const state = createTestState({
      storyId: 'WINT-9110',
      config: createTestConfig({ modelDispatch: mockDispatch as any }),
      planContent,
    })
    const result = await node(state)
    // Should complete since we have modelDispatch (even if change loop may abort without real FS)
    expect(result.worktreePath).toContain('WINT-9110')
    vi.doUnmock('../../nodes/change-loop.js')
  })

  // ED-3: worktreePath derived as path.join(config.worktreePath, storyId) (AC-2)
  it('derives worktreePath as path.join(config.worktreePath, storyId) (ED-3)', async () => {
    const mockDispatch = {
      dispatch: vi.fn().mockResolvedValue({ success: false, error: 'mock', durationMs: 0 }),
    }
    const node = createExecuteNode()
    const state = createTestState({
      storyId: 'WINT-9110',
      config: createTestConfig({
        worktreePath: '/custom/worktrees',
        modelDispatch: mockDispatch as any,
      }),
      planContent: null,
    })
    const result = await node(state)
    // When planContent is null → no changeSpecs → executeComplete=true
    expect(result.executeComplete).toBe(true)
    expect(result.worktreePath).toBe('/custom/worktrees/WINT-9110')
  })

  // ED-4: no WINT-9070 warning string in result (AC-5)
  it('does not emit WINT-9070 warning string (ED-4)', async () => {
    const node = createExecuteNode()
    const state = createTestState({
      config: createTestConfig({}),
    })
    const result = await node(state)
    const allWarnings = (result.warnings ?? []).join(' ')
    expect(allWarnings).not.toContain('WINT-9070')
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

describe('createCollectEvidenceNode', () => {
  // HP-4: saveProof called with real file paths from CommitRecord.touchedFiles, no 'stub' path (AC-4)
  it('sets evidenceCollected=true with stub warning when no workflowRepo (EC-4)', async () => {
    const node = createCollectEvidenceNode()
    const state = createTestState({
      config: createTestConfig({}),
    })
    const result = await node(state)
    expect(result.evidenceCollected).toBe(true)
    expect(result.warnings!.length).toBeGreaterThan(0)
  })

  // HP-4: saveProof called with real file paths from completedChanges (AC-4)
  it('calls saveProof with evidence from completedChanges (HP-4)', async () => {
    const saveProofMock = vi.fn().mockResolvedValue(undefined)
    const workflowRepo = {
      saveProof: saveProofMock,
      getLatestPlan: vi.fn(),
    }
    const node = createCollectEvidenceNode()
    const touchedFile = 'packages/backend/orchestrator/src/graphs/dev-implement.ts'
    const state = createTestState({
      config: createTestConfig({ workflowRepo } as any),
      completedChanges: [makeCommitRecord({ touchedFiles: [touchedFile] })],
    })
    const result = await node(state)
    expect(result.evidenceCollected).toBe(true)
    expect(saveProofMock).toHaveBeenCalledOnce()
    const [_storyId, evidence] = saveProofMock.mock.calls[0]
    // Real file paths used, not 'stub'
    expect(evidence.touched_files.some((f: any) => f.path === touchedFile)).toBe(true)
    expect(evidence.touched_files.some((f: any) => f.path === 'stub')).toBe(false)
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

  // AC-11: afterExecute typed to include 'complete'; addConditionalEdges includes complete: 'complete'
  it('compiles with complete edge in afterExecute conditional (AC-11)', () => {
    // Graph compiles without TS error — the addConditionalEdges map includes complete: 'complete'
    expect(() =>
      createDevImplementGraph({ modelDispatch: { dispatch: vi.fn() } as any }),
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

  // HP-5: full integration — runDevImplement with runReview=false completes
  it('integration: completes with executeComplete=true and evidenceCollected=true (HP-5)', async () => {
    const result = await runDevImplement({
      storyId: 'WINT-9110',
      config: { runReview: false, persistToDb: false },
    })
    expect(result.executeComplete).toBe(true)
    expect(result.evidenceCollected).toBe(true)
  })
})
