/**
 * Vercel API Route: POST /api/mocs/import-from-url
 *
 * Fetches a MOC/Set page from Rebrickable or BrickLink and extracts metadata.
 * Includes rate limiting (10/min per user) and caching (1hr TTL).
 *
 * STORY-014: MOC Instructions - Import from URL
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import loggerPkg from '@repo/logger'
import {
  ImportFromUrlRequestSchema,
  detectPlatform,
  getPlatformDisplayName,
  type ImportFromUrlResponse,
} from '../../../aws/endpoints/moc-instructions/import-from-url/types'
import { parseBrickLinkStudio } from '../../../aws/endpoints/moc-instructions/import-from-url/parsers/bricklink-studio'
import { parseRebrickableMoc } from '../../../aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-moc'
import { parseRebrickableSet } from '../../../aws/endpoints/moc-instructions/import-from-url/parsers/rebrickable-set'

const { logger } = loggerPkg

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MAX_URL_LENGTH = 2000

// Rate limit: 10 imports per minute per user
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10

// Cache TTL: 1 hour
const CACHE_TTL_MS = 60 * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Rate Limiter
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Cache
// ─────────────────────────────────────────────────────────────────────────────

const cacheMap = new Map<string, { data: ImportFromUrlResponse; expiresAt: number }>()

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

// ─────────────────────────────────────────────────────────────────────────────
// Auth Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get user ID from AUTH_BYPASS or return null for unauthenticated.
 * This endpoint requires authentication - returns null if not authenticated.
 */
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch HTML
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch HTML from URL with timeout
 */
async function fetchHtml(
  url: string,
): Promise<{ ok: true; html: string } | { ok: false; status: number; message: string }> {
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
        return { ok: false, status: 404, message: 'Could not find a MOC at this URL' }
      }
      return { ok: false, status: 500, message: `Failed to fetch URL: ${response.status}` }
    }

    const html = await response.text()
    return { ok: true, html }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, status: 504, message: 'Request timed out while fetching URL' }
    }
    return { ok: false, status: 500, message: 'Failed to fetch URL' }
  } finally {
    clearTimeout(timeout)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method Not Allowed',
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-9: Authentication Required
  // ─────────────────────────────────────────────────────────────────────────

  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
    return
  }

  logger.info('Import from URL request', { userId })

  // ─────────────────────────────────────────────────────────────────────────
  // AC-7: Rate Limiting (10/min/user)
  // ─────────────────────────────────────────────────────────────────────────

  if (!checkRateLimit(userId)) {
    logger.warn('Rate limit exceeded', { userId })
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many imports. Please wait a moment and try again',
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-4: Parse and Validate Request Body
  // ─────────────────────────────────────────────────────────────────────────

  let parsedBody: unknown
  try {
    // req.body is already parsed by Vercel if Content-Type is application/json
    if (typeof req.body === 'string') {
      parsedBody = JSON.parse(req.body)
    } else {
      parsedBody = req.body
    }
  } catch {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid JSON body',
      },
    })
    return
  }

  const parseResult = ImportFromUrlRequestSchema.safeParse(parsedBody)
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please enter a valid URL',
      },
    })
    return
  }

  const { url } = parseResult.data

  // ─────────────────────────────────────────────────────────────────────────
  // AC-10: URL Length Validation
  // ─────────────────────────────────────────────────────────────────────────

  if (url.length > MAX_URL_LENGTH) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: `URL too long. Maximum length is ${MAX_URL_LENGTH} characters`,
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-8: Check Cache
  // ─────────────────────────────────────────────────────────────────────────

  const cached = getCached(url)
  if (cached) {
    logger.info('Returning cached result', { url })
    res.status(200).json(cached)
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AC-5: Detect Platform
  // ─────────────────────────────────────────────────────────────────────────

  const platformMatch = detectPlatform(url)
  if (!platformMatch) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'URL not supported. We support Rebrickable and BrickLink URLs',
      },
    })
    return
  }

  logger.info('Detected platform', {
    platform: platformMatch.platform,
    externalId: platformMatch.externalId,
  })

  // ─────────────────────────────────────────────────────────────────────────
  // AC-6: Fetch External URL
  // ─────────────────────────────────────────────────────────────────────────

  const fetchResult = await fetchHtml(url)
  if (!fetchResult.ok) {
    res.status(fetchResult.status).json({
      error: {
        code: fetchResult.status === 404 ? 'NOT_FOUND' : 'FETCH_ERROR',
        message: fetchResult.message,
      },
    })
    return
  }

  const { html } = fetchResult

  // ─────────────────────────────────────────────────────────────────────────
  // AC-1, AC-2, AC-3: Parse Based on Platform
  // ─────────────────────────────────────────────────────────────────────────

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
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unsupported platform: ${getPlatformDisplayName(platformMatch.platform)}`,
          },
        })
        return
    }
  } catch (error) {
    logger.error('Parse error', {
      url,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(400).json({
      error: {
        code: 'PARSE_ERROR',
        message: 'Could not read all data from this page. Some fields may be empty',
      },
    })
    return
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cache and Return Result
  // ─────────────────────────────────────────────────────────────────────────

  setCache(url, result)

  logger.info('Import successful', {
    platform: platformMatch.platform,
    title: (result.data as Record<string, unknown>)?.title,
    imageCount: result.images.length,
    warningCount: result.warnings.length,
  })

  res.status(200).json(result)
}
