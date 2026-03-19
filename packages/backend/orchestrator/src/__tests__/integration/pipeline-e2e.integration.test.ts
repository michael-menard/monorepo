/**
 * Pipeline E2E Integration Test
 *
 * Validates the three-graph pipeline: bootstrap → story_creation → elaboration
 *
 * ORCH-4020: Autonomous pipeline test plan
 *
 * Strategy: Module-level vi.mock for story-creation graph (whole-graph mock).
 * No source modifications — test-only.
 *
 * Config flags for isolation:
 *   persistToDb: false       — disables DB nodes
 *   requireHiTL: false       — bypasses HiTL pause
 *   autoApprovalThreshold: 0 — auto-approves in story-creation
 *   recalculateReadiness: false — skips readiness in elaboration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runBootstrap } from '../../graphs/bootstrap.js'
import { runElaboration } from '../../graphs/elaboration.js'
import type { SynthesizedStory } from '../../nodes/story/synthesize.js'
import type { StoryRequest } from '../../nodes/story/seed.js'

// ============================================================================
// AC-6: vi.mock('@repo/logger') at top level
// ============================================================================

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// AC-7, AC-8: Module-level vi.mock for story-creation.js (whole-graph mock)
// No llmProvider injection — StoryCreationConfigSchema has no llmProvider field.
// ============================================================================

const mockInvoke = vi.fn()

vi.mock('../../graphs/story-creation.js', () => ({
  createStoryCreationGraph: vi.fn(() => ({
    invoke: mockInvoke,
  })),
  StoryCreationResultSchema: {
    parse: vi.fn(d => d),
  },
}))

// ============================================================================
// AC-9: Inline fixture factories
// ============================================================================

function createPipelineTestStoryRequest(overrides: Partial<StoryRequest> = {}): StoryRequest {
  return {
    title: 'Pipeline E2E Test Story',
    domain: 'orch',
    description: 'Integration test story for the autonomous pipeline',
    tags: ['pipeline', 'e2e', 'integration'],
    ...overrides,
  }
}

function createPipelineTestSynthesizedStory(
  overrides: Partial<SynthesizedStory> = {},
): SynthesizedStory {
  return {
    storyId: 'ORCH-4020',
    title: 'Pipeline E2E Test Story',
    description: 'Integration test story for the autonomous pipeline',
    domain: 'orch',
    synthesizedAt: new Date().toISOString(),
    acceptanceCriteria: [
      {
        id: 'AC-1',
        description: 'Pipeline bootstrap returns success:true',
        fromBaseline: false,
        enhancedFromGaps: false,
        relatedGapIds: [],
        priority: 1,
      },
      {
        id: 'AC-2',
        description: 'Elaboration returns success:true given synthesized story',
        fromBaseline: false,
        enhancedFromGaps: false,
        relatedGapIds: [],
        priority: 1,
      },
    ],
    nonGoals: [],
    testHints: [],
    knownUnknowns: [],
    constraints: [],
    affectedFiles: [],
    dependencies: [],
    isReady: true,
    readinessScore: 90,
    commitmentBaseline: null,
    // AC-9: synthesisNotes field required per story
    synthesisNotes: 'Pipeline E2E test story',
    ...overrides,
  }
}

// ============================================================================
// AC-2: Bootstrap handoff test — runBootstrap with mocked story-creation
// ============================================================================

describe('Pipeline E2E: bootstrap handoff (AC-2)', () => {
  // AC-7: beforeEach per describe to reset mock return values
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      storyId: 'ORCH-4020',
      currentPhase: 'complete',
      workflowSuccess: true,
      synthesizedStory: createPipelineTestSynthesizedStory(),
      readinessResult: { score: 90 },
      hitlRequired: false,
      hitlDecision: 'approve',
      commitmentGateResult: null,
      warnings: [],
      errors: [],
    })
  })

  it(
    'HP-1: runBootstrap returns success:true when story-creation mock resolves',
    async () => {
      // AC-5: persistToDb:false
      const result = await runBootstrap({
        storyId: 'ORCH-4020',
        storyRequest: createPipelineTestStoryRequest(),
        config: {
          persistToDb: false,
          requireHiTL: false,
          autoApprovalThreshold: 0,
        },
      })

      expect(result.storyId).toBe('ORCH-4020')
      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    },
    10_000,
  )

  it(
    'HP-2: bootstrap result contains storyCreationResult from mock',
    async () => {
      const result = await runBootstrap({
        storyId: 'ORCH-4020',
        storyRequest: createPipelineTestStoryRequest(),
        config: {
          persistToDb: false,
          requireHiTL: false,
          autoApprovalThreshold: 0,
        },
      })

      expect(result.storyCreationResult).toBeDefined()
      expect(result.completedAt).toBeDefined()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    },
    10_000,
  )
})

// ============================================================================
// AC-3: Two-graph chain — story-creation mock → runElaboration
// ============================================================================

describe('Pipeline E2E: story-creation → elaboration chain (AC-3)', () => {
  beforeEach(() => {
    mockInvoke.mockResolvedValue({
      storyId: 'ORCH-4020',
      currentPhase: 'complete',
      workflowSuccess: true,
      synthesizedStory: createPipelineTestSynthesizedStory(),
      readinessResult: { score: 90 },
      hitlRequired: false,
      hitlDecision: 'approve',
      commitmentGateResult: null,
      warnings: [],
      errors: [],
    })
  })

  it(
    'HP-3: runElaboration returns success:true given a synthesized story from the mock',
    async () => {
      const synthesizedStory = createPipelineTestSynthesizedStory()

      // AC-5: persistToDb:false (recalculateReadiness:false skips readiness node)
      const result = await runElaboration(synthesizedStory, null, {
        recalculateReadiness: false,
        persistToDb: false,
      } as Parameters<typeof runElaboration>[2])

      expect(result.storyId).toBe('ORCH-4020')
      expect(result.success).toBe(true)
      expect(result.completedAt).toBeDefined()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    },
    10_000,
  )

  it(
    'HP-4: two-graph chain — bootstrap then elaboration with linked storyId',
    async () => {
      // Step 1: bootstrap
      const bootstrapResult = await runBootstrap({
        storyId: 'ORCH-4020',
        storyRequest: createPipelineTestStoryRequest(),
        config: {
          persistToDb: false,
          requireHiTL: false,
          autoApprovalThreshold: 0,
        },
      })

      expect(bootstrapResult.success).toBe(true)

      // Step 2: elaboration with the story produced by bootstrap
      const synthesizedStory = createPipelineTestSynthesizedStory({
        storyId: bootstrapResult.storyId,
      })

      const elaborationResult = await runElaboration(synthesizedStory, null, {
        recalculateReadiness: false,
        persistToDb: false,
      } as Parameters<typeof runElaboration>[2])

      expect(elaborationResult.storyId).toBe(bootstrapResult.storyId)
      expect(elaborationResult.success).toBe(true)
    },
    10_000,
  )
})

// ============================================================================
// AC-4: Error path — story-creation throws → BootstrapResult success:false
// ============================================================================

describe('Pipeline E2E: error path — story-creation throws (AC-4)', () => {
  beforeEach(() => {
    mockInvoke.mockRejectedValue(new Error('Story creation failed: LLM timeout'))
  })

  it(
    'HP-5: bootstrap returns success:false and non-empty errors when story-creation throws',
    async () => {
      const result = await runBootstrap({
        storyId: 'ORCH-4020',
        storyRequest: createPipelineTestStoryRequest(),
        config: {
          persistToDb: false,
          requireHiTL: false,
          autoApprovalThreshold: 0,
        },
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    },
    10_000,
  )

  it(
    'HP-6: error result still conforms to BootstrapResult schema shape',
    async () => {
      const result = await runBootstrap({
        storyId: 'ORCH-4020',
        storyRequest: createPipelineTestStoryRequest(),
        config: {
          persistToDb: false,
          requireHiTL: false,
          autoApprovalThreshold: 0,
        },
      })

      // Shape assertions
      expect(typeof result.storyId).toBe('string')
      expect(typeof result.success).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
      expect(typeof result.durationMs).toBe('number')
      expect(typeof result.completedAt).toBe('string')
    },
    10_000,
  )
})
