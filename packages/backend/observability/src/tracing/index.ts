/**
 * @repo/observability - OpenTelemetry Tracing
 *
 * Initializes OpenTelemetry SDK with auto-instrumentation.
 * Exports traces to OTLP collector and exposes Prometheus metrics.
 */

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api'
import type { Tracer, Span, SpanOptions, Context } from '@opentelemetry/api'
import { logger } from '@repo/logger'

import { TracingConfigSchema, type TracingConfig, type TracingInput } from './__types__/index.js'

export * from './__types__/index.js'

let sdkInstance: NodeSDK | null = null

/**
 * Initializes OpenTelemetry tracing.
 * Should be called once at application startup.
 *
 * @param config - Tracing configuration
 * @returns NodeSDK instance (for shutdown)
 *
 * @example
 * ```typescript
 * const sdk = initializeTracing({
 *   serviceName: 'lego-api',
 *   environment: 'production',
 * })
 *
 * // On shutdown
 * await sdk.shutdown()
 * ```
 */
export function initializeTracing(inputConfig: TracingInput): NodeSDK {
  const config = TracingConfigSchema.parse(inputConfig)

  if (!config.enabled) {
    logger.info('Tracing disabled')
    // Return a no-op SDK
    const noopSdk = new NodeSDK({
      serviceName: config.serviceName,
    })
    return noopSdk
  }

  if (sdkInstance) {
    logger.warn('Tracing already initialized, returning existing instance')
    return sdkInstance
  }

  logger.info('Initializing OpenTelemetry tracing', {
    serviceName: config.serviceName,
    environment: config.environment,
    metricsPort: config.metricsPort,
  })

  const sdk = new NodeSDK({
    serviceName: config.serviceName,
    // Prometheus exporter for metrics
    metricReader: new PrometheusExporter({
      port: config.metricsPort,
    }),
    // Auto-instrumentation for common libraries
    instrumentations: config.autoInstrumentation
      ? [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-http': {
              enabled: config.instrumentations.http,
            },
            '@opentelemetry/instrumentation-pg': {
              enabled: config.instrumentations.pg,
            },
            '@opentelemetry/instrumentation-ioredis': {
              enabled: config.instrumentations.redis,
            },
            // Note: fetch instrumentation uses undici under the hood in Node.js
            '@opentelemetry/instrumentation-undici': {
              enabled: config.instrumentations.fetch,
            },
          }),
        ]
      : [],
    // Resource attributes are set via OTEL_RESOURCE_ATTRIBUTES env var
    // or by using serviceName which creates a default resource
  })

  sdk.start()
  sdkInstance = sdk

  // Handle shutdown gracefully
  process.on('SIGTERM', () => {
    sdk.shutdown().then(
      () => logger.info('Tracing shutdown complete'),
      (err) => logger.error('Error shutting down tracing', { error: err }),
    )
  })

  return sdk
}

/**
 * Gets a tracer for creating custom spans.
 *
 * @param name - Tracer name (usually module/component name)
 * @returns OpenTelemetry Tracer
 */
export function getTracer(name: string): Tracer {
  return trace.getTracer(name)
}

/**
 * Creates a span and executes an operation within it.
 *
 * @param name - Span name
 * @param operation - Async operation to trace
 * @param options - Optional span options
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await withSpan('processOrder', async (span) => {
 *   span.setAttribute('order.id', orderId)
 *   return await processOrder(orderId)
 * })
 * ```
 */
export async function withSpan<T>(
  name: string,
  operation: (span: Span) => Promise<T>,
  options?: SpanOptions & { tracer?: string },
): Promise<T> {
  const tracer = getTracer(options?.tracer ?? 'default')
  const span = tracer.startSpan(name, options)

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () =>
      operation(span),
    )
    span.setStatus({ code: SpanStatusCode.OK })
    return result
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    span.recordException(error as Error)
    throw error
  } finally {
    span.end()
  }
}

/**
 * Gets the current active span (if any).
 */
export function getCurrentSpan(): Span | undefined {
  return trace.getActiveSpan()
}

/**
 * Adds attributes to the current span.
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = getCurrentSpan()
  if (span) {
    span.setAttributes(attributes)
  }
}

/**
 * Records an error on the current span.
 */
export function recordSpanError(error: Error): void {
  const span = getCurrentSpan()
  if (span) {
    span.recordException(error)
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    })
  }
}

/**
 * Extracts trace context from headers (for distributed tracing).
 */
export function extractTraceContext(
  headers: Record<string, string | string[] | undefined>,
): Context {
  return propagation.extract(context.active(), headers)
}

/**
 * Injects trace context into headers (for outgoing requests).
 */
export function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers)
}

// Re-export commonly used OpenTelemetry types
export { SpanStatusCode, trace, context, propagation }
export type { Tracer, Span, SpanOptions, Context }
