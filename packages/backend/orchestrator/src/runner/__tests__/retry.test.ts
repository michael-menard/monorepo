import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { NodeRetryExhaustedError, NodeTimeoutError } from '../errors.js'
import { DEFAULT_RETRY_CONFIG } from '../types.js'
import {
  calculateRetryDelay,
  createRetryWrapper,
  withNodeRetry,
  wouldRetry,
} from '../retry.js'

describe('calculateRetryDelay', () => {
  it('calculates base delay for first attempt', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 }
    expect(calculateRetryDelay(1, config)).toBe(1000)
  })

  it('applies exponential backoff', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 }
    expect(calculateRetryDelay(1, config)).toBe(1000)
    expect(calculateRetryDelay(2, config)).toBe(2000)
    expect(calculateRetryDelay(3, config)).toBe(4000)
    expect(calculateRetryDelay(4, config)).toBe(8000)
  })

  it('respects maxBackoffMs cap', () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      jitterFactor: 0,
      backoffMs: 1000,
      backoffMultiplier: 10,
      maxBackoffMs: 5000,
    }
    expect(calculateRetryDelay(3, config)).toBe(5000) // Would be 100000 without cap
  })

  it('applies jitter within expected range', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0.25 }

    // Run multiple times to verify jitter is applied
    const delays = new Set<number>()
    for (let i = 0; i < 100; i++) {
      delays.add(calculateRetryDelay(1, config))
    }

    // With jitter, we should get varying delays
    expect(delays.size).toBeGreaterThan(1)

    // All delays should be within expected range (1000 to 1250)
    for (const delay of delays) {
      expect(delay).toBeGreaterThanOrEqual(1000)
      expect(delay).toBeLessThanOrEqual(1250)
    }
  })

  it('returns integer delays', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0.25 }
    for (let i = 0; i < 10; i++) {
      const delay = calculateRetryDelay(1, config)
      expect(Number.isInteger(delay)).toBe(true)
    }
  })

  it('handles zero jitter', () => {
    const config = { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 }
    const delay1 = calculateRetryDelay(1, config)
    const delay2 = calculateRetryDelay(1, config)
    expect(delay1).toBe(delay2)
  })
})

describe('withNodeRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful execution', () => {
    it('returns result on first attempt success', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await withNodeRetry(operation, {
        config: DEFAULT_RETRY_CONFIG,
        nodeName: 'test-node',
      })

      expect(result.value).toBe('success')
      expect(result.attempts).toBe(1)
      expect(result.errors).toHaveLength(0)
      expect(operation).toHaveBeenCalledOnce()
    })

    it('returns result after retry success', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
      })

      // Advance through retries
      await vi.advanceTimersByTimeAsync(1000) // First retry delay
      await vi.advanceTimersByTimeAsync(2000) // Second retry delay

      const result = await promise

      expect(result.value).toBe('success')
      expect(result.attempts).toBe(3)
      expect(result.errors).toHaveLength(2)
    })
  })

  describe('retry exhaustion', () => {
    it('throws NodeRetryExhaustedError after all attempts fail', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

      // Don't create the promise before we're ready to handle it
      // Instead, run the operation and collect results after timers advance
      let error: Error | undefined
      const runOperation = async () => {
        try {
          await withNodeRetry(operation, {
            config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 3, jitterFactor: 0 },
            nodeName: 'test-node',
          })
        } catch (e) {
          error = e as Error
        }
      }

      const promise = runOperation()

      // Advance through all retries
      await vi.advanceTimersByTimeAsync(1000) // First retry
      await vi.advanceTimersByTimeAsync(2000) // Second retry
      await promise

      expect(error).toBeInstanceOf(NodeRetryExhaustedError)
    })

    it('includes correct attempt count in exhausted error', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

      let error: NodeRetryExhaustedError | undefined
      const runOperation = async () => {
        try {
          await withNodeRetry(operation, {
            config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2, jitterFactor: 0 },
            nodeName: 'test-node',
          })
        } catch (e) {
          error = e as NodeRetryExhaustedError
        }
      }

      const promise = runOperation()
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(error).toBeInstanceOf(NodeRetryExhaustedError)
      expect(error?.attempts).toBe(2)
      expect(error?.nodeName).toBe('test-node')
    })

    it('includes last error in exhausted error', async () => {
      const lastError = new Error('Last failure')
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValue(lastError)

      let error: NodeRetryExhaustedError | undefined
      const runOperation = async () => {
        try {
          await withNodeRetry(operation, {
            config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2, jitterFactor: 0 },
            nodeName: 'test-node',
          })
        } catch (e) {
          error = e as NodeRetryExhaustedError
        }
      }

      const promise = runOperation()
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(error?.lastError).toBe(lastError)
    })
  })

  describe('non-retryable errors', () => {
    it('does not retry ZodError', async () => {
      const zodError = new ZodError([])
      const operation = vi.fn().mockRejectedValue(zodError)

      await expect(
        withNodeRetry(operation, {
          config: DEFAULT_RETRY_CONFIG,
          nodeName: 'test-node',
        }),
      ).rejects.toThrow(NodeRetryExhaustedError)

      expect(operation).toHaveBeenCalledOnce()
    })

    it('does not retry TypeError', async () => {
      const typeError = new TypeError('Cannot read property')
      const operation = vi.fn().mockRejectedValue(typeError)

      await expect(
        withNodeRetry(operation, {
          config: DEFAULT_RETRY_CONFIG,
          nodeName: 'test-node',
        }),
      ).rejects.toThrow(NodeRetryExhaustedError)

      expect(operation).toHaveBeenCalledOnce()
    })
  })

  describe('retryable errors', () => {
    it('retries NodeTimeoutError', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new NodeTimeoutError('test', 1000))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
      })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.value).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('retries network errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
      })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.value).toBe('success')
    })
  })

  describe('onRetryAttempt callback', () => {
    it('calls onRetryAttempt before each retry', async () => {
      const onRetryAttempt = vi.fn()
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
        onRetryAttempt,
      })

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await promise

      expect(onRetryAttempt).toHaveBeenCalledTimes(2)
      expect(onRetryAttempt).toHaveBeenNthCalledWith(1, 1, expect.any(Error), 1000)
      expect(onRetryAttempt).toHaveBeenNthCalledWith(2, 2, expect.any(Error), 2000)
    })

    it('continues even if callback throws', async () => {
      const onRetryAttempt = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
        onRetryAttempt,
      })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await promise

      expect(result.value).toBe('success')
    })
  })

  describe('totalDelayMs tracking', () => {
    it('tracks total delay time', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const promise = withNodeRetry(operation, {
        config: { ...DEFAULT_RETRY_CONFIG, jitterFactor: 0 },
        nodeName: 'test-node',
      })

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      const result = await promise

      expect(result.totalDelayMs).toBe(3000) // 1000 + 2000
    })
  })
})

describe('createRetryWrapper', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates reusable retry wrapper', async () => {
    const retryWithDefaults = createRetryWrapper({
      nodeName: 'default-node',
      config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2, jitterFactor: 0 },
    })

    const operation = vi.fn().mockResolvedValue('success')
    const result = await retryWithDefaults(operation)

    expect(result.value).toBe('success')
  })

  it('allows overriding defaults', async () => {
    const retryWithDefaults = createRetryWrapper({
      nodeName: 'default-node',
      config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 1, jitterFactor: 0 },
    })

    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success')

    const promise = retryWithDefaults(operation, {
      config: { ...DEFAULT_RETRY_CONFIG, maxAttempts: 2, jitterFactor: 0 },
    })

    await vi.advanceTimersByTimeAsync(1000)
    const result = await promise

    expect(result.value).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })
})

describe('wouldRetry', () => {
  it('returns true for retryable errors', () => {
    expect(wouldRetry(new NodeTimeoutError('test', 1000))).toBe(true)
    expect(wouldRetry(new Error('ECONNREFUSED'))).toBe(true)
    expect(wouldRetry(new Error('Rate limit exceeded'))).toBe(true)
  })

  it('returns false for non-retryable errors', () => {
    expect(wouldRetry(new ZodError([]))).toBe(false)
    expect(wouldRetry(new TypeError('test'))).toBe(false)
    expect(wouldRetry(new ReferenceError('test'))).toBe(false)
  })
})
