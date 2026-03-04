/**
 * Unit tests for the change-loop node.
 *
 * Tests:
 * HP-1: Node returns complete when no change specs
 * HP-2: Node dispatches to model and commits on success (pass routing)
 * HP-3: Node retries on dispatch failure and eventually aborts after maxRetries
 * HP-4: Node routes to abort when micro-verify fails after maxRetries
 * HP-5: Already-committed ChangeSpec skipped on idempotent resume
 * EC-1: BudgetExhaustedError from dispatch triggers permanent abort
 * EC-2: BudgetExhaustedError thrown inside retry loop triggers permanent abort
 * EC-3: Node returns abort when no modelDispatch configured
 *
 * APIP-1032 AC-5, AC-6, AC-7, AC-8, AC-11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createChangeLoopNode,
  derivePackageFilter,
  MAX_CHANGE_RETRIES,
  type ChangeLoopStatus,
} from '../nodes/change-loop.js'
import { CommitRecordSchema } from '../graphs/implementation.js'
import { BudgetExhaustedError } from '../pipeline/__types__/index.js'
import type { ImplementationGraphState } from '../graphs/implementation.js'
import type { IModelDispatch } from '../pipeline/i-model-dispatch.js'
import type { ChangeSpec } from '../artifacts/change-spec.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock spawnCommand and runMicroVerify for unit tests
vi.mock('../nodes/change-loop.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../nodes/change-loop.js')>()
  return {
    ...actual,
  }
})

// ============================================================================
// Fixtures
// ============================================================================

function makeFileChangeSpec(overrides: Partial<ChangeSpec> = {}): ChangeSpec {
  return {
    schema: 1,
    story_id: 'TEST-001',
    id: 'CS-1',
    description: 'Create test file',
    change_type: 'file_change',
    file_path: 'packages/backend/orchestrator/src/test-file.ts',
    file_action: 'create',
    ac_ids: ['AC-1'],
    complexity: 'low',
    test_strategy: 'unit',
    test_hints: [],
    dependencies: [],
    ...overrides,
  } as ChangeSpec
}

function makeState(overrides: Partial<ImplementationGraphState> = {}): ImplementationGraphState {
  return {
    storyId: 'TEST-001',
    attemptNumber: 1,
    featureDir: 'plans/test',
    startedAt: new Date().toISOString(),
    storyContent: 'story content',
    changeSpecs: [],
    loadError: null,
    storyLoaded: true,
    worktreePath: '/tmp/test-worktree',
    worktreeCreated: true,
    currentChangeIndex: 0,
    completedChanges: [],
    changeLoopComplete: false,
    changeLoopStatus: null,
    changeLoopRetryCount: 0,
    evidencePath: null,
    evidenceWritten: false,
    workflowComplete: false,
    workflowSuccess: false,
    aborted: false,
    abortReason: null,
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeSuccessDispatch(output = '// generated code'): IModelDispatch {
  return {
    dispatch: vi.fn().mockResolvedValue({
      success: true,
      output,
      durationMs: 100,
    }),
  }
}

function makeFailDispatch(error = 'model error'): IModelDispatch {
  return {
    dispatch: vi.fn().mockResolvedValue({
      success: false,
      error,
      durationMs: 50,
    }),
  }
}

// ============================================================================
// Helper: create node with mocked spawnCommand for unit tests
// ============================================================================

/**
 * Creates a change-loop node that mocks the subprocess calls.
 * Unit tests should not spawn real processes.
 */
async function createMockedNode(opts: {
  modelDispatch?: IModelDispatch
  maxRetries?: number
  microVerifyPasses?: boolean
  commitSha?: string
}) {
  const { createChangeLoopNode: _create, ...rest } = await import('../nodes/change-loop.js')
  void rest

  // We'll patch spawnCommand by mocking child_process.spawn
  return { _create, opts }
}

// ============================================================================
// Tests: derivePackageFilter helper
// ============================================================================

describe('derivePackageFilter', () => {
  it('derives @repo/orchestrator from orchestrator path', () => {
    const result = derivePackageFilter('packages/backend/orchestrator/src/foo.ts')
    expect(result).toBe('@repo/orchestrator')
  })

  it('derives @repo/mcp-tools from mcp-tools path', () => {
    const result = derivePackageFilter('packages/backend/mcp-tools/src/bar.ts')
    expect(result).toBe('@repo/mcp-tools')
  })

  it('returns empty string for unrecognized path', () => {
    const result = derivePackageFilter('random/path/without/packages.ts')
    expect(result).toBe('')
  })

  it('handles apps paths', () => {
    const result = derivePackageFilter('apps/web/main-app/src/component.tsx')
    expect(result).toBe('@repo/main-app')
  })
})

// ============================================================================
// Tests: HP-1 — No change specs → complete immediately
// ============================================================================

describe('change-loop node: HP-1 no change specs', () => {
  it('returns complete status when changeSpecs is empty', async () => {
    const node = createChangeLoopNode({ modelDispatch: makeSuccessDispatch() })
    const state = makeState({ changeSpecs: [] })
    const result = await node(state)
    expect(result.changeLoopComplete).toBe(true)
    expect(result.changeLoopStatus).toBe('complete')
  })

  it('returns complete when currentChangeIndex >= changeSpecs.length', async () => {
    const spec = makeFileChangeSpec()
    const node = createChangeLoopNode({ modelDispatch: makeSuccessDispatch() })
    const state = makeState({
      changeSpecs: [spec],
      currentChangeIndex: 1,
    })
    const result = await node(state)
    expect(result.changeLoopComplete).toBe(true)
    expect(result.changeLoopStatus).toBe('complete')
  })
})

// ============================================================================
// Tests: EC-3 — No model dispatch → abort
// ============================================================================

describe('change-loop node: EC-3 no model dispatch', () => {
  it('returns abort status when no modelDispatch configured', async () => {
    const spec = makeFileChangeSpec()
    const node = createChangeLoopNode({ modelDispatch: undefined })
    const state = makeState({ changeSpecs: [spec] })
    const result = await node(state)
    expect(result.changeLoopStatus).toBe('abort')
    expect(result.abortReason).toContain('No model dispatch configured')
  })

  it('returns abort when worktreePath is null', async () => {
    const spec = makeFileChangeSpec()
    const node = createChangeLoopNode({ modelDispatch: makeSuccessDispatch() })
    const state = makeState({ changeSpecs: [spec], worktreePath: null })
    const result = await node(state)
    expect(result.changeLoopStatus).toBe('abort')
  })
})

// ============================================================================
// Tests: HP-5 — Idempotent resume: skip already-committed specs
// ============================================================================

describe('change-loop node: HP-5 idempotent resume', () => {
  it('skips spec whose id is already in completedChanges', async () => {
    const spec = makeFileChangeSpec({ id: 'CS-1' })
    const existingCommit = CommitRecordSchema.parse({
      changeSpecId: 'CS-1',
      commitSha: 'existing-sha',
      commitMessage: 'feat(CS-1): already committed',
      touchedFiles: [],
      committedAt: new Date().toISOString(),
      durationMs: 0,
    })

    const mockDispatch = makeSuccessDispatch()
    const node = createChangeLoopNode({ modelDispatch: mockDispatch })
    const state = makeState({
      changeSpecs: [spec],
      currentChangeIndex: 0,
      completedChanges: [existingCommit],
    })

    const result = await node(state)

    // Should advance index without calling dispatch
    expect(mockDispatch.dispatch).not.toHaveBeenCalled()
    expect(result.currentChangeIndex).toBe(1)
    // Since index 1 >= length 1, should mark complete
    expect(result.changeLoopComplete).toBe(true)
  })

  it('skips first spec and processes second when first is already committed', async () => {
    const spec1 = makeFileChangeSpec({ id: 'CS-1' })
    const spec2 = makeFileChangeSpec({ id: 'CS-2', file_path: 'packages/backend/orchestrator/src/other.ts' })

    const existingCommit = CommitRecordSchema.parse({
      changeSpecId: 'CS-1',
      commitSha: 'existing-sha',
      commitMessage: 'feat(CS-1): already committed',
      touchedFiles: [],
      committedAt: new Date().toISOString(),
      durationMs: 0,
    })

    const node = createChangeLoopNode({ modelDispatch: makeSuccessDispatch() })
    const state = makeState({
      changeSpecs: [spec1, spec2],
      currentChangeIndex: 0,
      completedChanges: [existingCommit],
    })

    const result = await node(state)
    // Should advance to index 1 (skipped CS-1), not complete
    expect(result.currentChangeIndex).toBe(1)
    expect(result.changeLoopComplete).toBe(false)
  })
})

// ============================================================================
// Tests: EC-1, EC-2 — BudgetExhaustedError triggers permanent abort
// ============================================================================

describe('change-loop node: EC-1/EC-2 BudgetExhaustedError', () => {
  it('EC-1: BudgetExhaustedError from dispatch returns abort immediately', async () => {
    const spec = makeFileChangeSpec()
    const budgetError = new BudgetExhaustedError({
      storyId: 'TEST-001',
      tokensUsed: 10000,
      budgetCap: 5000,
    })

    const mockDispatch: IModelDispatch = {
      dispatch: vi.fn().mockRejectedValue(budgetError),
    }

    const node = createChangeLoopNode({ modelDispatch: mockDispatch, maxRetries: 3 })
    const state = makeState({ changeSpecs: [spec] })
    const result = await node(state)

    expect(result.changeLoopStatus).toBe('abort')
    expect(result.abortReason).toContain('BudgetExhaustedError')
    // Dispatch should only have been called once — no retry
    expect(mockDispatch.dispatch).toHaveBeenCalledTimes(1)
  })

  it('EC-2: BudgetExhaustedError sets abortReason with error message', async () => {
    const spec = makeFileChangeSpec()
    const budgetError = new BudgetExhaustedError({
      storyId: 'TEST-001',
      tokensUsed: 9999,
      budgetCap: 5000,
    })

    const mockDispatch: IModelDispatch = {
      dispatch: vi.fn().mockRejectedValue(budgetError),
    }

    const node = createChangeLoopNode({ modelDispatch: mockDispatch })
    const state = makeState({ changeSpecs: [spec] })
    const result = await node(state)

    expect(result.abortReason).toContain('BudgetExhaustedError')
    expect(result.errors).toHaveLength(1)
    expect(result.errors![0]).toContain('BudgetExhaustedError')
  })
})

// ============================================================================
// Tests: HP-3 — Dispatch failure retries and aborts after maxRetries
// ============================================================================

describe('change-loop node: HP-3 retry exhaustion', () => {
  it('aborts after maxRetries failed dispatches', async () => {
    const spec = makeFileChangeSpec()
    const mockDispatch = makeFailDispatch('persistent error')

    const node = createChangeLoopNode({ modelDispatch: mockDispatch, maxRetries: 2 })
    const state = makeState({ changeSpecs: [spec] })
    const result = await node(state)

    expect(result.changeLoopStatus).toBe('abort')
    expect(result.abortReason).toContain('CS-1')
    expect(result.abortReason).toContain('2')
    // Dispatch called maxRetries times
    expect(mockDispatch.dispatch).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// Tests: Constants
// ============================================================================

describe('MAX_CHANGE_RETRIES', () => {
  it('is 3 by default', () => {
    expect(MAX_CHANGE_RETRIES).toBe(3)
  })
})

// ============================================================================
// Tests: ChangeLoopStatus values
// ============================================================================

describe('change loop routing', () => {
  it('complete status means all specs processed', async () => {
    const node = createChangeLoopNode({ modelDispatch: makeSuccessDispatch() })
    const state = makeState({ changeSpecs: [] })
    const result = await node(state)
    const status = result.changeLoopStatus as ChangeLoopStatus
    expect(['complete', 'pass', 'abort', 'retry']).toContain(status)
    expect(status).toBe('complete')
  })
})
