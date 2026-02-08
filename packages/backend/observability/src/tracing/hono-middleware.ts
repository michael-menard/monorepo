/**
 * @repo/observability - Hono Tracing Middleware
 *
 * Middleware for Hono that creates spans for HTTP requests.
 * Integrates with OpenTelemetry for distributed tracing.
 */

import { trace, SpanStatusCode, context, propagation } from '@opentelemetry/api'
import type { MiddlewareHandler, Context as HonoContext } from 'hono'
import { logger } from '@repo/logger'

/**
 * Configuration for tracing middleware.
 */
export interface TracingMiddlewareConfig {
  /** Service name for the tracer */
  serviceName: string

  /** Routes to skip tracing (e.g., health checks) */
  skipRoutes?: string[]

  /** Whether to include request body in traces (careful with PII) */
  includeRequestBody?: boolean

  /** Whether to include response body in traces */
  includeResponseBody?: boolean

  /** Custom attribute extractor */
  extractAttributes?: (c: HonoContext) => Record<string, string | number | boolean>
}

/**
 * Creates a Hono middleware for tracing HTTP requests.
 *
 * @param config - Middleware configuration
 * @returns Hono MiddlewareHandler
 *
 * @example
 * ```typescript
 * import { createTracingMiddleware } from '@repo/observability'
 *
 * const app = new Hono()
 * app.use('*', createTracingMiddleware({ serviceName: 'lego-api' }))
 * ```
 */
export function createTracingMiddleware(config: TracingMiddlewareConfig): MiddlewareHandler {
  const tracer = trace.getTracer(config.serviceName)
  const skipRoutes = new Set(config.skipRoutes ?? ['/health', '/metrics', '/ready'])

  return async (c, next) => {
    // Skip tracing for certain routes
    const path = c.req.path
    if (skipRoutes.has(path)) {
      return next()
    }

    // Extract trace context from incoming headers
    const parentContext = propagation.extract(
      context.active(),
      Object.fromEntries(c.req.raw.headers),
    )

    // Create span name from method and route pattern
    const routePath = c.req.routePath || path
    const spanName = `${c.req.method} ${routePath}`

    // Start span within parent context
    return context.with(parentContext, async () => {
      const span = tracer.startSpan(spanName, {
        attributes: {
          'http.method': c.req.method,
          'http.url': c.req.url,
          'http.route': routePath,
          'http.scheme': new URL(c.req.url).protocol.replace(':', ''),
          'http.host': c.req.header('host') || 'unknown',
          'http.user_agent': c.req.header('user-agent') || 'unknown',
        },
      })

      // Add custom attributes if extractor provided
      if (config.extractAttributes) {
        try {
          const customAttrs = config.extractAttributes(c)
          span.setAttributes(customAttrs)
        } catch (err) {
          logger.warn('Failed to extract custom trace attributes', { error: err })
        }
      }

      // Store trace ID in context for logging correlation
      const traceId = span.spanContext().traceId
      c.set('traceId', traceId)

      try {
        await context.with(trace.setSpan(context.active(), span), async () => {
          await next()
        })

        // Set response attributes
        span.setAttribute('http.status_code', c.res.status)

        // Set span status based on response code
        if (c.res.status >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${c.res.status}`,
          })
        } else {
          span.setStatus({ code: SpanStatusCode.OK })
        }
      } catch (error) {
        // Record error details
        span.recordException(error as Error)
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        })
        span.setAttribute('http.status_code', 500)
        throw error
      } finally {
        span.end()
      }
    })
  }
}

/**
 * Creates a middleware that adds trace context to response headers.
 * Useful for debugging and correlating client-side traces.
 */
export function createTraceHeaderMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    await next()

    const span = trace.getActiveSpan()
    if (span) {
      const { traceId, spanId } = span.spanContext()
      c.header('X-Trace-Id', traceId)
      c.header('X-Span-Id', spanId)
    }
  }
}

/**
 * Creates a span for a specific operation within a request handler.
 *
 * @param name - Span name
 * @param serviceName - Service name for the tracer
 * @returns Object with start and end functions
 *
 * @example
 * ```typescript
 * app.get('/orders/:id', async (c) => {
 *   const span = createRequestSpan('fetchOrder', 'lego-api')
 *   span.setAttribute('order.id', c.req.param('id'))
 *
 *   try {
 *     const order = await fetchOrder(c.req.param('id'))
 *     span.end()
 *     return c.json(order)
 *   } catch (error) {
 *     span.recordError(error)
 *     span.end()
 *     throw error
 *   }
 * })
 * ```
 */
export function createRequestSpan(name: string, serviceName: string) {
  const tracer = trace.getTracer(serviceName)
  const span = tracer.startSpan(name)

  return {
    setAttribute: (key: string, value: string | number | boolean) => {
      span.setAttribute(key, value)
    },
    setAttributes: (attrs: Record<string, string | number | boolean>) => {
      span.setAttributes(attrs)
    },
    recordError: (error: unknown) => {
      span.recordException(error as Error)
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    },
    end: () => {
      if (!span.isRecording()) return
      span.setStatus({ code: SpanStatusCode.OK })
      span.end()
    },
  }
}
