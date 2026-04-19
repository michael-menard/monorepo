import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createMinifigsService } from './application/index.js'
import {
  createMinifigInstanceRepository,
  createMinifigArchetypeRepository,
  createMinifigVariantRepository,
  syncTagsForEntity,
} from './adapters/index.js'
import {
  ListMinifigsQuerySchema,
  CreateMinifigInstanceInputSchema,
  UpdateMinifigInstanceInputSchema,
  UpdateMinifigVariantInputSchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const instanceRepo = createMinifigInstanceRepository(db, schema)
const archetypeRepo = createMinifigArchetypeRepository(db, schema)
const variantRepo = createMinifigVariantRepository(db, schema)

const minifigsService = createMinifigsService({
  instanceRepo,
  archetypeRepo,
  variantRepo,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const minifigs = new Hono()

minifigs.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// Archetype Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /archetypes - List archetypes
 */
minifigs.get('/archetypes', async c => {
  const userId = c.get('userId')
  const search = c.req.query('search')
  const archetypes = await minifigsService.listArchetypes(userId, search)
  return c.json(archetypes)
})

// ─────────────────────────────────────────────────────────────────────────
// Variant Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /variants - List variants
 */
minifigs.get('/variants', async c => {
  const userId = c.get('userId')
  const archetypeId = c.req.query('archetypeId')
  const search = c.req.query('search')
  const variants = await minifigsService.listVariants(userId, { archetypeId, search })
  return c.json(variants)
})

/**
 * GET /variants/:id - Get variant detail
 */
minifigs.get('/variants/:id', async c => {
  const userId = c.get('userId')
  const variantId = c.req.param('id')
  const result = await minifigsService.getVariant(userId, variantId)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * PATCH /variants/:id - Update variant (theme, subtheme)
 */
minifigs.patch('/variants/:id', async c => {
  const userId = c.get('userId')
  const variantId = c.req.param('id')
  const body = await c.req.json()
  const parseResult = UpdateMinifigVariantInputSchema.safeParse(body)
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.flatten() }, 400)
  }

  const result = await minifigsService.updateVariant(userId, variantId, parseResult.data)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Instance Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET / - List minifig instances
 */
minifigs.get('/', async c => {
  const userId = c.get('userId')

  const queryResult = ListMinifigsQuerySchema.safeParse(c.req.query())
  if (!queryResult.success) {
    return c.json({ error: 'Invalid query parameters', details: queryResult.error.flatten() }, 400)
  }

  const { page, limit, search, status, condition, sourceType, tags, sort, order } = queryResult.data

  const filters = {
    search,
    status,
    condition,
    sourceType,
    tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
    sort,
    order,
  }

  const result = await minifigsService.listInstances(userId, { page, limit }, filters)

  return c.json({
    items: result.items,
    pagination: result.pagination,
  })
})

/**
 * POST / - Create minifig instance
 */
minifigs.post('/', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const parseResult = CreateMinifigInstanceInputSchema.safeParse(body)
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.flatten() }, 400)
  }

  const result = await minifigsService.createInstance(userId, parseResult.data)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data, 201)
})

/**
 * POST /variants - Create or get variant (used by scrapers)
 */
minifigs.post('/variants', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()

  // If legoNumber provided, use getOrCreate to avoid duplicates
  if (body.legoNumber) {
    const result = await minifigsService.getOrCreateVariant(userId, body.legoNumber, body)
    if (!result.ok) {
      return c.json({ error: result.error }, 500)
    }
    return c.json(result.data, 201)
  }

  const result = await minifigsService.createVariant(userId, body)
  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }
  return c.json(result.data, 201)
})

/**
 * GET /:id - Get minifig instance detail
 */
minifigs.get('/:id', async c => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const result = await minifigsService.getInstance(userId, id)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * PATCH /:id - Update minifig instance
 */
minifigs.patch('/:id', async c => {
  const userId = c.get('userId')
  const id = c.req.param('id')

  const body = await c.req.json()
  const parseResult = UpdateMinifigInstanceInputSchema.safeParse(body)
  if (!parseResult.success) {
    return c.json({ error: 'Validation failed', details: parseResult.error.flatten() }, 400)
  }

  const { tags: tagInput, ...instanceInput } = parseResult.data

  const result = await minifigsService.updateInstance(userId, id, instanceInput)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  if (tagInput !== undefined) {
    await syncTagsForEntity(db, schema, id, tagInput)
    result.data.tags = tagInput.map(t => t.toLowerCase().trim()).filter(Boolean)
  }

  return c.json(result.data)
})

/**
 * POST /bulk-tags - Add or remove tags from multiple minifig instances
 * Body: { ids: string[], add?: string[], remove?: string[] }
 */
minifigs.post('/bulk-tags', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const { ids, add, remove } = body as {
    ids?: string[]
    add?: string[]
    remove?: string[]
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'ids must be a non-empty array' }, 400)
  }

  if ((!add || add.length === 0) && (!remove || remove.length === 0)) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'must provide add or remove tags' }, 400)
  }

  const normalizedAdd = (add ?? []).map(t => t.toLowerCase().trim()).filter(Boolean)
  const normalizedRemove = new Set((remove ?? []).map(t => t.toLowerCase().trim()).filter(Boolean))

  let updated = 0

  for (const id of ids) {
    // Verify ownership
    const existing = await minifigsService.getInstance(userId, id)
    if (!existing.ok) continue

    // Get current tags
    const currentTags = existing.data.tags ?? []

    // Apply add + remove
    const tagSet = new Set(currentTags)
    for (const t of normalizedAdd) tagSet.add(t)
    for (const t of normalizedRemove) tagSet.delete(t)

    await syncTagsForEntity(db, schema, id, Array.from(tagSet))
    updated++
  }

  return c.json({ updated, total: ids.length })
})

/**
 * POST /bulk-delete - Delete multiple minifig instances
 */
minifigs.post('/bulk-delete', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const ids: string[] = body?.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'ids must be a non-empty array' }, 400)
  }

  const results = await Promise.allSettled(
    ids.map(id => minifigsService.deleteInstance(userId, id)),
  )

  const deleted = results.filter(r => r.status === 'fulfilled' && r.value.ok).length

  return c.json({ deleted, total: ids.length })
})

/**
 * DELETE /:id - Delete minifig instance
 */
minifigs.delete('/:id', async c => {
  const userId = c.get('userId')
  const id = c.req.param('id')
  const result = await minifigsService.deleteInstance(userId, id)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : result.error === 'FORBIDDEN' ? 403 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true })
})

export default minifigs
