/**
 * subgraph-invokers node tests (pipeline-orchestrator)
 *
 * Tests for merge/cleanup, post-completion, and block-story nodes.
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
  createMergeCleanupNode,
  createPostCompletionNode,
  createBlockStoryNode,
  transitionToCompleted,
  resolveDownstreamDependencies,
} from '../subgraph-invokers.js'
import type { KbAdapter, KbStory } from '../subgraph-invokers.js'
import type { PipelineOrchestratorV2State } from '../../../state/pipeline-orchestrator-v2-state.js'
import type { ShellExecResult } from '../worktree-manager.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(
  overrides: Partial<PipelineOrchestratorV2State> = {},
): PipelineOrchestratorV2State {
  return {
    inputMode: 'story',
    planSlug: null,
    currentStoryId: 'TEST-001',
    worktreePath: '/tmp/monorepo/.worktrees/TEST-001',
    branch: 'TEST-001',
    pipelinePhase: 'merge_cleanup',
    storyPickerResult: null,
    devResult: null,
    reviewResult: null,
    qaResult: null,
    retryContext: null,
    modelConfig: { primaryModel: 'sonnet', escalationModel: 'opus', ollamaModel: 'qwen2.5-coder:14b' },
    completedStories: [],
    blockedStories: [],
    errors: [],
    ollamaAvailable: true,
    storyIds: ['TEST-001'],
    ...overrides,
  }
}

function makeKbAdapter(overrides: Partial<KbAdapter> = {}): KbAdapter {
  return {
    updateStoryStatus: vi.fn(async () => {}),
    writeArtifact: vi.fn(async () => {}),
    listStories: vi.fn(async () => []),
    ...overrides,
  }
}

function ok(stdout = ''): ShellExecResult {
  return { stdout, stderr: '', exitCode: 0 }
}

function fail(stderr = 'error', exitCode = 1): ShellExecResult {
  return { stdout: '', stderr, exitCode }
}

// ============================================================================
// createMergeCleanupNode tests
// ============================================================================

describe('createMergeCleanupNode', () => {
  it('calls mergePr then cleanupWorktree in sequence', async () => {
    const callOrder: string[] = []
    const shellExec = vi.fn(async (cmd: string, args: string[]) => {
      const key = `${cmd} ${args[0]}`
      callOrder.push(key)
      return ok()
    })

    const node = createMergeCleanupNode({
      monorepoRoot: '/tmp/monorepo',
      defaultBaseBranch: 'main',
      shellExec,
    })

    const state = makeState()
    const result = await node(state)

    expect(result.pipelinePhase).toBe('merge_cleanup')
    // Should have called git/gh commands for merge, then wt for cleanup
    expect(shellExec).toHaveBeenCalled()
    // Verify merge happened before cleanup by checking call order
    const mergeCallIndex = callOrder.findIndex(c => c.includes('gh') || c.includes('git'))
    const cleanupCallIndex = callOrder.findIndex(c => c.includes('wt'))
    if (mergeCallIndex >= 0 && cleanupCallIndex >= 0) {
      expect(mergeCallIndex).toBeLessThan(cleanupCallIndex)
    }
  })

  it('skips cleanup when merge fails', async () => {
    const shellExec = vi.fn(async (cmd: string, args: string[]) => {
      if (cmd === 'gh' && args.includes('merge')) {
        return fail('merge failed')
      }
      return ok()
    })

    const node = createMergeCleanupNode({
      monorepoRoot: '/tmp/monorepo',
      defaultBaseBranch: 'main',
      shellExec,
    })

    const state = makeState()
    const result = await node(state)

    expect(result.pipelinePhase).toBe('merge_cleanup')
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })

  it('returns merge_cleanup phase on success', async () => {
    const shellExec = vi.fn(async () => ok())

    const node = createMergeCleanupNode({
      monorepoRoot: '/tmp/monorepo',
      defaultBaseBranch: 'main',
      shellExec,
    })

    const result = await node(makeState())
    expect(result.pipelinePhase).toBe('merge_cleanup')
  })

  it('handles cleanup failure gracefully (non-fatal)', async () => {
    const callCount = { merge: 0, cleanup: 0 }
    const shellExec = vi.fn(async (cmd: string, args: string[]) => {
      if (cmd === 'wt' && args.includes('remove')) {
        callCount.cleanup++
        return fail('worktree not found')
      }
      callCount.merge++
      return ok()
    })

    const node = createMergeCleanupNode({
      monorepoRoot: '/tmp/monorepo',
      defaultBaseBranch: 'main',
      shellExec,
    })

    const result = await node(makeState())
    // Should still succeed even if cleanup fails
    expect(result.pipelinePhase).toBe('merge_cleanup')
    expect(result.errors).toBeUndefined()
  })

  it('uses default config when no config provided', async () => {
    const node = createMergeCleanupNode()
    const result = await node(makeState())
    expect(result.pipelinePhase).toBe('merge_cleanup')
  })
})

// ============================================================================
// transitionToCompleted tests
// ============================================================================

describe('transitionToCompleted', () => {
  it('transitions through all intermediate states with artifacts', async () => {
    const adapter = makeKbAdapter()
    await transitionToCompleted('TEST-001', adapter)

    // Should write 4 artifacts (proof, review, verification, qa_gate)
    expect(adapter.writeArtifact).toHaveBeenCalledTimes(4)
    // Should update status 4 times
    expect(adapter.updateStoryStatus).toHaveBeenCalledTimes(4)

    // Verify correct order of status transitions
    const statusCalls = (adapter.updateStoryStatus as ReturnType<typeof vi.fn>).mock.calls
    expect(statusCalls[0]).toEqual(['TEST-001', 'needs_code_review'])
    expect(statusCalls[1]).toEqual(['TEST-001', 'ready_for_qa'])
    expect(statusCalls[2]).toEqual(['TEST-001', 'in_qa'])
    expect(statusCalls[3]).toEqual(['TEST-001', 'completed'])
  })

  it('writes artifact before each status transition', async () => {
    const callOrder: string[] = []
    const adapter = makeKbAdapter({
      writeArtifact: vi.fn(async (_id, type) => {
        callOrder.push(`artifact:${type}`)
      }),
      updateStoryStatus: vi.fn(async (_id, status) => {
        callOrder.push(`status:${status}`)
      }),
    })

    await transitionToCompleted('TEST-001', adapter)

    // Each artifact should come before its corresponding status update
    expect(callOrder).toEqual([
      'artifact:proof',
      'status:needs_code_review',
      'artifact:review',
      'status:ready_for_qa',
      'artifact:verification',
      'status:in_qa',
      'artifact:qa_gate',
      'status:completed',
    ])
  })
})

// ============================================================================
// resolveDownstreamDependencies tests
// ============================================================================

describe('resolveDownstreamDependencies', () => {
  it('returns unblocked story IDs when blocker is completed', async () => {
    const blockedStories: KbStory[] = [
      { id: 'TEST-002', blockedBy: 'TEST-001', status: 'blocked' },
      { id: 'TEST-003', blockedBy: 'TEST-001', status: 'blocked' },
    ]
    const adapter = makeKbAdapter({
      listStories: vi.fn(async () => blockedStories),
    })

    const result = await resolveDownstreamDependencies('TEST-001', [], adapter)
    expect(result).toEqual(['TEST-002', 'TEST-003'])
  })

  it('returns empty array when no stories are blocked by completed story', async () => {
    const adapter = makeKbAdapter({
      listStories: vi.fn(async () => []),
    })

    const result = await resolveDownstreamDependencies('TEST-001', [], adapter)
    expect(result).toEqual([])
  })

  it('considers already completed stories when checking blockers', async () => {
    const blockedStories: KbStory[] = [
      { id: 'TEST-003', blockedBy: 'TEST-001', status: 'blocked' },
    ]
    const adapter = makeKbAdapter({
      listStories: vi.fn(async () => blockedStories),
    })

    const result = await resolveDownstreamDependencies(
      'TEST-001',
      ['TEST-002'],
      adapter,
    )
    expect(result).toEqual(['TEST-003'])
  })
})

// ============================================================================
// createPostCompletionNode tests
// ============================================================================

describe('createPostCompletionNode', () => {
  it('writes completion artifact, transitions status, and resolves deps', async () => {
    const adapter = makeKbAdapter()
    const node = createPostCompletionNode({ kbAdapter: adapter })

    const state = makeState()
    const result = await node(state)

    expect(result.completedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('post_completion')

    // Should write completion_report + 4 transition artifacts = 5 total
    expect(adapter.writeArtifact).toHaveBeenCalledTimes(5)
    // First call should be the completion_report
    expect((adapter.writeArtifact as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe(
      'completion_report',
    )

    // Should transition status through intermediate states (4 calls)
    expect(adapter.updateStoryStatus).toHaveBeenCalledTimes(4)

    // Should query for downstream dependencies
    expect(adapter.listStories).toHaveBeenCalledWith({ blockedBy: 'TEST-001' })
  })

  it('falls back to stub behavior when no KB adapter provided', async () => {
    const node = createPostCompletionNode()

    const state = makeState()
    const result = await node(state)

    expect(result.completedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('post_completion')
  })

  it('skips when no currentStoryId', async () => {
    const adapter = makeKbAdapter()
    const node = createPostCompletionNode({ kbAdapter: adapter })

    const state = makeState({ currentStoryId: null })
    const result = await node(state)

    expect(result.pipelinePhase).toBe('post_completion')
    expect(result.completedStories).toBeUndefined()
    expect(adapter.writeArtifact).not.toHaveBeenCalled()
  })

  it('still marks completed in pipeline state when KB operations fail', async () => {
    const adapter = makeKbAdapter({
      writeArtifact: vi.fn(async () => {
        throw new Error('KB connection failed')
      }),
    })
    const node = createPostCompletionNode({ kbAdapter: adapter })

    const state = makeState()
    const result = await node(state)

    expect(result.completedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('post_completion')
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toMatch(/KB operations failed/)
  })
})

// ============================================================================
// createBlockStoryNode tests
// ============================================================================

describe('createBlockStoryNode', () => {
  it('updates KB status to blocked with reason', async () => {
    const adapter = makeKbAdapter()
    const node = createBlockStoryNode({ kbAdapter: adapter })

    const state = makeState({
      retryContext: {
        reviewAttempts: 2,
        qaAttempts: 0,
        maxReviewRetries: 2,
        maxQaRetries: 2,
        lastFailureReason: 'Review failed: critical issues found',
      },
    })
    const result = await node(state)

    expect(result.blockedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('block_story')
    expect(adapter.updateStoryStatus).toHaveBeenCalledWith('TEST-001', 'blocked')
  })

  it('falls back to stub behavior when no KB adapter provided', async () => {
    const node = createBlockStoryNode()

    const state = makeState({
      retryContext: {
        reviewAttempts: 2,
        qaAttempts: 0,
        maxReviewRetries: 2,
        maxQaRetries: 2,
        lastFailureReason: 'exhausted',
      },
    })
    const result = await node(state)

    expect(result.blockedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('block_story')
  })

  it('handles KB update failure gracefully', async () => {
    const adapter = makeKbAdapter({
      updateStoryStatus: vi.fn(async () => {
        throw new Error('KB unavailable')
      }),
    })
    const node = createBlockStoryNode({ kbAdapter: adapter })

    const state = makeState()
    const result = await node(state)

    // Should still add to blockedStories even if KB update fails
    expect(result.blockedStories).toEqual(['TEST-001'])
    expect(result.pipelinePhase).toBe('block_story')
  })

  it('handles missing currentStoryId', async () => {
    const adapter = makeKbAdapter()
    const node = createBlockStoryNode({ kbAdapter: adapter })

    const state = makeState({ currentStoryId: null })
    const result = await node(state)

    expect(result.blockedStories).toEqual([])
    expect(adapter.updateStoryStatus).not.toHaveBeenCalled()
  })
})
