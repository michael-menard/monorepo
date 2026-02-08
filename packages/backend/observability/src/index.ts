/**
 * @repo/observability
 *
 * Observability infrastructure for distributed tracing and metrics.
 * Provides OpenTelemetry integration and Prometheus metrics collection.
 *
 * @example
 * ```typescript
 * import {
 *   initializeTracing,
 *   createTracingMiddleware,
 *   createMetricsEndpoint,
 *   createHttpMetricsMiddleware,
 * } from '@repo/observability'
 *
 * // Initialize at startup
 * initializeTracing({ serviceName: 'lego-api' })
 *
 * // Add middleware
 * const app = new Hono()
 * app.use('*', createTracingMiddleware({ serviceName: 'lego-api' }))
 * app.use('*', createHttpMetricsMiddleware())
 * app.get('/metrics', createMetricsEndpoint())
 * ```
 */

// Tracing
export {
  initializeTracing,
  getTracer,
  withSpan,
  getCurrentSpan,
  addSpanAttributes,
  recordSpanError,
  extractTraceContext,
  injectTraceContext,
  // OpenTelemetry re-exports
  SpanStatusCode,
  trace,
  context,
  propagation,
  // Types
  type Tracer,
  type Span,
  type SpanOptions,
  type Context,
  type TracingConfig,
  type TracingInput,
  type HttpSpanAttributes,
  type DbSpanAttributes,
  // Schemas
  TracingConfigSchema,
  HttpSpanAttributesSchema,
  DbSpanAttributesSchema,
} from './tracing/index.js'

// Tracing Middleware
export {
  createTracingMiddleware,
  createTraceHeaderMiddleware,
  createRequestSpan,
  type TracingMiddlewareConfig,
} from './tracing/hono-middleware.js'

// Metrics
export {
  createMetricsRegistry,
  getMetrics,
  createMetricsEndpoint,
  createHttpMetricsMiddleware,
  updateCircuitBreakerMetrics,
  updateDbPoolMetrics,
  observeDbQueryDuration,
  // Types
  type MetricsCollectors,
  type MetricsConfig,
  type MetricsInput,
  type HttpMetricLabels,
  type CircuitBreakerMetricLabels,
  type DbMetricLabels,
  // Schemas
  MetricsConfigSchema,
  HttpMetricLabelsSchema,
  CircuitBreakerMetricLabelsSchema,
  DbMetricLabelsSchema,
} from './metrics/index.js'
