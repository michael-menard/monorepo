import { vi } from 'vitest'

/**
 * Represents the shape of a mock BullMQ Worker instance.
 * All methods are `vi.fn()` stubs suitable for assertion in unit tests.
 */
export type MockBullMQWorker = {
  /** Stub for registering event handlers (completed, failed, progress, etc.). */
  on: ReturnType<typeof vi.fn>
  /** Stub for gracefully shutting down the worker. */
  close: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock BullMQ Worker with stubbed event emitter and lifecycle methods.
 *
 * Use this in place of a real `Worker` from `bullmq` to avoid Redis connections
 * in unit tests. All stubs are pre-configured as `vi.fn()`.
 *
 * @returns A `MockBullMQWorker` with `on` and `close` stubs.
 *
 * @example
 * ```ts
 * const worker = createMockBullMQWorker()
 * supervisor.start()
 * expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function))
 * ```
 */
export function createMockBullMQWorker(): MockBullMQWorker {
  return {
    on: vi.fn(),
    close: vi.fn(),
  }
}
