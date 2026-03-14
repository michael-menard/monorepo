import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { getPlans, type PlanListParams } from './services/planService'

const app = new Hono()

app.get('/', c => {
  return c.json({
    message: 'Roadmap API',
    version: '1.0.0',
    endpoints: ['/health', '/api/v1/roadmap'],
  })
})

app.get('/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/v1/roadmap', async c => {
  const page = c.req.query('page') ? parseInt(c.req.query('page')!) : 1
  const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 10
  const status = c.req.query('status') || undefined
  const planType = c.req.query('planType') || undefined
  const priority = c.req.query('priority') || undefined

  const params: PlanListParams = {
    page,
    limit,
    status,
    planType,
    priority,
  }

  try {
    const result = await getPlans(params)
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch plans', { error, params })
    return c.json({ error: 'Failed to fetch plans' }, 500)
  }
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3004

logger.info(`Starting Roadmap API on port ${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
