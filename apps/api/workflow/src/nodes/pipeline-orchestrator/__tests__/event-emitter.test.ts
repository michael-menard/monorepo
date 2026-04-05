/**
 * Event Emitter tests (pipeline-orchestrator)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger } from '@repo/logger'
import {
  PipelineEventSchema,
  PipelineStartedEventSchema,
  StoryStartedEventSchema,
  StoryPhaseCompleteEventSchema,
  StoryCompletedEventSchema,
  StoryBlockedEventSchema,
  StoryRetryEventSchema,
  PipelineCompleteEventSchema,
  PipelineStalledEventSchema,
  MergeConflictEventSchema,
  aggregateTokenUsage,
  createEventEmitter,
} from '../event-emitter.js'
import { createCapturingNotiAdapter } from '../../../services/noti-adapter.js'
import type { PipelineOrchestratorV2State } from '../../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<PipelineOrchestratorV2State> = {}): PipelineOrchestratorV2State {
  return {
    inputMode: 'story',
    planSlug: null,
    refinedPlan: null,
    planFlows: [],
    planPostconditionResult: null,
    currentStoryId: null,
    worktreePath: null,
    branch: null,
    pipelinePhase: 'preflight',
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
    ollamaAvailable: true,
    storyIds: ['STORY-001', 'STORY-002', 'STORY-003'],
    ...overrides,
  }
}

const NOW = '2026-04-04T12:00:00.000Z'

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('PipelineEventSchema — discriminated union', () => {
  it('validates pipeline_started event', () => {
    const event = {
      type: 'pipeline_started',
      timestamp: NOW,
      storyCount: 5,
      inputMode: 'story',
      planSlug: null,
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates story_started event', () => {
    const event = {
      type: 'story_started',
      timestamp: NOW,
      storyId: 'STORY-001',
      storyIndex: 0,
      totalStories: 3,
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates story_phase_complete event', () => {
    const event = {
      type: 'story_phase_complete',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'dev_implement',
      verdict: 'complete',
      durationMs: 45000,
      tokenUsage: { inputTokens: 1000, outputTokens: 500 },
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates story_completed event', () => {
    const event = {
      type: 'story_completed',
      timestamp: NOW,
      storyId: 'STORY-001',
      totalPhases: 6,
      totalDurationMs: 120000,
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates story_blocked event', () => {
    const event = {
      type: 'story_blocked',
      timestamp: NOW,
      storyId: 'STORY-001',
      reason: 'Max review retries exceeded',
      phase: 'review',
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates story_retry event', () => {
    const event = {
      type: 'story_retry',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'review',
      attempt: 2,
      maxAttempts: 3,
      reason: 'Code review failed',
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates pipeline_complete event', () => {
    const event = {
      type: 'pipeline_complete',
      timestamp: NOW,
      completedCount: 4,
      blockedCount: 1,
      totalStories: 5,
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates pipeline_stalled event', () => {
    const event = {
      type: 'pipeline_stalled',
      timestamp: NOW,
      blockedStories: ['STORY-002', 'STORY-003'],
      reason: 'All remaining stories are blocked',
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('validates merge_conflict event', () => {
    const event = {
      type: 'merge_conflict',
      timestamp: NOW,
      storyId: 'STORY-001',
      branch: 'feat/STORY-001',
      conflictDetails: 'Conflict in src/main.ts',
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(true)
  })

  it('rejects unknown event type', () => {
    const event = {
      type: 'unknown_type',
      timestamp: NOW,
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects event missing required fields', () => {
    const event = {
      type: 'story_started',
      timestamp: NOW,
      // missing storyId, storyIndex, totalStories
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })

  it('rejects invalid phase value', () => {
    const event = {
      type: 'story_phase_complete',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'invalid_phase',
    }
    const result = PipelineEventSchema.safeParse(event)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Individual Schema Tests
// ============================================================================

describe('individual event schemas', () => {
  it('PipelineStartedEventSchema rejects missing storyCount', () => {
    const result = PipelineStartedEventSchema.safeParse({
      type: 'pipeline_started',
      timestamp: NOW,
      inputMode: 'story',
      planSlug: null,
    })
    expect(result.success).toBe(false)
  })

  it('StoryStartedEventSchema requires storyId', () => {
    const result = StoryStartedEventSchema.safeParse({
      type: 'story_started',
      timestamp: NOW,
      storyId: '',
      storyIndex: 0,
      totalStories: 3,
    })
    expect(result.success).toBe(false)
  })

  it('StoryPhaseCompleteEventSchema allows optional fields', () => {
    const result = StoryPhaseCompleteEventSchema.safeParse({
      type: 'story_phase_complete',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'dev_implement',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.verdict).toBeUndefined()
      expect(result.data.durationMs).toBeUndefined()
      expect(result.data.tokenUsage).toBeUndefined()
    }
  })

  it('StoryCompletedEventSchema allows optional totalDurationMs', () => {
    const result = StoryCompletedEventSchema.safeParse({
      type: 'story_completed',
      timestamp: NOW,
      storyId: 'STORY-001',
      totalPhases: 4,
    })
    expect(result.success).toBe(true)
  })

  it('StoryBlockedEventSchema requires reason', () => {
    const result = StoryBlockedEventSchema.safeParse({
      type: 'story_blocked',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'review',
    })
    expect(result.success).toBe(false)
  })

  it('StoryRetryEventSchema requires attempt >= 1', () => {
    const result = StoryRetryEventSchema.safeParse({
      type: 'story_retry',
      timestamp: NOW,
      storyId: 'STORY-001',
      phase: 'review',
      attempt: 0,
      maxAttempts: 3,
      reason: 'fail',
    })
    expect(result.success).toBe(false)
  })

  it('PipelineCompleteEventSchema validates correctly', () => {
    const result = PipelineCompleteEventSchema.safeParse({
      type: 'pipeline_complete',
      timestamp: NOW,
      completedCount: 0,
      blockedCount: 0,
      totalStories: 0,
    })
    expect(result.success).toBe(true)
  })

  it('PipelineStalledEventSchema requires blockedStories array', () => {
    const result = PipelineStalledEventSchema.safeParse({
      type: 'pipeline_stalled',
      timestamp: NOW,
      reason: 'all blocked',
    })
    expect(result.success).toBe(false)
  })

  it('MergeConflictEventSchema allows optional conflictDetails', () => {
    const result = MergeConflictEventSchema.safeParse({
      type: 'merge_conflict',
      timestamp: NOW,
      storyId: 'STORY-001',
      branch: 'feat/STORY-001',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.conflictDetails).toBeUndefined()
    }
  })
})

// ============================================================================
// aggregateTokenUsage Tests
// ============================================================================

describe('aggregateTokenUsage', () => {
  it('returns zeroed usage (stub)', () => {
    const state = makeState()
    const usage = aggregateTokenUsage(state)
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
  })
})

// ============================================================================
// createEventEmitter — Adapter Injection Tests
// ============================================================================

describe('createEventEmitter', () => {
  let adapter: ReturnType<typeof createCapturingNotiAdapter>

  beforeEach(() => {
    adapter = createCapturingNotiAdapter()
    vi.clearAllMocks()
  })

  it('emits pipeline_started event', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState({ storyIds: ['S-1', 'S-2'] })

    await emitter.pipelineStarted(state)

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('pipeline_started')
    expect(adapter.events[0].channel).toBe('pipeline-orchestrator')
    expect(adapter.events[0].severity).toBe('info')
    expect(adapter.events[0].data).toHaveProperty('storyCount', 2)
  })

  it('emits story_started event', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState({
      currentStoryId: 'STORY-002',
      storyIds: ['STORY-001', 'STORY-002', 'STORY-003'],
    })

    await emitter.storyStarted(state)

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('story_started')
    expect(adapter.events[0].data).toHaveProperty('storyId', 'STORY-002')
  })

  it('skips story_started when no currentStoryId', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState({ currentStoryId: null })

    await emitter.storyStarted(state)

    expect(adapter.events).toHaveLength(0)
  })

  it('emits story_phase_complete event', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })

    await emitter.storyPhaseComplete('STORY-001', 'dev_implement', 'complete', 30000)

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('story_phase_complete')
    expect(adapter.events[0].data).toHaveProperty('phase', 'dev_implement')
    expect(adapter.events[0].data).toHaveProperty('verdict', 'complete')
  })

  it('emits story_completed event', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })

    await emitter.storyCompleted('STORY-001', 6, 120000)

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('story_completed')
  })

  it('emits story_blocked event with warning severity', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })

    await emitter.storyBlocked('STORY-001', 'review', 'Max retries exceeded')

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('story_blocked')
    expect(adapter.events[0].severity).toBe('warning')
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[pipeline] Story blocked: STORY-001'),
    )
  })

  it('emits story_retry event with warning severity', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })

    await emitter.storyRetry('STORY-001', 'review', 2, 3, 'Code review failed')

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('story_retry')
    expect(adapter.events[0].severity).toBe('warning')
  })

  it('emits pipeline_complete event', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState({
      completedStories: ['S-1', 'S-2'],
      blockedStories: ['S-3'],
      storyIds: ['S-1', 'S-2', 'S-3'],
    })

    await emitter.pipelineComplete(state)

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('pipeline_complete')
    expect(adapter.events[0].data).toHaveProperty('completedCount', 2)
    expect(adapter.events[0].data).toHaveProperty('blockedCount', 1)
  })

  it('emits pipeline_stalled event with critical severity', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState({ blockedStories: ['S-2', 'S-3'] })

    await emitter.pipelineStalled(state, 'All stories blocked')

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('pipeline_stalled')
    expect(adapter.events[0].severity).toBe('critical')
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[pipeline] Pipeline stalled'),
    )
  })

  it('emits merge_conflict event with critical severity', async () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })

    await emitter.mergeConflict('STORY-001', 'feat/STORY-001', 'Conflict in package.json')

    expect(adapter.events).toHaveLength(1)
    expect(adapter.events[0].type).toBe('merge_conflict')
    expect(adapter.events[0].severity).toBe('critical')
  })

  it('uses noop adapter when no adapter provided', async () => {
    const emitter = createEventEmitter()
    const state = makeState()

    // Should not throw
    await emitter.pipelineStarted(state)

    // Logger should still be called (console progress logging)
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('[pipeline]'),
    )
  })

  it('aggregateTokenUsage returns zeroed usage', () => {
    const emitter = createEventEmitter({ notiAdapter: adapter })
    const state = makeState()

    const usage = emitter.aggregateTokenUsage(state)
    expect(usage).toEqual({ inputTokens: 0, outputTokens: 0, totalTokens: 0 })
  })
})
