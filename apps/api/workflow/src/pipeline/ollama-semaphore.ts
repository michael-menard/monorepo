/**
 * Ollama Concurrency Semaphore
 *
 * Capacity-1 semaphore that prevents concurrent Ollama model loading.
 * Only one Ollama model can be loaded at a time — concurrent requests
 * queue in FIFO order and wait for the current holder to release.
 *
 * Non-Ollama providers (openrouter, anthropic, minimax) bypass the
 * semaphore entirely.
 *
 * @module pipeline/ollama-semaphore
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Configuration
// ============================================================================

export const OllamaSemaphoreConfigSchema = z.object({
  /** Maximum concurrent Ollama invocations (default: 1) */
  capacity: z.number().int().min(1).default(1),
  /** Timeout in ms waiting to acquire (default: 5 minutes) */
  timeoutMs: z
    .number()
    .int()
    .min(0)
    .default(5 * 60 * 1000),
})

export type OllamaSemaphoreConfig = z.infer<typeof OllamaSemaphoreConfigSchema>

// ============================================================================
// Semaphore
// ============================================================================

type QueueEntry = {
  resolve: () => void
  reject: (err: Error) => void
  timer: ReturnType<typeof setTimeout> | null
}

export class OllamaSemaphore {
  private readonly capacity: number
  private readonly timeoutMs: number
  private permits: number
  private readonly queue: QueueEntry[] = []

  constructor(config?: Partial<OllamaSemaphoreConfig>) {
    const validated = OllamaSemaphoreConfigSchema.parse(config ?? {})
    this.capacity = validated.capacity
    this.timeoutMs = validated.timeoutMs
    this.permits = validated.capacity
  }

  /**
   * Acquire a permit. Blocks (async) until one is available or timeout fires.
   *
   * @throws Error if timeout expires before a permit becomes available
   */
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      logger.debug('ollama-semaphore: acquired immediately', {
        remainingPermits: this.permits,
        queueLength: this.queue.length,
      })
      return
    }

    // No permit available — queue and wait
    return new Promise<void>((resolve, reject) => {
      const entry: QueueEntry = { resolve, reject, timer: null }

      if (this.timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          // Remove from queue
          const idx = this.queue.indexOf(entry)
          if (idx !== -1) {
            this.queue.splice(idx, 1)
          }
          reject(
            new Error(
              `OllamaSemaphore: timed out after ${this.timeoutMs}ms waiting for permit ` +
                `(${this.queue.length} still queued)`,
            ),
          )
        }, this.timeoutMs)
      }

      this.queue.push(entry)
      logger.debug('ollama-semaphore: queued', {
        queuePosition: this.queue.length,
        timeoutMs: this.timeoutMs,
      })
    })
  }

  /**
   * Release a permit. Wakes the next queued waiter (FIFO).
   */
  release(): void {
    const next = this.queue.shift()
    if (next) {
      // Clear timeout for the waiter we're unblocking
      if (next.timer) {
        clearTimeout(next.timer)
      }
      logger.debug('ollama-semaphore: released to queued waiter', {
        remainingQueue: this.queue.length,
      })
      next.resolve()
    } else {
      this.permits = Math.min(this.permits + 1, this.capacity)
      logger.debug('ollama-semaphore: released (no waiters)', {
        remainingPermits: this.permits,
      })
    }
  }

  /**
   * Current number of available permits.
   */
  get availablePermits(): number {
    return this.permits
  }

  /**
   * Number of waiters currently queued.
   */
  get queueLength(): number {
    return this.queue.length
  }

  /**
   * Drain all queued waiters with a rejection error.
   * Used during shutdown to prevent hanging promises.
   */
  drain(): void {
    while (this.queue.length > 0) {
      const entry = this.queue.shift()!
      if (entry.timer) clearTimeout(entry.timer)
      entry.reject(new Error('OllamaSemaphore: drained during shutdown'))
    }
    this.permits = this.capacity
  }
}

// ============================================================================
// Provider-Aware Helper
// ============================================================================

/**
 * Check if a model string resolves to the Ollama provider.
 *
 * @param modelString - Model identifier (e.g., 'ollama:qwen2.5-coder:14b', 'minimax/abab6')
 * @returns true if the model uses Ollama
 */
export function isOllamaModel(modelString: string): boolean {
  const provider = modelString.split(/[:/]/)[0]?.toLowerCase()
  return provider === 'ollama'
}

/**
 * Execute a function with Ollama semaphore protection.
 * Acquires the semaphore before execution and releases after,
 * regardless of success or failure.
 *
 * For non-Ollama models, executes directly without semaphore.
 *
 * @param semaphore - The OllamaSemaphore instance
 * @param modelString - Model identifier to check provider
 * @param fn - The function to execute under semaphore protection
 * @returns The result of fn()
 */
export async function withOllamaSemaphore<T>(
  semaphore: OllamaSemaphore,
  modelString: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!isOllamaModel(modelString)) {
    return fn()
  }

  await semaphore.acquire()
  try {
    return await fn()
  } finally {
    semaphore.release()
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _instance: OllamaSemaphore | null = null

/**
 * Get or create the global OllamaSemaphore singleton.
 */
export function getOllamaSemaphore(config?: Partial<OllamaSemaphoreConfig>): OllamaSemaphore {
  if (!_instance) {
    _instance = new OllamaSemaphore(config)
  }
  return _instance
}

/**
 * Reset the singleton (for testing).
 */
export function resetOllamaSemaphore(): void {
  if (_instance) {
    _instance.drain()
    _instance = null
  }
}
