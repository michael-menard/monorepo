/**
 * Unit Tests for Retry Utility
 *
 * Tests exponential backoff, jitter, retry logic, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, createRetryWrapper } from '../retry'
import {
  ValidationError,
  ThrottlingError,
  ServiceUnavailableError,
  DatabaseError,
} from '@/core/utils/responses'

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Successful operations', () => {
    it('should return result on first attempt if operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const promise = retryWithBackoff(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should succeed on second attempt after one failure', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ThrottlingError('S3', 'Throttled'))
        .mockResolvedValueOnce('success')

      const promise = retryWithBackoff(operation, { baseDelay: 100 })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should succeed on third attempt after two failures', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new ServiceUnavailableError('Redis down'))
        .mockRejectedValueOnce(new ServiceUnavailableError('Redis down'))
        .mockResolvedValueOnce('success')

      const promise = retryWithBackoff(operation, { maxAttempts: 3 })
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })
  })

  describe('Non-retryable errors', () => {
    it('should fail immediately on ValidationError (not retryable)', async () => {
      const error = new ValidationError('Invalid email')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation)

      await expect(promise).rejects.toThrow(ValidationError)
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should fail immediately on non-retryable DatabaseError', async () => {
      const error = new DatabaseError('Syntax error', undefined, false) // isRetryable = false
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation)

      await expect(promise).rejects.toThrow(DatabaseError)
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('Retryable errors - exhaustion', () => {
    it('should exhaust retries and throw last error', async () => {
      const error = new ThrottlingError('S3', 'Throttled')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation, { maxAttempts: 3 })

      // Run timers in background while we await
      const timerPromise = vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(ThrottlingError)
      await timerPromise

      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should respect custom maxAttempts', async () => {
      const error = new ServiceUnavailableError('Service down')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation, { maxAttempts: 5 })

      const timerPromise = vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(ServiceUnavailableError)
      await timerPromise

      expect(operation).toHaveBeenCalledTimes(5)
    })
  })

  describe('Exponential backoff timing', () => {
    it('should wait with exponential backoff between retries', async () => {
      const error = new ThrottlingError('S3', 'Throttled')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation, {
        maxAttempts: 3,
        baseDelay: 100,
        exponentialBase: 2,
        jitter: false, // Disable jitter for predictable testing
      })

      // Attach error handler immediately to prevent unhandled rejection
      const promiseResult = promise.catch((err) => err)

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(operation).toHaveBeenCalledTimes(1)

      // Wait for first retry delay: 100ms * 2^(1-1) = 100ms
      await vi.advanceTimersByTimeAsync(100)
      expect(operation).toHaveBeenCalledTimes(2)

      // Wait for second retry delay: 100ms * 2^(2-1) = 200ms
      await vi.advanceTimersByTimeAsync(200)
      expect(operation).toHaveBeenCalledTimes(3)

      // Now await the promise and verify the error
      const result = await promiseResult
      expect(result).toBeInstanceOf(ThrottlingError)
    })

    it('should respect maxDelay cap', async () => {
      const error = new ServiceUnavailableError('Service down')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation, {
        maxAttempts: 4,
        baseDelay: 1000,
        exponentialBase: 10,
        maxDelay: 2000,
        jitter: false,
      })

      // Attach error handler immediately to prevent unhandled rejection
      const promiseResult = promise.catch((err) => err)

      await vi.advanceTimersByTimeAsync(0)
      expect(operation).toHaveBeenCalledTimes(1)

      // First retry: 1000ms * 10^0 = 1000ms (under cap)
      await vi.advanceTimersByTimeAsync(1000)
      expect(operation).toHaveBeenCalledTimes(2)

      // Second retry: would be 10000ms, capped at 2000ms
      await vi.advanceTimersByTimeAsync(2000)
      expect(operation).toHaveBeenCalledTimes(3)

      // Third retry: still capped at 2000ms
      await vi.advanceTimersByTimeAsync(2000)
      expect(operation).toHaveBeenCalledTimes(4)

      // Now await the promise and verify the error
      const result = await promiseResult
      expect(result).toBeInstanceOf(ServiceUnavailableError)
    })
  })

  describe('Jitter', () => {
    it('should apply jitter when enabled', async () => {
      const error = new ThrottlingError('S3', 'Throttled')
      const operation = vi.fn().mockRejectedValue(error)

      // Run multiple times to verify jitter randomness
      const delays: number[] = []

      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        const promise = retryWithBackoff(operation, {
          maxAttempts: 2,
          baseDelay: 1000,
          jitter: true,
        })

        const timerPromise = vi.runAllTimersAsync()

        // Catch and ignore the error
        await promise.catch(() => {})
        await timerPromise

        const endTime = Date.now()
        delays.push(endTime - startTime)

        operation.mockClear()
        vi.clearAllTimers()
      }

      // With jitter, delays should vary (not all the same)
      const uniqueDelays = new Set(delays)
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  describe('Standard Error retry patterns', () => {
    it('should retry on timeout errors', async () => {
      const error = new Error('ETIMEDOUT: connection timeout')
      const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success')

      const promise = retryWithBackoff(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should retry on network errors', async () => {
      const error = new Error('ECONNRESET: network error')
      const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success')

      const promise = retryWithBackoff(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on generic Error without retryable pattern', async () => {
      const error = new Error('Some unknown error')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation)

      await expect(promise).rejects.toThrow('Some unknown error')
      expect(operation).toHaveBeenCalledTimes(1)
    })
  })

  describe('createRetryWrapper', () => {
    it('should create pre-configured retry wrapper', async () => {
      const retryS3 = createRetryWrapper({
        maxAttempts: 3,
        baseDelay: 500,
        context: 'S3',
      })

      const operation = vi.fn().mockResolvedValue('uploaded')

      const promise = retryS3(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('uploaded')
    })

    it('should allow override options in wrapper', async () => {
      const retryS3 = createRetryWrapper({
        maxAttempts: 3,
        baseDelay: 100,
      })

      const error = new ThrottlingError('S3', 'Throttled')
      const operation = vi.fn().mockRejectedValue(error)

      // Override maxAttempts to 5
      const promise = retryS3(operation, { maxAttempts: 5 })

      const timerPromise = vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(ThrottlingError)
      await timerPromise

      expect(operation).toHaveBeenCalledTimes(5)
    })
  })

  describe('Edge cases', () => {
    it('should handle operation that throws non-Error', async () => {
      const operation = vi.fn().mockRejectedValue('string error')

      const promise = retryWithBackoff(operation)

      await expect(promise).rejects.toBe('string error')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should handle maxAttempts of 1 (no retries)', async () => {
      const error = new ThrottlingError('S3', 'Throttled')
      const operation = vi.fn().mockRejectedValue(error)

      const promise = retryWithBackoff(operation, { maxAttempts: 1 })

      const timerPromise = vi.runAllTimersAsync()

      await expect(promise).rejects.toThrow(ThrottlingError)
      await timerPromise

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should handle retryable DatabaseError', async () => {
      const error = new DatabaseError('Connection timeout', undefined, true)
      const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success')

      const promise = retryWithBackoff(operation)
      await vi.runAllTimersAsync()
      const result = await promise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })
})
