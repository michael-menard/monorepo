/**
 * @repo/observability - Prometheus Metrics
 *
 * Provides Prometheus metrics collection for application monitoring.
 * Includes HTTP request metrics, circuit breaker stats, and custom collectors.
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
  register as globalRegistry,
} from 'prom-client'
import type { MiddlewareHandler } from 'hono'
import { logger } from '@repo/logger'

import { MetricsConfigSchema, type MetricsConfig, type MetricsInput } from './__types__/index.js'

export * from './__types__/index.js'

/**
 * Metrics registry and collectors.
 */
export interface MetricsCollectors {
  /** Prometheus registry */
  registry: Registry

  /** HTTP request counter */
  httpRequests: Counter<'method' | 'route' | 'status'>

  /** HTTP request duration histogram */
  httpDuration: Histogram<'method' | 'route'>

  /** Active HTTP connections gauge */
  httpActiveConnections: Gauge<string>

  /** Circuit breaker state gauge */
  circuitBreakerState: Gauge<'name'>

  /** Circuit breaker events counter */
  circuitBreakerEvents: Counter<'name' | 'event'>

  /** Database connection pool gauge */
  dbPoolConnections: Gauge<'database' | 'state'>

  /** Database query duration histogram */
  dbQueryDuration: Histogram<'database' | 'operation'>
}

let metricsInstance: MetricsCollectors | null = null

/**
 * Creates a new metrics registry with standard collectors.
 *
 * @param config - Metrics configuration
 * @returns Metrics collectors object
 *
 * @example
 * ```typescript
 * const metrics = createMetricsRegistry({
 *   prefix: 'lego_api',
 *   defaultLabels: { environment: 'production' },
 * })
 *
 * // Use in request handler
 * metrics.httpRequests.inc({ method: 'GET', route: '/api/sets', status: '200' })
 * ```
 */
export function createMetricsRegistry(inputConfig?: MetricsInput): MetricsCollectors {
  const config = MetricsConfigSchema.parse(inputConfig ?? {})

  if (!config.enabled) {
    // Return no-op collectors
    return createNoopCollectors()
  }

  const registry = new Registry()

  // Set default labels
  registry.setDefaultLabels(config.defaultLabels)

  // Collect default Node.js metrics
  if (config.collectDefaultMetrics) {
    collectDefaultMetrics({
      register: registry,
      prefix: `${config.prefix}_`,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    })
  }

  // HTTP Metrics
  const httpRequests = new Counter({
    name: `${config.prefix}_http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [registry],
  })

  const httpDuration = new Histogram({
    name: `${config.prefix}_http_request_duration_seconds`,
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'] as const,
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [registry],
  })

  const httpActiveConnections = new Gauge({
    name: `${config.prefix}_http_active_connections`,
    help: 'Number of active HTTP connections',
    registers: [registry],
  })

  // Circuit Breaker Metrics
  const circuitBreakerState = new Gauge({
    name: `${config.prefix}_circuit_breaker_state`,
    help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
    labelNames: ['name'] as const,
    registers: [registry],
  })

  const circuitBreakerEvents = new Counter({
    name: `${config.prefix}_circuit_breaker_events_total`,
    help: 'Circuit breaker events',
    labelNames: ['name', 'event'] as const,
    registers: [registry],
  })

  // Database Metrics
  const dbPoolConnections = new Gauge({
    name: `${config.prefix}_db_pool_connections`,
    help: 'Database connection pool size',
    labelNames: ['database', 'state'] as const,
    registers: [registry],
  })

  const dbQueryDuration = new Histogram({
    name: `${config.prefix}_db_query_duration_seconds`,
    help: 'Database query duration in seconds',
    labelNames: ['database', 'operation'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [registry],
  })

  const collectors: MetricsCollectors = {
    registry,
    httpRequests,
    httpDuration,
    httpActiveConnections,
    circuitBreakerState,
    circuitBreakerEvents,
    dbPoolConnections,
    dbQueryDuration,
  }

  metricsInstance = collectors
  return collectors
}

/**
 * Gets the singleton metrics instance.
 */
export function getMetrics(): MetricsCollectors {
  if (!metricsInstance) {
    metricsInstance = createMetricsRegistry()
  }
  return metricsInstance
}

/**
 * Creates a Hono middleware that exposes Prometheus metrics endpoint.
 *
 * @param registry - Optional custom registry (uses default if not provided)
 * @returns Hono MiddlewareHandler
 *
 * @example
 * ```typescript
 * import { createMetricsEndpoint } from '@repo/observability'
 *
 * const app = new Hono()
 * app.get('/metrics', createMetricsEndpoint())
 * ```
 */
export function createMetricsEndpoint(registry?: Registry): MiddlewareHandler {
  return async (c) => {
    const reg = registry ?? getMetrics().registry
    try {
      const metrics = await reg.metrics()
      c.header('Content-Type', reg.contentType)
      return c.text(metrics)
    } catch (error) {
      logger.error('Failed to collect metrics', { error })
      return c.text('Error collecting metrics', 500)
    }
  }
}

/**
 * Creates a Hono middleware that collects HTTP request metrics.
 *
 * @param collectors - Optional custom collectors
 * @returns Hono MiddlewareHandler
 *
 * @example
 * ```typescript
 * import { createHttpMetricsMiddleware } from '@repo/observability'
 *
 * const app = new Hono()
 * app.use('*', createHttpMetricsMiddleware())
 * ```
 */
export function createHttpMetricsMiddleware(collectors?: MetricsCollectors): MiddlewareHandler {
  return async (c, next) => {
    const metrics = collectors ?? getMetrics()
    const start = Date.now()

    // Track active connections
    metrics.httpActiveConnections.inc()

    try {
      await next()
    } finally {
      const duration = (Date.now() - start) / 1000
      const route = c.req.routePath || c.req.path
      const status = String(c.res.status)

      // Record request metrics
      metrics.httpRequests.inc({
        method: c.req.method,
        route,
        status,
      })

      metrics.httpDuration.observe(
        { method: c.req.method, route },
        duration,
      )

      metrics.httpActiveConnections.dec()
    }
  }
}

/**
 * Updates circuit breaker metrics.
 */
export function updateCircuitBreakerMetrics(
  name: string,
  state: 'closed' | 'half_open' | 'open',
  event?: string,
): void {
  const metrics = getMetrics()

  // Map state to numeric value
  const stateValue = { closed: 0, half_open: 1, open: 2 }[state]
  metrics.circuitBreakerState.set({ name }, stateValue)

  if (event) {
    metrics.circuitBreakerEvents.inc({ name, event })
  }
}

/**
 * Updates database pool metrics.
 */
export function updateDbPoolMetrics(
  database: string,
  active: number,
  idle: number,
  waiting: number,
): void {
  const metrics = getMetrics()
  metrics.dbPoolConnections.set({ database, state: 'active' }, active)
  metrics.dbPoolConnections.set({ database, state: 'idle' }, idle)
  metrics.dbPoolConnections.set({ database, state: 'waiting' }, waiting)
}

/**
 * Observes a database query duration.
 */
export function observeDbQueryDuration(
  database: string,
  operation: string,
  durationSeconds: number,
): void {
  const metrics = getMetrics()
  metrics.dbQueryDuration.observe({ database, operation }, durationSeconds)
}

/**
 * Creates no-op collectors for when metrics are disabled.
 */
function createNoopCollectors(): MetricsCollectors {
  const noopCounter = { inc: () => {}, labels: () => ({ inc: () => {} }) } as unknown as Counter<string>
  const noopHistogram = { observe: () => {}, labels: () => ({ observe: () => {} }) } as unknown as Histogram<string>
  const noopGauge = { set: () => {}, inc: () => {}, dec: () => {} } as unknown as Gauge<string>

  return {
    registry: new Registry(),
    httpRequests: noopCounter as Counter<'method' | 'route' | 'status'>,
    httpDuration: noopHistogram as Histogram<'method' | 'route'>,
    httpActiveConnections: noopGauge,
    circuitBreakerState: noopGauge as Gauge<'name'>,
    circuitBreakerEvents: noopCounter as Counter<'name' | 'event'>,
    dbPoolConnections: noopGauge as Gauge<'database' | 'state'>,
    dbQueryDuration: noopHistogram as Histogram<'database' | 'operation'>,
  }
}
