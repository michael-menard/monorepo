import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  OllamaSemaphore,
  isOllamaModel,
  withOllamaSemaphore,
  resetOllamaSemaphore,
} from '../ollama-semaphore.js'

// Suppress logger output in tests
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('OllamaSemaphore', () => {
  beforeEach(() => {
    resetOllamaSemaphore()
  })

  describe('acquire/release', () => {
    it('acquires immediately when permit available', async () => {
      const sem = new OllamaSemaphore()
      await sem.acquire()
      expect(sem.availablePermits).toBe(0)
    })

    it('release restores permit when no waiters', () => {
      const sem = new OllamaSemaphore()
      // Start with 1 permit, acquire it
      sem.acquire()
      expect(sem.availablePermits).toBe(0)

      sem.release()
      expect(sem.availablePermits).toBe(1)
    })

    it('does not exceed capacity on extra release', () => {
      const sem = new OllamaSemaphore({ capacity: 1 })
      sem.release()
      sem.release()
      expect(sem.availablePermits).toBe(1)
    })

    it('blocks second acquire until first releases', async () => {
      const sem = new OllamaSemaphore()
      const order: string[] = []

      await sem.acquire()
      order.push('first-acquired')

      const secondPromise = sem.acquire().then(() => {
        order.push('second-acquired')
      })

      // Second should be queued
      expect(sem.queueLength).toBe(1)

      // Let microtasks run — second should still be waiting
      await new Promise(r => setTimeout(r, 10))
      expect(order).toEqual(['first-acquired'])

      // Release first
      sem.release()
      await secondPromise

      expect(order).toEqual(['first-acquired', 'second-acquired'])
      expect(sem.queueLength).toBe(0)
    })

    it('serves queued waiters in FIFO order', async () => {
      const sem = new OllamaSemaphore()
      const order: number[] = []

      await sem.acquire()

      const p1 = sem.acquire().then(() => order.push(1))
      const p2 = sem.acquire().then(() => order.push(2))
      const p3 = sem.acquire().then(() => order.push(3))

      expect(sem.queueLength).toBe(3)

      // Release one at a time
      sem.release()
      await p1
      expect(order).toEqual([1])

      sem.release()
      await p2
      expect(order).toEqual([1, 2])

      sem.release()
      await p3
      expect(order).toEqual([1, 2, 3])
    })
  })

  describe('timeout', () => {
    it('rejects after timeout expires', async () => {
      const sem = new OllamaSemaphore({ timeoutMs: 50 })
      await sem.acquire() // take the only permit

      await expect(sem.acquire()).rejects.toThrow('timed out after 50ms')
      expect(sem.queueLength).toBe(0)
    })

    it('clears timeout when released before expiry', async () => {
      const sem = new OllamaSemaphore({ timeoutMs: 5000 })
      await sem.acquire()

      const acquirePromise = sem.acquire()

      // Release before timeout
      sem.release()
      await acquirePromise // should resolve, not reject

      expect(sem.queueLength).toBe(0)
    })

    it('allows no timeout with timeoutMs: 0', async () => {
      const sem = new OllamaSemaphore({ timeoutMs: 0 })
      await sem.acquire()

      // With timeout 0, it queues indefinitely — release to unblock
      const p = sem.acquire()
      sem.release()
      await p

      expect(sem.availablePermits).toBe(0)
    })
  })

  describe('drain', () => {
    it('rejects all queued waiters', async () => {
      const sem = new OllamaSemaphore()
      await sem.acquire()

      const p1 = sem.acquire()
      const p2 = sem.acquire()

      expect(sem.queueLength).toBe(2)

      sem.drain()

      await expect(p1).rejects.toThrow('drained during shutdown')
      await expect(p2).rejects.toThrow('drained during shutdown')
      expect(sem.queueLength).toBe(0)
      expect(sem.availablePermits).toBe(1)
    })
  })
})

describe('isOllamaModel', () => {
  it('returns true for ollama: prefix', () => {
    expect(isOllamaModel('ollama:qwen2.5-coder:14b')).toBe(true)
    expect(isOllamaModel('ollama:deepseek-coder-v2:33b')).toBe(true)
    expect(isOllamaModel('ollama:llama3.2:8b')).toBe(true)
  })

  it('returns true for ollama/ prefix', () => {
    expect(isOllamaModel('ollama/qwen2.5-coder:14b')).toBe(true)
  })

  it('returns false for non-ollama providers', () => {
    expect(isOllamaModel('minimax/abab6')).toBe(false)
    expect(isOllamaModel('openrouter/anthropic/claude-3-haiku')).toBe(false)
    expect(isOllamaModel('anthropic/claude-3-sonnet')).toBe(false)
    expect(isOllamaModel('claude-code/sonnet')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isOllamaModel('OLLAMA:qwen')).toBe(true)
    expect(isOllamaModel('Ollama:qwen')).toBe(true)
  })
})

describe('withOllamaSemaphore', () => {
  it('acquires and releases for ollama models', async () => {
    const sem = new OllamaSemaphore()

    const result = await withOllamaSemaphore(sem, 'ollama:qwen2.5-coder:14b', async () => {
      expect(sem.availablePermits).toBe(0)
      return 42
    })

    expect(result).toBe(42)
    expect(sem.availablePermits).toBe(1)
  })

  it('releases on error', async () => {
    const sem = new OllamaSemaphore()

    await expect(
      withOllamaSemaphore(sem, 'ollama:qwen', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(sem.availablePermits).toBe(1)
  })

  it('bypasses semaphore for non-ollama models', async () => {
    const sem = new OllamaSemaphore()
    // Take the permit so ollama would block
    await sem.acquire()
    expect(sem.availablePermits).toBe(0)

    // Non-ollama should execute immediately despite no permits
    const result = await withOllamaSemaphore(sem, 'minimax/abab6', async () => 'done')
    expect(result).toBe('done')

    // Permit still held
    expect(sem.availablePermits).toBe(0)
    sem.release()
  })

  it('bypasses for claude-code models', async () => {
    const sem = new OllamaSemaphore()
    await sem.acquire()

    const result = await withOllamaSemaphore(sem, 'claude-code/sonnet', async () => 'ok')
    expect(result).toBe('ok')
    sem.release()
  })
})
