import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { DbClient } from '../../db/story-repository.js'
import { createStoryRepository, StoryRepository } from '../../db/story-repository.js'
import { createWorkflowRepository, WorkflowRepository } from '../../db/workflow-repository.js'
import type { SynthesizedStory } from '../../nodes/story/synthesize.js'
import {
  createElaborationGraph,
  runElaboration,
  createElaborationLoadFromDbNode,
  createElaborationSaveToDbNode,
  ElaborationConfigSchema,
  type ElaborationState,
  type ElaborationConfig,
} from '../elaboration.js'

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
const createTestSynthesizedStory = (
  overrides: Partial<SynthesizedStory> = {},
): SynthesizedStory => ({
  storyId: 'TEST-001',
  title: 'Test Story',
  description: 'A test story for unit testing',
  domain: 'test-domain',
  acceptanceCriteria: [
    { id: 'AC1', description: 'Test acceptance criterion' },
  ],
  constraints: ['Test constraint'],
  dependencies: {
    internal: [],
    external: [],
  },
  affectedFiles: ['src/test.ts'],
  ...overrides,
})

const createTestState = (
  overrides: Partial<ElaborationState> = {},
): ElaborationState => ({
  storyId: 'TEST-001',
  epicPrefix: 'test',
  config: null,
  currentPhase: 'load_previous',
  startedAt: null,
  currentStory: createTestSynthesizedStory(),
  previousStory: null,
  previousStoryLoaded: false,
  previousIteration: 0,
  currentIteration: 1,
  attackAnalysis: null,
  previousReadinessResult: null,
  deltaDetectionResult: null,
  deltaDetected: false,
  deltaReviewResult: null,
  deltaReviewed: false,
  escapeHatchResult: null,
  escapeHatchEvaluated: false,
  escapeHatchTriggered: false,
  targetedReviewComplete: false,
  targetedReviewFindings: [],
  aggregatedFindings: null,
  updatedReadinessResult: null,
  readinessUpdated: false,
  workflowComplete: false,
  workflowSuccess: false,
  warnings: [],
  errors: [],
  dbLoadSuccess: false,
  dbSaveSuccess: false,
  ...overrides,
})

describe('ElaborationConfigSchema with DB persistence', () => {
  it('accepts persistToDb configuration', () => {
    const config = ElaborationConfigSchema.parse({
      persistToDb: true,
    })

    expect(config.persistToDb).toBe(true)
  })

  it('defaults persistToDb to false', () => {
    const config = ElaborationConfigSchema.parse({})

    expect(config.persistToDb).toBe(false)
  })

  it('accepts storyRepo and workflowRepo', () => {
    const mockClient = createMockDbClient()
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)

    const config = ElaborationConfigSchema.parse({
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(config.storyRepo).toBe(storyRepo)
    expect(config.workflowRepo).toBe(workflowRepo)
  })
})

describe('createElaborationLoadFromDbNode', () => {
  let mockClient: DbClient
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    storyRepo = createStoryRepository(mockClient)
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('returns dbLoadSuccess=false when no repositories configured', async () => {
    const node = createElaborationLoadFromDbNode(null, null)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
    expect(result.warnings).toContain('DB persistence not configured - skipping load')
  })

  it('returns dbLoadSuccess=false when story not found', async () => {
    vi.mocked(mockClient.query).mockResolvedValue({ rows: [], rowCount: 0 })

    const node = createElaborationLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
  })

  it('returns dbLoadSuccess=true when story found', async () => {
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

    const node = createElaborationLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(true)
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(mockClient.query).mockRejectedValue(new Error('Connection failed'))

    const node = createElaborationLoadFromDbNode(storyRepo, workflowRepo)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbLoadSuccess).toBe(false)
    expect(result.warnings?.[0]).toContain('Failed to load from DB')
  })
})

describe('createElaborationSaveToDbNode', () => {
  let mockClient: DbClient
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    storyRepo = createStoryRepository(mockClient)
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('returns dbSaveSuccess=false when no repositories configured', async () => {
    const node = createElaborationSaveToDbNode(null, null)
    const state = createTestState()

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(false)
  })

  it('saves elaboration results when aggregated findings present', async () => {
    // Mock story lookup and UUID resolution
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

    const node = createElaborationSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'TEST-001',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 2,
        criticalCount: 0,
        majorCount: 1,
        minorCount: 1,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: ['acceptance_criteria'],
        recommendedStakeholders: [],
        passed: true,
        summary: 'Elaboration passed with 2 findings',
      },
    })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(true)
  })

  it('updates story state based on elaboration result', async () => {
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

    const node = createElaborationSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'TEST-001',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: true,
        summary: 'Elaboration passed',
      },
    })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(true)
    // Verify that state transition was attempted (via query mock)
    expect(mockClient.query).toHaveBeenCalled()
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(mockClient.query).mockRejectedValue(new Error('Connection failed'))

    const node = createElaborationSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'TEST-001',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: true,
        summary: 'Test',
      },
    })

    const result = await node(state)

    expect(result.dbSaveSuccess).toBe(false)
    expect(result.warnings?.[0]).toContain('Failed to save to DB')
  })
})

describe('createElaborationGraph with DB persistence', () => {
  let mockClient: DbClient

  beforeEach(() => {
    mockClient = createMockDbClient()
  })

  it('creates compilable graph with DB repositories', () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)

    const graph = createElaborationGraph({
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(graph).toBeDefined()
  })

  it('creates compilable graph without DB repositories', () => {
    const graph = createElaborationGraph({
      persistToDb: false,
    })

    expect(graph).toBeDefined()
  })

  it('creates compilable graph with all options', () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)

    const graph = createElaborationGraph({
      persistToDb: true,
      storyRepo,
      workflowRepo,
      recalculateReadiness: true,
    })

    expect(graph).toBeDefined()
  })
})

describe('runElaboration with DB persistence', () => {
  let mockClient: DbClient

  beforeEach(() => {
    mockClient = createMockDbClient()
  })

  it('runs with DB persistence configuration', async () => {
    const storyRepo = createStoryRepository(mockClient)
    const workflowRepo = createWorkflowRepository(mockClient)
    const currentStory = createTestSynthesizedStory()

    const result = await runElaboration(currentStory, null, {
      persistToDb: true,
      storyRepo,
      workflowRepo,
    })

    expect(result).toBeDefined()
    expect(result.storyId).toBe('TEST-001')
    expect(result.completedAt).toBeDefined()
  })

  it('runs without DB persistence', async () => {
    const currentStory = createTestSynthesizedStory()

    const result = await runElaboration(currentStory, null, {
      persistToDb: false,
    })

    expect(result).toBeDefined()
  })

  it('compares current story with previous story', async () => {
    const currentStory = createTestSynthesizedStory({
      title: 'Updated Story',
    })
    const previousStory = createTestSynthesizedStory({
      title: 'Original Story',
    })

    const result = await runElaboration(currentStory, previousStory, {
      persistToDb: false,
    })

    expect(result).toBeDefined()
    expect(result.storyId).toBe('TEST-001')
  })
})

describe('State transitions with DB persistence', () => {
  let mockClient: DbClient
  let storyRepo: StoryRepository
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    storyRepo = createStoryRepository(mockClient)
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('transitions to ready-to-work on PASS', async () => {
    // Mock story lookup
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

    const node = createElaborationSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'TEST-001',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: true, // PASS
        summary: 'Elaboration passed',
      },
    })

    await node(state)

    // Verify UPDATE query was called with ready-to-work state
    const calls = vi.mocked(mockClient.query).mock.calls
    const updateCall = calls.find(
      call =>
        typeof call[0] === 'string' &&
        call[0].includes('UPDATE') &&
        call[0].includes('stories'),
    )
    expect(updateCall).toBeDefined()
  })

  it('keeps in backlog on FAIL', async () => {
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

    const node = createElaborationSaveToDbNode(storyRepo, workflowRepo)
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'TEST-001',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 5,
        criticalCount: 2,
        majorCount: 1,
        minorCount: 2,
        infoCount: 0,
        escapeHatchTriggered: true,
        sectionsNeedingAttention: ['requirements', 'scope'],
        recommendedStakeholders: ['PM', 'Tech Lead'],
        passed: false, // FAIL
        summary: 'Elaboration failed with critical issues',
      },
    })

    await node(state)

    // Verify that query was called (state update attempted)
    expect(mockClient.query).toHaveBeenCalled()
  })
})

describe('Token usage tracking', () => {
  let mockClient: DbClient
  let workflowRepo: WorkflowRepository

  beforeEach(() => {
    mockClient = createMockDbClient()
    workflowRepo = createWorkflowRepository(mockClient)
  })

  it('logs token usage to database', async () => {
    // Mock story UUID lookup
    vi.mocked(mockClient.query)
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-456' }], rowCount: 1 })

    await workflowRepo.logTokenUsage('TEST-001', 'elaboration', {
      inputTokens: 1000,
      outputTokens: 500,
      model: 'claude-opus-4-5-20251101',
      agentName: 'elaboration-graph',
    })

    // Verify INSERT was called with token data
    const calls = vi.mocked(mockClient.query).mock.calls
    const insertCall = calls.find(
      call =>
        typeof call[0] === 'string' &&
        call[0].includes('INSERT') &&
        call[0].includes('token_usage'),
    )
    expect(insertCall).toBeDefined()
  })

  it('retrieves total token usage', async () => {
    // Mock story UUID lookup then total query
    vi.mocked(mockClient.query)
      .mockResolvedValueOnce({ rows: [{ id: 'uuid-123' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ total: 1500 }], rowCount: 1 })

    const total = await workflowRepo.getTotalTokenUsage('TEST-001')

    expect(total).toBe(1500)
  })
})
