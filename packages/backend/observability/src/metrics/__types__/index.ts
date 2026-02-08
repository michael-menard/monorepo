/**
 * @repo/observability - Metrics Types
 *
 * Zod schemas for Prometheus metrics configuration.
 */

import { z } from 'zod'

/**
 * Metrics configuration.
 */
export const MetricsConfigSchema = z.object({
  /** Prefix for all metric names */
  prefix: z.string().default('app'),

  /** Default labels to add to all metrics */
  defaultLabels: z.record(z.string()).default({}),

  /** Whether to collect default Node.js metrics */
  collectDefaultMetrics: z.boolean().default(true),

  /** Interval for collecting default metrics (ms) */
  collectInterval: z.number().positive().default(10000),

  /** Whether metrics are enabled */
  enabled: z.boolean().default(true),
})

export type MetricsConfig = z.infer<typeof MetricsConfigSchema>
export type MetricsInput = z.input<typeof MetricsConfigSchema>

/**
 * HTTP metrics labels.
 */
export const HttpMetricLabelsSchema = z.object({
  method: z.string(),
  route: z.string(),
  status: z.string(),
})

export type HttpMetricLabels = z.infer<typeof HttpMetricLabelsSchema>

/**
 * Circuit breaker metrics labels.
 */
export const CircuitBreakerMetricLabelsSchema = z.object({
  name: z.string(),
  state: z.enum(['closed', 'open', 'half_open']),
})

export type CircuitBreakerMetricLabels = z.infer<typeof CircuitBreakerMetricLabelsSchema>

/**
 * Database metrics labels.
 */
export const DbMetricLabelsSchema = z.object({
  database: z.string(),
  operation: z.string().optional(),
})

export type DbMetricLabels = z.infer<typeof DbMetricLabelsSchema>
