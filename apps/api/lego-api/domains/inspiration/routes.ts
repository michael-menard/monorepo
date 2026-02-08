import { Hono, Context } from 'hono'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { db, schema } from '../../composition/index.js'
import { extractClientIp } from '../../core/utils/ip.js'
import { getGeolocation, type GeolocationData } from '../../core/geolocation/index.js'
import { createInspirationService } from './application/index.js'
import {
  createInspirationRepository,
  createAlbumRepository,
  createAlbumItemRepository,
  createAlbumParentRepository,
  createInspirationImageStorage,
} from './adapters/index.js'
import {
  CreateInspirationInputSchema,
  UpdateInspirationInputSchema,
  ListInspirationQuerySchema,
  CreateAlbumInputSchema,
  UpdateAlbumInputSchema,
  ListAlbumQuerySchema,
  ReorderInspirationsInputSchema,
  ReorderAlbumsInputSchema,
  AddToAlbumInputSchema,
  RemoveFromAlbumInputSchema,
  AddAlbumParentInputSchema,
  PresignRequestSchema,
  CreateAlbumFromStackInputSchema,
  LinkInspirationToMocInputSchema,
  LinkAlbumToMocInputSchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Audit Logging
// ─────────────────────────────────────────────────────────────────────────

/**
 * Log unauthorized access attempts for audit trail
 */
function logAuthorizationFailure(
  userId: string,
  resourceId: string | null,
  endpoint: string,
  method: string,
  statusCode: 403 | 404,
  errorCode: string,
  clientIp: string | null,
  geolocation: GeolocationData | null,
): void {
  logger.warn('Unauthorized inspiration access attempt', {
    userId,
    resourceId,
    endpoint,
    method,
    statusCode,
    errorCode,
    timestamp: new Date().toISOString(),
    ip: clientIp,
    country: geolocation?.country ?? null,
    countryName: geolocation?.countryName ?? null,
    region: geolocation?.region ?? null,
    city: geolocation?.city ?? null,
  })
}

/**
 * Helper to extract IP and geolocation for authorization failure logging
 */
async function getAuthFailureContext(
  c: Context,
): Promise<{ clientIp: string | null; geolocation: GeolocationData | null }> {
  const clientIp = extractClientIp(c.req.raw)
  let geolocation: GeolocationData | null = null
  if (clientIp) {
    geolocation = await getGeolocation(clientIp)
  }
  return { clientIp, geolocation }
}

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const inspirationRepo = createInspirationRepository(db, schema)
const albumRepo = createAlbumRepository(db, schema)
const albumItemRepo = createAlbumItemRepository(db, schema)
const albumParentRepo = createAlbumParentRepository(db, schema)
const imageStorage = createInspirationImageStorage()

const inspirationService = createInspirationService({
  inspirationRepo,
  albumRepo,
  albumItemRepo,
  albumParentRepo,
  imageStorage,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const inspiration = new Hono()

// All inspiration routes require authentication and inspiration feature
inspiration.use('*', auth)
inspiration.use('*', loadPermissions)
inspiration.use('*', requireFeature('inspiration'))

// ─────────────────────────────────────────────────────────────────────────
// Inspiration Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /inspirations - List user's inspirations
 */
inspiration.get('/', async c => {
  const userId = c.get('userId')
  const query = ListInspirationQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, tags, albumId, unassigned, sort, order } = query.data

  // Parse comma-separated tags
  const tagList = tags
    ? tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : undefined

  const result = await inspirationService.listInspirations(
    userId,
    { page, limit },
    { search, tags: tagList, albumId, unassigned, sort, order },
  )

  return c.json(result)
})

/**
 * POST /inspirations - Create new inspiration
 */
inspiration.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateInspirationInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.createInspiration(userId, input.data)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

/**
 * GET /inspirations/images/presign - Get presigned URL for image upload
 */
inspiration.get('/images/presign', async c => {
  const userId = c.get('userId')
  const query = PresignRequestSchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { fileName, mimeType, fileSize } = query.data
  const result = await inspirationService.generateImageUploadUrl(
    userId,
    fileName,
    mimeType,
    fileSize,
  )

  if (!result.ok) {
    const status =
      result.error === 'INVALID_EXTENSION' ||
      result.error === 'INVALID_MIME_TYPE' ||
      result.error === 'FILE_TOO_LARGE' ||
      result.error === 'FILE_TOO_SMALL'
        ? 400
        : 500

    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * PUT /inspirations/reorder - Reorder inspirations
 */
inspiration.put('/reorder', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = ReorderInspirationsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.reorderInspirations(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * GET /inspirations/:id - Get single inspiration
 */
inspiration.get('/:id', async c => {
  const userId = c.get('userId')
  const inspirationId = c.req.param('id')

  const result = await inspirationService.getInspiration(userId, inspirationId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        inspirationId,
        '/inspirations/:id',
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
 * PUT /inspirations/:id - Update inspiration
 */
inspiration.put('/:id', async c => {
  const userId = c.get('userId')
  const inspirationId = c.req.param('id')
  const body = await c.req.json()
  const input = UpdateInspirationInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.updateInspiration(userId, inspirationId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        inspirationId,
        '/inspirations/:id',
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
 * DELETE /inspirations/:id - Delete inspiration
 */
inspiration.delete('/:id', async c => {
  const userId = c.get('userId')
  const inspirationId = c.req.param('id')

  const result = await inspirationService.deleteInspiration(userId, inspirationId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        inspirationId,
        '/inspirations/:id',
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
// Album Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /albums - List user's albums
 */
inspiration.get('/albums', async c => {
  const userId = c.get('userId')
  const query = ListAlbumQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, tags, parentAlbumId, rootOnly, sort, order } = query.data

  // Parse comma-separated tags
  const tagList = tags
    ? tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : undefined

  const result = await inspirationService.listAlbums(
    userId,
    { page, limit },
    { search, tags: tagList, parentAlbumId, rootOnly, sort, order },
  )

  return c.json(result)
})

/**
 * POST /albums - Create new album
 */
inspiration.post('/albums', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.createAlbum(userId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'DUPLICATE_TITLE'
        ? 409
        : result.error === 'CYCLE_DETECTED' || result.error === 'MAX_DEPTH_EXCEEDED'
          ? 400
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * POST /albums/from-stack - Create album from stacked inspirations (INSP-012)
 */
inspiration.post('/albums/from-stack', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateAlbumFromStackInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.createAlbumFromStack(
    userId,
    input.data.title,
    input.data.inspirationIds,
    {
      description: input.data.description,
      tags: input.data.tags,
    },
  )

  if (!result.ok) {
    const status =
      result.error === 'DUPLICATE_TITLE' ? 409 : result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PUT /albums/reorder - Reorder albums
 */
inspiration.put('/albums/reorder', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = ReorderAlbumsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.reorderAlbums(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * GET /albums/:id - Get single album with metadata
 */
inspiration.get('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await inspirationService.getAlbum(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        albumId,
        '/albums/:id',
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
 * PUT /albums/:id - Update album
 */
inspiration.put('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const input = UpdateAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.updateAlbum(userId, albumId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'DUPLICATE_TITLE'
            ? 409
            : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        albumId,
        '/albums/:id',
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
 * DELETE /albums/:id - Delete album
 */
inspiration.delete('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await inspirationService.deleteAlbum(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    if (status === 403 || status === 404) {
      const { clientIp, geolocation } = await getAuthFailureContext(c)
      logAuthorizationFailure(
        userId,
        albumId,
        '/albums/:id',
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
// Album Items Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /albums/:id/items - Add inspirations to album
 */
inspiration.post('/albums/:id/items', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const input = AddToAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.addToAlbum(userId, albumId, input.data.inspirationIds)

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'VALIDATION_ERROR'
            ? 400
            : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * DELETE /albums/:id/items - Remove inspirations from album
 */
inspiration.delete('/albums/:id/items', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const input = RemoveFromAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.removeFromAlbum(
    userId,
    albumId,
    input.data.inspirationIds,
  )

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Album Hierarchy Routes (DAG)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /albums/:id/breadcrumbs - Get album breadcrumbs (ancestor chain)
 */
inspiration.get('/albums/:id/breadcrumbs', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await inspirationService.getAlbumBreadcrumbs(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ breadcrumbs: result.data })
})

/**
 * POST /albums/:id/parents - Add parent album relationship
 */
inspiration.post('/albums/:id/parents', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const input = AddAlbumParentInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.addAlbumParent(userId, albumId, input.data.parentAlbumId)

  if (!result.ok) {
    const status =
      result.error === 'FORBIDDEN'
        ? 403
        : result.error === 'CYCLE_DETECTED' || result.error === 'MAX_DEPTH_EXCEEDED'
          ? 400
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true }, 201)
})

/**
 * DELETE /albums/:id/parents/:parentId - Remove parent album relationship
 */
inspiration.delete('/albums/:id/parents/:parentId', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const parentAlbumId = c.req.param('parentId')

  const result = await inspirationService.removeAlbumParent(userId, albumId, parentAlbumId)

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

// ─────────────────────────────────────────────────────────────────────────
// MOC Linking Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /inspirations/:id/mocs - Link inspiration to MOC
 */
inspiration.post('/:id/mocs', async c => {
  const userId = c.get('userId')
  const inspirationId = c.req.param('id')
  const body = await c.req.json()
  const input = LinkInspirationToMocInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.linkInspirationToMoc(
    userId,
    inspirationId,
    input.data.mocId,
    input.data.notes,
  )

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true }, 201)
})

/**
 * DELETE /inspirations/:id/mocs/:mocId - Unlink inspiration from MOC
 */
inspiration.delete('/:id/mocs/:mocId', async c => {
  const userId = c.get('userId')
  const inspirationId = c.req.param('id')
  const mocId = c.req.param('mocId')

  const result = await inspirationService.unlinkInspirationFromMoc(userId, inspirationId, mocId)

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

/**
 * POST /albums/:id/mocs - Link album to MOC
 */
inspiration.post('/albums/:id/mocs', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const body = await c.req.json()
  const input = LinkAlbumToMocInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await inspirationService.linkAlbumToMoc(
    userId,
    albumId,
    input.data.mocId,
    input.data.notes,
  )

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true }, 201)
})

/**
 * DELETE /albums/:id/mocs/:mocId - Unlink album from MOC
 */
inspiration.delete('/albums/:id/mocs/:mocId', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')
  const mocId = c.req.param('mocId')

  const result = await inspirationService.unlinkAlbumFromMoc(userId, albumId, mocId)

  if (!result.ok) {
    const status = result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

export default inspiration
