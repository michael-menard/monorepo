/**
 * resume_handler node tests (pipeline-orchestrator)
 *
 * ORCH-5010: Checkpoint/Resume Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createResumeHandlerNode,
  isWorktreePresent,
  isBranchInRemoteOutput,
  determineResumeNode,
  type ResumeHandlerAdapters,
  type ResumeHandlerConfig,
  type CheckpointQueryFn,
  type CheckpointQueryByStoryFn,
  type ShellExecFn,
} from '../resume-handler.js'
import type { CheckpointPayload } from '../../../checkpointer/__types__/index.js'
import type { PipelineOrchestratorV2State } from '../../../state/pipeline-orchestrator-v2-state.js'
import {
  ORCHESTRATOR_PHASE_TO_NODE_MAP,
  translateOrchestratorPhaseToNode,
  getNextOrchestratorNode,
} from '../../../checkpointer/phase-mapping.js'

// ============================================================================
// Helpers
// ============================================================================

function makeCheckpointPayload(overrides: Partial<CheckpointPayload> = {}): CheckpointPayload {
  return {
    thread_id: 'test-thread-001',
    current_node: 'dev_implement',
    state_snapshot: {
      currentStoryId: 'STORY-001',
      worktreePath: '/tmp/monorepo/.worktrees/STORY-001',
      branch: 'feat/STORY-001',
      pipelinePhase: 'dev_implement',
    },
    node_history: [],
    retry_counts: {},
    error_context: null,
    rollback_actions: [],
    schema_version: 1 as const,
    ...overrides,
  }
}

function makeDefaultState(): PipelineOrchestratorV2State {
  return {
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
  }
}

function makeConfig(overrides: Partial<ResumeHandlerConfig> = {}): ResumeHandlerConfig {
  return {
    threadId: 'test-thread-001',
    storyId: 'STORY-001',
    monorepoRoot: '/tmp/monorepo',
    ...overrides,
  }
}

function makeShellExec(responses: Record<string, { stdout: string, stderr: string, exitCode: number }>): ShellExecFn {
  return async (cmd, args, _opts) => {
    const key = `${cmd} ${args.join(' ')}`
    for (const [pattern, result] of Object.entries(responses)) {
      if (key.includes(pattern)) return result
    }
    return { stdout: '', stderr: 'unknown command', exitCode: 1 }
  }
}

// ============================================================================
// Pure function tests
// ============================================================================

describe('isWorktreePresent', () => {
  it('returns true when worktree path appears in output', () => {
    const output = [
      '/tmp/monorepo  abc1234 [main]',
      '/tmp/monorepo/.worktrees/STORY-001  def5678 [feat/STORY-001]',
    ].join('\n')

    expect(isWorktreePresent(output, '/tmp/monorepo/.worktrees/STORY-001')).toBe(true)
  })

  it('returns false when worktree path is not in output', () => {
    const output = '/tmp/monorepo  abc1234 [main]\n'
    expect(isWorktreePresent(output, '/tmp/monorepo/.worktrees/STORY-001')).toBe(false)
  })

  it('returns false for empty worktree path', () => {
    expect(isWorktreePresent('some output', '')).toBe(false)
  })
})

describe('isBranchInRemoteOutput', () => {
  it('returns true when branch refs/heads entry exists', () => {
    const output = 'abc123\trefs/heads/feat/STORY-001\n'
    expect(isBranchInRemoteOutput(output, 'feat/STORY-001')).toBe(true)
  })

  it('returns false when branch not in output', () => {
    const output = 'abc123\trefs/heads/main\n'
    expect(isBranchInRemoteOutput(output, 'feat/STORY-001')).toBe(false)
  })

  it('returns false for empty branch', () => {
    expect(isBranchInRemoteOutput('some output', '')).toBe(false)
  })
})

describe('determineResumeNode', () => {
  it('returns commit_push after dev_implement', () => {
    expect(determineResumeNode('dev_implement')).toBe('commit_push')
  })

  it('returns review after commit_push', () => {
    expect(determineResumeNode('commit_push')).toBe('review')
  })

  it('returns null for conditional routing nodes', () => {
    expect(determineResumeNode('review_decision')).toBeNull()
    expect(determineResumeNode('qa_decision')).toBeNull()
    expect(determineResumeNode('story_picker')).toBeNull()
  })

  it('returns story_picker after post_completion', () => {
    expect(determineResumeNode('post_completion')).toBe('story_picker')
  })

  it('returns null for unknown nodes', () => {
    expect(determineResumeNode('nonexistent_node')).toBeNull()
  })
})

// ============================================================================
// Phase mapping tests
// ============================================================================

describe('ORCHESTRATOR_PHASE_TO_NODE_MAP', () => {
  it('maps all 16 pipeline phases', () => {
    const phases = [
      'preflight', 'routing', 'story_picking', 'worktree_setup',
      'dev_implement', 'commit_push', 'review', 'review_decision',
      'create_pr', 'qa_verify', 'qa_decision', 'merge_cleanup',
      'post_completion', 'block_story', 'pipeline_complete', 'pipeline_stalled',
    ]

    for (const phase of phases) {
      expect(ORCHESTRATOR_PHASE_TO_NODE_MAP[phase as keyof typeof ORCHESTRATOR_PHASE_TO_NODE_MAP]).toBeDefined()
    }
  })

  it('maps preflight to preflight_checks', () => {
    expect(translateOrchestratorPhaseToNode('preflight')).toBe('preflight_checks')
  })

  it('maps dev_implement to dev_implement', () => {
    expect(translateOrchestratorPhaseToNode('dev_implement')).toBe('dev_implement')
  })
})

describe('getNextOrchestratorNode', () => {
  it('returns route_input after preflight_checks', () => {
    expect(getNextOrchestratorNode('preflight_checks')).toBe('route_input')
  })

  it('returns dev_implement after create_worktree', () => {
    expect(getNextOrchestratorNode('create_worktree')).toBe('dev_implement')
  })

  it('returns qa_verify after create_pr', () => {
    expect(getNextOrchestratorNode('create_pr')).toBe('qa_verify')
  })

  it('returns null for conditional nodes', () => {
    expect(getNextOrchestratorNode('story_picker')).toBeNull()
    expect(getNextOrchestratorNode('review_decision')).toBeNull()
    expect(getNextOrchestratorNode('qa_decision')).toBeNull()
  })
})

// ============================================================================
// createResumeHandlerNode tests
// ============================================================================

describe('createResumeHandlerNode', () => {
  let defaultState: PipelineOrchestratorV2State

  beforeEach(() => {
    defaultState = makeDefaultState()
  })

  it('returns shouldResume=false when no checkpoint exists', async () => {
    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery: async () => null,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(false)
    expect(result.resumeResult.resumeNode).toBeNull()
    expect(result.resumeResult.reason).toContain('No checkpoint found')
  })

  it('returns shouldResume=false when no adapters are provided', async () => {
    const node = createResumeHandlerNode(makeConfig(), {})

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(false)
  })

  it('resumes after dev_implement at commit_push', async () => {
    const payload = makeCheckpointPayload()
    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'dev_implement',
      phase: 'dev_implement',
    })

    const shellExec = makeShellExec({
      'worktree list': {
        stdout: '/tmp/monorepo  abc [main]\n/tmp/monorepo/.worktrees/STORY-001  def [feat/STORY-001]\n',
        stderr: '',
        exitCode: 0,
      },
    })

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
      shellExec,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.resumeNode).toBe('commit_push')
    expect(result.resumeResult.lastCompletedNode).toBe('dev_implement')
    expect(result.resumeResult.worktreeRecovered).toBe(false)
  })

  it('recovers worktree from remote branch when missing', async () => {
    const payload = makeCheckpointPayload()
    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'dev_implement',
      phase: 'dev_implement',
    })

    const shellExec = makeShellExec({
      'worktree list': {
        stdout: '/tmp/monorepo  abc [main]\n',
        stderr: '',
        exitCode: 0,
      },
      'ls-remote': {
        stdout: 'abc123\trefs/heads/feat/STORY-001\n',
        stderr: '',
        exitCode: 0,
      },
      'worktree add': {
        stdout: 'Preparing worktree\n',
        stderr: '',
        exitCode: 0,
      },
    })

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
      shellExec,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.worktreeRecovered).toBe(true)
    expect(result.resumeResult.resumeNode).toBe('commit_push')
  })

  it('falls back to storyId query when threadId query returns null', async () => {
    const payload = makeCheckpointPayload({
      state_snapshot: {
        currentStoryId: 'STORY-002',
        worktreePath: null,
        branch: null,
        pipelinePhase: 'commit_push',
      },
    })

    const checkpointQuery: CheckpointQueryFn = async () => null
    const checkpointQueryByStory: CheckpointQueryByStoryFn = async () => ({
      payload,
      nodeName: 'commit_push',
      phase: 'commit_push',
    })

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
      checkpointQueryByStory,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.resumeNode).toBe('review')
    expect(result.resumeResult.lastCompletedNode).toBe('commit_push')
  })

  it('handles conditional routing node (review_decision) by deferring to graph', async () => {
    const payload = makeCheckpointPayload({
      state_snapshot: {
        currentStoryId: 'STORY-001',
        worktreePath: null,
        branch: null,
        pipelinePhase: 'review_decision',
      },
    })

    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'review_decision',
      phase: 'review_decision',
    })

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.resumeNode).toBeNull()
    expect(result.resumeResult.reason).toContain('conditional node')
  })

  it('handles worktree recovery failure gracefully', async () => {
    const payload = makeCheckpointPayload()
    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'dev_implement',
      phase: 'dev_implement',
    })

    const shellExec = makeShellExec({
      'worktree list': {
        stdout: '/tmp/monorepo  abc [main]\n',
        stderr: '',
        exitCode: 0,
      },
      'ls-remote': {
        stdout: '',
        stderr: '',
        exitCode: 0,
      },
    })

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
      shellExec,
    })

    const result = await node(defaultState)

    // Should still resume even if worktree cannot be recovered
    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.worktreeRecovered).toBe(false)
    expect(result.resumeResult.resumeNode).toBe('commit_push')
  })

  it('handles checkpoint query errors gracefully', async () => {
    const checkpointQuery: CheckpointQueryFn = async () => {
      throw new Error('DB connection refused')
    }

    const node = createResumeHandlerNode(makeConfig(), {
      checkpointQuery,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(false)
    expect(result.resumeResult.reason).toContain('No checkpoint found')
  })

  it('restores state snapshot into returned partial state', async () => {
    const savedState = {
      currentStoryId: 'STORY-999',
      worktreePath: '/tmp/monorepo/.worktrees/STORY-999',
      branch: 'feat/STORY-999',
      pipelinePhase: 'commit_push',
      ollamaAvailable: true,
    }

    const payload = makeCheckpointPayload({
      state_snapshot: savedState,
    })

    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'commit_push',
      phase: 'commit_push',
    })

    const shellExec = makeShellExec({
      'worktree list': {
        stdout: '/tmp/monorepo  abc [main]\n/tmp/monorepo/.worktrees/STORY-999  def [feat/STORY-999]\n',
        stderr: '',
        exitCode: 0,
      },
    })

    const node = createResumeHandlerNode(makeConfig({ threadId: 'test-thread-999' }), {
      checkpointQuery,
      shellExec,
    })

    const result = await node(defaultState)

    expect(result.resumeResult.shouldResume).toBe(true)
    // The restored state should be spread into the returned object
    expect((result as Record<string, unknown>).currentStoryId).toBe('STORY-999')
    expect((result as Record<string, unknown>).worktreePath).toBe('/tmp/monorepo/.worktrees/STORY-999')
  })

  it('resumes at correct node in the full pipeline sequence', async () => {
    // Simulate crash after dev_implement → should resume at commit_push
    // This is the integration test scenario from the AC
    const savedState = {
      currentStoryId: 'STORY-INT-001',
      worktreePath: '/tmp/monorepo/.worktrees/STORY-INT-001',
      branch: 'feat/STORY-INT-001',
      pipelinePhase: 'dev_implement',
      devResult: { verdict: 'complete', errors: [] },
    }

    const payload = makeCheckpointPayload({
      thread_id: 'crash-sim-001',
      current_node: 'dev_implement',
      state_snapshot: savedState,
    })

    const checkpointQuery: CheckpointQueryFn = async () => ({
      payload,
      nodeName: 'dev_implement',
      phase: 'dev_implement',
    })

    const shellExec = makeShellExec({
      'worktree list': {
        stdout: '/tmp/monorepo  abc [main]\n/tmp/monorepo/.worktrees/STORY-INT-001  def [feat/STORY-INT-001]\n',
        stderr: '',
        exitCode: 0,
      },
    })

    const node = createResumeHandlerNode(
      makeConfig({ threadId: 'crash-sim-001', storyId: 'STORY-INT-001' }),
      { checkpointQuery, shellExec },
    )

    const result = await node(defaultState)

    // Verify full resume chain
    expect(result.resumeResult.shouldResume).toBe(true)
    expect(result.resumeResult.lastCompletedNode).toBe('dev_implement')
    expect(result.resumeResult.resumeNode).toBe('commit_push')
    expect(result.resumeResult.worktreeRecovered).toBe(false)
    expect(result.resumeResult.restoredState).toEqual(savedState)
    expect((result as Record<string, unknown>).currentStoryId).toBe('STORY-INT-001')
    expect((result as Record<string, unknown>).devResult).toEqual({ verdict: 'complete', errors: [] })
  })
})
