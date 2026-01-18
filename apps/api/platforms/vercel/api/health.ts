/**
 * Vercel API Route: GET /api/health
 *
 * Platform-agnostic health check using ports & adapters architecture.
 * Uses @vercel/node types (no Next.js dependency).
 *
 * This is a thin adapter layer that:
 * - Parses Vercel request
 * - Calls platform-agnostic core logic from @repo/health-check-core
 * - Formats response with CORS headers
 * - Uses Neon serverless driver for PostgreSQL connection testing
 */
// import { neon } from '@neondatabase/serverless'
import pg from 'pg'
import { performHealthCheck } from '@repo/health-check-core'
// ESM/CJS interop: Vercel runs native Node.js ESM, logger is CJS
import loggerPkg from '@repo/logger'
const { logger } = loggerPkg
import type { VercelRequest, VercelResponse } from '@repo/vercel-adapter'

/**
 * Allowed origins for CORS
 */
const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']

/**
 * Add CORS headers to response
 */
function addCorsHeaders(res: VercelResponse, origin: string | undefined): void {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  res.setHeader('Access-Control-Allow-Origin', allowOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

/**
 * Test PostgreSQL connection using pg driver (supports local Postgres)
 */
async function testPostgresConnection(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    logger.error('DATABASE_URL environment variable is not set')
    return false
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    await client.query('SELECT 1 as health_check')
    return true
  } catch (error) {
    logger.error('PostgreSQL connection test failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Health check handler
 *
 * GET /api/health - Returns health status of critical services
 * OPTIONS /api/health - CORS preflight
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const origin = req.headers.origin as string | undefined

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    addCorsHeaders(res, origin)
    res.status(200).json({ message: 'OK' })
    return
  }

  // Only allow GET
  if (req.method !== 'GET') {
    addCorsHeaders(res, origin)
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const requestId = crypto.randomUUID()
  const stage = process.env.STAGE || 'development'

  logger.info('Health check initiated', {
    requestId,
    stage,
    timestamp: new Date().toISOString(),
  })

  try {
    // Perform health check using platform-agnostic core logic
    const healthData = await performHealthCheck(
      { testPostgresConnection },
      '1.0.0',
    )

    logger.info('Health check completed', {
      requestId,
      status: healthData.status,
      services: healthData.services,
      timestamp: healthData.timestamp,
    })

    // Return 503 if system is unhealthy
    const statusCode = healthData.status === 'unhealthy' ? 503 : 200

    addCorsHeaders(res, origin)
    res.status(statusCode).json(healthData)
  } catch (error) {
    logger.error('Health check failed with unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    addCorsHeaders(res, origin)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Health check failed',
      details: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
