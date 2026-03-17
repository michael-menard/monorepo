/**
 * Emergency Controls Unit Tests (AUDIT-8)
 *
 * Tests for pausePipeline(), drainPipeline(), quarantineStory().
 *
 * Key verification (AUDIT-8 Task 5 checklist):
 * - pausePipeline() calls queue.pause() and stops new jobs from being dispatched
 * - quarantineStory() blocks story in KB and removes its queued job
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pausePipeline, drainPipeline, quarantineStory } from '../../emergency-controls.js'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@repo/knowledge-base', () => ({
  kb_update_story_status: vi.fn().mockResolvedValue({ updated: true, message: 'ok' }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: minimal BullMQ mock shapes
// ─────────────────────────────────────────────────────────────────────────────

function makeQueue(overrides: Record<string, unknown> = {}) {
  return {
    name: 'apip-pipeline',
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    drain: vi.fn().mockResolvedValue(undefined),
    getWaitingCount: vi.fn().mockResolvedValue(0),
    getJobs: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as any
}

function makeWorker(overrides: Record<string, unknown> = {}) {
  return {
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any
}

function makeJob(storyId: string, jobId = 'job-1') {
  return {
    id: jobId,
    name: `story-${storyId}`,
    data: { storyId, stage: 'implementation', attemptNumber: 1 },
    remove: vi.fn().mockResolvedValue(undefined),
  }
}

function makeKbDeps() {
  return { db: {} as any }
}

// ─────────────────────────────────────────────────────────────────────────────
// pausePipeline()
// ─────────────────────────────────────────────────────────────────────────────

describe('pausePipeline()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AUDIT-8-T1: pauses the queue (server-side) — no new jobs dispatched', async () => {
    const queue = makeQueue()

    const result = await pausePipeline(queue)

    expect(queue.pause).toHaveBeenCalledOnce()
    expect(result.queuePaused).toBe(true)
    expect(result.workerPaused).toBe(false)
  })

  it('AUDIT-8-T2: pauses both queue and worker when worker is provided', async () => {
    const queue = makeQueue()
    const worker = makeWorker()

    const result = await pausePipeline(queue, worker)

    expect(queue.pause).toHaveBeenCalledOnce()
    expect(worker.pause).toHaveBeenCalledOnce()
    expect(result.queuePaused).toBe(true)
    expect(result.workerPaused).toBe(true)
  })

  it('AUDIT-8-T3: returns queuePaused=false and does not throw when queue.pause() fails', async () => {
    const queue = makeQueue({
      pause: vi.fn().mockRejectedValue(new Error('Redis unavailable')),
    })

    // Should not throw — emergency controls must be robust
    const result = await pausePipeline(queue)

    expect(result.queuePaused).toBe(false)
  })

  it('AUDIT-8-T4: after queue is paused, calling queue.pause() again is idempotent (BullMQ contract)', async () => {
    const queue = makeQueue()

    await pausePipeline(queue)
    await pausePipeline(queue)

    // Both calls reach queue.pause() — BullMQ handles idempotency internally
    expect(queue.pause).toHaveBeenCalledTimes(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// drainPipeline()
// ─────────────────────────────────────────────────────────────────────────────

describe('drainPipeline()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AUDIT-8-D1: calls queue.drain() and returns count of removed waiting jobs', async () => {
    const queue = makeQueue({
      getWaitingCount: vi.fn().mockResolvedValue(5),
    })

    const result = await drainPipeline(queue)

    expect(queue.drain).toHaveBeenCalledOnce()
    expect(result.jobsRemoved).toBe(5)
  })

  it('AUDIT-8-D2: returns jobsRemoved=0 when queue is already empty', async () => {
    const queue = makeQueue({
      getWaitingCount: vi.fn().mockResolvedValue(0),
    })

    const result = await drainPipeline(queue)

    expect(result.jobsRemoved).toBe(0)
  })

  it('AUDIT-8-D3: throws when queue.drain() fails', async () => {
    const queue = makeQueue({
      drain: vi.fn().mockRejectedValue(new Error('drain failed')),
    })

    await expect(drainPipeline(queue)).rejects.toThrow('drain failed')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// quarantineStory()
// ─────────────────────────────────────────────────────────────────────────────

describe('quarantineStory()', () => {
  // Reference the mocked function directly via the module mock
  let mockKbUpdate: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const kbModule = await import('@repo/knowledge-base')
    mockKbUpdate = vi.mocked(kbModule.kb_update_story_status)
    mockKbUpdate.mockResolvedValue({ updated: true, message: 'ok' } as any)
  })

  it('AUDIT-8-Q1: sets story state to blocked in KB with the provided reason', async () => {
    const queue = makeQueue()
    const kbDeps = makeKbDeps()

    await quarantineStory(kbDeps, queue, 'STORY-001', 'runaway agent detected')

    expect(mockKbUpdate).toHaveBeenCalledWith(kbDeps, {
      story_id: 'STORY-001',
      blocked_reason: 'runaway agent detected',
    })
  })

  it('AUDIT-8-Q2: returns storyBlocked=true when KB update succeeds', async () => {
    const queue = makeQueue()
    const kbDeps = makeKbDeps()

    const result = await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(result.storyBlocked).toBe(true)
  })

  it('AUDIT-8-Q3: finds and removes the waiting BullMQ job for the story', async () => {
    const job = makeJob('STORY-001')
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([job]),
    })
    const kbDeps = makeKbDeps()

    const result = await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(job.remove).toHaveBeenCalledOnce()
    expect(result.jobRemoved).toBe(true)
  })

  it('AUDIT-8-Q4: jobRemoved=false when no waiting job exists for the story', async () => {
    const otherJob = makeJob('STORY-999')
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([otherJob]),
    })
    const kbDeps = makeKbDeps()

    const result = await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(otherJob.remove).not.toHaveBeenCalled()
    expect(result.jobRemoved).toBe(false)
    expect(result.jobsSearched).toBe(1)
  })

  it('AUDIT-8-Q5: does not throw when KB update fails — still attempts BullMQ removal', async () => {
    mockKbUpdate.mockRejectedValue(new Error('DB unavailable'))
    const job = makeJob('STORY-001')
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([job]),
    })
    const kbDeps = makeKbDeps()

    // Should not throw
    const result = await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(result.storyBlocked).toBe(false)
    // Still attempts job removal even when KB fails
    expect(job.remove).toHaveBeenCalledOnce()
    expect(result.jobRemoved).toBe(true)
  })

  it('AUDIT-8-Q6: searches both waiting and delayed jobs', async () => {
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([]),
    })
    const kbDeps = makeKbDeps()

    await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(queue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed'])
  })

  it('AUDIT-8-Q7: also finds jobs whose storyId is nested in payload field', async () => {
    const job = {
      id: 'job-1',
      name: 'story-STORY-001',
      data: {
        storyId: undefined,
        payload: { storyId: 'STORY-001' },
      },
      remove: vi.fn().mockResolvedValue(undefined),
    }
    const queue = makeQueue({
      getJobs: vi.fn().mockResolvedValue([job]),
    })
    const kbDeps = makeKbDeps()

    const result = await quarantineStory(kbDeps, queue, 'STORY-001', 'reason')

    expect(job.remove).toHaveBeenCalledOnce()
    expect(result.jobRemoved).toBe(true)
  })
})
