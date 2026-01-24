/**
 * Story 3.1.16: Import from URL Handler
 *
 * POST /api/mocs/import-from-url
 *
 * Fetches a MOC/Set page from Rebrickable or BrickLink and extracts metadata.
 * Includes rate limiting (10/min per user) and caching (1hr TTL).
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  ImportFromUrlRequestSchema,
  detectPlatform,
  getPlatformDisplayName,
  type ImportFromUrlResponse,
} from './types'
import { parseBrickLinkStudio } from './parsers/bricklink-studio'
import { parseRebrickableMoc } from './parsers/rebrickable-moc'
import { parseRebrickableSet } from './parsers/rebrickable-set'
import {
  successResponse,
  errorResponse,
  ValidationError,
  RateLimitError,
  NotFoundError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('import-from-url')

// Rate limit: 10 imports per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10

// Simple in-memory rate limiter (for Lambda, consider Redis for production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// Simple in-memory cache (for Lambda, consider Redis for production)
const cacheMap = new Map<string, { data: ImportFromUrlResponse; expiresAt: number }>()
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

function getCached(url: string): ImportFromUrlResponse | null {
  const entry = cacheMap.get(url)
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data
  }
  cacheMap.delete(url)
  return null
}

function setCache(url: string, data: ImportFromUrlResponse): void {
  cacheMap.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Fetch HTML from URL with timeout
 */
async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LegoMocBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError('Could not find a MOC at this URL. Please check the link')
      }
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    return await response.text()
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Main handler for POST /api/mocs/import-from-url
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext?.requestId || 'unknown'
  const userId = getUserIdFromEvent(event)

  logger.info('Import from URL request', { requestId, userId })

  // Require authentication
  if (!userId) {
    return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', { requestId })
  }

  // Check rate limit
  if (!checkRateLimit(userId)) {
    logger.warn('Rate limit exceeded', { requestId, userId })
    throw new RateLimitError('Too many imports. Please wait a moment and try again')
  }

  // Parse and validate request body
  let body: unknown
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    throw new ValidationError('Invalid JSON body')
  }

  const parseResult = ImportFromUrlRequestSchema.safeParse(body)
  if (!parseResult.success) {
    throw new ValidationError('Please enter a valid URL from Rebrickable or BrickLink')
  }

  const { url } = parseResult.data

  // Check cache first
  const cached = getCached(url)
  if (cached) {
    logger.info('Returning cached result', { requestId, url })
    return successResponse(200, cached)
  }

  // Detect platform
  const platformMatch = detectPlatform(url)
  if (!platformMatch) {
    throw new ValidationError('URL not supported. We support Rebrickable and BrickLink URLs')
  }

  logger.info('Detected platform', {
    requestId,
    platform: platformMatch.platform,
    externalId: platformMatch.externalId,
  })

  // Fetch and parse
  const html = await fetchHtml(url)
  let result: ImportFromUrlResponse

  try {
    switch (platformMatch.platform) {
      case 'bricklink-studio': {
        const parsed = parseBrickLinkStudio(html, url)
        result = {
          success: true,
          data: parsed as unknown as Record<string, unknown>,
          images: parsed.images,
          warnings: [],
          source: {
            platform: 'bricklink',
            url,
            externalId: platformMatch.externalId,
          },
        }
        break
      }

      case 'rebrickable-moc': {
        const parsed = parseRebrickableMoc(html, url, platformMatch.externalId)
        result = {
          success: true,
          data: {
            type: 'moc',
            ...parsed,
          },
          images: parsed.images,
          warnings: parsed.warnings,
          source: {
            platform: 'rebrickable',
            url,
            externalId: platformMatch.externalId,
          },
        }
        break
      }

      case 'rebrickable-set': {
        const parsed = parseRebrickableSet(html, url, platformMatch.externalId)
        result = {
          success: true,
          data: {
            type: 'set',
            ...parsed,
          },
          images: parsed.images,
          warnings: parsed.warnings,
          source: {
            platform: 'rebrickable',
            url,
            externalId: platformMatch.externalId,
          },
        }
        break
      }

      default:
        throw new ValidationError(
          `Unsupported platform: ${getPlatformDisplayName(platformMatch.platform)}`,
        )
    }
  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error
    }
    logger.error('Parse error', { requestId, url, error })
    throw new ValidationError('Could not read all data from this page. Some fields may be empty')
  }

  // Cache the result
  setCache(url, result)

  logger.info('Import successful', {
    requestId,
    platform: platformMatch.platform,
    title: (result.data as Record<string, unknown>)?.title,
    imageCount: result.images.length,
    warningCount: result.warnings.length,
  })

  return successResponse(200, result)
}
