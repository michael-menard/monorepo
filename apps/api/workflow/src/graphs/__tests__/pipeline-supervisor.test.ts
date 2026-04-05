/**
 * Pipeline Supervisor Tests
 *
 * Tests the supervisor's decision logic and story processing lifecycle.
 * All subgraph invocations and KB calls are mocked.
 *
 * ORCH-9020
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @langchain/langgraph — MUST come before any module that transitively imports it
vi.mock('@langchain/langgraph', () => ({
  Annotation: { Root: () => ({ State: {} }) },
  StateGraph: vi.fn(),
  START: 'START',
  END: 'END',
}))

// Mock @langchain/core/messages to prevent deep resolution
vi.mock('@langchain/core/messages', () => ({
  BaseMessage: class {},
  HumanMessage: class {},
  AIMessage: class {},
  SystemMessage: class {},
}))

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock @repo/knowledge-base to prevent DB resolution
vi.mock('@repo/knowledge-base', () => ({
  getDbClient: vi.fn(),
  kb_get_story: vi.fn(),
  kb_list_stories: vi.fn(),
  kb_search: vi.fn(),
  kb_get_plan: vi.fn(),
  kb_create_story: vi.fn(),
  kb_update_story_status: vi.fn(),
  kb_write_artifact: vi.fn(),
}))

vi.mock('@repo/knowledge-base/embedding-client', () => ({
  EmbeddingClient: vi.fn(),
}))

vi.mock('@repo/knowledge-base/telemetry', () => ({
  logInvocation: vi.fn(),
}))

// Default subgraph mock implementations
const mockDevImplement = vi.fn(async () => ({
  devResult: { verdict: 'complete', errors: [] },
  pipelinePhase: 'dev_implement',
  errors: [],
}))

const mockReview = vi.fn(async () => ({
  reviewResult: { verdict: 'pass', findings: [] },
  pipelinePhase: 'review',
  errors: [],
}))

const mockQAVerify = vi.fn(async () => ({
  qaResult: { verdict: 'pass', failures: [] },
  pipelinePhase: 'qa_verify',
  errors: [],
}))

const mockTransitionToCompleted = vi.fn(async () => {})
const mockResolveDownstreamDeps = vi.fn(async () => [])

// Mock subgraph invokers (lazy-loaded by supervisor)
vi.mock('../../nodes/pipeline-orchestrator/subgraph-invokers.js', () => ({
  createPlanRefinementWrapper: vi.fn(() => vi.fn(async () => ({
    refinedPlan: { slug: 'test-plan' },
    planFlows: [],
    pipelinePhase: 'plan_refinement',
    errors: [],
  }))),
  createStoryGenerationWrapper: vi.fn(() => vi.fn(async () => ({
    storyIds: ['STORY-1'],
    pipelinePhase: 'story_generation',
    errors: [],
  }))),
  createDevImplementWrapper: vi.fn(() => mockDevImplement),
  createReviewWrapper: vi.fn(() => mockReview),
  createQAVerifyWrapper: vi.fn(() => mockQAVerify),
  transitionToCompleted: mockTransitionToCompleted,
  resolveDownstreamDependencies: mockResolveDownstreamDeps,
}))

// Mock event emitter (lazy-loaded by supervisor)
vi.mock('../../nodes/pipeline-orchestrator/event-emitter.js', () => ({
  createEventEmitter: vi.fn(() => ({
    pipelineStarted: vi.fn(async () => {}),
    storyStarted: vi.fn(async () => {}),
    storyPhaseComplete: vi.fn(async () => {}),
    storyCompleted: vi.fn(async () => {}),
    storyBlocked: vi.fn(async () => {}),
    storyRetry: vi.fn(async () => {}),
    pipelineComplete: vi.fn(async () => {}),
    pipelineStalled: vi.fn(async () => {}),
    mergeConflict: vi.fn(async () => {}),
  })),
}))

// Mock preflight checks — always pass
vi.mock('../../nodes/pipeline-orchestrator/preflight-checks.js', () => ({
  createPreflightChecksNode: vi.fn(() => vi.fn(async () => ({
    ollamaAvailable: true,
    ollamaModel: 'qwen2.5-coder:14b',
    ollamaStarted: false,
    modelPulled: false,
  }))),
}))

// Mock worktree manager
vi.mock('../../nodes/pipeline-orchestrator/worktree-manager.js', () => ({
  createWorktreeNode: vi.fn(() => vi.fn(async (state: { storyId: string }) => ({
    worktreePath: `/tmp/worktrees/${state.storyId}`,
    worktreeResult: {
      worktreePath: `/tmp/worktrees/${state.storyId}`,
      branch: state.storyId,
      created: true,
      reused: false,
    },
  }))),
  createCleanupWorktreeNode: vi.fn(() => vi.fn(async () => ({
    cleanupResult: { removed: true },
  }))),
}))

// Mock git operations
vi.mock('../../nodes/pipeline-orchestrator/git-operations.js', () => ({
  createCommitPushNode: vi.fn(() => vi.fn(async () => ({
    pipelinePhase: 'commit_push',
  }))),
  createCreatePrNode: vi.fn(() => vi.fn(async () => ({
    pipelinePhase: 'create_pr',
  }))),
  createMergePrNode: vi.fn(() => vi.fn(async () => ({
    pipelinePhase: 'merge_cleanup',
  }))),
}))

import {
  runPipelineSupervisor,
  type SupervisorConfig,
  type SupervisorAdapters,
} from '../pipeline-supervisor.js'
import type { StoryEntry } from '../../nodes/pipeline-orchestrator/story-picker.js'

// ============================================================================
// Test Helpers
// ============================================================================

function makeConfig(overrides: Partial<SupervisorConfig> = {}): SupervisorConfig {
  return {
    inputMode: 'plan',
    planSlug: 'test-plan',
    storyIds: [],
    monorepoRoot: '/tmp/monorepo',
    defaultBaseBranch: 'main',
    ollamaBaseUrl: 'http://localhost:11434',
    requiredModel: 'qwen2.5-coder:14b',
    maxStories: 0,
    modelConfig: {
      primaryModel: 'sonnet',
      escalationModel: 'opus',
      ollamaModel: 'qwen2.5-coder:14b',
    },
    ...overrides,
  }
}

function makeKbAdapter() {
  return {
    updateStoryStatus: vi.fn(async () => {}),
    writeArtifact: vi.fn(async () => {}),
    listStories: vi.fn(async () => []),
  }
}

function makeAdapters(
  stories: StoryEntry[] = [],
  storyStates: Record<string, string> = {},
  overrides: Partial<SupervisorAdapters> = {},
): SupervisorAdapters {
  // Track which stories have been processed (completed/blocked)
  const processed = new Set<string>()

  // The storyListAdapter must reflect completed/blocked states after processing
  // Otherwise the supervisor loop will re-pick the same story forever
  const defaultStoryListAdapter = vi.fn(async () =>
    stories.map(s => ({
      ...s,
      state: processed.has(s.storyId) ? 'completed' : s.state,
    })),
  )

  // Wrap kbAdapter to track processed stories
  const kbAdapter = makeKbAdapter()
  const originalUpdateStatus = kbAdapter.updateStoryStatus
  kbAdapter.updateStoryStatus = vi.fn(async (storyId: string, status: string) => {
    if (status === 'completed' || status === 'blocked') {
      processed.add(storyId)
    }
    return originalUpdateStatus(storyId, status)
  })

  // Also track via transitionToCompleted mock
  mockTransitionToCompleted.mockImplementation(async (storyId: string) => {
    processed.add(storyId)
  })

  return {
    storyListAdapter: defaultStoryListAdapter,
    getStoryState: vi.fn(async (id: string) => storyStates[id] ?? null),
    kbAdapter,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('runPipelineSupervisor', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset default mock implementations
    mockDevImplement.mockResolvedValue({
      devResult: { verdict: 'complete', errors: [] },
      pipelinePhase: 'dev_implement',
      errors: [],
    })
    mockReview.mockResolvedValue({
      reviewResult: { verdict: 'pass', findings: [] },
      pipelinePhase: 'review',
      errors: [],
    })
    mockQAVerify.mockResolvedValue({
      qaResult: { verdict: 'pass', failures: [] },
      pipelinePhase: 'qa_verify',
      errors: [],
    })
    mockTransitionToCompleted.mockResolvedValue(undefined)
    mockResolveDownstreamDeps.mockResolvedValue([])
  })

  // --------------------------------------------------------------------------
  // Plan handling
  // --------------------------------------------------------------------------

  describe('plan handling', () => {
    it('runs plan refinement + story generation when plan has no stories', async () => {
      const storyListAdapter = vi.fn(async () => [] as StoryEntry[])
      const adapters = makeAdapters([], {}, { storyListAdapter })

      const result = await runPipelineSupervisor(
        makeConfig({ inputMode: 'plan', planSlug: 'empty-plan' }),
        adapters,
      )

      expect(result.finalPhase).toBe('pipeline_complete')
      // storyListAdapter called once for plan check, once for story picking
      expect(storyListAdapter).toHaveBeenCalled()
    })

    it('skips refinement when plan already has stories', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      const result = await runPipelineSupervisor(
        makeConfig({ inputMode: 'plan', planSlug: 'existing-plan' }),
        adapters,
      )

      expect(result.completed).toContain('S-1')
      expect(result.finalPhase).toBe('pipeline_complete')
    })
  })

  // --------------------------------------------------------------------------
  // Story routing by KB state
  // --------------------------------------------------------------------------

  describe('story routing by KB state', () => {
    it('routes story in ready state to dev_implement', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
      expect(mockDevImplement).toHaveBeenCalled()
    })

    it('routes story in needs_code_review to review (skips dev)', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'needs_code_review' })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
      expect(mockReview).toHaveBeenCalled()
      expect(mockDevImplement).not.toHaveBeenCalled()
    })

    it('routes story in ready_for_qa to qa_verify (skips dev + review)', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready_for_qa' })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
      expect(mockQAVerify).toHaveBeenCalled()
      expect(mockDevImplement).not.toHaveBeenCalled()
      expect(mockReview).not.toHaveBeenCalled()
    })

    it('skips completed stories', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'completed', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'completed' })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.finalPhase).toBe('pipeline_complete')
      expect(result.storiesProcessed).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // Review failure + retry
  // --------------------------------------------------------------------------

  describe('review retry logic', () => {
    it('retries dev after review failure when retries remain', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      let reviewCallCount = 0
      mockReview.mockImplementation(async () => {
        reviewCallCount++
        if (reviewCallCount === 1) {
          return {
            reviewResult: { verdict: 'fail', findings: ['Missing tests'] },
            pipelinePhase: 'review',
            errors: [],
          }
        }
        return {
          reviewResult: { verdict: 'pass', findings: [] },
          pipelinePhase: 'review',
          errors: [],
        }
      })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
      // Dev called twice (initial + retry)
      expect(mockDevImplement).toHaveBeenCalledTimes(2)
    })

    it('blocks story when review retries exhausted', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      mockReview.mockResolvedValue({
        reviewResult: { verdict: 'fail', findings: ['Critical issue'] },
        pipelinePhase: 'review',
        errors: [],
      })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.blocked).toContain('S-1')
      expect(result.completed).not.toContain('S-1')
      expect(adapters.kbAdapter.updateStoryStatus).toHaveBeenCalledWith('S-1', 'blocked')
    })
  })

  // --------------------------------------------------------------------------
  // QA failure + retry
  // --------------------------------------------------------------------------

  describe('QA retry logic', () => {
    it('retries dev after QA failure when retries remain', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      let qaCallCount = 0
      mockQAVerify.mockImplementation(async () => {
        qaCallCount++
        if (qaCallCount === 1) {
          return {
            qaResult: { verdict: 'fail', failures: ['Test failures'] },
            pipelinePhase: 'qa_verify',
            errors: [],
          }
        }
        return {
          qaResult: { verdict: 'pass', failures: [] },
          pipelinePhase: 'qa_verify',
          errors: [],
        }
      })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
    })

    it('blocks story when QA retries exhausted', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      mockQAVerify.mockResolvedValue({
        qaResult: { verdict: 'fail', failures: ['Persistent failure'] },
        pipelinePhase: 'qa_verify',
        errors: [],
      })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.blocked).toContain('S-1')
      expect(adapters.kbAdapter.updateStoryStatus).toHaveBeenCalledWith('S-1', 'blocked')
    })
  })

  // --------------------------------------------------------------------------
  // QA pass full lifecycle
  // --------------------------------------------------------------------------

  describe('QA pass full lifecycle', () => {
    it('merges PR, transitions to completed in KB, resolves dependencies', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, { 'S-1': 'ready' })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed).toContain('S-1')
      expect(result.finalPhase).toBe('pipeline_complete')

      // transitionToCompleted should be called
      expect(mockTransitionToCompleted).toHaveBeenCalledWith('S-1', adapters.kbAdapter)

      // resolveDownstreamDependencies should be called
      expect(mockResolveDownstreamDeps).toHaveBeenCalled()

      // KB status updates through lifecycle
      const updateCalls = vi.mocked(adapters.kbAdapter.updateStoryStatus).mock.calls
      const statuses = updateCalls.map(c => c[1])
      expect(statuses).toContain('in_progress')
      expect(statuses).toContain('needs_code_review')
      expect(statuses).toContain('ready_for_qa')
    })
  })

  // --------------------------------------------------------------------------
  // Pipeline completion signals
  // --------------------------------------------------------------------------

  describe('pipeline completion signals', () => {
    it('returns pipeline_complete when all stories are done', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'completed', priority: 'P1', blockedByStory: null },
        { storyId: 'S-2', state: 'completed', priority: 'P2', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, {})

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.finalPhase).toBe('pipeline_complete')
      expect(result.storiesProcessed).toBe(0)
    })

    it('returns pipeline_stalled when all stories are blocked', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'blocked', priority: 'P1', blockedByStory: null },
        { storyId: 'S-2', state: 'blocked', priority: 'P2', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, {})

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.finalPhase).toBe('pipeline_stalled')
    })

    it('returns pipeline_complete when no planSlug is provided', async () => {
      const adapters = makeAdapters([], {})

      const result = await runPipelineSupervisor(
        makeConfig({ planSlug: null }),
        adapters,
      )

      expect(result.finalPhase).toBe('pipeline_complete')
      expect(result.storiesProcessed).toBe(0)
    })
  })

  // --------------------------------------------------------------------------
  // Multiple stories
  // --------------------------------------------------------------------------

  describe('multiple stories', () => {
    it('processes stories in priority order', async () => {
      const processingOrder: string[] = []
      mockDevImplement.mockImplementation(async state => {
        processingOrder.push((state as Record<string, unknown>).currentStoryId as string)
        return {
          devResult: { verdict: 'complete', errors: [] },
          pipelinePhase: 'dev_implement',
          errors: [],
        }
      })

      const stories: StoryEntry[] = [
        { storyId: 'S-3', state: 'ready', priority: 'P3', blockedByStory: null },
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
        { storyId: 'S-2', state: 'ready', priority: 'P2', blockedByStory: null },
      ]

      const storyListAdapter = vi.fn(async () =>
        stories.map(s => ({
          ...s,
          state: processingOrder.includes(s.storyId) ? 'completed' : s.state,
        })),
      )

      const adapters = makeAdapters(stories, {
        'S-1': 'ready',
        'S-2': 'ready',
        'S-3': 'ready',
      }, { storyListAdapter })

      const result = await runPipelineSupervisor(makeConfig(), adapters)

      expect(result.completed.length).toBe(3)
      expect(processingOrder[0]).toBe('S-1')
    })

    it('respects maxStories limit', async () => {
      const stories: StoryEntry[] = [
        { storyId: 'S-1', state: 'ready', priority: 'P1', blockedByStory: null },
        { storyId: 'S-2', state: 'ready', priority: 'P2', blockedByStory: null },
        { storyId: 'S-3', state: 'ready', priority: 'P3', blockedByStory: null },
      ]
      const adapters = makeAdapters(stories, {
        'S-1': 'ready',
        'S-2': 'ready',
        'S-3': 'ready',
      })

      const result = await runPipelineSupervisor(
        makeConfig({ maxStories: 1 }),
        adapters,
      )

      expect(result.storiesProcessed).toBe(1)
      expect(result.completed.length).toBe(1)
    })
  })

  // --------------------------------------------------------------------------
  // Error handling
  // --------------------------------------------------------------------------

  describe('error handling', () => {
    it('returns error phase on fatal error', async () => {
      const adapters = makeAdapters([], {}, {
        storyListAdapter: vi.fn(async () => {
          throw new Error('KB connection failed')
        }),
      })

      const result = await runPipelineSupervisor(
        makeConfig({ inputMode: 'plan', planSlug: 'fail-plan' }),
        adapters,
      )

      expect(result.finalPhase).toBe('error')
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
