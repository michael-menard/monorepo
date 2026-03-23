import 'dotenv/config'
import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { sseRoutes } from './routes/sse'
import {
  getPlans,
  getPlanBySlug,
  reorderPlans,
  reorderPlanStories,
  updatePlan,
  getStoriesByPlanSlug,
  getStoryById,
  updateStory,
  updateStoryContentSection,
  getPlanImpactAnalysis,
  executePlanRetire,
  RetireActionSchema,
  type PlanListParams,
  type PlanUpdateInput,
  type StoryUpdateInput,
} from './services/planService'
import { getDashboard } from './services/dashboardService'

const app = new Hono()

app.route('/', sseRoutes)

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

app.get('/api/v1/dashboard', async c => {
  try {
    const result = await getDashboard()
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch dashboard', { error: String(error) })
    console.error('Full error:', error)
    return c.json({ error: 'Failed to fetch dashboard', detail: String(error) }, 500)
  }
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
    logger.error('Failed to fetch plans', { error: String(error), params })
    console.error('Full error:', error)
    return c.json({ error: 'Failed to fetch plans', detail: String(error) }, 500)
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

app.get('/api/v1/roadmap/:slug/impact', async c => {
  const slug = c.req.param('slug')

  try {
    const result = await getPlanImpactAnalysis(slug)
    if (!result) {
      return c.json({ error: 'Plan not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch plan impact', { error: String(error), slug })
    return c.json({ error: 'Failed to fetch plan impact', detail: String(error) }, 500)
  }
})

app.post('/api/v1/roadmap/:slug/retire', async c => {
  const slug = c.req.param('slug')

  try {
    const body = await c.req.json()
    const parsed = RetireActionSchema.safeParse(body.action)
    if (!parsed.success) {
      return c.json({ error: 'Invalid action. Must be "delete" or "supersede".' }, 400)
    }

    const result = await executePlanRetire(slug, parsed.data)
    if (!result.success) {
      return c.json({ error: result.error }, 404)
    }
    return c.json({ success: true })
  } catch (error) {
    logger.error('Failed to retire plan', { error: String(error), slug })
    return c.json({ error: 'Failed to retire plan', detail: String(error) }, 500)
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
    logger.error('Failed to fetch plan stories', { error: String(error), slug })
    console.error('Full error:', error)
    return c.json({ error: 'Failed to fetch plan stories', detail: String(error) }, 500)
  }
})

app.patch('/api/v1/roadmap/:slug/stories/reorder', async c => {
  const slug = c.req.param('slug')
  const body = await c.req.json()

  const { items } = body as {
    items: Array<{ id: string; sortOrder: number }>
  }

  if (!items || !Array.isArray(items)) {
    return c.json({ error: 'Invalid request: items are required' }, 400)
  }

  try {
    await reorderPlanStories(slug, items)
    return c.json({ success: true })
  } catch (error) {
    logger.error('Failed to reorder plan stories', { error, slug, items })
    return c.json({ error: 'Failed to reorder plan stories' }, 500)
  }
})

app.patch('/api/v1/roadmap/reorder', async c => {
  const body = await c.req.json()

  const { items } = body as {
    items: Array<{ id: string; sortOrder: number }>
  }

  if (!items || !Array.isArray(items)) {
    return c.json({ error: 'Invalid request: items are required' }, 400)
  }

  try {
    await reorderPlans(items)
    return c.json({ success: true })
  } catch (error) {
    logger.error('Failed to reorder plans', { error, items })
    return c.json({ error: 'Failed to reorder plans' }, 500)
  }
})

app.patch('/api/v1/stories/:storyId', async c => {
  const storyId = c.req.param('storyId')
  const input = (await c.req.json()) as StoryUpdateInput

  try {
    const result = await updateStory(storyId, input)
    if (!result) {
      return c.json({ error: 'Story not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to update story', { error: String(error), storyId, input })
    return c.json({ error: 'Failed to update story', detail: String(error) }, 500)
  }
})

app.patch('/api/v1/stories/:storyId/content/:sectionName', async c => {
  const storyId = c.req.param('storyId')
  const sectionName = c.req.param('sectionName')
  const { contentText } = (await c.req.json()) as { contentText: string }

  try {
    const result = await updateStoryContentSection(storyId, sectionName, contentText)
    if (!result) {
      return c.json({ error: 'Section not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to update story content section', {
      error: String(error),
      storyId,
      sectionName,
    })
    return c.json({ error: 'Failed to update story content section', detail: String(error) }, 500)
  }
})

app.get('/api/v1/stories/:storyId', async c => {
  const storyId = c.req.param('storyId')

  try {
    const result = await getStoryById(storyId)
    if (!result) {
      return c.json({ error: 'Story not found' }, 404)
    }
    return c.json(result)
  } catch (error) {
    logger.error('Failed to fetch story', {
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      storyId,
    })
    console.error('Full error:', error)
    return c.json({ error: 'Failed to fetch story', detail: String(error) }, 500)
  }
})

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3004

logger.info(`Starting Roadmap API on port ${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch,
}
