import { z } from 'zod'
import { SupervisorStateSchema } from '../__types__/supervisor-state.js'

/** Inferred type for supervisor runtime state. */
type SupervisorState = z.infer<typeof SupervisorStateSchema>

/**
 * Creates a mock supervisor state fixture for use in unit tests.
 *
 * Merges sensible defaults with any caller-supplied partial overrides,
 * then validates the result through `SupervisorStateSchema.parse()` so
 * tests always receive a structurally-valid state object.
 *
 * @param overrides - Partial fields to override on the default fixture.
 * @returns A validated `SupervisorState` object.
 *
 * @example
 * ```ts
 * const state = createSupervisorStateFixture({ status: 'processing', currentJobId: 'job-42' })
 * ```
 */
export function createSupervisorStateFixture(
  overrides?: Partial<SupervisorState>,
): SupervisorState {
  const defaults: SupervisorState = {
    status: 'idle',
    config: {
      queueName: 'pipeline',
      stageTimeoutMs: 600_000,
      circuitBreakerFailureThreshold: 3,
      circuitBreakerRecoveryTimeoutMs: 30_000,
    },
    currentJobId: null,
    processedCount: 0,
    errorCount: 0,
    startedAt: null,
    lastProcessedAt: null,
  }

  return SupervisorStateSchema.parse({ ...defaults, ...overrides })
}
