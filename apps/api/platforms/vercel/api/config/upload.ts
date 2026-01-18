/**
 * Vercel API Route: GET /api/config/upload
 *
 * Platform-agnostic upload configuration using ports & adapters architecture.
 * Uses @vercel/node types (no Next.js dependency).
 *
 * This is a thin adapter layer that:
 * - Parses Vercel request
 * - Calls platform-agnostic core logic from @repo/upload-config-core
 * - Formats response with CORS headers
 * - Returns public-safe upload configuration
 */
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local from the vercel platform directory
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
import { getPublicUploadConfig, loadUploadConfigFromEnv } from '@repo/upload-config-core'
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
 * Upload config handler
 *
 * GET /api/config/upload - Returns public-safe upload configuration
 * OPTIONS /api/config/upload - CORS preflight
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

  logger.info('Upload config requested', {
    requestId,
    stage,
    timestamp: new Date().toISOString(),
  })

  try {
    // Load config from environment using platform-agnostic core logic
    const fullConfig = loadUploadConfigFromEnv(process.env as Record<string, string>)

    // Filter to public-safe fields
    const publicConfig = getPublicUploadConfig(fullConfig)

    logger.debug('Returning upload config', {
      requestId,
      pdfMaxMb: (publicConfig.pdfMaxBytes ?? 0) / (1024 * 1024),
      imageMaxMb: (publicConfig.imageMaxBytes ?? 0) / (1024 * 1024),
      maxImagesPerMoc: publicConfig.maxImagesPerMoc,
    })

    addCorsHeaders(res, origin)
    res.status(200).json(publicConfig)
  } catch (error) {
    logger.error('Upload config request failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    addCorsHeaders(res, origin)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to load upload configuration',
      details: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    })
  }
}
