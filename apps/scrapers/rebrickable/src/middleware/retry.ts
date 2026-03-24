import { logger } from '@repo/logger'
import { RetryConfigSchema } from '../__types__/index.js'
import type { RetryConfig } from '../__types__/index.js'

export class RetryHandler {
  private readonly config: RetryConfig

  constructor(config?: Partial<RetryConfig>) {
    this.config = RetryConfigSchema.parse(config || {})
  }

  async execute<T>(
    fn: () => Promise<T>,
    label = 'operation',
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        if (attempt === this.config.maxRetries) {
          break
        }

        const action = this.getRetryAction(lastError)
        if (action === 'abort') {
          logger.error(`[retry] Non-retryable error for ${label}: ${lastError.message}`)
          throw lastError
        }

        const delay = this.calculateDelay(attempt, action)
        logger.warn(
          `[retry] ${label} attempt ${attempt + 1}/${this.config.maxRetries} failed, retrying in ${Math.round(delay)}ms`,
          { error: lastError.message },
        )
        await sleep(delay)
      }
    }

    throw lastError!
  }

  private getRetryAction(error: Error): 'retry' | 'backoff_long' | 'reauth' | 'abort' {
    const message = error.message.toLowerCase()

    // HTTP 429 — long backoff
    if (message.includes('429') || message.includes('too many requests')) {
      return 'backoff_long'
    }

    // HTTP 503 — service unavailable
    if (message.includes('503') || message.includes('service unavailable')) {
      return 'retry'
    }

    // HTTP 403 — may need re-auth
    if (message.includes('403') || message.includes('forbidden')) {
      return 'reauth'
    }

    // Network errors — retryable
    if (
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('socket hang up')
    ) {
      return 'retry'
    }

    // HTTP 4xx (non-429/403) — don't retry
    if (message.includes('400') || message.includes('404') || message.includes('401')) {
      return 'abort'
    }

    return 'retry'
  }

  private calculateDelay(attempt: number, action: string): number {
    let baseDelay: number

    if (action === 'backoff_long') {
      baseDelay = 30000 * Math.pow(this.config.backoffFactor, attempt)
    } else {
      baseDelay = this.config.baseDelayMs * Math.pow(this.config.backoffFactor, attempt)
    }

    const delay = Math.min(baseDelay, this.config.maxDelayMs)

    // Add jitter (+-30%)
    const jitter = delay * 0.3 * (Math.random() * 2 - 1)
    return Math.max(0, delay + jitter)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
