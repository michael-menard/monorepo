import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeCancellationError, NodeTimeoutError } from '../errors.js'
import { createNodeExecutionContext } from '../types.js'
import { createTimeoutController, withTimeout, withTimeoutResult } from '../timeout.js'

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful execution', () => {
    it('returns result when operation completes before timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'success'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
      })

      vi.advanceTimersByTime(100)
      const result = await promise

      expect(result).toBe('success')
    })

    it('resolves immediately for sync operations', async () => {
      const operation = async () => 'immediate'

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
      })

      const result = await promise

      expect(result).toBe('immediate')
    })
  })

  describe('timeout handling', () => {
    it('throws NodeTimeoutError when operation times out', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return 'never'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
      })

      vi.advanceTimersByTime(1000)

      await expect(promise).rejects.toThrow(NodeTimeoutError)
    })

    it('includes correct timeout value in error', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return 'never'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 5000,
        nodeName: 'test-node',
      })

      vi.advanceTimersByTime(5000)

      try {
        await promise
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(NodeTimeoutError)
        expect((error as NodeTimeoutError).timeoutMs).toBe(5000)
        expect((error as NodeTimeoutError).nodeName).toBe('test-node')
      }
    })

    it('calls onTimeout callback when timeout occurs', async () => {
      const onTimeout = vi.fn()
      const context = createNodeExecutionContext({ storyId: 'wrkf-1020' })

      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return 'never'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
        onTimeout,
        context,
      })

      vi.advanceTimersByTime(1000)

      await expect(promise).rejects.toThrow(NodeTimeoutError)
      expect(onTimeout).toHaveBeenCalledWith('test-node', context)
    })

    it('does not call onTimeout if operation completes', async () => {
      const onTimeout = vi.fn()
      const context = createNodeExecutionContext({ storyId: 'wrkf-1020' })

      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'success'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
        onTimeout,
        context,
      })

      vi.advanceTimersByTime(100)
      await promise

      expect(onTimeout).not.toHaveBeenCalled()
    })
  })

  describe('AbortSignal handling', () => {
    it('throws NodeCancellationError when signal is already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const operation = async () => 'never'

      await expect(
        withTimeout(operation, {
          timeoutMs: 1000,
          nodeName: 'test-node',
          signal: controller.signal,
        }),
      ).rejects.toThrow(NodeCancellationError)
    })

    it('throws NodeCancellationError when signal is aborted during execution', async () => {
      const controller = new AbortController()

      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000))
        return 'never'
      }

      const promise = withTimeout(operation, {
        timeoutMs: 5000,
        nodeName: 'test-node',
        signal: controller.signal,
      })

      // Abort after 500ms
      setTimeout(() => controller.abort(), 500)
      vi.advanceTimersByTime(500)

      await expect(promise).rejects.toThrow(NodeCancellationError)
    })

    it('includes node name in cancellation error', async () => {
      const controller = new AbortController()
      controller.abort()

      const operation = async () => 'never'

      try {
        await withTimeout(operation, {
          timeoutMs: 1000,
          nodeName: 'my-special-node',
          signal: controller.signal,
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(NodeCancellationError)
        expect((error as NodeCancellationError).nodeName).toBe('my-special-node')
      }
    })
  })

  describe('error propagation', () => {
    it('propagates operation errors', async () => {
      const operation = async () => {
        throw new Error('Operation failed')
      }

      await expect(
        withTimeout(operation, {
          timeoutMs: 1000,
          nodeName: 'test-node',
        }),
      ).rejects.toThrow('Operation failed')
    })

    it('does not trigger timeout after error', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        throw new Error('Operation failed')
      }

      const promise = withTimeout(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
      })

      vi.advanceTimersByTime(100)

      await expect(promise).rejects.toThrow('Operation failed')

      // Advance past timeout - should not throw additional error
      vi.advanceTimersByTime(2000)
    })
  })
})

describe('withTimeoutResult', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns success result when operation completes', async () => {
    const operation = async () => 'success'

    const result = await withTimeoutResult(operation, {
      timeoutMs: 1000,
      nodeName: 'test-node',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.value).toBe('success')
    }
  })

  it('returns failure result with NodeTimeoutError on timeout', async () => {
    const operation = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return 'never'
    }

    const promise = withTimeoutResult(operation, {
      timeoutMs: 1000,
      nodeName: 'test-node',
    })

    vi.advanceTimersByTime(1000)
    const result = await promise

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(NodeTimeoutError)
    }
  })

  it('returns failure result with NodeCancellationError on abort', async () => {
    const controller = new AbortController()
    controller.abort()

    const operation = async () => 'never'

    const result = await withTimeoutResult(operation, {
      timeoutMs: 1000,
      nodeName: 'test-node',
      signal: controller.signal,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeInstanceOf(NodeCancellationError)
    }
  })

  it('throws non-timeout/cancellation errors', async () => {
    const operation = async () => {
      throw new Error('Regular error')
    }

    await expect(
      withTimeoutResult(operation, {
        timeoutMs: 1000,
        nodeName: 'test-node',
      }),
    ).rejects.toThrow('Regular error')
  })
})

describe('createTimeoutController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls callback after timeout', () => {
    const callback = vi.fn()
    const controller = createTimeoutController(1000)

    controller.start(callback)

    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('can be cleared before timeout', () => {
    const callback = vi.fn()
    const controller = createTimeoutController(1000)

    controller.start(callback)
    controller.clear()

    vi.advanceTimersByTime(2000)
    expect(callback).not.toHaveBeenCalled()
  })

  it('can extend timeout', () => {
    const callback = vi.fn()
    const controller = createTimeoutController(1000)

    controller.start(callback)
    vi.advanceTimersByTime(500)
    controller.extend(1000)

    vi.advanceTimersByTime(500)
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(callback).toHaveBeenCalledOnce()
  })
})
