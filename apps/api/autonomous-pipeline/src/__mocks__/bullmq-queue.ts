import { vi } from 'vitest'

/**
 * Represents the shape of a mock BullMQ Queue instance.
 * All methods are `vi.fn()` stubs suitable for assertion in unit tests.
 */
export type MockBullMQQueue = {
  /** Stub for adding a job to the queue. */
  add: ReturnType<typeof vi.fn>
  /** Stub for retrieving a job by its ID. */
  getJob: ReturnType<typeof vi.fn>
  /** Stub for pausing job processing. */
  pause: ReturnType<typeof vi.fn>
  /** Stub for resuming job processing. */
  resume: ReturnType<typeof vi.fn>
  /** Stub for closing the queue connection. */
  close: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock BullMQ Queue with stubbed job management methods.
 *
 * Use this in place of a real `Queue` from `bullmq` to avoid Redis connections
 * in unit tests. All stubs are pre-configured as `vi.fn()`.
 *
 * @returns A `MockBullMQQueue` with `add`, `getJob`, `pause`, `resume`, and `close` stubs.
 *
 * @example
 * ```ts
 * const queue = createMockQueue()
 * queue.add.mockResolvedValue({ id: 'job-1' })
 * const jobId = await supervisor.enqueue(jobData)
 * expect(queue.add).toHaveBeenCalledWith('pipeline', jobData, expect.any(Object))
 * ```
 */
export function createMockQueue(): MockBullMQQueue {
  return {
    add: vi.fn(),
    getJob: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
  }
}
