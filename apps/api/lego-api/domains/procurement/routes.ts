import { Hono } from 'hono'
import { z } from 'zod'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createProcurementService } from './application/services.js'
import { createProcurementRepository } from './adapters/repositories.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const procurementRepo = createProcurementRepository(db, schema)
const procurementService = createProcurementService({ procurementRepo })

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const procurement = new Hono()
procurement.use('*', auth)

/**
 * GET /procurement/summary — aggregate stats
 */
procurement.get('/summary', async c => {
  const userId = c.get('userId')
  const result = await procurementService.getSummary(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

/**
 * GET /procurement/parts-needed — aggregated parts minus inventory
 */
procurement.get('/parts-needed', async c => {
  const userId = c.get('userId')
  const result = await procurementService.getPartsNeeded(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json({ parts: result.data })
})

/**
 * GET /procurement/inventory-available — parts available from inventory
 */
procurement.get('/inventory-available', async c => {
  const userId = c.get('userId')
  const result = await procurementService.getInventoryAvailable(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json({ inventory: result.data })
})

/**
 * GET /procurement/prices — cached pricing with freshness metadata
 */
procurement.get('/prices', async c => {
  const userId = c.get('userId')
  const result = await procurementService.getPricedParts(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json({ parts: result.data })
})

/**
 * POST /procurement/fetch-prices — trigger scraper for parts
 * Returns job ID for WebSocket progress tracking
 */
procurement.post('/fetch-prices', async c => {
  const userId = c.get('userId')

  // Get parts that need pricing
  const partsResult = await procurementService.getPartsNeeded(userId)
  if (!partsResult.ok) {
    return c.json({ error: partsResult.error }, 500)
  }

  const partsToBuy = partsResult.data.filter(p => p.quantityToBuy > 0)

  if (partsToBuy.length === 0) {
    return c.json({ error: 'No parts to fetch prices for' }, 400)
  }

  // TODO: Queue scraper job via BullMQ, return job ID
  // For now, return a placeholder acknowledging the request
  const jobId = crypto.randomUUID()

  return c.json(
    {
      jobId,
      partsCount: partsToBuy.length,
      message: `Price fetch queued for ${partsToBuy.length} parts`,
    },
    202,
  )
})

// ─────────────────────────────────────────────────────────────────────────
// Want-to-Build Toggle (convenience endpoint — also on MOC domain)
// ─────────────────────────────────────────────────────────────────────────

const WantToBuildInputSchema = z.object({
  wantToBuild: z.boolean(),
})

/**
 * PATCH /procurement/mocs/:id/want-to-build — toggle flag
 */
procurement.patch('/mocs/:id/want-to-build', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')
  const body = await c.req.json()
  const input = WantToBuildInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await procurementService.toggleWantToBuild(userId, mocId, input.data.wantToBuild)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true, wantToBuild: input.data.wantToBuild })
})

export default procurement
