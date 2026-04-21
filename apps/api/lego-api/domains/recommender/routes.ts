import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createRecommenderService } from './application/index.js'
import {
  createBuildProjectRepository,
  createStubAIProvider,
  createPartsSearchProvider,
} from './adapters/index.js'
import {
  ExpandConceptInputSchema,
  SearchPartsInputSchema,
  ExplainPartsInputSchema,
  CreateBuildProjectInputSchema,
} from './types.js'

// ─────────────────────────────────────────────────────────────────────────
// Setup: Wire dependencies
// ─────────────────────────────────────────────────────────────────────────

const aiProvider = createStubAIProvider()
const partsSearch = createPartsSearchProvider(db, schema)
const projectRepo = createBuildProjectRepository(db, schema)

const recommenderService = createRecommenderService({
  aiProvider,
  partsSearch,
  projectRepo,
})

// ─────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────

const recommender = new Hono()

recommender.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// Concept Expansion
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /expand - Expand a freeform concept into structured search signals
 *
 * Input: { concept: "fire mage" }
 * Output: { colors: [...], categories: [...], accessoryTypes: [...], ... }
 */
recommender.post('/expand', async c => {
  const body = await c.req.json()
  const input = ExpandConceptInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await recommenderService.expandConcept(input.data.concept)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Search & Score
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /search - Search for parts matching concept signals
 *
 * Input: { signals: ConceptSignals, limit?: number }
 * Output: { collection: ScoredPart[], wishlist: ScoredPart[], external: ScoredPart[], totalResults: number }
 */
recommender.post('/search', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = SearchPartsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await recommenderService.searchParts(userId, input.data.signals, input.data.limit)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  // Also find donor minifigs
  const donorsResult = await recommenderService.findDonorMinifigs(userId, input.data.signals)

  return c.json({
    ...result.data,
    donorMinifigs: donorsResult.ok ? donorsResult.data : [],
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Explanations
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /explain - Generate LLM explanations for recommended parts
 *
 * Input: { concept: string, parts: [...] }
 * Output: PartExplanation[]
 */
recommender.post('/explain', async c => {
  const body = await c.req.json()
  const input = ExplainPartsInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await recommenderService.explainParts(input.data.concept, input.data.parts)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// ─────────────────────────────────────────────────────────────────────────
// Build Projects
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /projects - Save selected parts as a build project
 */
recommender.post('/projects', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = CreateBuildProjectInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await recommenderService.createProject(userId, input.data)

  if (!result.ok) {
    const status = result.error === 'VALIDATION_ERROR' ? 400 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data, 201)
})

/**
 * GET /projects - List user's build projects
 */
recommender.get('/projects', async c => {
  const userId = c.get('userId')

  const result = await recommenderService.listProjects(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

/**
 * GET /projects/:id - Get a specific build project with parts
 */
recommender.get('/projects/:id', async c => {
  const { id } = c.req.param()

  const result = await recommenderService.getProject(id)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json(result.data)
})

/**
 * DELETE /projects/:id - Delete a build project
 */
recommender.delete('/projects/:id', async c => {
  const { id } = c.req.param()

  const result = await recommenderService.deleteProject(id)

  if (!result.ok) {
    const status = result.error === 'NOT_FOUND' ? 404 : 500
    return c.json({ error: result.error }, status)
  }

  return c.json({ success: true })
})

export default recommender
