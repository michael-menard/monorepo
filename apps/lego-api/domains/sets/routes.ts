import { Hono } from 'hono'
import { createDb } from '@repo/api-core'
import { auth } from '../../middleware/auth.js'
import { createSetsService } from './services.js'
import { createSetRepository, createSetImageRepository } from './repositories.js'
import { createImageStorage } from './storage.js'
import {
  CreateSetInputSchema,
  UpdateSetInputSchema,
  ListSetsQuerySchema,
  CreateSetImageInputSchema,
  UpdateSetImageInputSchema,
} from './types.js'

// Import schema for typed DB
import * as schema from '../../db/schema.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create typed database client
const db = createDb(schema)

// Create repositories
const setRepo = createSetRepository(db, schema)
const setImageRepo = createSetImageRepository(db, schema)

// Create storage adapter
const imageStorage = createImageStorage()

// Create service with injected dependencies
const setsService = createSetsService({
  setRepo,
  setImageRepo,
  imageStorage,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const sets = new Hono()

// All sets routes require authentication
sets.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// Set Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET / - List user's sets
 */
sets.get('/', async (c) => {
  const userId = c.get('userId')
  const query = ListSetsQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, theme, isBuilt } = query.data
  const result = await setsService.listSets(
    userId,
    { page, limit },
    { search, theme, isBuilt }
  )

  return c.json(result)
})

/**
 * GET /:id - Get single set with images
 */
sets.get('/:id', async (c) => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const result = await setsService.getSetWithImages(userId, setId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST / - Create new set
 */
sets.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateSetInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.createSet(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'DB_ERROR' ? 500 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /:id - Update set
 */
sets.patch('/:id', async (c) => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const body = await c.req.json()
  const input = UpdateSetInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.updateSet(userId, setId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /:id - Delete set
 */
sets.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const result = await setsService.deleteSet(userId, setId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

// ─────────────────────────────────────────────────────────────────────────
// Set Image Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /:setId/images - List images for a set
 */
sets.get('/:setId/images', async (c) => {
  const userId = c.get('userId')
  const setId = c.req.param('setId')

  const result = await setsService.listSetImages(userId, setId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /:setId/images - Upload new image for a set
 */
sets.post('/:setId/images', async (c) => {
  const userId = c.get('userId')
  const setId = c.req.param('setId')

  // Parse multipart form
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  // Extract metadata
  const positionStr = formData.get('position')
  const input = CreateSetImageInputSchema.safeParse({
    setId,
    position: positionStr ? parseInt(positionStr as string, 10) : undefined,
  })

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  // Convert File to buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await setsService.uploadSetImage(
    userId,
    setId,
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
      result.error === 'NOT_FOUND' ? 404 :
      result.error === 'FORBIDDEN' ? 403 :
      result.error === 'INVALID_FILE' ? 400 :
      result.error === 'UPLOAD_FAILED' ? 500 :
      result.error === 'DB_ERROR' ? 500 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /images/:imageId - Update image (position)
 */
sets.patch('/images/:imageId', async (c) => {
  const userId = c.get('userId')
  const imageId = c.req.param('imageId')

  const body = await c.req.json()
  const input = UpdateSetImageInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.updateSetImage(userId, imageId, input.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /images/:imageId - Delete image
 */
sets.delete('/images/:imageId', async (c) => {
  const userId = c.get('userId')
  const imageId = c.req.param('imageId')

  const result = await setsService.deleteSetImage(userId, imageId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

export default sets
