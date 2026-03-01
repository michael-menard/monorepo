import { describe, it, expect, vi } from 'vitest'
import {
  PollTimeoutError,
  PollTimeoutErrorSchema,
  getNextInterval,
} from '../job-poller.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Tests — pure unit tests (no fake timers needed for these)
// ─────────────────────────────────────────────────────────────────────────────

describe('getNextInterval', () => {
  it('doubles the interval', () => {
    expect(getNextInterval(100, 60000)).toBe(200)
    expect(getNextInterval(200, 60000)).toBe(400)
    expect(getNextInterval(400, 60000)).toBe(800)
  })

  it('caps at maxPollIntervalMs', () => {
    expect(getNextInterval(40000, 60000)).toBe(60000)
    expect(getNextInterval(60000, 60000)).toBe(60000)
    expect(getNextInterval(100000, 60000)).toBe(60000)
  })

  it('exponential sequence from 100ms reaches cap at 60000ms', () => {
    const max = 60000
    const intervals: number[] = []
    let current = 100
    for (let i = 0; i < 12; i++) {
      intervals.push(current)
      current = getNextInterval(current, max)
    }
    // First few: 100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200, 60000, 60000
    expect(intervals[0]).toBe(100)
    expect(intervals[1]).toBe(200)
    expect(intervals[2]).toBe(400)
    expect(intervals[3]).toBe(800)
    expect(intervals[10]).toBe(60000)
    expect(intervals[11]).toBe(60000)
  })

  it('exponential back-off schedule: 10ms base, 100ms cap', () => {
    const max = 100
    let current = 10
    const schedule: number[] = [current]
    for (let i = 0; i < 5; i++) {
      current = getNextInterval(current, max)
      schedule.push(current)
    }
    // 10, 20, 40, 80, 100, 100
    expect(schedule).toEqual([10, 20, 40, 80, 100, 100])
  })
})

describe('PollTimeoutError', () => {
  it('has correct name, message, and fields', () => {
    const err = new PollTimeoutError('job-123', 30000, 30001)
    expect(err.name).toBe('PollTimeoutError')
    expect(err.jobId).toBe('job-123')
    expect(err.maxWaitMs).toBe(30000)
    expect(err.elapsedMs).toBe(30001)
    expect(err.message).toContain('job-123')
    expect(err.message).toContain('30000')
  })

  it('is an instance of Error', () => {
    const err = new PollTimeoutError('job-x', 1000, 1001)
    expect(err).toBeInstanceOf(Error)
  })

  it('can be parsed by PollTimeoutErrorSchema', () => {
    const err = new PollTimeoutError('job-123', 30000, 30001)
    const parsed = PollTimeoutErrorSchema.parse({
      name: err.name,
      message: err.message,
      jobId: err.jobId,
      maxWaitMs: err.maxWaitMs,
      elapsedMs: err.elapsedMs,
    })
    expect(parsed.name).toBe('PollTimeoutError')
    expect(parsed.jobId).toBe('job-123')
  })

  it('thrown PollTimeoutError has correct jobId and maxWaitMs fields', () => {
    const err = new PollTimeoutError('my-job-id', 100, 150)
    expect(err.jobId).toBe('my-job-id')
    expect(err.maxWaitMs).toBe(100)
    expect(err.elapsedMs).toBe(150)
    expect(err.name).toBe('PollTimeoutError')
  })

  it('PollTimeoutError message contains jobId and maxWaitMs', () => {
    const err = new PollTimeoutError('test-job-42', 5000, 5001)
    expect(err.message).toContain('test-job-42')
    expect(err.message).toContain('5000')
  })
})

describe('pollJobCompletion - integration with real timer (short timeout)', () => {
  it('throws PollTimeoutError when job stays in active state past maxWaitMs', async () => {
    const { pollJobCompletion } = await import('../job-poller.ts')

    // Mock queue always returning 'active' state
    const mockQueue = {
      getJob: vi.fn().mockResolvedValue({
        getState: vi.fn().mockResolvedValue('active'),
      }),
    }

    // Use very short maxWaitMs (1ms) and large pollIntervalMs
    // The elapsed check happens before the first sleep, so it will timeout immediately
    await expect(
      pollJobCompletion(mockQueue as any, 'timeout-job', 1, {
        pollIntervalMs: 5000,
        maxPollIntervalMs: 60000,
      })
    ).rejects.toThrow(PollTimeoutError)
  }, 5000)

  it('returns completed state when job reaches completed immediately', async () => {
    const { pollJobCompletion } = await import('../job-poller.ts')

    // Mock queue returning 'completed' on first call
    const mockQueue = {
      getJob: vi.fn().mockResolvedValue({
        getState: vi.fn().mockResolvedValue('completed'),
      }),
    }

    const result = await pollJobCompletion(mockQueue as any, 'completed-job', 30000, {
      pollIntervalMs: 50,
      maxPollIntervalMs: 100,
    })

    expect(result).toBe('completed')
  }, 5000)

  it('returns failed state when job reaches failed immediately', async () => {
    const { pollJobCompletion } = await import('../job-poller.ts')

    const mockQueue = {
      getJob: vi.fn().mockResolvedValue({
        getState: vi.fn().mockResolvedValue('failed'),
      }),
    }

    const result = await pollJobCompletion(mockQueue as any, 'failed-job', 30000, {
      pollIntervalMs: 50,
      maxPollIntervalMs: 100,
    })

    expect(result).toBe('failed')
  }, 5000)
})
