/**
 * Unit tests for Supervisor Worker event callbacks (PIPE-2030)
 *
 * AC-5: HP-1 through HP-4 — completed callback with correct state for all 4 stages.
 * AC-6: HP-5, EC-3 — failed callback: final failure → blocked, transient → no KB call.
 * AC-7: All tests pass with pnpm test --filter @repo/pipeline.
 * AC-8: No wint.* references in this file.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoryCrudDeps } from '@repo/knowledge-base'

// ─────────────────────────────────────────────────────────────────────────────
// Mock @repo/logger
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', async importOriginal => {
  const actual = await importOriginal<typeof import('@repo/logger')>()
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mock @repo/knowledge-base
// ─────────────────────────────────────────────────────────────────────────────

const mockKbUpdateStoryStatus = vi.fn().mockResolvedValue({ story: null, updated: false })

vi.mock('@repo/knowledge-base', async importOriginal => {
  const actual = await importOriginal<typeof import('@repo/knowledge-base')>()
  return {
    ...actual,
    kb_update_story_status: mockKbUpdateStoryStatus,
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mock dispatch-router.js to avoid loading @repo/orchestrator (wint dep chain)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../dispatch-router.js', () => ({
  dispatchJob: vi.fn().mockResolvedValue(undefined),
  getCircuitBreakerSummary: vi.fn().mockReturnValue({}),
  resetDispatcherState: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock bullmq — capture Worker .on() handlers instead of starting real Redis
// ─────────────────────────────────────────────────────────────────────────────

type EventHandlerMap = Record<string, (...args: any[]) => void>
let capturedWorkerHandlers: EventHandlerMap = {}

const mockWorkerOn = vi.fn((event: string, handler: (...args: any[]) => void) => {
  capturedWorkerHandlers[event] = handler
})

const mockWorkerClose = vi.fn().mockResolvedValue(undefined)
const mockWorkerPause = vi.fn().mockResolvedValue(undefined)

vi.mock('bullmq', async importOriginal => {
  const actual = await importOriginal<typeof import('bullmq')>()
  return {
    ...actual,
    Worker: vi.fn().mockImplementation(() => ({
      on: mockWorkerOn,
      close: mockWorkerClose,
      pause: mockWorkerPause,
    })),
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Mock health server (createHealthServer called in start())
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../health/server.js', () => ({
  createHealthServer: vi.fn().mockReturnValue({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock drain handlers (registerDrainHandlers called in start())
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../drain/index.js', () => ({
  registerDrainHandlers: vi.fn(),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock blocker notification (db=null skips it, but mock the module anyway)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../blocker-notification/index.js', () => ({
  createBlockerNotificationModule: vi.fn().mockReturnValue(null),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock worktree-lifecycle.js (imported in supervisor/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../worktree-lifecycle.js', () => ({
  createWorktree: vi.fn().mockResolvedValue(undefined),
  removeWorktree: vi.fn().mockResolvedValue(undefined),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock concurrency-controller.js to avoid loading @repo/orchestrator
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../concurrency/concurrency-controller.js', () => ({
  ConcurrencyController: vi.fn().mockImplementation(() => ({
    tryAcquireSlot: vi.fn().mockReturnValue(true),
    releaseSlot: vi.fn(),
    getSlot: vi.fn().mockReturnValue(null),
    getActiveSlots: vi.fn().mockReturnValue(new Map()),
    activeSlots: vi.fn().mockReturnValue(0),
  })),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Mock concurrency/worktree-path.js
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../concurrency/worktree-path.js', () => ({
  generateWorktreePath: vi.fn().mockReturnValue('/tmp/test-worktree'),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMockRedis() {
  return { on: vi.fn(), status: 'ready' } as any
}

function makeMockKbDeps(): StoryCrudDeps {
  return { db: {} as any }
}

/**
 * Build a completed-event job mock.
 */
function makeCompletedJob(storyId: string, stage: string) {
  return {
    id: `job-${storyId}-${stage}`,
    data: { storyId, stage },
  } as any
}

/**
 * Build a failed-event job mock.
 * attemptsMade >= (opts.attempts ?? 1) means final failure.
 */
function makeFailedJob(storyId: string, attemptsMade: number, maxAttempts: number) {
  return {
    id: `job-${storyId}`,
    data: { storyId, stage: 'implementation' },
    attemptsMade,
    opts: { attempts: maxAttempts },
  } as any
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup — instantiate supervisor and start() to wire event handlers
// ─────────────────────────────────────────────────────────────────────────────

async function startSupervisor(kbDeps: StoryCrudDeps | null = null) {
  const { PipelineSupervisor } = await import('../index.js')
  capturedWorkerHandlers = {}
  const supervisor = new PipelineSupervisor(makeMockRedis(), { queueName: 'test-queue' }, null, kbDeps)
  await supervisor.start()
  return supervisor
}

// ─────────────────────────────────────────────────────────────────────────────
// ST-3: Completed callback — all 4 stages produce correct next-state (AC-5)
// ─────────────────────────────────────────────────────────────────────────────

describe('Supervisor: worker.on(completed) callback — state advancement (PIPE-2030 AC-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedWorkerHandlers = {}
    mockKbUpdateStoryStatus.mockResolvedValue({ story: null, updated: true })
  })

  it('HP-1: elaboration stage → kb_update_story_status called with state: "ready"', async () => {
    await startSupervisor(makeMockKbDeps())

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-001', 'elaboration')
    completedHandler(job)

    // Fire-and-forget: flush microtask queue before asserting
    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    expect(mockKbUpdateStoryStatus).toHaveBeenCalledWith(
      expect.objectContaining({ db: expect.anything() }),
      expect.objectContaining({ story_id: 'PIPE-001', state: 'ready' }),
    )
  })

  it('HP-2: implementation stage → kb_update_story_status called with state: "needs_code_review"', async () => {
    await startSupervisor(makeMockKbDeps())

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-002', 'implementation')
    completedHandler(job)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    expect(mockKbUpdateStoryStatus).toHaveBeenCalledWith(
      expect.objectContaining({ db: expect.anything() }),
      expect.objectContaining({ story_id: 'PIPE-002', state: 'needs_code_review' }),
    )
  })

  it('HP-3: review stage → kb_update_story_status called with state: "ready_for_qa"', async () => {
    await startSupervisor(makeMockKbDeps())

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-003', 'review')
    completedHandler(job)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    expect(mockKbUpdateStoryStatus).toHaveBeenCalledWith(
      expect.objectContaining({ db: expect.anything() }),
      expect.objectContaining({ story_id: 'PIPE-003', state: 'ready_for_qa' }),
    )
  })

  it('HP-4: qa stage → kb_update_story_status called with state: "completed" (not "UAT")', async () => {
    await startSupervisor(makeMockKbDeps())

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-004', 'qa')
    completedHandler(job)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    expect(mockKbUpdateStoryStatus).toHaveBeenCalledWith(
      expect.objectContaining({ db: expect.anything() }),
      expect.objectContaining({ story_id: 'PIPE-004', state: 'completed' }),
    )

    // Explicitly verify 'UAT' is NOT used
    const callArgs = mockKbUpdateStoryStatus.mock.calls[0]
    expect(callArgs[1].state).toBe('completed')
    expect(callArgs[1].state).not.toBe('UAT')
    expect(callArgs[1].state).not.toBe('uat')
  })

  it('HP-4a: unknown stage → kb_update_story_status NOT called (no mapping)', async () => {
    await startSupervisor(makeMockKbDeps())

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-005', 'unknown_stage')
    completedHandler(job)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).not.toHaveBeenCalled()
  })

  it('HP-4b: no kbDeps → kb_update_story_status NOT called', async () => {
    await startSupervisor(null)

    const completedHandler = capturedWorkerHandlers['completed']
    expect(completedHandler).toBeDefined()

    const job = makeCompletedJob('PIPE-006', 'qa')
    completedHandler(job)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// ST-4: Failed callback — final vs transient failure (AC-6)
// ─────────────────────────────────────────────────────────────────────────────

describe('Supervisor: worker.on(failed) callback — blocked state on final failure (PIPE-2030 AC-6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedWorkerHandlers = {}
    mockKbUpdateStoryStatus.mockResolvedValue({ story: null, updated: true })
  })

  it('HP-5: final failure → kb_update_story_status called with state: "blocked" and non-empty blocked_reason', async () => {
    await startSupervisor(makeMockKbDeps())

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    const job = makeFailedJob('PIPE-010', 3, 3) // attemptsMade === attempts → final failure
    const error = new Error('LangGraph timeout after 30s')
    failedHandler(job, error)

    // Fire-and-forget: flush microtask queue
    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    const callArgs = mockKbUpdateStoryStatus.mock.calls[0]
    expect(callArgs[1]).toMatchObject({
      story_id: 'PIPE-010',
      state: 'blocked',
      blocked_reason: 'LangGraph timeout after 30s',
    })
    expect(callArgs[1].blocked_reason).toBeTruthy()
    expect(callArgs[1].blocked_reason.length).toBeGreaterThan(0)
  })

  it('EC-3: transient failure (attemptsMade < attempts) → kb_update_story_status NOT called', async () => {
    await startSupervisor(makeMockKbDeps())

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    const job = makeFailedJob('PIPE-011', 1, 3) // attemptsMade (1) < attempts (3) → transient
    const error = new Error('Transient network error')
    failedHandler(job, error)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).not.toHaveBeenCalled()
  })

  it('HP-5a: final failure with default maxAttempts (opts.attempts undefined) → treated as final if attemptsMade >= 1', async () => {
    await startSupervisor(makeMockKbDeps())

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    // opts.attempts not set → defaults to 1, attemptsMade=1 → final
    const job = {
      id: 'job-012',
      data: { storyId: 'PIPE-012', stage: 'implementation' },
      attemptsMade: 1,
      opts: {},
    } as any
    const error = new Error('Out of memory')
    failedHandler(job, error)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    expect(mockKbUpdateStoryStatus).toHaveBeenCalledWith(
      expect.objectContaining({ db: expect.anything() }),
      expect.objectContaining({
        story_id: 'PIPE-012',
        state: 'blocked',
        blocked_reason: 'Out of memory',
      }),
    )
  })

  it('HP-5b: final failure with no kbDeps → kb_update_story_status NOT called', async () => {
    await startSupervisor(null)

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    const job = makeFailedJob('PIPE-013', 3, 3)
    const error = new Error('Permanent failure')
    failedHandler(job, error)

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).not.toHaveBeenCalled()
  })

  it('HP-5c: job undefined (BullMQ edge case) → kb_update_story_status NOT called', async () => {
    await startSupervisor(makeMockKbDeps())

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    failedHandler(undefined, new Error('Unknown job failure'))

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).not.toHaveBeenCalled()
  })

  it('HP-5d: non-Error thrown → blocked_reason is a non-empty string', async () => {
    await startSupervisor(makeMockKbDeps())

    const failedHandler = capturedWorkerHandlers['failed']
    expect(failedHandler).toBeDefined()

    const job = makeFailedJob('PIPE-014', 2, 2)
    failedHandler(job, 'string error reason')

    await Promise.resolve()

    expect(mockKbUpdateStoryStatus).toHaveBeenCalledOnce()
    const callArgs = mockKbUpdateStoryStatus.mock.calls[0]
    expect(callArgs[1].state).toBe('blocked')
    expect(callArgs[1].blocked_reason).toBe('string error reason')
  })
})
