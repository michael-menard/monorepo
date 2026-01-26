import { Hono } from 'hono'
import { createDb } from '@repo/api-core'
import { auth } from '../../middleware/auth.js'
import { createWishlistService } from './services.js'
import { createWishlistRepository } from './repositories.js'
import {
  CreateWishlistItemInputSchema,
  UpdateWishlistItemInputSchema,
  ListWishlistQuerySchema,
  ReorderWishlistInputSchema,
} from './types.js'

// Import schema for typed DB
import * as schema from '../../db/schema.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create typed database client
const db = createDb(schema)

// Create repository
const wishlistRepo = createWishlistRepository(db, schema)

// Create service with injected dependencies
const wishlistService = createWishlistService({
  wishlistRepo,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const wishlist = new Hono()

// All wishlist routes require authentication
wishlist.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// List & Reorder Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET / - List user's wishlist items
 */
wishlist.get('/', async (c) => {
  const userId = c.get('userId')
  const query = ListWishlistQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, search, store, tags, priority, sort, order } = query.data

  // Parse comma-separated tags
  const tagList = tags
    ? tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined

  const result = await wishlistService.listItems(
    userId,
    { page, limit },
    { search, store, tags: tagList, priority, sort, order }
  )

  return c.json(result)
})

/**
 * PUT /reorder - Reorder wishlist items
 */
wishlist.put('/reorder', async (c) => {
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
// Single Item Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /:id - Get single wishlist item
 */
wishlist.get('/:id', async (c) => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.getItem(userId, itemId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST / - Create new wishlist item
 */
wishlist.post('/', async (c) => {
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
wishlist.put('/:id', async (c) => {
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
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /:id - Delete wishlist item
 */
wishlist.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const itemId = c.req.param('id')

  const result = await wishlistService.deleteItem(userId, itemId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

export default wishlist
