/**
 * @repo/resilience - Rate Limiter Types
 *
 * Zod schemas for rate limiter configuration.
 */

import { z } from 'zod'

/**
 * Configuration for Bottleneck rate limiter
 */
export const RateLimiterConfigSchema = z.object({
  /** Unique name for this rate limiter (used for logging) */
  name: z.string().min(1),

  /** Maximum concurrent requests (default: null = unlimited) */
  maxConcurrent: z.number().positive().nullable().default(null),

  /** Minimum time between requests in ms (default: 0) */
  minTime: z.number().min(0).default(0),

  /** Number of requests available in the reservoir (default: null = unlimited) */
  reservoir: z.number().positive().nullable().default(null),

  /** Number of requests to add when refreshing reservoir */
  reservoirRefreshAmount: z.number().positive().nullable().default(null),

  /** Interval in ms to refresh reservoir (default: null = no refresh) */
  reservoirRefreshInterval: z.number().positive().nullable().default(null),

  /** Whether to enable rate limiting (allows runtime disable) */
  enabled: z.boolean().default(true),

  /** Maximum queue length before rejecting (default: null = unlimited) */
  highWater: z.number().positive().nullable().default(null),

  /** Strategy when highWater is reached: 'leak' or 'block' */
  strategy: z.enum(['leak', 'block']).default('block'),
})

export type RateLimiterConfig = z.infer<typeof RateLimiterConfigSchema>

/**
 * Input type for creating rate limiter (before defaults applied)
 */
export type RateLimiterInput = z.input<typeof RateLimiterConfigSchema>

/**
 * Rate limiter status for monitoring
 */
export const RateLimiterStatusSchema = z.object({
  name: z.string(),
  running: z.number(),
  queued: z.number(),
  done: z.number(),
  reservoir: z.number().nullable(),
})

export type RateLimiterStatus = z.infer<typeof RateLimiterStatusSchema>

/**
 * Preset rate limiter configurations for common services
 */
export const RateLimiterPresetsSchema = z.object({
  /** OpenAI API: 60 RPM (requests per minute) */
  openai: RateLimiterConfigSchema,

  /** AWS services: 100 concurrent, 10ms between requests */
  aws: RateLimiterConfigSchema,

  /** Database: 50 concurrent connections */
  database: RateLimiterConfigSchema,

  /** Strict: 10 RPM for sensitive operations */
  strict: RateLimiterConfigSchema,

  /** Lenient: 120 RPM for low-impact operations */
  lenient: RateLimiterConfigSchema,
})

export type RateLimiterPresets = z.infer<typeof RateLimiterPresetsSchema>
