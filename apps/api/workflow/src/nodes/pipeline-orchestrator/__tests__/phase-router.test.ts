/**
 * phase_router node tests (pipeline-orchestrator)
 *
 * Tests the routing logic that determines which pipeline phase a story
 * should resume from based on its current KB state.
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  determineResumePhase,
  createPhaseRouterNode,
} from '../phase-router.js'
import type { PipelineOrchestratorV2State } from '../../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

const makeState = (
  overrides: Partial<PipelineOrchestratorV2State> = {},
): PipelineOrchestratorV2State => ({
  inputMode: 'story',
  planSlug: null,
  refinedPlan: null,
  planFlows: [],
  planPostconditionResult: null,
  currentStoryId: null,
  worktreePath: null,
  branch: null,
  pipelinePhase: 'story_picking',
  storyPickerResult: null,
  devResult: null,
  reviewResult: null,
  qaResult: null,
  retryContext: null,
  modelConfig: {
    primaryModel: 'sonnet',
    escalationModel: 'opus',
    ollamaModel: 'qwen2.5-coder:14b',
  },
  completedStories: [],
  blockedStories: [],
  errors: [],
  ollamaAvailable: false,
  storyIds: [],
  resumePhase: null,
  ...overrides,
})

// ============================================================================
// determineResumePhase — pure logic tests
// ============================================================================

describe('determineResumePhase', () => {
  describe('routes to dev_implement', () => {
    it('routes ready → dev_implement', () => {
      const result = determineResumePhase('STORY-1', 'ready')
      expect(result.resumePhase).toBe('dev_implement')
      expect(result.completedStories).toEqual([])
      expect(result.blockedStories).toEqual([])
    })

    it('routes in_progress → dev_implement', () => {
      const result = determineResumePhase('STORY-1', 'in_progress')
      expect(result.resumePhase).toBe('dev_implement')
    })

    it('routes failed_code_review → dev_implement', () => {
      const result = determineResumePhase('STORY-1', 'failed_code_review')
      expect(result.resumePhase).toBe('dev_implement')
    })

    it('routes failed_qa → dev_implement', () => {
      const result = determineResumePhase('STORY-1', 'failed_qa')
      expect(result.resumePhase).toBe('dev_implement')
    })

    it('routes null state → dev_implement (safe default)', () => {
      const result = determineResumePhase('STORY-1', null)
      expect(result.resumePhase).toBe('dev_implement')
    })
  })

  describe('routes to review', () => {
    it('routes needs_code_review → review', () => {
      const result = determineResumePhase('STORY-1', 'needs_code_review')
      expect(result.resumePhase).toBe('review')
      expect(result.completedStories).toEqual([])
      expect(result.blockedStories).toEqual([])
    })
  })

  describe('routes to qa_verify', () => {
    it('routes ready_for_qa → qa_verify', () => {
      const result = determineResumePhase('STORY-1', 'ready_for_qa')
      expect(result.resumePhase).toBe('qa_verify')
      expect(result.completedStories).toEqual([])
      expect(result.blockedStories).toEqual([])
    })
  })

  describe('skips completed stories', () => {
    it('routes completed → skip (adds to completedStories)', () => {
      const result = determineResumePhase('STORY-1', 'completed')
      expect(result.resumePhase).toBeNull()
      expect(result.completedStories).toEqual(['STORY-1'])
      expect(result.blockedStories).toEqual([])
    })

    it('routes cancelled → skip (adds to completedStories)', () => {
      const result = determineResumePhase('STORY-1', 'cancelled')
      expect(result.resumePhase).toBeNull()
      expect(result.completedStories).toEqual(['STORY-1'])
      expect(result.blockedStories).toEqual([])
    })
  })

  describe('skips blocked stories', () => {
    it('routes blocked → skip (adds to blockedStories)', () => {
      const result = determineResumePhase('STORY-1', 'blocked')
      expect(result.resumePhase).toBeNull()
      expect(result.completedStories).toEqual([])
      expect(result.blockedStories).toEqual(['STORY-1'])
    })
  })

  describe('handles unknown states', () => {
    it('routes unknown state → dev_implement (safe default)', () => {
      const result = determineResumePhase('STORY-1', 'some_unknown_state')
      expect(result.resumePhase).toBe('dev_implement')
      expect(result.completedStories).toEqual([])
      expect(result.blockedStories).toEqual([])
    })

    it('routes elab → dev_implement (non-processing state)', () => {
      const result = determineResumePhase('STORY-1', 'elab')
      expect(result.resumePhase).toBe('dev_implement')
    })

    it('routes created → dev_implement (early lifecycle state)', () => {
      const result = determineResumePhase('STORY-1', 'created')
      expect(result.resumePhase).toBe('dev_implement')
    })
  })
})

// ============================================================================
// createPhaseRouterNode — node factory tests
// ============================================================================

describe('createPhaseRouterNode', () => {
  it('returns resumePhase dev_implement when adapter returns ready', async () => {
    const getStoryState = vi.fn().mockResolvedValue('ready')
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(getStoryState).toHaveBeenCalledWith('STORY-1')
    expect(result.resumePhase).toBe('dev_implement')
    expect(result.pipelinePhase).toBe('phase_routing')
  })

  it('returns resumePhase review when adapter returns needs_code_review', async () => {
    const getStoryState = vi.fn().mockResolvedValue('needs_code_review')
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBe('review')
  })

  it('returns resumePhase qa_verify when adapter returns ready_for_qa', async () => {
    const getStoryState = vi.fn().mockResolvedValue('ready_for_qa')
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBe('qa_verify')
  })

  it('skips completed story and adds to completedStories', async () => {
    const getStoryState = vi.fn().mockResolvedValue('completed')
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBeNull()
    expect(result.completedStories).toEqual(['STORY-1'])
    expect(result.blockedStories).toEqual([])
  })

  it('skips blocked story and adds to blockedStories', async () => {
    const getStoryState = vi.fn().mockResolvedValue('blocked')
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBeNull()
    expect(result.completedStories).toEqual([])
    expect(result.blockedStories).toEqual(['STORY-1'])
  })

  it('returns error when no currentStoryId is set', async () => {
    const node = createPhaseRouterNode()

    const result = await node(makeState({ currentStoryId: null }))

    expect(result.resumePhase).toBeNull()
    expect(result.errors).toContain('phase_router: no currentStoryId set')
  })

  it('defaults to dev_implement when no adapter is provided (null state)', async () => {
    const node = createPhaseRouterNode()

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBe('dev_implement')
  })

  it('defaults to dev_implement when adapter returns null', async () => {
    const getStoryState = vi.fn().mockResolvedValue(null)
    const node = createPhaseRouterNode({ getStoryState })

    const result = await node(makeState({ currentStoryId: 'STORY-1' }))

    expect(result.resumePhase).toBe('dev_implement')
  })
})
