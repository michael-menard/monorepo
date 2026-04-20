/**
 * Circuit Breaker
 *
 * Pauses a BullMQ queue when a scraper detects rate limiting.
 * Resumes after a cooldown period (parsed from page or default).
 * State is stored in Redis for API visibility.
 */

import type { Queue } from 'bullmq'
import type Redis from 'ioredis'
import { logger } from '@repo/logger'

const REDIS_PREFIX = 'circuit-breaker:'
const DEFAULT_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

export interface CircuitBreakerState {
  isOpen: boolean
  queueName: string
  trippedAt: string | null
  resumesAt: string | null
  reason: string | null
}

export class CircuitBreaker {
  private timers = new Map<string, NodeJS.Timeout>()

  constructor(private redis: Redis) {}

  /**
   * Trip the circuit breaker for a queue.
   * Pauses the queue and schedules a resume after cooldown.
   */
  async trip(
    queue: Queue,
    reason: string,
    cooldownMs: number = DEFAULT_COOLDOWN_MS,
  ): Promise<void> {
    const queueName = queue.name
    const now = new Date()
    const resumesAt = new Date(now.getTime() + cooldownMs)

    logger.warn(`Circuit breaker tripped for ${queueName}`, {
      reason,
      cooldownMs,
      resumesAt: resumesAt.toISOString(),
    })

    // Store state in Redis
    await this.redis.set(
      `${REDIS_PREFIX}${queueName}`,
      JSON.stringify({
        isOpen: true,
        queueName,
        trippedAt: now.toISOString(),
        resumesAt: resumesAt.toISOString(),
        reason,
      }),
      'PX',
      cooldownMs + 60000, // TTL slightly longer than cooldown
    )

    // Pause the queue
    await queue.pause()

    // Clear any existing timer for this queue
    const existingTimer = this.timers.get(queueName)
    if (existingTimer) clearTimeout(existingTimer)

    // Schedule resume
    const timer = setTimeout(async () => {
      await this.reset(queue)
    }, cooldownMs)

    this.timers.set(queueName, timer)
  }

  /**
   * Reset the circuit breaker and resume the queue.
   */
  async reset(queue: Queue): Promise<void> {
    const queueName = queue.name

    logger.info(`Circuit breaker reset for ${queueName}`)

    await this.redis.del(`${REDIS_PREFIX}${queueName}`)
    await queue.resume()

    const timer = this.timers.get(queueName)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(queueName)
    }
  }

  /**
   * Get circuit breaker state for a queue.
   */
  async getState(queueName: string): Promise<CircuitBreakerState> {
    const raw = await this.redis.get(`${REDIS_PREFIX}${queueName}`)
    if (!raw) {
      return {
        isOpen: false,
        queueName,
        trippedAt: null,
        resumesAt: null,
        reason: null,
      }
    }
    return JSON.parse(raw)
  }

  /**
   * Get state for all queues.
   */
  async getAllStates(queueNames: string[]): Promise<CircuitBreakerState[]> {
    return Promise.all(queueNames.map(name => this.getState(name)))
  }

  /**
   * Clean up timers on shutdown.
   */
  destroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }
}
