/**
 * Vercel API Route: POST /api/sets
 *
 * Create a new set for the authenticated user.
 * Uses ports & adapters architecture with @repo/sets-core for business logic.
 *
 * STORY-003: Sets - Write Operations (No Images)
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { z } from 'zod'
import loggerPkg from '@repo/logger'
import {
  type VercelRequest,
  type VercelResponse,
  validateCognitoJwt,
  transformRequest,
} from '@repo/vercel-adapter'
import {
  successResponse,
  errorResponseFromError,
  BadRequestError,
  UnauthorizedError,
} from '@repo/lambda-responses'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { CreateSetSchema, SetSchema } from '@repo/api-client/schemas/sets'
import { createSet } from '@repo/sets-core'
import * as schema from '../../../../core/database/schema'

const { logger } = loggerPkg

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/**
 * Get Drizzle database client (lazy initialization)
 */
let dbClient: ReturnType<typeof drizzle> | null = null

async function getDb() {
  if (!dbClient) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    dbClient = drizzle(pool, { schema })
  }
  return dbClient
}

/**
 * Create Set Handler
 *
 * POST /api/sets - Creates a new set for the authenticated user
 * OPTIONS /api/sets - CORS preflight
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const origin = req.headers.origin as string | undefined
  const requestId = crypto.randomUUID()

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    addCorsHeaders(res, origin)
    res.status(204).end()
    return
  }

  // Only allow POST
  if (req.method !== 'POST') {
    addCorsHeaders(res, origin)
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    // Validate JWT
    const authHeader = req.headers.authorization as string | undefined
    const jwtResult = await validateCognitoJwt(authHeader)

    if (!jwtResult.valid) {
      logger.warn('Authentication failed', {
        requestId,
        error: jwtResult.error,
        message: jwtResult.message,
      })

      addCorsHeaders(res, origin)
      const response = errorResponseFromError(
        new UnauthorizedError(jwtResult.message),
        requestId,
      )
      res.status(response.statusCode).json(JSON.parse(response.body))
      return
    }

    // Transform request to get user ID
    const event = transformRequest(req, {
      jwtClaims: jwtResult.claims,
    })
    const userId = getUserIdFromEvent(event)

    if (!userId) {
      addCorsHeaders(res, origin)
      const response = errorResponseFromError(
        new UnauthorizedError('User ID not found in token'),
        requestId,
      )
      res.status(response.statusCode).json(JSON.parse(response.body))
      return
    }

    // Parse and validate request body
    const parseResult = CreateSetSchema.safeParse(req.body)

    if (!parseResult.success) {
      logger.warn('Validation failed', {
        requestId,
        userId,
        errors: parseResult.error.issues,
      })

      addCorsHeaders(res, origin)
      const response = errorResponseFromError(
        new BadRequestError(parseResult.error.message),
        requestId,
      )
      res.status(response.statusCode).json(JSON.parse(response.body))
      return
    }

    const input = parseResult.data

    logger.info('Create set request', {
      requestId,
      userId,
      title: input.title,
    })

    // Get database client
    const db = await getDb()

    // Call core business logic
    const result = await createSet(
      db as any, // Type coercion for DB client interface
      { sets: schema.sets },
      userId,
      input,
    )

    if (!result.success) {
      logger.error('Create set failed', {
        requestId,
        userId,
        error: result.error,
        message: result.message,
      })

      addCorsHeaders(res, origin)
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create set',
        statusCode: 500,
      })
      return
    }

    // Validate response against schema (runtime check)
    SetSchema.parse(result.data)

    logger.info('Set created successfully', {
      requestId,
      userId,
      setId: result.data.id,
      title: result.data.title,
    })

    // Return success response with Location header
    addCorsHeaders(res, origin)
    res.setHeader('Location', `/api/sets/${result.data.id}`)

    const successResp = successResponse(201, result.data)
    res.status(successResp.statusCode).json(JSON.parse(successResp.body))
  } catch (error) {
    logger.error('Create set error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    addCorsHeaders(res, origin)

    if (error instanceof z.ZodError) {
      const response = errorResponseFromError(
        new BadRequestError(error.message),
        requestId,
      )
      res.status(response.statusCode).json(JSON.parse(response.body))
      return
    }

    const response = errorResponseFromError(error, requestId)
    res.status(response.statusCode).json(JSON.parse(response.body))
  }
}

/**
 * Export POST handler explicitly for Vercel
 */
export const POST = handler
