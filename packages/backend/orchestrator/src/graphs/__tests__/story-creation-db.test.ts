import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { StoryRequest } from '../../nodes/story/seed.js'
import type { DbClient } from '../../db/story-repository.js'
import { createStoryRepository, StoryRepository } from '../../db/story-repository.js'
import { createWorkflowRepository, WorkflowRepository } from '../../db/workflow-repository.js'
import {
  createStoryCreationGraph,
  runStoryCreation,
  createLoadFromDbNode,
  createSaveToDbNode,
  createPersistLearningsNode,
  StoryCreationConfigSchema,
  type StoryCreationState,
  type StoryCreationConfig,
} from '../story-creation.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock DB client
const createMockDbClient = (): DbClient => ({
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
})

// Test fixtures
const createTestStoryRequest = (
  overrides: Partial<StoryRequest> = {},
): StoryRequest => ({
  title: 'Test Story',
  domain: 'test-domain',
  description: 'A test story for unit testing',
  tags: ['test', 'unit'],
  ...overrides,
})

const createTestState = (
  overrides: Partial<StoryCreationState> = {},
): StoryCreationState => ({
  storyId: 'TEST-001',
  epicPrefix: 'test',
  config: null,
  currentPhase: 'reality_intake',
  attackIteration: 0,
  startedAt: null,
  storyRequest: createTestStoryRequest(),
  baselineReality: null,
  baselineLoaded: false,
  retrievedContext: null,
  contextRetrieved: false,
  storyStructure: null,
  storySeeded: false,
  pmGapAnalysis: null,
  pmAnalysisComplete: false,
  uxGapAnalysis: null,
  uxAnalysisComplete: false,
  qaGapAnalysis: null,
  qaAnalysisComplete: false,
  attackAnalysis: null,
  attackComplete: false,
  gapHygieneResult: null,
  gapHygieneAnalyzed: false,
  readinessResult: null,
  readinessAnalyzed: false,
  hitlDecision: null,
  hitlRequired: true,
  hitlNote: null,
  commitmentGateResult: null,
  commitmentValidated: false,
  synthesizedStory: null,
  storySynthesized: false,
  workflowComplete: false,
  workflowSuccess: false,
  warnings: [],
  errors: [],
  dbLoadSuccess: false,
  dbSaveSuccess: false,
  learningsPersisted: false,
  ...overrides,
})

describe('StoryCreationConfigSchema with DB persistence', () => {
  it('accepts persistToDb configuration', () => {
    const config = StoryCreationConfigSchema.parse({
      persistToDb: true,
    })

    expect(config.persistToDb).toBe(true)
  })

  it('defaults persistToDb to false', () => {
    const config = StoryCreationConfigSchema.parse({})

    expect(config.persistToDb).toBe(false)
  })

  it('accepts storyRepo and workflowRepo', () => {
    const mockClient = createMockDbClient()
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)

    const config = StoryCreationConfigSchema.parse({
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(config.storyRepo).toBe(storyRepo)
    expect(config.workflowRepo).toBe(workflowRepo)
  })
})

describe('createLoadFromDbNode', () => {
  let mockClient: DbClient
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    storyRepo = createStoryRepository(mockClient)
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('returns dbLoadSuccess=false when no repositories configured', async () => {
    const node = createLoadFromDbNode(null, null)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
    expect(result.warnings).toContain('DB persistence not configured - skipping load')
  })

  it('returns dbLoadSuccess=false when story not found', async () => {
    // Mock empty result for story lookup
    vi.mocked(mockClient.query).mockResolvedValue({ rows: [], rowCount: 0 })

    const node = createLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
  })

  it('returns dbLoadSuccess=true when story found', async () => {
    // Mock successful story lookup
    const mockStory = {
      id: 'uuid-123',
      story_id: 'TEST-001',
      feature_id: null,
      type: 'feature',
      state: 'backlog',
      title: 'Test Story',
      goal: 'Test goal',
      points: null,
      priority: null,
      blocked_by: null,
      depends_on: [],
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: new Date(),
      updated_at: new Date(),
    }

    vi.mocked(mockClient.query).mockResolvedValue({
      rows: [mockStory],
      rowCount: 1,
    })

    const node = createLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(true)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(mockClient.query).mockRejectedValue(new Error('Connection failed'))

    const node = createLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
    expect(result.warnings?.[0]).toContain('Failed to load from DB')
  })
})

describe('createSaveToDbNode', () => {
  let mockClient: DbClient
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    storyRepo = createStoryRepository(mockClient)
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('returns dbSaveSuccess=false when no repositories configured', async () => {
    const node = createSaveToDbNode(null, null)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(false)
  })

  it('returns dbSaveSuccess=false when no synthesized story', async () => {
    const node = createSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({ synthesizedStory: null })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(false)
  })

  it('saves to database when story is synthesized', async () => {
    // Mock story lookup for state update
    const mockStory = {
      id: 'uuid-123',
      story_id: 'TEST-001',
      feature_id: null,
      type: 'feature',
      state: 'backlog',
      title: 'Test Story',
      goal: 'Test goal',
      points: null,
      priority: null,
      blocked_by: null,
      depends_on: [],
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: new Date(),
      updated_at: new Date(),
    }

    vi.mocked(mockClient.query).mockResolvedValue({
      rows: [mockStory],
      rowCount: 1,
    })

    const node = createSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      synthesizedStory: {
        storyId: 'TEST-001',
        title: 'Test Story',
        description: 'A test story',
        domain: 'test',
        acceptanceCriteria: [],
        constraints: [],
        dependencies: { internal: [], external: [] },
        affectedFiles: [],
      },
    })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(true)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(mockClient.query).mockRejectedValue(new Error('Connection failed'))

    const node = createSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      synthesizedStory: {
        storyId: 'TEST-001',
        title: 'Test Story',
        description: 'A test story',
        domain: 'test',
        acceptanceCriteria: [],
        constraints: [],
        dependencies: { internal: [], external: [] },
        affectedFiles: [],
      },
    })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(false)
    expect(result.warnings?.[0]).toContain('Failed to save to DB')
  })
})

describe('createPersistLearningsNode', () => {
  it('returns learningsPersisted=false when no KB dependencies', async () => {
    const node = createPersistLearningsNode(null)
    const state = createTestState()

    const result = await node(state)

    expect(result.learningsPersisted).toBe(false)
  })

  it('returns learningsPersisted=true when no learnings to persist', async () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const node = createPersistLearningsNode(mockKbDeps)
    const state = createTestState({ errors: [] })

    const result = await node(state)

    // No learnings = success (nothing to persist)
    expect(result.learningsPersisted).toBe(true)
  })

  it('persists learnings when errors present', async () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn().mockResolvedValue({
        results: [],
        metadata: { total: 0, fallback_mode: false },
      }),
      kbAddFn: vi.fn().mockResolvedValue({
        id: 'kb-123',
        success: true,
      }),
    }

    const node = createPersistLearningsNode(mockKbDeps)
    const state = createTestState({
      errors: [{ message: 'Test error', recoverable: false }],
    } as Partial<StoryCreationState>)

    const result = await node(state)

    expect(result.learningsPersisted).toBe(true)
  })
})

describe('createStoryCreationGraph with DB persistence', () => {
  let mockClient: DbClient

  beforeEach(() => {
    mockClient = createMockDbClient()
  })

  it('creates compilable graph with DB repositories', () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)

    const graph = createStoryCreationGraph({
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(graph).toBeDefined()
  })

  it('creates compilable graph with KB dependencies', () => {
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const graph = createStoryCreationGraph({
      kbDeps: mockKbDeps,
    })

    expect(graph).toBeDefined()
  })

  it('creates compilable graph with all persistence options', () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)
    const mockKbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn(),
      kbAddFn: vi.fn(),
    }

    const graph = createStoryCreationGraph({
      persistToDb: true,
      storyRepo,
      workflowRepo,
      kbDeps: mockKbDeps,
    })

    expect(graph).toBeDefined()
  })
})

describe('runStoryCreation with DB persistence', () => {
  let mockClient: DbClient

  beforeEach(() => {
    mockClient = createMockDbClient()
  })

  it('runs with DB persistence configuration', async () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)
    const request = createTestStoryRequest()

    const result = await runStoryCreation(request, null, {
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(result).toBeDefined()
    expect(result.storyId).toBeDefined()
    expect(result.completedAt).toBeDefined()
  })

  it('runs without DB persistence', async () => {
    const request = createTestStoryRequest()

    const result = await runStoryCreation(request, null, {
      persistToDb: false,
    })

    expect(result).toBeDefined()
  })
})
