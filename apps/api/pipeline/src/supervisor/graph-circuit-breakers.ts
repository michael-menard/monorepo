/**
 * Per-Graph Circuit Breaker Instances
 *
 * One NodeCircuitBreaker per worker graph, shared across all job dispatches.
 * Imported directly from @repo/orchestrator — NOT re-implemented (AC-14).
 *
 * AC-8: Circuit breakers protect each worker graph.
 * AC-14: Imports NodeCircuitBreaker from '@repo/orchestrator'.
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 */

// AC-14: Import NodeCircuitBreaker directly from @repo/orchestrator — do NOT re-implement
import { NodeCircuitBreaker } from '@repo/orchestrator'
import type { PipelineSupervisorConfig } from './__types__/index.js'

export type { CircuitBreakerStatus } from '@repo/orchestrator'

/**
 * Container for per-graph circuit breaker instances.
 * Created once per supervisor config.
 */
export interface GraphCircuitBreakers {
  elaboration: NodeCircuitBreaker
  storyCreation: NodeCircuitBreaker
  implementation: NodeCircuitBreaker
  review: NodeCircuitBreaker
  qa: NodeCircuitBreaker
}

/**
 * Create per-graph NodeCircuitBreaker instances with the given config.
 *
 * Phase 0 defaults: failureThreshold: 3, recoveryTimeoutMs: 30000
 * (lower than NodeCircuitBreaker defaults to fail faster in Phase 0)
 *
 * @param config - Supervisor configuration containing circuit breaker settings
 */
export function createCircuitBreakers(
  config: Pick<
    PipelineSupervisorConfig,
    'circuitBreakerFailureThreshold' | 'circuitBreakerRecoveryTimeoutMs'
  >,
): GraphCircuitBreakers {
  const cbConfig = {
    failureThreshold: config.circuitBreakerFailureThreshold,
    recoveryTimeoutMs: config.circuitBreakerRecoveryTimeoutMs,
  }

  return {
    elaboration: new NodeCircuitBreaker(cbConfig),
    storyCreation: new NodeCircuitBreaker(cbConfig),
    implementation: new NodeCircuitBreaker(cbConfig),
    review: new NodeCircuitBreaker(cbConfig),
    qa: new NodeCircuitBreaker(cbConfig),
  }
}

/**
 * Module-level singleton circuit breakers.
 * Lazily initialized on first use so tests can create fresh instances.
 */
let _circuitBreakers: GraphCircuitBreakers | null = null

/**
 * Get or create singleton circuit breaker instances.
 * Useful for the standalone process — tests should use createCircuitBreakers() directly.
 */
export function getCircuitBreakers(
  config: Pick<
    PipelineSupervisorConfig,
    'circuitBreakerFailureThreshold' | 'circuitBreakerRecoveryTimeoutMs'
  >,
): GraphCircuitBreakers {
  if (!_circuitBreakers) {
    _circuitBreakers = createCircuitBreakers(config)
  }
  return _circuitBreakers
}

/**
 * Reset the module-level singleton (for testing only).
 */
export function resetCircuitBreakers(): void {
  _circuitBreakers = null
}
