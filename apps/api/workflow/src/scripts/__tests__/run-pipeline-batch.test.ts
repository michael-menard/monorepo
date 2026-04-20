/**
 * Gate 2 + Gate 3 + Gate 5: Batch Loop, Dry-Run, and Status Transition Tests
 *
 * Tests runGenerateStoriesMode with mocked dependencies:
 * - getPlansWithoutStories
 * - runPipelineSupervisor
 * - storyListAdapter
 * - updatePlanStatus
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock all external dependencies before importing the module under test
vi.mock('../../services/kb-adapters.js', () => ({
  storyListAdapter: vi.fn(),
  getNextPlanWithEligibleStories: vi.fn(),
  getPlansWithoutStories: vi.fn(),
  updatePlanStatus: vi.fn(),
  buildKbAdapter: vi.fn(() => ({})),
  getStoryStateAdapter: vi.fn(),
}))

vi.mock('../../graphs/pipeline-supervisor.js', () => ({
  runPipelineSupervisor: vi.fn(),
}))

vi.mock('../../config/model-config.js', () => ({
  DEFAULT_MODEL_CONFIG: {
    requiredLocalModel: 'test-model',
    planRefinement: 'test',
    storyGeneration: 'test',
  },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { runGenerateStoriesMode } from '../run-pipeline.js'
import { storyListAdapter, getPlansWithoutStories, updatePlanStatus } from '../../services/kb-adapters.js'
import { runPipelineSupervisor } from '../../graphs/pipeline-supervisor.js'
import type { PlanEntry } from '../../services/kb-adapters.js'
import type { SupervisorResult } from '../../graphs/pipeline-supervisor.js'

// Type the mocks
const mockGetPlans = vi.mocked(getPlansWithoutStories)
const mockSupervisor = vi.mocked(runPipelineSupervisor)
const mockStoryList = vi.mocked(storyListAdapter)
const mockUpdateStatus = vi.mocked(updatePlanStatus)

// Mock process.exit and stdout to prevent test runner interference
const mockExit = vi.spyOn(process, 'exit').mockImplementation((_code?: number) => {
  throw new Error(`process.exit(${_code})`)
})
const mockStdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

// Helper to create a plan entry
function plan(slug: string, status: string, priority: string): PlanEntry {
  return {
    planSlug: slug,
    status,
    priority,
    title: `Plan: ${slug}`,
    sortOrder: null,
    createdAt: new Date('2026-01-01'),
  }
}

// Helper for a successful supervisor result
function successResult(): SupervisorResult {
  return {
    completed: [],
    blocked: [],
    errors: [],
    storiesProcessed: 0,
    durationMs: 100,
    finalPhase: 'pipeline_complete',
  }
}

// Helper for a failed supervisor result
function errorResult(msg: string): SupervisorResult {
  return {
    completed: [],
    blocked: [],
    errors: [msg],
    storiesProcessed: 0,
    durationMs: 100,
    finalPhase: 'error',
  }
}

const stubAdapters = {} as Parameters<typeof runGenerateStoriesMode>[2]
const envConfig = {
  monorepoRoot: '/tmp/mono',
  ollamaBaseUrl: 'http://localhost:11434',
  defaultBaseBranch: 'main',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockExit.mockClear()
  mockStdout.mockClear()
})

// ============================================================================
// Gate 2: Batch Loop Logic
// ============================================================================

describe('runGenerateStoriesMode — batch loop', () => {
  it('processes plans in the order returned by getPlansWithoutStories', async () => {
    const plans = [plan('alpha', 'draft', 'P1'), plan('beta', 'accepted', 'P2'), plan('gamma', 'draft', 'P3')]
    mockGetPlans.mockResolvedValue(plans)
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['draft', 'accepted'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    const slugsProcessed = mockSupervisor.mock.calls.map(call => (call[0] as { planSlug: string }).planSlug)
    expect(slugsProcessed).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('passes skipDevPhase=true and correct planStatus for draft plans', async () => {
    mockGetPlans.mockResolvedValue([plan('draft-plan', 'draft', 'P1')])
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    const config = mockSupervisor.mock.calls[0][0] as { skipDevPhase: boolean; planStatus: string }
    expect(config.skipDevPhase).toBe(true)
    expect(config.planStatus).toBe('draft')
  })

  it('passes skipDevPhase=true and correct planStatus for accepted plans', async () => {
    mockGetPlans.mockResolvedValue([plan('accepted-plan', 'accepted', 'P1')])
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['accepted'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    const config = mockSupervisor.mock.calls[0][0] as { skipDevPhase: boolean; planStatus: string }
    expect(config.skipDevPhase).toBe(true)
    expect(config.planStatus).toBe('accepted')
  })

  it('does NOT update status when zero stories generated', async () => {
    mockGetPlans.mockResolvedValue([plan('empty-plan', 'draft', 'P1')])
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([]) // zero stories

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('trips circuit breaker after 3 consecutive failures', async () => {
    const plans = [
      plan('p1', 'draft', 'P1'),
      plan('p2', 'draft', 'P1'),
      plan('p3', 'draft', 'P1'),
      plan('p4', 'draft', 'P1'),
      plan('p5', 'draft', 'P1'),
    ]
    mockGetPlans.mockResolvedValue(plans)
    mockSupervisor.mockRejectedValue(new Error('LLM down'))

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(1)')

    // Should only attempt 3 plans before circuit breaker trips
    expect(mockSupervisor).toHaveBeenCalledTimes(3)
  })

  it('resets circuit breaker counter on success', async () => {
    const plans = [
      plan('p1', 'draft', 'P1'),
      plan('p2', 'draft', 'P1'),
      plan('p3', 'draft', 'P1'),
      plan('p4', 'draft', 'P1'),
      plan('p5', 'draft', 'P1'),
    ]
    mockGetPlans.mockResolvedValue(plans)
    // fail, succeed, fail, fail, fail — circuit breaker should trip on p5
    mockSupervisor
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce(successResult()) // resets counter
      .mockRejectedValueOnce(new Error('fail2'))
      .mockRejectedValueOnce(new Error('fail3'))
      .mockRejectedValueOnce(new Error('fail4'))

    // p2 needs stories for status update
    mockStoryList.mockResolvedValueOnce([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(1)')

    // All 5 plans should be attempted — counter reset after p2 success
    // fail(p1), success(p2), fail(p3), fail(p4), fail(p5) — breaker trips at p5 check but p5 already ran
    // Actually: p1 fail (count=1), p2 success (count=0), p3 fail (count=1), p4 fail (count=2), p5 fail (count=3)
    // Circuit breaker checks at TOP of loop, so p5 runs, then p6 would be blocked
    expect(mockSupervisor).toHaveBeenCalledTimes(5)
  })

  it('collects errors from failed plans in summary', async () => {
    mockGetPlans.mockResolvedValue([plan('broken', 'draft', 'P1')])
    mockSupervisor.mockResolvedValue(errorResult('refinement failed: invalid plan'))

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(1)')

    // Verify error was written to stdout
    const outputCalls = mockStdout.mock.calls.map(c => c[0]).join('')
    expect(outputCalls).toContain('refinement failed')
  })

  it('exits with code 0 when no plans found', async () => {
    mockGetPlans.mockResolvedValue([])

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    expect(mockSupervisor).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Gate 3: Dry-Run Mode
// ============================================================================

describe('runGenerateStoriesMode — dry-run', () => {
  it('lists plans without calling supervisor', async () => {
    mockGetPlans.mockResolvedValue([
      plan('plan-a', 'draft', 'P1'),
      plan('plan-b', 'accepted', 'P2'),
    ])

    await expect(runGenerateStoriesMode(['draft', 'accepted'], true, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    expect(mockSupervisor).not.toHaveBeenCalled()
    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('logs plan count in dry-run output', async () => {
    mockGetPlans.mockResolvedValue([
      plan('plan-a', 'draft', 'P1'),
      plan('plan-b', 'accepted', 'P2'),
      plan('plan-c', 'draft', 'P3'),
    ])

    await expect(runGenerateStoriesMode(['draft', 'accepted'], true, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    const outputCalls = mockStdout.mock.calls.map(c => c[0]).join('')
    expect(outputCalls).toContain('Plans to process: 3')
  })

  it('exits with code 0', async () => {
    mockGetPlans.mockResolvedValue([plan('plan-a', 'draft', 'P1')])

    await expect(runGenerateStoriesMode(['draft'], true, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')
  })
})

// ============================================================================
// Gate 5: Status Transition Integrity
// ============================================================================

describe('runGenerateStoriesMode — status transitions', () => {
  it('updates draft plan status to accepted then stories-created', async () => {
    mockGetPlans.mockResolvedValue([plan('draft-p', 'draft', 'P1')])
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    expect(mockUpdateStatus).toHaveBeenCalledTimes(2)
    expect(mockUpdateStatus).toHaveBeenNthCalledWith(1, 'draft-p', 'accepted')
    expect(mockUpdateStatus).toHaveBeenNthCalledWith(2, 'draft-p', 'stories-created')
  })

  it('updates accepted plan status to stories-created only', async () => {
    mockGetPlans.mockResolvedValue([plan('accepted-p', 'accepted', 'P1')])
    mockSupervisor.mockResolvedValue(successResult())
    mockStoryList.mockResolvedValue([{ storyId: 'S1', state: 'ready', priority: 'P1', blockedByStory: null }])
    mockUpdateStatus.mockResolvedValue(true)

    await expect(runGenerateStoriesMode(['accepted'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(0)')

    expect(mockUpdateStatus).toHaveBeenCalledTimes(1)
    expect(mockUpdateStatus).toHaveBeenCalledWith('accepted-p', 'stories-created')
  })

  it('does NOT update status when supervisor returns errors', async () => {
    mockGetPlans.mockResolvedValue([plan('fail-p', 'draft', 'P1')])
    mockSupervisor.mockResolvedValue(errorResult('refinement failed'))

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(1)')

    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })

  it('does NOT update status when supervisor throws', async () => {
    mockGetPlans.mockResolvedValue([plan('crash-p', 'draft', 'P1')])
    mockSupervisor.mockRejectedValue(new Error('adapter crash'))

    await expect(runGenerateStoriesMode(['draft'], false, stubAdapters, envConfig)).rejects.toThrow('process.exit(1)')

    expect(mockUpdateStatus).not.toHaveBeenCalled()
  })
})
