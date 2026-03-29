import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeCircuitBreaker, type CircuitState } from '../circuit-breaker.js'

describe('NodeCircuitBreaker', () => {
  let breaker: NodeCircuitBreaker

  beforeEach(() => {
    vi.useFakeTimers()
    breaker = new NodeCircuitBreaker()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('allows execution in initial state', () => {
      expect(breaker.canExecute()).toBe(true)
    })

    it('has zero failures initially', () => {
      const status = breaker.getStatus()
      expect(status.failures).toBe(0)
      expect(status.lastFailureTime).toBe(0)
    })
  })

  describe('configuration', () => {
    it('uses default config when not provided', () => {
      const config = breaker.getConfig()
      expect(config.failureThreshold).toBe(5)
      expect(config.recoveryTimeoutMs).toBe(60000)
    })

    it('uses custom config when provided', () => {
      const customBreaker = new NodeCircuitBreaker({
        failureThreshold: 3,
        recoveryTimeoutMs: 30000,
      })
      const config = customBreaker.getConfig()
      expect(config.failureThreshold).toBe(3)
      expect(config.recoveryTimeoutMs).toBe(30000)
    })
  })

  describe('failure recording', () => {
    it('increments failure count on failure', () => {
      breaker.recordFailure()
      expect(breaker.getStatus().failures).toBe(1)

      breaker.recordFailure()
      expect(breaker.getStatus().failures).toBe(2)
    })

    it('stays CLOSED below failure threshold', () => {
      for (let i = 0; i < 4; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('CLOSED')
      expect(breaker.canExecute()).toBe(true)
    })

    it('opens circuit at failure threshold', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('OPEN')
      expect(breaker.canExecute()).toBe(false)
    })

    it('records last failure time', () => {
      const now = Date.now()
      breaker.recordFailure()
      expect(breaker.getStatus().lastFailureTime).toBe(now)
    })
  })

  describe('success recording', () => {
    it('resets failure count on success', () => {
      breaker.recordFailure()
      breaker.recordFailure()
      expect(breaker.getStatus().failures).toBe(2)

      breaker.recordSuccess()
      expect(breaker.getStatus().failures).toBe(0)
    })

    it('closes circuit on success', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('OPEN')

      // Wait for recovery
      vi.advanceTimersByTime(60000)

      // Should be HALF_OPEN now
      expect(breaker.canExecute()).toBe(true)
      expect(breaker.getState()).toBe('HALF_OPEN')

      // Record success
      breaker.recordSuccess()
      expect(breaker.getState()).toBe('CLOSED')
    })
  })

  describe('OPEN state', () => {
    beforeEach(() => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
    })

    it('blocks execution in OPEN state', () => {
      expect(breaker.getState()).toBe('OPEN')
      expect(breaker.canExecute()).toBe(false)
    })

    it('reports time until recovery', () => {
      const status = breaker.getStatus()
      expect(status.timeUntilRecovery).toBe(60000)

      vi.advanceTimersByTime(30000)
      const status2 = breaker.getStatus()
      expect(status2.timeUntilRecovery).toBe(30000)
    })

    it('transitions to HALF_OPEN after recovery timeout', () => {
      expect(breaker.getState()).toBe('OPEN')

      vi.advanceTimersByTime(60000)

      expect(breaker.canExecute()).toBe(true)
      expect(breaker.getState()).toBe('HALF_OPEN')
    })
  })

  describe('HALF_OPEN state', () => {
    beforeEach(() => {
      // Open the circuit and wait for recovery
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      vi.advanceTimersByTime(60000)
      // This should transition to HALF_OPEN
      breaker.canExecute()
    })

    it('allows one request in HALF_OPEN state', () => {
      expect(breaker.getState()).toBe('HALF_OPEN')
      expect(breaker.canExecute()).toBe(true)
    })

    it('closes circuit on success in HALF_OPEN', () => {
      expect(breaker.getState()).toBe('HALF_OPEN')
      breaker.recordSuccess()
      expect(breaker.getState()).toBe('CLOSED')
    })

    it('reopens circuit on failure in HALF_OPEN', () => {
      expect(breaker.getState()).toBe('HALF_OPEN')
      breaker.recordFailure()
      expect(breaker.getState()).toBe('OPEN')
    })
  })

  describe('reset', () => {
    it('resets to CLOSED state', () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }
      expect(breaker.getState()).toBe('OPEN')

      breaker.reset()

      expect(breaker.getState()).toBe('CLOSED')
      expect(breaker.getStatus().failures).toBe(0)
      expect(breaker.getStatus().lastFailureTime).toBe(0)
    })
  })

  describe('getStatus', () => {
    it('returns complete status information', () => {
      breaker.recordFailure()
      breaker.recordFailure()

      const status = breaker.getStatus()

      expect(status.state).toBe('CLOSED')
      expect(status.failures).toBe(2)
      expect(status.lastFailureTime).toBeGreaterThan(0)
      expect(status.timeUntilRecovery).toBe(0)
    })

    it('includes recovery time when OPEN', () => {
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure()
      }

      const status = breaker.getStatus()

      expect(status.state).toBe('OPEN')
      expect(status.timeUntilRecovery).toBe(60000)
    })
  })

  describe('custom threshold', () => {
    it('respects custom failure threshold', () => {
      const customBreaker = new NodeCircuitBreaker({ failureThreshold: 2 })

      customBreaker.recordFailure()
      expect(customBreaker.getState()).toBe('CLOSED')

      customBreaker.recordFailure()
      expect(customBreaker.getState()).toBe('OPEN')
    })

    it('respects custom recovery timeout', () => {
      const customBreaker = new NodeCircuitBreaker({
        failureThreshold: 2,
        recoveryTimeoutMs: 10000,
      })

      // Open the circuit
      customBreaker.recordFailure()
      customBreaker.recordFailure()
      expect(customBreaker.getState()).toBe('OPEN')

      // Wait less than recovery timeout
      vi.advanceTimersByTime(5000)
      expect(customBreaker.canExecute()).toBe(false)

      // Wait for full recovery timeout
      vi.advanceTimersByTime(5000)
      expect(customBreaker.canExecute()).toBe(true)
      expect(customBreaker.getState()).toBe('HALF_OPEN')
    })
  })
})
