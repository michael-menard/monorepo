import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTimeoutSignal,
  createTimeoutController,
  withTimeout,
  combineSignals,
  TimeoutError,
  isTimeoutError,
  isAbortError,
} from '../timeout/index.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Timeout Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTimeoutSignal', () => {
    it('should create an AbortSignal that aborts after timeout', async () => {
      const signal = createTimeoutSignal(50)

      expect(signal.aborted).toBe(false)

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(signal.aborted).toBe(true)
    })
  })

  describe('createTimeoutController', () => {
    it('should create a controller with signal and cleanup', () => {
      const { controller, signal, cleanup } = createTimeoutController(1000)

      expect(controller).toBeInstanceOf(AbortController)
      expect(signal).toBe(controller.signal)
      expect(typeof cleanup).toBe('function')

      // Cleanup should not throw
      cleanup()
    })

    it('should allow manual abort before timeout', () => {
      const { controller, signal, cleanup } = createTimeoutController(10000)

      controller.abort()
      expect(signal.aborted).toBe(true)

      cleanup()
    })
  })

  describe('withTimeout', () => {
    it('should complete operation within timeout', async () => {
      const operation = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'success'
      })

      const result = await withTimeout(operation, 1000, 'test-op')
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should throw TimeoutError when operation exceeds timeout', async () => {
      const operation = vi.fn().mockImplementation(async (signal: AbortSignal) => {
        // Simulate an operation that respects the abort signal
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => resolve('success'), 200)
          signal.addEventListener('abort', () => {
            clearTimeout(timeout)
            reject(signal.reason)
          })
        })
      })

      await expect(withTimeout(operation, 50, 'slow-op')).rejects.toThrow(TimeoutError)
    })

    it('should pass AbortSignal to operation', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      await withTimeout(operation, 1000)

      expect(operation).toHaveBeenCalledTimes(1)
      const signal = operation.mock.calls[0][0]
      expect(signal).toBeInstanceOf(AbortSignal)
    })

    it('should re-throw non-timeout errors', async () => {
      const customError = new Error('Custom error')
      const operation = vi.fn().mockRejectedValue(customError)

      await expect(withTimeout(operation, 1000)).rejects.toThrow('Custom error')
    })
  })

  describe('combineSignals', () => {
    it('should abort when any signal aborts', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const combined = combineSignals([controller1.signal, controller2.signal])

      expect(combined.aborted).toBe(false)

      controller1.abort()

      expect(combined.aborted).toBe(true)
    })

    it('should be immediately aborted if any input is already aborted', () => {
      const controller1 = new AbortController()
      controller1.abort()

      const controller2 = new AbortController()

      const combined = combineSignals([controller1.signal, controller2.signal])

      expect(combined.aborted).toBe(true)
    })
  })

  describe('TimeoutError', () => {
    it('should contain timeout metadata', () => {
      const error = new TimeoutError('Timed out', 5000, 'my-operation')

      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('Timed out')
      expect(error.timeoutMs).toBe(5000)
      expect(error.operationName).toBe('my-operation')
    })
  })

  describe('isTimeoutError', () => {
    it('should return true for TimeoutError', () => {
      const error = new TimeoutError('Timed out', 5000)
      expect(isTimeoutError(error)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error = new Error('Not a timeout')
      expect(isTimeoutError(error)).toBe(false)
    })
  })

  describe('isAbortError', () => {
    it('should return true for AbortError DOMException', () => {
      const error = new DOMException('Aborted', 'AbortError')
      expect(isAbortError(error)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error = new Error('Not an abort')
      expect(isAbortError(error)).toBe(false)
    })
  })
})
