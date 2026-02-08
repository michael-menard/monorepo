import { resolve } from 'path'
import { config as loadEnv } from 'dotenv'

// Load env from root .env (must be before other imports that use env vars)
const rootDir = resolve(import.meta.dir, '../../..')
loadEnv({ path: resolve(rootDir, '.env.local') })
loadEnv({ path: resolve(rootDir, '.env') })

import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import {
  initializeTracing,
  createTracingMiddleware,
  createHttpMetricsMiddleware,
  createMetricsEndpoint,
} from '@repo/observability'

// Initialize OpenTelemetry tracing (must be early, before other imports use instrumented libs)
const enableMetrics = process.env.ENABLE_METRICS === 'true'
if (enableMetrics) {
  initializeTracing({
    serviceName: 'lego-api',
    environment: process.env.NODE_ENV ?? 'development',
    metricsPort: parseInt(process.env.METRICS_PORT ?? '9464'),
  })
}
import health from './domains/health/routes.js'
import gallery from './domains/gallery/routes.js'
import sets from './domains/sets/routes.js'
import wishlist from './domains/wishlist/routes.js'
import instructions from './domains/instructions/routes.js'
import mocs from './domains/mocs/routes.js'
import partsLists from './domains/parts-lists/routes.js'
import config, { adminConfig } from './domains/config/routes.js'
import authorization from './domains/authorization/routes.js'
import auth from './domains/auth/routes.js'
import adminUsers from './domains/admin/routes.js'
import inspiration from './domains/inspiration/routes.js'

const app = new Hono()

// Global middleware
// Tracing middleware (before logger for accurate timing)
if (enableMetrics) {
  app.use(
    '*',
    createTracingMiddleware({
      serviceName: 'lego-api',
      skipRoutes: ['/health', '/metrics', '/ready'],
    }),
  )
  app.use('*', createHttpMetricsMiddleware())
}
app.use('*', logger())
// Configure CORS for credentials support (needed for cookie-based auth)
// In development, allow localhost origins; in production, this should be more restrictive
app.use(
  '*',
  cors({
    origin: origin => {
      // Allow requests from localhost (development)
      if (!origin || origin.startsWith('http://localhost:')) {
        return origin || 'http://localhost:3000'
      }
      // In production, return a specific allowed origin
      return null // Reject unknown origins
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
  }),
)
// app.use('*', rateLimit) // WISH-2008 AC24: Rate limiting for brute-force protection (disabled for testing)

// Metrics endpoint for Prometheus scraping
if (enableMetrics) {
  app.get('/metrics', createMetricsEndpoint())
}

// Mount domain routes
app.route('/health', health)
app.route('/auth', auth) // Session management (cookie-based auth)
app.route('/gallery', gallery)
app.route('/sets', sets)
app.route('/wishlist', wishlist)
app.route('/instructions/mocs', mocs) // Mount before /instructions for correct route matching
app.route('/instructions', instructions)
app.route('/parts-lists', partsLists)
app.route('/config', config)
app.route('/admin', adminConfig)
app.route('/admin/users', adminUsers)
app.route('/authorization', authorization)
app.route('/mocs', mocs)
app.route('/inspiration', inspiration)

// Root endpoint
app.get('/', c => {
  return c.json({
    name: 'lego-api',
    version: '1.0.0',
    status: 'running',
  })
})

// 404 handler
app.notFound(c => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

// Port configuration - uses LEGO_API_PORT from root .env
const port = (() => {
  if (!process.env.LEGO_API_PORT) {
    throw new Error('LEGO_API_PORT environment variable is required. Set it in root .env')
  }
  return parseInt(process.env.LEGO_API_PORT)
})()

// Export for Bun
export default {
  port,
  fetch: app.fetch,
}

// Log startup
console.log(`🚀 lego-api running on http://localhost:${port}`)
