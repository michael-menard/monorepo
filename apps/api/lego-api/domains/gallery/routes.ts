import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { requireQuota, releaseReservedQuota } from '../../middleware/require-quota.js'
import { authorizationService, db, schema } from '../../composition/index.js'
import { createGalleryService } from './application/index.js'
import {
  createImageRepository,
  createAlbumRepository,
  createImageStorage,
} from './adapters/index.js'
import {
  CreateImageInputSchema,
  UpdateImageInputSchema,
  ListImagesQuerySchema,
  CreateAlbumInputSchema,
  UpdateAlbumInputSchema,
  ListAlbumsQuerySchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create repositories using shared db from composition root
const imageRepo = createImageRepository(db, schema)
const albumRepo = createAlbumRepository(db, schema)

// Create storage adapter
const imageStorage = createImageStorage()

// Create service with injected dependencies
const galleryService = createGalleryService({
  imageRepo,
  albumRepo,
  imageStorage,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const gallery = new Hono()

// All gallery routes require authentication and gallery feature (pro-tier+)
gallery.use('*', auth)
gallery.use('*', loadPermissions)
gallery.use('*', requireFeature('gallery'))

// ─────────────────────────────────────────────────────────────────────────
// Image Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /images - List user's images
 */
gallery.get('/images', async c => {
  const userId = c.get('userId')
  const query = ListImagesQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, albumId } = query.data
  const result = await galleryService.listImages(
    userId,
    { page, limit },
    { search, albumId: albumId ?? null },
  )

  return c.json(result)
})

/**
 * GET /images/:id - Get single image
 */
gallery.get('/images/:id', async c => {
  const userId = c.get('userId')
  const imageId = c.req.param('id')

  const result = await galleryService.getImage(userId, imageId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /images - Upload new image
 */
gallery.post('/images', async c => {
  const userId = c.get('userId')

  // Parse multipart form
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // Extract metadata
  const body = {
    title: formData.get('title'),
    description: formData.get('description'),
    tags: formData.get('tags'),
    albumId: formData.get('albumId'),
  }

  // Parse tags if provided as JSON string
  let parsedTags: string[] | undefined
  if (typeof body.tags === 'string') {
    try {
      parsedTags = JSON.parse(body.tags)
    } catch {
      parsedTags = body.tags.split(',').map(t => t.trim())
    }
  }

  // Validate input
  const input = CreateImageInputSchema.safeParse({
    title: body.title,
    description: body.description || undefined,
    tags: parsedTags,
    albumId: body.albumId || undefined,
  })

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  // Convert File to buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await galleryService.uploadImage(
    userId,
    {
      buffer,
      filename: file.name,
      mimetype: file.type,
      size: file.size,
    },
    input.data,
  )

  if (!result.ok) {
    const status =
      result.error === 'INVALID_FILE'
        ? 400
        : result.error === 'UPLOAD_FAILED'
          ? 500
          : result.error === 'DB_ERROR'
            ? 500
            : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /images/:id - Update image metadata
 */
gallery.patch('/images/:id', async c => {
  const userId = c.get('userId')
  const imageId = c.req.param('id')

  const body = await c.req.json()
  const input = UpdateImageInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await galleryService.updateImage(userId, imageId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /images/:id - Delete image
 */
gallery.delete('/images/:id', async c => {
  const userId = c.get('userId')
  const imageId = c.req.param('id')

  const result = await galleryService.deleteImage(userId, imageId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
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
gallery.get('/albums', async c => {
  const userId = c.get('userId')
  const query = ListAlbumsQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search } = query.data
  const result = await galleryService.listAlbums(userId, { page, limit }, { search })

  return c.json(result)
})

/**
 * GET /albums/:id - Get single album with images
 */
gallery.get('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await galleryService.getAlbumWithImages(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /albums - Create new album
 *
 * Requires galleries quota availability. Quota is reserved atomically before
 * creation and released on failure.
 */
gallery.post('/albums', requireQuota('galleries'), async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateAlbumInputSchema.safeParse(body)

  if (!input.success) {
    // Release reserved quota on validation failure
    await releaseReservedQuota(c)
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await galleryService.createAlbum(userId, input.data)

  if (!result.ok) {
    // Release reserved quota on creation failure
    await releaseReservedQuota(c)
    const status =
      result.error === 'VALIDATION_ERROR'
        ? 400
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'DB_ERROR'
            ? 500
            : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /albums/:id - Update album
 */
gallery.patch('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const body = await c.req.json()
  const input = UpdateAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await galleryService.updateAlbum(userId, albumId, input.data)

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

  return c.json(result.data)
})

/**
 * DELETE /albums/:id - Delete album (orphans images)
 *
 * Releases galleries quota after successful deletion.
 */
gallery.delete('/albums/:id', async c => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await galleryService.deleteAlbum(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  // Release galleries quota after successful deletion
  await authorizationService.releaseQuota(userId, 'galleries')

  return c.body(null, 204)
})

export default gallery
