/**
 * Pipeline Orchestrator V2 Graph tests
 *
 * Tests graph compilation, routing logic, and end-to-end invocation
 * with mocked adapters (MVP stubs).
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
  createPipelineOrchestratorV2Graph,
  routeByInputMode,
  routeByPickerSignal,
  routeByReviewVerdict,
  routeByQAVerdict,
  type PipelineOrchestratorV2State,
} from '../pipeline-orchestrator-v2.js'
import type { RetryContext } from '../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Test Helpers
// ============================================================================

const makeState = (
  overrides: Partial<PipelineOrchestratorV2State> = {},
): PipelineOrchestratorV2State => ({
  inputMode: 'story',
  planSlug: null,
  currentStoryId: null,
  worktreePath: null,
  branch: null,
  pipelinePhase: 'preflight',
  storyPickerResult: null,
  devResult: null,
  reviewResult: null,
  qaResult: null,
  retryContext: null,
  modelConfig: { primaryModel: 'sonnet', escalationModel: 'opus', ollamaModel: 'qwen2.5-coder:14b' },
  completedStories: [],
  blockedStories: [],
  errors: [],
  ollamaAvailable: false,
  storyIds: [],
  ...overrides,
})

const makeRetryCtx = (overrides: Partial<RetryContext> = {}): RetryContext => ({
  reviewAttempts: 0,
  qaAttempts: 0,
  maxReviewRetries: 2,
  maxQaRetries: 2,
  lastFailureReason: '',
  ...overrides,
})

/** Preflight adapter that skips Ollama checks entirely */
const skipPreflightAdapters = {
  healthChecker: vi.fn().mockResolvedValue(['qwen2.5-coder:14b']),
  processSpawner: vi.fn(),
  modelPuller: vi.fn().mockResolvedValue(undefined),
  sleep: vi.fn().mockResolvedValue(undefined),
}

/** Shell exec that always succeeds (for worktree/git stubs) */
const noopShellExec = vi.fn().mockResolvedValue({
  stdout: '',
  stderr: '',
  exitCode: 0,
})

// ============================================================================
// Graph Compilation Tests
// ============================================================================

describe('createPipelineOrchestratorV2Graph', () => {
  it('compiles without error with no config', () => {
    expect(() => createPipelineOrchestratorV2Graph()).not.toThrow()
  })

  it('compiles with full config provided', () => {
    expect(() =>
      createPipelineOrchestratorV2Graph({
        monorepoRoot: '/tmp/test',
        ollamaBaseUrl: 'http://localhost:11434',
        requiredModel: 'qwen2.5-coder:14b',
        maxStories: 5,
        defaultBaseBranch: 'main',
        shellExec: noopShellExec,
        preflightAdapters: skipPreflightAdapters,
      }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createPipelineOrchestratorV2Graph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// Conditional Edge Routing Tests
// ============================================================================

describe('routeByInputMode', () => {
  it('returns plan_refinement for plan input mode', () => {
    expect(routeByInputMode(makeState({ inputMode: 'plan' }))).toBe('plan_refinement')
  })

  it('returns story_picker for story input mode', () => {
    expect(routeByInputMode(makeState({ inputMode: 'story' }))).toBe('story_picker')
  })
})

describe('routeByPickerSignal', () => {
  it('returns story_ready when picker has a story', () => {
    expect(
      routeByPickerSignal(
        makeState({
          storyPickerResult: { signal: 'story_ready', storyId: 'ORCH-1234', reason: '' },
        }),
      ),
    ).toBe('story_ready')
  })

  it('returns pipeline_complete when all stories done', () => {
    expect(
      routeByPickerSignal(
        makeState({
          storyPickerResult: { signal: 'pipeline_complete', storyId: null, reason: '' },
        }),
      ),
    ).toBe('pipeline_complete')
  })

  it('returns pipeline_stalled when all remaining are blocked', () => {
    expect(
      routeByPickerSignal(
        makeState({
          storyPickerResult: { signal: 'pipeline_stalled', storyId: null, reason: '' },
        }),
      ),
    ).toBe('pipeline_stalled')
  })

  it('defaults to pipeline_stalled when no picker result', () => {
    expect(routeByPickerSignal(makeState())).toBe('pipeline_stalled')
  })
})

describe('routeByReviewVerdict', () => {
  it('returns pass for passing review', () => {
    expect(
      routeByReviewVerdict(
        makeState({
          reviewResult: { verdict: 'pass', findings: [] },
          retryContext: makeRetryCtx(),
        }),
      ),
    ).toBe('pass')
  })

  it('returns retry for failing review within budget', () => {
    expect(
      routeByReviewVerdict(
        makeState({
          reviewResult: { verdict: 'fail', findings: [] },
          retryContext: makeRetryCtx({ reviewAttempts: 0 }),
        }),
      ),
    ).toBe('retry')
  })

  it('returns block for failing review when budget exhausted', () => {
    expect(
      routeByReviewVerdict(
        makeState({
          reviewResult: { verdict: 'fail', findings: [] },
          retryContext: makeRetryCtx({ reviewAttempts: 2 }),
        }),
      ),
    ).toBe('block')
  })

  it('returns block for explicit block verdict', () => {
    expect(
      routeByReviewVerdict(
        makeState({
          reviewResult: { verdict: 'block', findings: [] },
          retryContext: makeRetryCtx(),
        }),
      ),
    ).toBe('block')
  })
})

describe('routeByQAVerdict', () => {
  it('returns pass for passing QA', () => {
    expect(
      routeByQAVerdict(
        makeState({
          qaResult: { verdict: 'pass', failures: [] },
          retryContext: makeRetryCtx(),
        }),
      ),
    ).toBe('pass')
  })

  it('returns retry for failing QA within budget', () => {
    expect(
      routeByQAVerdict(
        makeState({
          qaResult: { verdict: 'fail', failures: [] },
          retryContext: makeRetryCtx({ qaAttempts: 1 }),
        }),
      ),
    ).toBe('retry')
  })

  it('returns block for failing QA when budget exhausted', () => {
    expect(
      routeByQAVerdict(
        makeState({
          qaResult: { verdict: 'fail', failures: [] },
          retryContext: makeRetryCtx({ qaAttempts: 2 }),
        }),
      ),
    ).toBe('block')
  })
})

// ============================================================================
// Graph Invocation Tests
// ============================================================================

describe('pipeline-orchestrator-v2 graph invocation', () => {
  it('completes immediately when no stories provided', async () => {
    const graph = createPipelineOrchestratorV2Graph({
      preflightAdapters: skipPreflightAdapters,
      shellExec: noopShellExec,
    })

    const result = await graph.invoke({
      inputMode: 'story',
      storyIds: [],
    })

    expect(result.pipelinePhase).toBe('pipeline_complete')
    expect(result.completedStories).toEqual([])
  })

  it('processes a single story through the happy path', async () => {
    const graph = createPipelineOrchestratorV2Graph({
      preflightAdapters: skipPreflightAdapters,
      shellExec: noopShellExec,
    })

    const result = await graph.invoke({
      inputMode: 'story',
      storyIds: ['ORCH-2010'],
    })

    // Story should be completed
    expect(result.completedStories).toContain('ORCH-2010')
    // Pipeline should end as complete (no more stories)
    expect(result.pipelinePhase).toBe('pipeline_complete')
  })

  it('processes multiple stories sequentially', async () => {
    const graph = createPipelineOrchestratorV2Graph({
      preflightAdapters: skipPreflightAdapters,
      shellExec: noopShellExec,
    })

    // Each story traverses ~12 nodes, so 3 stories needs higher recursion limit
    const result = await graph.invoke(
      {
        inputMode: 'story',
        storyIds: ['ORCH-2010', 'ORCH-2020', 'ORCH-2030'],
      },
      { recursionLimit: 100 },
    )

    expect(result.completedStories).toContain('ORCH-2010')
    expect(result.completedStories).toContain('ORCH-2020')
    expect(result.completedStories).toContain('ORCH-2030')
    expect(result.pipelinePhase).toBe('pipeline_complete')
  })

  it('handles plan input mode (MVP: skips to story picker)', async () => {
    const graph = createPipelineOrchestratorV2Graph({
      preflightAdapters: skipPreflightAdapters,
      shellExec: noopShellExec,
    })

    const result = await graph.invoke({
      inputMode: 'plan',
      planSlug: 'test-plan',
      storyIds: ['ORCH-2010'],
    })

    expect(result.completedStories).toContain('ORCH-2010')
    expect(result.pipelinePhase).toBe('pipeline_complete')
  })

  it('sets ollamaAvailable from preflight checks', async () => {
    const graph = createPipelineOrchestratorV2Graph({
      preflightAdapters: skipPreflightAdapters,
      shellExec: noopShellExec,
    })

    const result = await graph.invoke({
      inputMode: 'story',
      storyIds: [],
    })

    expect(result.ollamaAvailable).toBe(true)
  })
})
