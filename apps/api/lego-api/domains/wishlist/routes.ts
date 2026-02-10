import { Hono, Context } from 'hono'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { db, schema } from '../../composition/index.js'
import { createSetsService } from '../sets/application/index.js'
import {
  createSetRepository,
  createSetImageRepository,
  createImageStorage,
} from '../sets/adapters/index.js'
import { extractClientIp } from '../../core/utils/ip.js'
import { getGeolocation, type GeolocationData } from '../../core/geolocation/index.js'
import { createWishlistService } from './application/index.js'
import { createWishlistRepository, createWishlistImageStorage } from './adapters/index.js'
import {
  CreateWishlistItemInputSchema,
  UpdateWishlistItemInputSchema,
  ListWishlistQuerySchema,
  ReorderWishlistInputSchema,
  PresignRequestSchema,
  MarkAsPurchasedInputSchema,
  PurchaseDetailsInputSchema,
  BuildStatusUpdateInputSchema,
} from './types.js'
// IP extraction and geolocation (WISH-2047)
// Cross-domain dependencies for purchase flow (WISH-2042)

// ─────────────────────────────────────────────────────────────────────────
// Audit Logging (WISH-2008 AC14, WISH-2047 IP/Geolocation)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Log unauthorized access attempts for audit trail
 *
 * Called when returning 403 or 404 for authorization failures.
 * Provides structured logging for security monitoring and incident response.
 *
 * WISH-2047: Enriched with IP address and geolocation data for:
 * - Detecting suspicious access patterns
 * - Geographic anomaly detection
 * - Brute-force attack identification
 *
 * Privacy: IP/geolocation is ONLY logged for 403/404 responses,
 * not for successful 200/201 requests.
 */
function logAuthorizationFailure(
  userId: string,
  itemId: string | null,
  endpoint: string,
  method: string,
  statusCode: 403 | 404,
  errorCode: string,
  clientIp: string | null,
  geolocation: GeolocationData | null,
): void {
  logger.warn('Unauthorized wishlist access attempt', {
    userId,
    itemId,
    endpoint,
    method,
    statusCode,
    errorCode,
    timestamp: new Date().toISOString(),
    // WISH-2047: IP and geolocation enrichment
    ip: clientIp,
    country: geolocation?.country ?? null,
    countryName: geolocation?.countryName ?? null,
    region: geolocation?.region ?? null,
    city: geolocation?.city ?? null,
    latitude: geolocation?.latitude ?? null,
    longitude: geolocation?.longitude ?? null,
  })
}

/**
 * Helper to extract IP and geolocation for authorization failure logging
 *
 * WISH-2047: Extracts client IP from request headers and performs
 * geolocation lookup. Returns null for geolocation if lookup fails.
 */
async function getAuthFailureContext(
  c: Context,
): Promise<{ clientIp: string | null; geolocation: GeolocationData | null }> {
  const clientIp = extractClientIp(c.req.raw)

  // Only perform geolocation lookup if we have an IP
  let geolocation: GeolocationData | null = null
  if (clientIp) {
    geolocation = await getGeolocation(clientIp)
  }

  return { clientIp, geolocation }
}

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create repository using shared db from composition root
const wishlistRepo = createWishlistRepository(db, schema)

// Create image storage adapter
const imageStorage = createWishlistImageStorage()

// Create Sets service for cross-domain purchase operations (WISH-2042)
const setRepo = createSetRepository(db, schema)
const setImageRepo = createSetImageRepository(db, schema)
const setsImageStorage = createImageStorage()
const setsService = createSetsService({
  setRepo,
  setImageRepo,
  imageStorage: setsImageStorage,
})

// Create service with injected dependencies
const wishlistService = createWishlistService({
  wishlistRepo,
  imageStorage,
  setsService,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const wishlist = new Hono()

// All wishlist routes require authentication and wishlist feature (free-tier+)
wishlist.use('*', auth)
wishlist.use('*', loadPermissions)
wishlist.use('*', requireFeature('wishlist'))

// ─────────────────────────────────────────────────────────────────────────
// List & Reorder Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET / - List user's wishlist items
 *
 * WISH-20171: Extended with combined filter support (store[], priorityRange, priceRange)
 */
wishlist.get('/', async c => {
  const userId = c.get('userId')
  const query = ListWishlistQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, store, tags, priority, priorityRange, priceRange, sort, order, status } =
    query.data

  // Parse comma-separated tags
  const tagList = tags
    ? tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : undefined

  const result = await wishlistService.listItems(
    userId,
    { page, limit },
    {
      search,
      store, // WISH-20171: Now string[]
      tags: tagList,
      priority, // Backward compatibility
      priorityRange, // WISH-20171: New
      priceRange, // WISH-20171: New
      status, // SETS-MVP-002: Filter by lifecycle status
      sort,
      order,
    },
  )

  return c.json(result)
})

/**
 * PUT /reorder - Reorder wishlist items
 */
wishlist.put('/reorder', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = ReorderWishlistInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.reorderItems(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Image Upload Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /images/presign - Get presigned URL for image upload
 *
 * WISH-2013: Enhanced with file size validation (AC3, AC18)
 */
wishlist.get('/images/presign', async c => {
  const userId = c.get('userId')
  const query = PresignRequestSchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { fileName, mimeType, fileSize } = query.data

  const result = await wishlistService.generateImageUploadUrl(userId, fileName, mimeType, fileSize)

  if (!result.ok) {
    // WISH-2013 AC16: Security audit logging handled in storage adapter
    const status =
      result.error === 'INVALID_EXTENSION' ||
      result.error === 'INVALID_MIME_TYPE' ||
      result.error === 'FILE_TOO_LARGE' ||
      result.error === 'FILE_TOO_SMALL'
        ? 400
        : 500

    const message =
      result.error === 'INVALID_EXTENSION'
        ? 'Invalid file extension. Allowed: jpg, jpeg, png, webp'
        : result.error === 'INVALID_MIME_TYPE'
          ? 'Unsupported file type. Allowed: image/jpeg, image/png, image/webp'
          : result.error === 'FILE_TOO_LARGE'
            ? 'File size exceeds maximum limit of 10MB'
            : result.error === 'FILE_TOO_SMALL'
              ? 'File cannot be empty (0 bytes)'
              : 'Failed to generate presigned URL'

    // Return structured error response for client handling
    return c.json(
      {
        error: result.error,
        message,
        ...(result.error === 'INVALID_MIME_TYPE' && {
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        }),
        ...(result.error === 'FILE_TOO_LARGE' && {
          maxSizeBytes: 10 * 1024 * 1024,
        }),
      },
      status,
    )
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Single Item Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /:id - Get single wishlist item
 */
wishlist.get('/:id', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.getItem(userId, itemId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    // Log authorization failures for audit trail (AC14, WISH-2047)
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id',
        'GET',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST / - Create new wishlist item
 */
wishlist.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateWishlistItemInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.createItem(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'DB_ERROR' ? 500 : 400
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PUT /:id - Update wishlist item
 */
wishlist.put('/:id', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')
  const body = await c.req.json()
  const input = UpdateWishlistItemInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.updateItem(userId, itemId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    // Log authorization failures for audit trail (AC14, WISH-2047)
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id',
        'PUT',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /:id - Delete wishlist item
 */
wishlist.delete('/:id', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.deleteItem(userId, itemId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    // Log authorization failures for audit trail (AC14, WISH-2047)
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id',
        'DELETE',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

// ─────────────────────────────────────────────────────────────────────────
// Build Status Route (SETS-MVP-004)
// ─────────────────────────────────────────────────────────────────────────

/**
 * PATCH /:id/build-status - Toggle build status of an owned item
 *
 * SETS-MVP-004: Build status toggle.
 * Only valid for items with status='owned'.
 *
 * Returns 200 with the updated item on success.
 * Returns 400 with { error: 'INVALID_STATUS', message: '...' } if item is not owned.
 * Returns 403 if user doesn't own the item.
 * Returns 404 if item doesn't exist.
 */
wishlist.patch('/:id/build-status', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')
  const body = await c.req.json()
  const input = BuildStatusUpdateInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.updateBuildStatus(userId, itemId, input.data.buildStatus)

  if (!result.ok) {
    if (result.error === 'INVALID_STATUS') {
      return c.json(
        { error: 'INVALID_STATUS', message: 'Build status can only be set on owned items' },
        400,
      )
    }
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id/build-status',
        'PATCH',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Purchase Routes (WISH-2042)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /:id/purchased - Mark wishlist item as purchased
 *
 * @deprecated Use PATCH /:id/purchase instead (SETS-MVP-0310)
 * This endpoint will be removed after 2-week deprecation period.
 *
 * Creates a Set item from the wishlist item with purchase details.
 * Optionally removes the item from the wishlist.
 *
 * Returns 201 with the new Set item on success.
 * Returns 400 for validation errors.
 * Returns 403 if user doesn't own the item.
 * Returns 404 if item doesn't exist.
 * Returns 500 if Set creation fails.
 */
wishlist.post('/:id/purchased', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')
  const body = await c.req.json()
  const input = MarkAsPurchasedInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.markAsPurchased(userId, itemId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'VALIDATION_ERROR'
            ? 400
            : 500
    // Log authorization failures for audit trail (AC14, WISH-2047)
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id/purchased',
        'POST',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  // Add deprecation warning header
  c.header('Deprecated', 'true')
  c.header('Sunset', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toUTCString())
  c.header('Link', '</api/v2/wishlist/:id/purchase>; rel="alternate"')

  return c.json(result.data, 201)
})

/**
 * PATCH /:id/purchase - Update item status to 'owned' with purchase details
 *
 * SETS-MVP-0310: Unified model status transition approach.
 * Updates the item's status to 'owned' and captures purchase metadata.
 *
 * Returns 200 with the updated item on success.
 * Returns 400 for validation errors.
 * Returns 403 if user doesn't own the item.
 * Returns 404 if item doesn't exist.
 */
wishlist.patch('/:id/purchase', async c => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')
  const body = await c.req.json()
  const input = PurchaseDetailsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await wishlistService.updateItemStatus(userId, itemId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    // Log authorization failures for audit trail
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        itemId,
        '/wishlist/:id/purchase',
        'PATCH',
        status as 403 | 404,
        result.error,
        clientIp,
        geolocation,
      )
    }
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

export default wishlist
