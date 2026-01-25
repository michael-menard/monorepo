/**
 * Node-local circuit breaker implementation.
 *
 * AC-21: Circuit breaker pattern with failureThreshold and recoveryTimeoutMs.
 * The circuit breaker prevents execution when too many failures occur,
 * allowing the system to recover gracefully.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests are blocked
 * - HALF_OPEN: Testing recovery, allows one request through
 */

import { CircuitBreakerConfig, DEFAULT_CIRCUIT_BREAKER_CONFIG } from './types.js'

/**
 * Circuit breaker state.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

/**
 * Circuit breaker status information.
 */
export interface CircuitBreakerStatus {
  /** Current circuit state */
  state: CircuitState
  /** Number of consecutive failures */
  failures: number
  /** Timestamp of last failure (ms since epoch) */
  lastFailureTime: number
  /** Time remaining until recovery attempt (ms), or 0 if not in OPEN state */
  timeUntilRecovery: number
}

/**
 * Node-local circuit breaker.
 * Each node instance has its own circuit breaker.
 *
 * Adapted from @repo/api-client CircuitBreaker pattern.
 */
export class NodeCircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: CircuitState = 'CLOSED'
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config }
  }

  /**
   * Check if the circuit breaker allows execution.
   *
   * @returns true if execution is allowed
   */
  canExecute(): boolean {
    const now = Date.now()

    switch (this.state) {
      case 'CLOSED':
        return true

      case 'OPEN':
        // Check if recovery timeout has elapsed
        if (now - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
          this.state = 'HALF_OPEN'
          return true
        }
        return false

      case 'HALF_OPEN':
        // Allow one request to test recovery
        return true

      default:
        return true
    }
  }

  /**
   * Record a successful execution.
   * Resets failure count and closes the circuit.
   */
  recordSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  /**
   * Record a failed execution.
   * Increments failure count and may open the circuit.
   */
  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    // Open circuit if threshold exceeded
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN'
    } else if (this.state === 'HALF_OPEN') {
      // Failed during recovery, back to OPEN
      this.state = 'OPEN'
    }
  }

  /**
   * Get current circuit breaker status.
   */
  getStatus(): CircuitBreakerStatus {
    const now = Date.now()
    let timeUntilRecovery = 0

    if (this.state === 'OPEN') {
      const elapsed = now - this.lastFailureTime
      timeUntilRecovery = Math.max(0, this.config.recoveryTimeoutMs - elapsed)
    }

    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      timeUntilRecovery,
    }
  }

  /**
   * Get current circuit state.
   */
  getState(): CircuitState {
    // Re-check in case recovery timeout has elapsed
    if (this.state === 'OPEN') {
      const now = Date.now()
      if (now - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN'
      }
    }
    return this.state
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  reset(): void {
    this.failures = 0
    this.lastFailureTime = 0
    this.state = 'CLOSED'
  }

  /**
   * Get the configuration.
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.config }
  }
}
