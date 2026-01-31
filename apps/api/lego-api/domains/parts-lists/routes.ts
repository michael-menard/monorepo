import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createPartsListsService } from './application/index.js'
import {
  createMocRepository,
  createPartsListRepository,
  createPartRepository,
} from './adapters/index.js'
import {
  CreatePartsListInputSchema,
  UpdatePartsListInputSchema,
  ListPartsListsQuerySchema,
  CreatePartInputSchema,
  UpdatePartInputSchema,
  BulkCreatePartsInputSchema,
  UpdateStatusInputSchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

// Create repositories using shared db from composition root
const mocRepo = createMocRepository(db, schema)
const partsListRepo = createPartsListRepository(db, schema)
const partRepo = createPartRepository(db, schema)

// Create service with injected dependencies
const partsListsService = createPartsListsService({
  mocRepo,
  partsListRepo,
  partRepo,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const partsLists = new Hono()

// All parts-lists routes require authentication
partsLists.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// User Summary Routes
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /summary - Get user's parts lists summary
 */
partsLists.get('/summary', async c => {
  const userId = c.get('userId')

  const result = await partsListsService.getUserSummary(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Parts List Routes (nested under /mocs/:mocId)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /mocs/:mocId - List parts lists for a MOC
 */
partsLists.get('/mocs/:mocId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const query = ListPartsListsQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit } = query.data
  const result = await partsListsService.listPartsLists(userId, mocId, { page, limit })

  if (!result.ok) {
    const status = result.error === 'MOC_NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * POST /mocs/:mocId - Create a new parts list for a MOC
 */
partsLists.post('/mocs/:mocId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')

  const body = await c.req.json()
  const input = CreatePartsListInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.createPartsList(userId, mocId, input.data)

  if (!result.ok) {
    const status = result.error === 'MOC_NOT_FOUND' ? 404 : result.error === 'DB_ERROR' ? 500 : 400
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * GET /mocs/:mocId/:partsListId - Get a specific parts list
 */
partsLists.get('/mocs/:mocId/:partsListId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const result = await partsListsService.getPartsListWithParts(userId, mocId, partsListId)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * PATCH /mocs/:mocId/:partsListId - Update a parts list
 */
partsLists.patch('/mocs/:mocId/:partsListId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const body = await c.req.json()
  const input = UpdatePartsListInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.updatePartsList(userId, mocId, partsListId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * PUT /mocs/:mocId/:partsListId/status - Update parts list status
 */
partsLists.put('/mocs/:mocId/:partsListId/status', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const body = await c.req.json()
  const input = UpdateStatusInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.updatePartsListStatus(
    userId,
    mocId,
    partsListId,
    input.data.status,
  )

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /mocs/:mocId/:partsListId - Delete a parts list
 */
partsLists.delete('/mocs/:mocId/:partsListId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const result = await partsListsService.deletePartsList(userId, mocId, partsListId)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

// ─────────────────────────────────────────────────────────────────────────
// Part Routes (nested under /mocs/:mocId/:partsListId/parts)
// ─────────────────────────────────────────────────────────────────────────

/**
 * GET /mocs/:mocId/:partsListId/parts - List all parts in a parts list
 */
partsLists.get('/mocs/:mocId/:partsListId/parts', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const result = await partsListsService.listParts(userId, mocId, partsListId)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ parts: result.data })
})

/**
 * POST /mocs/:mocId/:partsListId/parts - Add a part to a parts list
 */
partsLists.post('/mocs/:mocId/:partsListId/parts', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const body = await c.req.json()
  const input = CreatePartInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.addPart(userId, mocId, partsListId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'DB_ERROR'
            ? 500
            : 400
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * POST /mocs/:mocId/:partsListId/parts/bulk - Add multiple parts to a parts list
 */
partsLists.post('/mocs/:mocId/:partsListId/parts/bulk', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')

  const body = await c.req.json()
  const input = BulkCreatePartsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.addParts(userId, mocId, partsListId, input.data.parts)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' || result.error === 'PARTS_LIST_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : result.error === 'DB_ERROR'
            ? 500
            : 400
    return c.json({ error: result.error }, status)
  }

  return c.json({ parts: result.data }, 201)
})

/**
 * PATCH /mocs/:mocId/:partsListId/parts/:partId - Update a part
 */
partsLists.patch('/mocs/:mocId/:partsListId/parts/:partId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')
  const partId = c.req.param('partId')

  const body = await c.req.json()
  const input = UpdatePartInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await partsListsService.updatePart(userId, mocId, partsListId, partId, input.data)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' ||
      result.error === 'PARTS_LIST_NOT_FOUND' ||
      result.error === 'PART_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /mocs/:mocId/:partsListId/parts/:partId - Delete a part
 */
partsLists.delete('/mocs/:mocId/:partsListId/parts/:partId', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('mocId')
  const partsListId = c.req.param('partsListId')
  const partId = c.req.param('partId')

  const result = await partsListsService.deletePart(userId, mocId, partsListId, partId)

  if (!result.ok) {
    const status =
      result.error === 'MOC_NOT_FOUND' ||
      result.error === 'PARTS_LIST_NOT_FOUND' ||
      result.error === 'PART_NOT_FOUND'
        ? 404
        : result.error === 'FORBIDDEN'
          ? 403
          : 500
    return c.json({ error: result.error }, status)
  }

  return c.body(null, 204)
})

export default partsLists
