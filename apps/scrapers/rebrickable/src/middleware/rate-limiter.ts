import { logger } from '@repo/logger'
import { RateLimiterConfigSchema } from '../__types__/index.js'
import type { RateLimiterConfig } from '../__types__/index.js'

export class TokenBucketRateLimiter {
  private tokens: number
  private lastRefill: number
  private readonly config: RateLimiterConfig
  private requestCount = 0

  constructor(config?: Partial<RateLimiterConfig>) {
    this.config = RateLimiterConfigSchema.parse(config || {})
    this.tokens = this.config.burstSize
    this.lastRefill = Date.now()
  }

  private refillTokens(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = (elapsed / 60000) * this.config.requestsPerMinute
    this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  private addJitter(delayMs: number): number {
    const jitterRange = delayMs * this.config.jitter
    const jitter = (Math.random() * 2 - 1) * jitterRange
    return Math.max(0, delayMs + jitter)
  }

  async acquire(): Promise<void> {
    this.refillTokens()

    if (this.tokens >= 1) {
      this.tokens -= 1
      this.requestCount++

      // Still respect minimum delay
      const delay = this.addJitter(this.config.minDelayMs)
      if (delay > 0) {
        await sleep(delay)
      }
      return
    }

    // No tokens available — wait for refill
    const msPerToken = 60000 / this.config.requestsPerMinute
    const waitTime = this.addJitter(msPerToken)
    logger.info(`[rate-limiter] Throttling — waiting ${Math.round(waitTime)}ms`)
    await sleep(waitTime)

    this.tokens = 0
    this.requestCount++
  }

  getRequestCount(): number {
    return this.requestCount
  }

  getAvailableTokens(): number {
    this.refillTokens()
    return this.tokens
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
