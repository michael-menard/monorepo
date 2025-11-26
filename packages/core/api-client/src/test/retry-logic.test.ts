/**
 * Enhanced Retry Logic Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withRetry,
  withPriorityRetry,
  withBatchRetry,
  CircuitBreaker,
  calculateRetryDelay,
  isRetryableError,
  getRetryMetrics,
  resetRetryMetrics,
  getCircuitBreakerStates,
  resetAllCircuitBreakers,
  getRetrySystemHealth,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../retry/retry-logic'

describe('Enhanced Retry Logic', () => {
  beforeEach(() => {
    resetRetryMetrics()
    resetAllCircuitBreakers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('CircuitBreaker', () => {
    it('should allow requests when circuit is closed', () => {
      const breaker = new CircuitBreaker()
      expect(breaker.canExecute()).toBe(true)
      expect(breaker.getState().state).toBe('CLOSED')
    })

    it('should open circuit after failure threshold', () => {
      const breaker = new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 2 })
      
      // First failure
      breaker.recordFailure()
      expect(breaker.canExecute()).toBe(true)
      expect(breaker.getState().state).toBe('CLOSED')
      
      // Second failure - should open circuit
      breaker.recordFailure()
      expect(breaker.canExecute()).toBe(false)
      expect(breaker.getState().state).toBe('OPEN')
    })

    it('should transition to half-open after recovery timeout', async () => {
      const breaker = new CircuitBreaker({ 
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG, 
        failureThreshold: 1,
        recoveryTimeout: 100 
      })
      
      // Trigger circuit open
      breaker.recordFailure()
      expect(breaker.canExecute()).toBe(false)
      
      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(breaker.canExecute()).toBe(true)
      expect(breaker.getState().state).toBe('HALF_OPEN')
    })

    it('should close circuit on successful execution in half-open state', async () => {
      const breaker = new CircuitBreaker({ 
        ...DEFAULT_CIRCUIT_BREAKER_CONFIG, 
        failureThreshold: 1,
        recoveryTimeout: 100 
      })
      
      // Open circuit
      breaker.recordFailure()
      
      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Record success
      breaker.recordSuccess()
      expect(breaker.getState().state).toBe('CLOSED')
      expect(breaker.getState().failures).toBe(0)
    })
  })

  describe('Enhanced Retry Delay Calculation', () => {
    it('should apply cold start multiplier', () => {
      const errorInfo = { isRetryable: true, isColdStart: true, isTimeout: false, statusCode: 502, message: 'Cold start' }
      const config = { ...DEFAULT_RETRY_CONFIG, coldStartMultiplier: 2.0 }
      
      const delay = calculateRetryDelay(1, errorInfo, config)
      const normalDelay = calculateRetryDelay(1, { ...errorInfo, isColdStart: false }, config)
      
      expect(delay).toBeGreaterThan(normalDelay)
    })

    it('should apply timeout multiplier', () => {
      const errorInfo = { isRetryable: true, isColdStart: false, isTimeout: true, statusCode: 504, message: 'Timeout' }
      const config = { ...DEFAULT_RETRY_CONFIG, timeoutMultiplier: 3.0 }
      
      const delay = calculateRetryDelay(1, errorInfo, config)
      const normalDelay = calculateRetryDelay(1, { ...errorInfo, isTimeout: false }, config)
      
      expect(delay).toBeGreaterThan(normalDelay)
    })

    it('should apply both multipliers when both conditions are true', () => {
      const errorInfo = { isRetryable: true, isColdStart: true, isTimeout: true, statusCode: 504, message: 'Cold start timeout' }
      const config = { ...DEFAULT_RETRY_CONFIG, coldStartMultiplier: 1.5, timeoutMultiplier: 2.0 }
      
      const delay = calculateRetryDelay(1, errorInfo, config)
      const normalDelay = calculateRetryDelay(1, { ...errorInfo, isColdStart: false, isTimeout: false }, config)
      
      expect(delay).toBeGreaterThan(normalDelay * 2.5) // Should be roughly 1.5 * 2.0 * normal
    })
  })

  describe('Enhanced withRetry', () => {
    it('should respect circuit breaker', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Service unavailable'))
      
      // Configure with low failure threshold
      const config = { 
        ...DEFAULT_RETRY_CONFIG, 
        maxAttempts: 1,
        circuitBreakerEnabled: true 
      }
      
      // First call should fail and open circuit
      await expect(withRetry(operation, config, 'test-endpoint')).rejects.toThrow()
      
      // Trigger more failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await withRetry(operation, config, 'test-endpoint')
        } catch (e) {
          // Expected to fail
        }
      }
      
      // Next call should be blocked by circuit breaker
      await expect(withRetry(operation, config, 'test-endpoint')).rejects.toThrow('Circuit breaker is OPEN')
    })

    it('should track retry metrics', async () => {
      const retryableError = { status: 500, message: 'Internal Server Error' }
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('success')

      await withRetry(operation, { maxAttempts: 3 })

      const metrics = getRetryMetrics()
      expect(metrics.totalAttempts).toBe(2)
      expect(metrics.successfulAttempts).toBe(1)
      expect(metrics.failedAttempts).toBe(1)
    })

    it('should track cold start and timeout retries', async () => {
      resetRetryMetrics() // Reset before this test

      const coldStartError = { status: 502, message: 'Cold start' }
      const timeoutError = { status: 504, message: 'Timeout' }

      const operation1 = vi.fn().mockRejectedValue(coldStartError)
      const operation2 = vi.fn().mockRejectedValue(timeoutError)

      // Use maxAttempts: 1 to avoid retries, just track the error types
      try { await withRetry(operation1, { maxAttempts: 1 }, 'cold-start-test') } catch (e) {}

      const metricsAfterColdStart = getRetryMetrics()
      expect(metricsAfterColdStart.coldStartRetries).toBe(1)

      try { await withRetry(operation2, { maxAttempts: 1 }, 'timeout-test') } catch (e) {}

      const finalMetrics = getRetryMetrics()
      expect(finalMetrics.timeoutRetries).toBe(1)
    })
  })

  describe('Priority Retry', () => {
    it('should use different retry configs based on priority', async () => {
      vi.useFakeTimers()

      const retryableError = { status: 500, message: 'Server Error' }
      const operation = vi.fn().mockRejectedValue(retryableError)

      // Critical priority should have more attempts
      const criticalPromise = withPriorityRetry(operation, 'critical', {}, 'test').catch(() => {})
      await vi.runAllTimersAsync()
      await criticalPromise

      // Should have made 5 attempts (critical default)
      expect(operation).toHaveBeenCalledTimes(5)

      operation.mockClear()

      // Low priority should have fewer attempts
      const lowPromise = withPriorityRetry(operation, 'low', {}, 'test').catch(() => {})
      await vi.runAllTimersAsync()
      await lowPromise

      // Should have made 2 attempts (low default)
      expect(operation).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('Batch Retry', () => {
    it('should process operations in batches with concurrency control', async () => {
      const operations = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockRejectedValue(new Error('failure')),
        vi.fn().mockResolvedValue('result4'),
      ]
      
      const results = await withBatchRetry(operations, {}, 2)
      
      expect(results).toHaveLength(4)
      expect(results[0]).toBe('result1')
      expect(results[1]).toBe('result2')
      expect(results[2]).toBeInstanceOf(Error)
      expect(results[3]).toBe('result4')
    })
  })

  describe('System Health', () => {
    it('should report healthy status with good metrics', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      // Generate some successful operations
      for (let i = 0; i < 10; i++) {
        await withRetry(operation)
      }
      
      const health = getRetrySystemHealth()
      expect(health.status).toBe('healthy')
      expect(health.recommendations).toHaveLength(0)
    })

    it('should report unhealthy status with poor success rate', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Failure'))
      
      // Generate failures
      for (let i = 0; i < 10; i++) {
        try {
          await withRetry(operation, { maxAttempts: 1 })
        } catch (e) {}
      }
      
      const health = getRetrySystemHealth()
      expect(health.status).toBe('unhealthy')
      expect(health.recommendations.length).toBeGreaterThan(0)
    })
  })
})
