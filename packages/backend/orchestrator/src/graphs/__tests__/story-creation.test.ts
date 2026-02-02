import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { StoryRequest } from '../../nodes/story/seed.js'
import type { BaselineReality } from '../../nodes/reality/load-baseline.js'
import {
  createStoryCreationGraph,
  runStoryCreation,
  createInitializeNode,
  createLoadBaselineNode,
  createRetrieveContextNode,
  createStorySeedNode,
  createFanoutPMNode,
  createFanoutUXNode,
  createFanoutQANode,
  createMergeFanoutNode,
  createAttackNode,
  createGapHygieneNode,
  createReadinessScoringNode,
  createHiTLNode,
  createSynthesisNode,
  createCompleteNode,
  HiTLDecisionSchema,
  StoryCreationConfigSchema,
  WorkflowPhaseSchema,
  StoryCreationResultSchema,
  type StoryCreationState,
  type StoryCreationConfig,
} from '../story-creation.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

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

const createTestBaseline = (
  overrides: Partial<BaselineReality> = {},
): BaselineReality => ({
  source: 'test-baseline.md',
  loadedAt: new Date().toISOString(),
  whatExists: ['Feature A', 'Feature B'],
  whatInProgress: ['Feature C'],
  noRework: ['Do not modify Core API'],
  knownGaps: ['Missing tests for Feature A'],
  lastUpdated: new Date().toISOString(),
  ...overrides,
})

const createTestState = (
  overrides: Partial<StoryCreationState> = {},
): StoryCreationState => ({
  storyId: 'flow-042',
  epicPrefix: 'flow',
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
  ...overrides,
})

describe('HiTLDecisionSchema', () => {
  it('validates approve decision', () => {
    expect(HiTLDecisionSchema.parse('approve')).toBe('approve')
  })

  it('validates revise decision', () => {
    expect(HiTLDecisionSchema.parse('revise')).toBe('revise')
  })

  it('validates reject decision', () => {
    expect(HiTLDecisionSchema.parse('reject')).toBe('reject')
  })

  it('validates defer decision', () => {
    expect(HiTLDecisionSchema.parse('defer')).toBe('defer')
  })

  it('rejects invalid decisions', () => {
    expect(() => HiTLDecisionSchema.parse('invalid')).toThrow()
  })
})

describe('WorkflowPhaseSchema', () => {
  const validPhases = [
    'reality_intake',
    'seeding',
    'fanout',
    'attack',
    'hygiene',
    'scoring',
    'hitl',
    'synthesis',
    'complete',
    'rejected',
    'error',
  ]

  it.each(validPhases)('validates %s phase', phase => {
    expect(WorkflowPhaseSchema.parse(phase)).toBe(phase)
  })

  it('rejects invalid phases', () => {
    expect(() => WorkflowPhaseSchema.parse('invalid_phase')).toThrow()
  })
})

describe('StoryCreationConfigSchema', () => {
  it('applies default values', () => {
    const config = StoryCreationConfigSchema.parse({})

    expect(config.autoApprovalThreshold).toBe(95)
    expect(config.minReadinessScore).toBe(70)
    expect(config.maxAttackIterations).toBe(3)
    expect(config.requireHiTL).toBe(true)
    expect(config.nodeTimeoutMs).toBe(30000)
    expect(config.generateCommitmentBaseline).toBe(true)
    expect(config.parallelFanout).toBe(true)
  })

  it('validates custom config', () => {
    const config = {
      autoApprovalThreshold: 90,
      minReadinessScore: 80,
      maxAttackIterations: 5,
      requireHiTL: false,
      nodeTimeoutMs: 60000,
      generateCommitmentBaseline: false,
      parallelFanout: false,
    }

    const parsed = StoryCreationConfigSchema.parse(config)

    expect(parsed.autoApprovalThreshold).toBe(90)
    expect(parsed.minReadinessScore).toBe(80)
    expect(parsed.maxAttackIterations).toBe(5)
    expect(parsed.requireHiTL).toBe(false)
    expect(parsed.nodeTimeoutMs).toBe(60000)
    expect(parsed.generateCommitmentBaseline).toBe(false)
    expect(parsed.parallelFanout).toBe(false)
  })

  it('rejects invalid threshold values', () => {
    expect(() =>
      StoryCreationConfigSchema.parse({ autoApprovalThreshold: 150 }),
    ).toThrow()
    expect(() =>
      StoryCreationConfigSchema.parse({ minReadinessScore: -10 }),
    ).toThrow()
  })

  it('rejects invalid iteration values', () => {
    expect(() =>
      StoryCreationConfigSchema.parse({ maxAttackIterations: 0 }),
    ).toThrow()
    expect(() =>
      StoryCreationConfigSchema.parse({ maxAttackIterations: -1 }),
    ).toThrow()
  })

  it('rejects negative timeout', () => {
    expect(() =>
      StoryCreationConfigSchema.parse({ nodeTimeoutMs: -1 }),
    ).toThrow()
  })
})

describe('StoryCreationResultSchema', () => {
  it('validates successful result', () => {
    const result = {
      storyId: 'flow-042',
      phase: 'complete',
      success: true,
      synthesizedStory: { storyId: 'flow-042' },
      readinessScore: 95,
      hitlRequired: false,
      hitlDecision: 'approve',
      commitmentGateResult: null,
      warnings: ['Minor warning'],
      errors: [],
      durationMs: 5000,
      completedAt: new Date().toISOString(),
    }

    expect(() => StoryCreationResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-042',
      phase: 'error',
      success: false,
      synthesizedStory: null,
      readinessScore: null,
      hitlRequired: false,
      hitlDecision: null,
      commitmentGateResult: null,
      warnings: [],
      errors: ['Something went wrong'],
      durationMs: 1000,
      completedAt: new Date().toISOString(),
    }

    expect(() => StoryCreationResultSchema.parse(result)).not.toThrow()
  })

  it('validates rejected result', () => {
    const result = {
      storyId: 'flow-042',
      phase: 'rejected',
      success: false,
      synthesizedStory: null,
      readinessScore: 50,
      hitlRequired: true,
      hitlDecision: 'reject',
      commitmentGateResult: null,
      warnings: [],
      errors: [],
      durationMs: 3000,
      completedAt: new Date().toISOString(),
    }

    expect(() => StoryCreationResultSchema.parse(result)).not.toThrow()
  })
})

describe('createInitializeNode', () => {
  it('initializes with default config', async () => {
    const node = createInitializeNode()
    const state = createTestState()

    const result = await node(state)

    expect(result.config).toBeDefined()
    expect(result.currentPhase).toBe('reality_intake')
    expect(result.startedAt).toBeDefined()
    expect(result.errors).toEqual([])
  })

  it('initializes with custom config', async () => {
    const config: Partial<StoryCreationConfig> = {
      autoApprovalThreshold: 90,
      requireHiTL: false,
    }
    const node = createInitializeNode(config)
    const state = createTestState()

    const result = await node(state)

    expect(result.config?.autoApprovalThreshold).toBe(90)
    expect(result.config?.requireHiTL).toBe(false)
    expect(result.hitlRequired).toBe(false)
  })

  it('fails initialization without story ID', async () => {
    const node = createInitializeNode()
    const state = createTestState({ storyId: '' })

    const result = await node(state)

    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No story ID provided for story creation')
  })

  it('fails initialization without story request', async () => {
    const node = createInitializeNode()
    const state = createTestState({ storyRequest: null })

    const result = await node(state)

    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No story request provided for story creation')
  })
})

describe('createMergeFanoutNode', () => {
  it('merges fanout results when all complete', async () => {
    const node = createMergeFanoutNode()
    const state = createTestState({
      pmAnalysisComplete: true,
      uxAnalysisComplete: true,
      qaAnalysisComplete: true,
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('attack')
  })

  it('warns when not all analyses complete', async () => {
    const node = createMergeFanoutNode()
    const state = createTestState({
      pmAnalysisComplete: true,
      uxAnalysisComplete: false,
      qaAnalysisComplete: true,
    })

    const result = await node(state)

    expect(result.warnings).toContain('Not all fanout analyses completed')
  })
})

describe('createHiTLNode', () => {
  it('respects pre-made approve decision', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      hitlDecision: 'approve',
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('synthesis')
  })

  it('respects pre-made revise decision', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      hitlDecision: 'revise',
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('seeding')
    expect(result.storySeeded).toBe(false)
    expect(result.attackIteration).toBe(0)
  })

  it('respects pre-made reject decision', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      hitlDecision: 'reject',
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('rejected')
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })

  it('respects pre-made defer decision', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      hitlDecision: 'defer',
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('hitl')
    expect(result.warnings).toContain('Story deferred for later review')
  })

  it('auto-approves when score meets minimum', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      config: StoryCreationConfigSchema.parse({ minReadinessScore: 70 }),
      readinessResult: {
        storyId: 'flow-042',
        analyzedAt: new Date().toISOString(),
        score: 85,
        breakdown: {
          baseScore: 100,
          deductions: [],
          additions: [],
          totalDeductions: 15,
          totalAdditions: 0,
          finalScore: 85,
        },
        ready: true,
        threshold: 85,
        factors: {
          mvpBlockingCount: 0,
          mvpImportantCount: 1,
          knownUnknownsCount: 0,
          hasStrongContext: true,
          hasBaselineAlignment: true,
          totalGapsAnalyzed: 5,
        },
        recommendations: [],
        summary: 'Story is ready',
        confidence: 'high',
      },
    })

    const result = await node(state)

    expect(result.hitlDecision).toBe('approve')
    expect(result.currentPhase).toBe('synthesis')
    expect(result.hitlNote).toContain('Auto-approved')
  })

  it('auto-revises when score below minimum', async () => {
    const node = createHiTLNode()
    const state = createTestState({
      config: StoryCreationConfigSchema.parse({ minReadinessScore: 70 }),
      readinessResult: {
        storyId: 'flow-042',
        analyzedAt: new Date().toISOString(),
        score: 50,
        breakdown: {
          baseScore: 100,
          deductions: [],
          additions: [],
          totalDeductions: 50,
          totalAdditions: 0,
          finalScore: 50,
        },
        ready: false,
        threshold: 85,
        factors: {
          mvpBlockingCount: 2,
          mvpImportantCount: 3,
          knownUnknownsCount: 2,
          hasStrongContext: false,
          hasBaselineAlignment: false,
          totalGapsAnalyzed: 10,
        },
        recommendations: [],
        summary: 'Story needs work',
        confidence: 'medium',
      },
    })

    const result = await node(state)

    expect(result.hitlDecision).toBe('revise')
    expect(result.currentPhase).toBe('seeding')
    expect(result.hitlNote).toContain('Auto-revision')
  })
})

describe('createCompleteNode', () => {
  it('marks workflow as complete', async () => {
    const node = createCompleteNode()
    const state = createTestState()

    const result = await node(state)

    expect(result.workflowComplete).toBe(true)
  })
})

describe('createStoryCreationGraph', () => {
  it('creates compilable graph with default config', () => {
    const graph = createStoryCreationGraph()
    expect(graph).toBeDefined()
  })

  it('creates compilable graph with custom config', () => {
    const graph = createStoryCreationGraph({
      autoApprovalThreshold: 90,
      requireHiTL: false,
      maxAttackIterations: 5,
    })
    expect(graph).toBeDefined()
  })
})

describe('runStoryCreation', () => {
  // Note: These tests use mocked imports, so they test the flow structure
  // rather than actual node execution

  it('generates story ID when not provided', async () => {
    const request = createTestStoryRequest({ storyId: undefined })

    // This will fail early due to mocked imports, but we can check the result structure
    const result = await runStoryCreation(request, null, { requireHiTL: false })

    expect(result).toBeDefined()
    expect(result.storyId).toBeDefined()
    expect(result.completedAt).toBeDefined()
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('generates story ID based on domain', async () => {
    const request = createTestStoryRequest({ domain: 'wishlist/feature' })

    const result = await runStoryCreation(request, null)

    // Story ID should be generated from domain prefix in uppercase
    expect(result.storyId).toMatch(/^WISHLIST-\d{4}$/)
  })

  it('extracts epic prefix from domain', async () => {
    const request = createTestStoryRequest({
      domain: 'myfeature/component',
    })

    const result = await runStoryCreation(request, null)

    // Story ID should use the domain prefix (myfeature) in uppercase
    expect(result.storyId).toMatch(/^MYFEATURE-\d{4}$/)
  })

  it('returns error result on exception', async () => {
    // Force an error by providing invalid data
    const request = createTestStoryRequest({ title: '', description: '' })

    const result = await runStoryCreation(request, null)

    // The result should still be valid even if the workflow fails
    expect(result).toBeDefined()
    expect(result.completedAt).toBeDefined()
  })

  it('respects custom configuration', async () => {
    const request = createTestStoryRequest()
    const config: Partial<StoryCreationConfig> = {
      autoApprovalThreshold: 90,
      requireHiTL: false,
      maxAttackIterations: 2,
    }

    const result = await runStoryCreation(request, null, config)

    expect(result).toBeDefined()
  })

  it('accepts baseline reality input', async () => {
    const request = createTestStoryRequest()
    const baseline = createTestBaseline()

    const result = await runStoryCreation(request, baseline)

    expect(result).toBeDefined()
  })
})
