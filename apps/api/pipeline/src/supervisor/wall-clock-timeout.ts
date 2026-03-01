/**
 * Wall Clock Timeout
 *
 * WallClockTimeoutError and withWallClockTimeout() wrapper for enforcing
 * a hard deadline on LangGraph graph execution via Promise.race().
 *
 * AC-6: Per-stage wall clock timeout (default: 10 minutes, configurable).
 * AC-15: WallClockTimeoutError MUST be caught BEFORE general error classification.
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 */

/**
 * Error thrown when a graph invocation exceeds the configured wall clock timeout.
 *
 * AC-15: This error bypasses isRetryableNodeError() entirely.
 * The two-catch pattern in dispatch-router.ts catches this FIRST.
 */
export class WallClockTimeoutError extends Error {
  readonly timeoutMs: number
  readonly stage: string

  constructor(timeoutMs: number, stage: string) {
    super(
      `Wall clock timeout after ${timeoutMs}ms for stage '${stage}' — graph execution exceeded deadline`,
    )
    this.name = 'WallClockTimeoutError'
    this.timeoutMs = timeoutMs
    this.stage = stage
  }
}

/**
 * Wraps a promise with a wall clock timeout using Promise.race().
 *
 * AC-6: If the wrapped promise does not settle within timeoutMs, rejects with WallClockTimeoutError.
 *
 * @param promise - The graph invocation promise to race
 * @param timeoutMs - Maximum allowed time in milliseconds
 * @param stage - Stage name for error reporting
 * @returns The result of the wrapped promise
 * @throws WallClockTimeoutError if timeout fires first
 */
export function withWallClockTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stage: string,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const handle = setTimeout(() => {
      reject(new WallClockTimeoutError(timeoutMs, stage))
    }, timeoutMs)

    // Ensure the timeout handle does not prevent process exit
    if (typeof handle === 'object' && handle !== null && 'unref' in handle) {
      ;(handle as NodeJS.Timeout).unref()
    }
  })

  return Promise.race([promise, timeoutPromise])
}
