import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createSetsService } from './application/index.js'
import {
  createSetRepository,
  createSetImageRepository,
  createStoreRepository,
  createImageStorage,
} from './adapters/index.js'
import {
  CreateSetInputSchema,
  UpdateSetInputSchema,
  ListSetsQuerySchema,
  CreateSetImageInputSchema,
  UpdateSetImageInputSchema,
  PresignSetImageInputSchema,
  RegisterSetImageInputSchema,
  ReorderInputSchema,
  PurchaseInputSchema,
  BuildStatusUpdateInputSchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const setRepo = createSetRepository(db, schema)
const setImageRepo = createSetImageRepository(db, schema)
const storeRepo = createStoreRepository(db, schema)
const imageStorage = createImageStorage()

const setsService = createSetsService({
  setRepo,
  setImageRepo,
  storeRepo,
  imageStorage,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const sets = new Hono()

sets.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// Store Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /stores - List all stores
 */
sets.get('/stores', async c => {
  const stores = await setsService.listStores()
  return c.json(stores)
})

// ─────────────────────────────────────────────────────────────────────────
// Set Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET / - List user's sets
 *
 * Supports filtering by status (wanted/owned), search, store, tags,
 * priority/price ranges, and smart sorting (bestValue, expiringSoon, hiddenGems).
 */
sets.get('/', async c => {
  const userId = c.get('userId')
  const query = ListSetsQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const {
    page,
    limit,
    search,
    status,
    storeId,
    tags,
    priority,
    priorityRange,
    priceRange,
    isBuilt,
    sort,
    order,
  } = query.data

  const tagList = tags
    ? tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
    : undefined

  const result = await setsService.listSets(
    userId,
    { page, limit },
    {
      search,
      status,
      storeId,
      tags: tagList,
      priority,
      priorityRange,
      priceRange,
      isBuilt,
      sort,
      order,
    },
  )

  return c.json(result)
})

/**
 * POST /reorder - Reorder sets (wanted items)
 */
sets.post('/reorder', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = ReorderInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.reorderSets(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * GET /:id - Get single set with images
 */
sets.get('/:id', async c => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const result = await setsService.getSetWithImages(userId, setId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({
    ...result.data.set,
    images: result.data.images,
  })
})

/**
 * POST / - Create new set
 */
sets.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateSetInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.createSet(userId, input.data)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /:id - Update set
 */
sets.patch('/:id', async c => {
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
sets.delete('/:id', async c => {
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
// Purchase Route (wanted → owned)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /:id/purchase - Transition a wanted set to owned
 */
sets.post('/:id/purchase', async c => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const body = await c.req.json()
  const input = PurchaseInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.purchaseSet(userId, setId, input.data)

  if (!result.ok) {
    if (result.error === 'INVALID_STATUS') {
      return c.json({ error: 'INVALID_STATUS', message: 'Only wanted items can be purchased' }, 400)
    }
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Build Status Route
// ─────────────────────────────────────────────────────────────────────────

/**
 * PATCH /:id/build-status - Update build status (owned items only)
 */
sets.patch('/:id/build-status', async c => {
  const userId = c.get('userId')
  const setId = c.req.param('id')

  const body = await c.req.json()
  const input = BuildStatusUpdateInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.updateBuildStatus(userId, setId, input.data.buildStatus)

  if (!result.ok) {
    if (result.error === 'INVALID_STATUS') {
      return c.json(
        { error: 'INVALID_STATUS', message: 'Build status can only be set on owned items' },
        400,
      )
    }
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Set Image Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /:setId/images - List images for a set
 */
sets.get('/:setId/images', async c => {
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
 * POST /:setId/images/presign - Get presigned URL for client-side image upload
 */
sets.post('/:setId/images/presign', async c => {
  const userId = c.get('userId')
  const setId = c.req.param('setId')

  const body = await c.req.json()
  const input = PresignSetImageInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await setsService.presignSetImage(
    userId,
    setId,
    input.data.filename,
    input.data.contentType,
  )

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'INVALID_FILE'
            ? 400
            : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /:setId/images - Upload or register an image for a set
 *
 * Supports two flows:
 * 1. Multipart form upload (direct): sends file as form data
 * 2. JSON register (after presign): sends { imageUrl, key, thumbnailUrl? }
 */
sets.post('/:setId/images', async c => {
  const userId = c.get('userId')
  const setId = c.req.param('setId')
  const contentType = c.req.header('content-type') || ''

  // JSON body = register flow (after presigned upload)
  if (contentType.includes('application/json')) {
    const body = await c.req.json()
    const input = RegisterSetImageInputSchema.safeParse(body)

    if (!input.success) {
      return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
    }

    const result = await setsService.registerSetImage(userId, setId, input.data)

    if (!result.ok) {
      const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
      return c.json({ error: result.error }, status)
    }

    return c.json(result.data, 201)
  }

  // Multipart = direct upload flow
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return c.json({ error: 'No file provided' }, 400)
  }

  const positionStr = formData.get('position')
  const input = CreateSetImageInputSchema.safeParse({
    setId,
    position: positionStr ? parseInt(positionStr as string, 10) : undefined,
  })

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await setsService.uploadSetImage(
    userId,
    setId,
    { buffer, filename: file.name, mimetype: file.type, size: file.size },
    input.data,
  )

  if (!result.ok) {
    const status =
      result.error === 'NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'INVALID_FILE'
            ? 400
            : result.error === 'UPLOAD_FAILED'
              ? 500
              : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * PATCH /images/:imageId - Update image (position)
 */
sets.patch('/images/:imageId', async c => {
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
sets.delete('/images/:imageId', async c => {
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
