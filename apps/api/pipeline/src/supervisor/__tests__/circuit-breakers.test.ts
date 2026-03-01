/**
 * Unit tests for per-graph circuit breaker instances.
 *
 * AC-10e: Circuit open → delayed re-queue path.
 * AC-14: NodeCircuitBreaker imported from @repo/orchestrator — not re-implemented.
 *
 * Tests the circuit breaker state transitions as used by the supervisor.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NodeCircuitBreaker } from '@repo/orchestrator'
import {
  createCircuitBreakers,
  resetCircuitBreakers,
  getCircuitBreakers,
} from '../graph-circuit-breakers.js'

describe('createCircuitBreakers', () => {
  beforeEach(() => {
    resetCircuitBreakers()
  })

  afterEach(() => {
    resetCircuitBreakers()
  })

  it('creates separate circuit breaker instances for elaboration and storyCreation', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers = createCircuitBreakers(config)

    expect(breakers.elaboration).toBeInstanceOf(NodeCircuitBreaker)
    expect(breakers.storyCreation).toBeInstanceOf(NodeCircuitBreaker)
    expect(breakers.elaboration).not.toBe(breakers.storyCreation)
  })

  it('applies the provided failure threshold', () => {
    const config = { circuitBreakerFailureThreshold: 2, circuitBreakerRecoveryTimeoutMs: 5_000 }
    const breakers = createCircuitBreakers(config)

    // Initially CLOSED
    expect(breakers.elaboration.canExecute()).toBe(true)

    // Trip circuit with failures up to threshold
    breakers.elaboration.recordFailure()
    expect(breakers.elaboration.canExecute()).toBe(true) // still CLOSED (1 < 2)

    breakers.elaboration.recordFailure()
    expect(breakers.elaboration.canExecute()).toBe(false) // OPEN (2 >= 2)
  })

  it('circuit breakers start CLOSED and allow execution', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers = createCircuitBreakers(config)

    expect(breakers.elaboration.canExecute()).toBe(true)
    expect(breakers.storyCreation.canExecute()).toBe(true)
  })

  it('circuit transitions CLOSED → OPEN after failureThreshold failures', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers = createCircuitBreakers(config)

    breakers.elaboration.recordFailure()
    breakers.elaboration.recordFailure()
    expect(breakers.elaboration.canExecute()).toBe(true) // still CLOSED

    breakers.elaboration.recordFailure() // third failure
    expect(breakers.elaboration.canExecute()).toBe(false) // OPEN
    expect(breakers.elaboration.getState()).toBe('OPEN')
  })

  it('circuit transitions OPEN → HALF_OPEN after recovery timeout', () => {
    vi.useFakeTimers()

    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 1_000 }
    const breakers = createCircuitBreakers(config)

    // Trip the circuit
    breakers.elaboration.recordFailure()
    breakers.elaboration.recordFailure()
    breakers.elaboration.recordFailure()
    expect(breakers.elaboration.getState()).toBe('OPEN')

    // Advance time past recovery timeout
    vi.advanceTimersByTime(1_001)

    // canExecute() transitions to HALF_OPEN
    expect(breakers.elaboration.canExecute()).toBe(true)
    expect(breakers.elaboration.getState()).toBe('HALF_OPEN')

    vi.useRealTimers()
  })

  it('circuit resets to CLOSED on success', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers = createCircuitBreakers(config)

    breakers.elaboration.recordFailure()
    breakers.elaboration.recordFailure()
    breakers.elaboration.recordSuccess()

    // After success, circuit resets
    expect(breakers.elaboration.getState()).toBe('CLOSED')
    expect(breakers.elaboration.canExecute()).toBe(true)
  })

  it('elaboration and storyCreation circuits are independent', () => {
    const config = { circuitBreakerFailureThreshold: 2, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers = createCircuitBreakers(config)

    // Trip only elaboration
    breakers.elaboration.recordFailure()
    breakers.elaboration.recordFailure()

    expect(breakers.elaboration.canExecute()).toBe(false) // OPEN
    expect(breakers.storyCreation.canExecute()).toBe(true) // CLOSED — unaffected
  })
})

describe('getCircuitBreakers singleton', () => {
  beforeEach(() => {
    resetCircuitBreakers()
  })

  afterEach(() => {
    resetCircuitBreakers()
  })

  it('returns the same instance on subsequent calls (singleton)', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers1 = getCircuitBreakers(config)
    const breakers2 = getCircuitBreakers(config)

    expect(breakers1.elaboration).toBe(breakers2.elaboration)
    expect(breakers1.storyCreation).toBe(breakers2.storyCreation)
  })

  it('resets state on resetCircuitBreakers()', () => {
    const config = { circuitBreakerFailureThreshold: 3, circuitBreakerRecoveryTimeoutMs: 30_000 }
    const breakers1 = getCircuitBreakers(config)

    resetCircuitBreakers()

    const breakers2 = getCircuitBreakers(config)
    expect(breakers1.elaboration).not.toBe(breakers2.elaboration)
  })
})
