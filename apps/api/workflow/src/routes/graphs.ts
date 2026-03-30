import { Hono } from 'hono'
import { logger } from '@repo/logger'
import {
  GraphInvokeRequestSchema,
  PlanGraphInvokeRequestSchema,
  ReviewGraphInvokeRequestSchema,
} from './__types__/graph-invoke.js'
import {
  executeDevImplementV2,
  executePlanRefinementV2,
  executeQAVerifyV2,
  executeReviewV2,
  executeStoryGenerationV2,
} from '../services/graph-executor.js'

export const graphRoutes = new Hono()

// ============================================================================
// Dev Implement (story-centric)
// ============================================================================

graphRoutes.post('/graphs/dev-implement', async c => {
  try {
    const body = await c.req.json()
    const parseResult = GraphInvokeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
    }

    const result = await executeDevImplementV2(parseResult.data)
    return c.json(result, result.status === 'completed' ? 200 : 500)
  } catch (err) {
    logger.error('Route handler error', { error: err })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Story Generation (plan-centric)
// ============================================================================

graphRoutes.post('/graphs/story-generation', async c => {
  try {
    const body = await c.req.json()
    const parseResult = PlanGraphInvokeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
    }

    const result = await executeStoryGenerationV2(parseResult.data)
    return c.json(result, result.status === 'completed' ? 200 : 500)
  } catch (err) {
    logger.error('Route handler error', { error: err })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Review (story-centric + worktree)
// ============================================================================

graphRoutes.post('/graphs/review', async c => {
  try {
    const body = await c.req.json()
    const parseResult = ReviewGraphInvokeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
    }

    const result = await executeReviewV2(parseResult.data)
    return c.json(result, result.status === 'completed' ? 200 : 500)
  } catch (err) {
    logger.error('Route handler error', { error: err })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// QA Verify (story-centric)
// ============================================================================

graphRoutes.post('/graphs/qa-verify', async c => {
  try {
    const body = await c.req.json()
    const parseResult = GraphInvokeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
    }

    const result = await executeQAVerifyV2(parseResult.data)
    return c.json(result, result.status === 'completed' ? 200 : 500)
  } catch (err) {
    logger.error('Route handler error', { error: err })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Plan Refinement (plan-centric)
// ============================================================================

graphRoutes.post('/graphs/plan-refinement', async c => {
  try {
    const body = await c.req.json()
    const parseResult = PlanGraphInvokeRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return c.json({ error: 'Invalid request', details: parseResult.error.flatten() }, 400)
    }

    const result = await executePlanRefinementV2(parseResult.data)
    return c.json(result, result.status === 'completed' ? 200 : 500)
  } catch (err) {
    logger.error('Route handler error', { error: err })
    return c.json({ error: 'Internal server error' }, 500)
  }
})
