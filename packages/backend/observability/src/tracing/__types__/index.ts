/**
 * @repo/observability - Tracing Types
 *
 * Zod schemas for OpenTelemetry tracing configuration.
 */

import { z } from 'zod'

/**
 * OpenTelemetry tracing configuration.
 */
export const TracingConfigSchema = z.object({
  /** Service name for traces (e.g., 'lego-api') */
  serviceName: z.string().min(1),

  /** Service version (e.g., '1.0.0') */
  serviceVersion: z.string().optional(),

  /** Environment name (e.g., 'development', 'production') */
  environment: z.string().default('development'),

  /** Whether tracing is enabled */
  enabled: z.boolean().default(true),

  /** OTLP exporter endpoint (e.g., 'http://localhost:4317') */
  otlpEndpoint: z.string().url().optional(),

  /** Port for Prometheus metrics endpoint */
  metricsPort: z.number().positive().default(9464),

  /** Sample rate for traces (0.0 to 1.0) */
  sampleRate: z.number().min(0).max(1).default(1.0),

  /** Whether to enable auto-instrumentation */
  autoInstrumentation: z.boolean().default(true),

  /** Specific instrumentations to enable */
  instrumentations: z.object({
    http: z.boolean().default(true),
    pg: z.boolean().default(true),
    redis: z.boolean().default(true),
    fetch: z.boolean().default(true),
  }).default({}),
})

export type TracingConfig = z.infer<typeof TracingConfigSchema>
export type TracingInput = z.input<typeof TracingConfigSchema>

/**
 * Span attributes for HTTP requests.
 */
export const HttpSpanAttributesSchema = z.object({
  'http.method': z.string(),
  'http.url': z.string(),
  'http.route': z.string().optional(),
  'http.status_code': z.number().optional(),
  'http.request_content_length': z.number().optional(),
  'http.response_content_length': z.number().optional(),
  'user.id': z.string().optional(),
})

export type HttpSpanAttributes = z.infer<typeof HttpSpanAttributesSchema>

/**
 * Span attributes for database queries.
 */
export const DbSpanAttributesSchema = z.object({
  'db.system': z.string(),
  'db.name': z.string().optional(),
  'db.statement': z.string().optional(),
  'db.operation': z.string().optional(),
})

export type DbSpanAttributes = z.infer<typeof DbSpanAttributesSchema>
