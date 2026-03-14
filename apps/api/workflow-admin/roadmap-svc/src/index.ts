import { Hono } from 'hono'
import { logger } from '@repo/logger'
import {
  getPlans,
  getPlanBySlug,
  reorderPlansPriority,
  updatePlan,
  getStoriesByPlanSlug,
  type PlanListParams,
  type PlanUpdateInput,
} from './services/planService'

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
  const status = c.req.query('status') ? c.req.query('status')!.split(',') : undefined
  const planType = c.req.query('planType') ? c.req.query('planType')!.split(',') : undefined
  const priority = c.req.query('priority') ? c.req.query('priority')!.split(',') : undefined
  const tags = c.req.query('tags') ? c.req.query('tags')!.split(',') : undefined
  const excludeCompleted = c.req.query('excludeCompleted') !== 'false'
  const search = c.req.query('search') || undefined

  const params: PlanListParams = {
    page,
    limit,
    status,
    planType,
    priority,
    tags,
    excludeCompleted,
    search,
  }

  try {
    const result = await getPlans(params)
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch plans', { error, params })
    return c.json({ error: 'Failed to fetch plans' }, 500)
  }
})

app.get('/api/v1/roadmap/:slug', async c => {
  const slug = c.req.param('slug')

  try {
    const result = await getPlanBySlug(slug)
    if (!result) {
      return c.json({ error: 'Plan not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch plan', { error, slug })
    return c.json({ error: 'Failed to fetch plan' }, 500)
  }
})

app.patch('/api/v1/roadmap/:slug', async c => {
  const slug = c.req.param('slug')
  const input = (await c.req.json()) as PlanUpdateInput

  try {
    const result = await updatePlan(slug, input)
    if (!result) {
      return c.json({ error: 'Plan not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to update plan', { error, slug, input })
    return c.json({ error: 'Failed to update plan' }, 500)
  }
})

app.get('/api/v1/roadmap/:slug/stories', async c => {
  const slug = c.req.param('slug')

  try {
    const result = await getStoriesByPlanSlug(slug)
    return c.json({ data: result })
  } catch (error) {
    logger.error('Failed to fetch plan stories', { error, slug })
    return c.json({ error: 'Failed to fetch plan stories' }, 500)
  }
})

app.patch('/api/v1/roadmap/reorder', async c => {
  const body = await c.req.json()

  const { priority, items } = body as {
    priority: string
    items: Array<{ id: string; priorityOrder: number }>
  }

  if (!priority || !items || !Array.isArray(items)) {
    return c.json({ error: 'Invalid request: priority and items are required' }, 400)
  }

  try {
    await reorderPlansPriority(priority, items)
    return c.json({ success: true })
  } catch (error) {
    logger.error('Failed to reorder plans', { error, priority, items })
    return c.json({ error: 'Failed to reorder plans' }, 500)
  }
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3004

logger.info(`Starting Roadmap API on port ${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
