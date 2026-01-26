import { Hono } from 'hono'
import { createDb } from '@repo/api-core'
import { auth } from '../../middleware/auth.js'
import { createGalleryService } from './services.js'
import { createImageRepository, createAlbumRepository } from './repositories.js'
import { createImageStorage } from './storage.js'
import {
  CreateImageInputSchema,
  UpdateImageInputSchema,
  ListImagesQuerySchema,
  CreateAlbumInputSchema,
  UpdateAlbumInputSchema,
  ListAlbumsQuerySchema,
} from './types.js'

// Import schema for typed DB
import * as schema from '../../db/schema.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create typed database client
const db = createDb(schema)

// Create repositories
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

// All gallery routes require authentication
gallery.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// Image Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /images - List user's images
 */
gallery.get('/images', async (c) => {
  const userId = c.get('userId')
  const query = ListImagesQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, albumId } = query.data
  const result = await galleryService.listImages(
    userId,
    { page, limit },
    { search, albumId: albumId ?? null }
  )

  return c.json(result)
})

/**
 * GET /images/:id - Get single image
 */
gallery.get('/images/:id', async (c) => {
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
gallery.post('/images', async (c) => {
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
      parsedTags = body.tags.split(',').map((t) => t.trim())
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
    input.data
  )

  if (!result.ok) {
    const status =
      result.error === 'INVALID_FILE' ? 400 :
      result.error === 'UPLOAD_FAILED' ? 500 :
      result.error === 'DB_ERROR' ? 500 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /images/:id - Update image metadata
 */
gallery.patch('/images/:id', async (c) => {
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
gallery.delete('/images/:id', async (c) => {
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
gallery.get('/albums', async (c) => {
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
gallery.get('/albums/:id', async (c) => {
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
 */
gallery.post('/albums', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateAlbumInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await galleryService.createAlbum(userId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'VALIDATION_ERROR' ? 400 :
      result.error === 'FORBIDDEN' ? 403 :
      result.error === 'DB_ERROR' ? 500 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /albums/:id - Update album
 */
gallery.patch('/albums/:id', async (c) => {
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
      result.error === 'NOT_FOUND' ? 404 :
      result.error === 'FORBIDDEN' ? 403 :
      result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /albums/:id - Delete album (orphans images)
 */
gallery.delete('/albums/:id', async (c) => {
  const userId = c.get('userId')
  const albumId = c.req.param('id')

  const result = await galleryService.deleteAlbum(userId, albumId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

export default gallery
