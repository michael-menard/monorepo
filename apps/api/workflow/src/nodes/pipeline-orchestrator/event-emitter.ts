/**
 * Event Emitter Node (pipeline-orchestrator)
 *
 * Emits WebSocket events to the NOTI server and logs progress
 * to the console at every major pipeline transition.
 *
 * Event types (discriminated union):
 *   pipeline_started, story_started, story_phase_complete,
 *   story_completed, story_blocked, story_retry,
 *   pipeline_complete, pipeline_stalled, merge_conflict
 *
 * Uses injectable NotiAdapter for testability. In production,
 * the adapter POSTs to the NOTI server. In tests, use the
 * capturing or noop adapter.
 *
 * Graceful degradation: event emission failures are logged but
 * never block the pipeline.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import { PipelinePhaseSchema } from '../../state/pipeline-orchestrator-v2-state.js'
import {
  createNoopNotiAdapter,
  type NotiAdapter,
  type NotiEventPayload,
} from '../../services/noti-adapter.js'

// ============================================================================
// Pipeline Event Schemas (discriminated union)
// ============================================================================

const BaseEventSchema = z.object({
  timestamp: z.string().datetime(),
})

export const PipelineStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('pipeline_started'),
  storyCount: z.number().int().min(0),
  inputMode: z.enum(['plan', 'story']),
  planSlug: z.string().nullable(),
})

export const StoryStartedEventSchema = BaseEventSchema.extend({
  type: z.literal('story_started'),
  storyId: z.string().min(1),
  storyIndex: z.number().int().min(0),
  totalStories: z.number().int().min(0),
})

export const StoryPhaseCompleteEventSchema = BaseEventSchema.extend({
  type: z.literal('story_phase_complete'),
  storyId: z.string().min(1),
  phase: PipelinePhaseSchema,
  verdict: z.string().optional(),
  durationMs: z.number().int().min(0).optional(),
  tokenUsage: z
    .object({
      inputTokens: z.number().int().min(0).default(0),
      outputTokens: z.number().int().min(0).default(0),
    })
    .optional(),
})

export const StoryCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('story_completed'),
  storyId: z.string().min(1),
  totalPhases: z.number().int().min(0),
  totalDurationMs: z.number().int().min(0).optional(),
})

export const StoryBlockedEventSchema = BaseEventSchema.extend({
  type: z.literal('story_blocked'),
  storyId: z.string().min(1),
  reason: z.string(),
  phase: PipelinePhaseSchema,
})

export const StoryRetryEventSchema = BaseEventSchema.extend({
  type: z.literal('story_retry'),
  storyId: z.string().min(1),
  phase: PipelinePhaseSchema,
  attempt: z.number().int().min(1),
  maxAttempts: z.number().int().min(1),
  reason: z.string(),
})

export const PipelineCompleteEventSchema = BaseEventSchema.extend({
  type: z.literal('pipeline_complete'),
  completedCount: z.number().int().min(0),
  blockedCount: z.number().int().min(0),
  totalStories: z.number().int().min(0),
})

export const PipelineStalledEventSchema = BaseEventSchema.extend({
  type: z.literal('pipeline_stalled'),
  blockedStories: z.array(z.string()),
  reason: z.string(),
})

export const MergeConflictEventSchema = BaseEventSchema.extend({
  type: z.literal('merge_conflict'),
  storyId: z.string().min(1),
  branch: z.string().min(1),
  conflictDetails: z.string().optional(),
})

/**
 * PipelineEventSchema — discriminated union of all pipeline event types.
 */
export const PipelineEventSchema = z.discriminatedUnion('type', [
  PipelineStartedEventSchema,
  StoryStartedEventSchema,
  StoryPhaseCompleteEventSchema,
  StoryCompletedEventSchema,
  StoryBlockedEventSchema,
  StoryRetryEventSchema,
  PipelineCompleteEventSchema,
  PipelineStalledEventSchema,
  MergeConflictEventSchema,
])

export type PipelineEvent = z.infer<typeof PipelineEventSchema>

// ============================================================================
// Token Tracking
// ============================================================================

export const TokenUsageSummarySchema = z.object({
  inputTokens: z.number().int().min(0).default(0),
  outputTokens: z.number().int().min(0).default(0),
  totalTokens: z.number().int().min(0).default(0),
})

export type TokenUsageSummary = z.infer<typeof TokenUsageSummarySchema>

/**
 * Aggregates token usage from the orchestrator state.
 * Currently a stub — will aggregate per-node tokenUsage from subgraph state
 * once subgraphs report token metrics.
 */
export function aggregateTokenUsage(_state: PipelineOrchestratorV2State): TokenUsageSummary {
  // Subgraph token tracking will be wired when subgraphs report tokenUsage
  return { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
}

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type EventEmitterAdapters = {
  notiAdapter?: NotiAdapter
}

// ============================================================================
// NOTI Channel Constant
// ============================================================================

const NOTI_CHANNEL = 'pipeline-orchestrator'

// ============================================================================
// Helper: Convert PipelineEvent to NotiEventPayload
// ============================================================================

function toNotiPayload(event: PipelineEvent): NotiEventPayload {
  const severity = getSeverity(event.type)
  const title = getTitle(event)

  return {
    channel: NOTI_CHANNEL,
    type: event.type,
    severity,
    title,
    message: getMessage(event),
    data: event as unknown as Record<string, unknown>,
    timestamp: event.timestamp,
  }
}

function getSeverity(type: PipelineEvent['type']): 'info' | 'warning' | 'critical' {
  switch (type) {
    case 'pipeline_stalled':
    case 'merge_conflict':
      return 'critical'
    case 'story_blocked':
    case 'story_retry':
      return 'warning'
    default:
      return 'info'
  }
}

function getTitle(event: PipelineEvent): string {
  switch (event.type) {
    case 'pipeline_started':
      return `Pipeline started (${event.storyCount} stories)`
    case 'story_started':
      return `Story started: ${event.storyId}`
    case 'story_phase_complete':
      return `Phase ${event.phase} complete: ${event.storyId}`
    case 'story_completed':
      return `Story completed: ${event.storyId}`
    case 'story_blocked':
      return `Story blocked: ${event.storyId}`
    case 'story_retry':
      return `Story retry (${event.attempt}/${event.maxAttempts}): ${event.storyId}`
    case 'pipeline_complete':
      return `Pipeline complete (${event.completedCount}/${event.totalStories})`
    case 'pipeline_stalled':
      return `Pipeline stalled (${event.blockedStories.length} blocked)`
    case 'merge_conflict':
      return `Merge conflict: ${event.storyId} on ${event.branch}`
  }
}

function getMessage(event: PipelineEvent): string {
  switch (event.type) {
    case 'pipeline_started':
      return `Processing ${event.storyCount} stories in ${event.inputMode} mode`
    case 'story_started':
      return `Story ${event.storyIndex + 1} of ${event.totalStories}`
    case 'story_phase_complete':
      return `${event.phase}${event.verdict ? ` — ${event.verdict}` : ''}`
    case 'story_completed':
      return `Completed after ${event.totalPhases} phases`
    case 'story_blocked':
      return `Blocked at ${event.phase}: ${event.reason}`
    case 'story_retry':
      return `Retrying ${event.phase}: ${event.reason}`
    case 'pipeline_complete':
      return `${event.completedCount} completed, ${event.blockedCount} blocked`
    case 'pipeline_stalled':
      return event.reason
    case 'merge_conflict':
      return `Conflict on branch ${event.branch}${event.conflictDetails ? `: ${event.conflictDetails}` : ''}`
  }
}

// ============================================================================
// Event Emission Helpers
// ============================================================================

async function emitEvent(adapter: NotiAdapter, event: PipelineEvent): Promise<void> {
  // Validate event against schema
  const parsed = PipelineEventSchema.safeParse(event)
  if (!parsed.success) {
    logger.warn('event-emitter: invalid event, skipping', {
      type: event.type,
      errors: parsed.error.flatten(),
    })
    return
  }

  // Log to console
  const title = getTitle(parsed.data)
  const severity = getSeverity(parsed.data.type)

  if (severity === 'critical') {
    logger.error(`[pipeline] ${title}`)
  } else if (severity === 'warning') {
    logger.warn(`[pipeline] ${title}`)
  } else {
    logger.info(`[pipeline] ${title}`)
  }

  // Emit to NOTI server (fire and forget, never blocks)
  try {
    await adapter.emit(toNotiPayload(parsed.data))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.warn('event-emitter: failed to emit to NOTI adapter', {
      error: msg,
      eventType: event.type,
    })
  }
}

function now(): string {
  return new Date().toISOString()
}

// ============================================================================
// Public Emission Functions
// ============================================================================

export async function emitPipelineStarted(
  adapter: NotiAdapter,
  state: PipelineOrchestratorV2State,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'pipeline_started',
    timestamp: now(),
    storyCount: state.storyIds.length,
    inputMode: state.inputMode,
    planSlug: state.planSlug,
  })
}

export async function emitStoryStarted(
  adapter: NotiAdapter,
  state: PipelineOrchestratorV2State,
): Promise<void> {
  const storyId = state.currentStoryId
  if (!storyId) return

  const excluded = new Set([...state.completedStories, ...state.blockedStories])
  const storyIndex = state.storyIds.filter(id => !excluded.has(id)).indexOf(storyId)

  await emitEvent(adapter, {
    type: 'story_started',
    timestamp: now(),
    storyId,
    storyIndex: storyIndex >= 0 ? storyIndex : 0,
    totalStories: state.storyIds.length,
  })
}

export async function emitStoryPhaseComplete(
  adapter: NotiAdapter,
  storyId: string,
  phase: z.infer<typeof PipelinePhaseSchema>,
  verdict?: string,
  durationMs?: number,
  tokenUsage?: { inputTokens: number; outputTokens: number },
): Promise<void> {
  await emitEvent(adapter, {
    type: 'story_phase_complete',
    timestamp: now(),
    storyId,
    phase,
    verdict,
    durationMs,
    tokenUsage,
  })
}

export async function emitStoryCompleted(
  adapter: NotiAdapter,
  storyId: string,
  totalPhases: number,
  totalDurationMs?: number,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'story_completed',
    timestamp: now(),
    storyId,
    totalPhases,
    totalDurationMs,
  })
}

export async function emitStoryBlocked(
  adapter: NotiAdapter,
  storyId: string,
  phase: z.infer<typeof PipelinePhaseSchema>,
  reason: string,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'story_blocked',
    timestamp: now(),
    storyId,
    phase,
    reason,
  })
}

export async function emitStoryRetry(
  adapter: NotiAdapter,
  storyId: string,
  phase: z.infer<typeof PipelinePhaseSchema>,
  attempt: number,
  maxAttempts: number,
  reason: string,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'story_retry',
    timestamp: now(),
    storyId,
    phase,
    attempt,
    maxAttempts,
    reason,
  })
}

export async function emitPipelineComplete(
  adapter: NotiAdapter,
  state: PipelineOrchestratorV2State,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'pipeline_complete',
    timestamp: now(),
    completedCount: state.completedStories.length,
    blockedCount: state.blockedStories.length,
    totalStories: state.storyIds.length,
  })
}

export async function emitPipelineStalled(
  adapter: NotiAdapter,
  state: PipelineOrchestratorV2State,
  reason: string,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'pipeline_stalled',
    timestamp: now(),
    blockedStories: state.blockedStories,
    reason,
  })
}

export async function emitMergeConflict(
  adapter: NotiAdapter,
  storyId: string,
  branch: string,
  conflictDetails?: string,
): Promise<void> {
  await emitEvent(adapter, {
    type: 'merge_conflict',
    timestamp: now(),
    storyId,
    branch,
    conflictDetails,
  })
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates an event emitter utility bound to the given adapters.
 *
 * Usage in other orchestrator nodes:
 * ```typescript
 * const emitter = createEventEmitter({ notiAdapter: myAdapter })
 * await emitter.pipelineStarted(state)
 * await emitter.storyStarted(state)
 * ```
 */
export function createEventEmitter(adapters: EventEmitterAdapters = {}) {
  const adapter = adapters.notiAdapter ?? createNoopNotiAdapter()

  return {
    pipelineStarted: (state: PipelineOrchestratorV2State) => emitPipelineStarted(adapter, state),
    storyStarted: (state: PipelineOrchestratorV2State) => emitStoryStarted(adapter, state),
    storyPhaseComplete: (
      storyId: string,
      phase: z.infer<typeof PipelinePhaseSchema>,
      verdict?: string,
      durationMs?: number,
      tokenUsage?: { inputTokens: number; outputTokens: number },
    ) => emitStoryPhaseComplete(adapter, storyId, phase, verdict, durationMs, tokenUsage),
    storyCompleted: (storyId: string, totalPhases: number, totalDurationMs?: number) =>
      emitStoryCompleted(adapter, storyId, totalPhases, totalDurationMs),
    storyBlocked: (storyId: string, phase: z.infer<typeof PipelinePhaseSchema>, reason: string) =>
      emitStoryBlocked(adapter, storyId, phase, reason),
    storyRetry: (
      storyId: string,
      phase: z.infer<typeof PipelinePhaseSchema>,
      attempt: number,
      maxAttempts: number,
      reason: string,
    ) => emitStoryRetry(adapter, storyId, phase, attempt, maxAttempts, reason),
    pipelineComplete: (state: PipelineOrchestratorV2State) => emitPipelineComplete(adapter, state),
    pipelineStalled: (state: PipelineOrchestratorV2State, reason: string) =>
      emitPipelineStalled(adapter, state, reason),
    mergeConflict: (storyId: string, branch: string, conflictDetails?: string) =>
      emitMergeConflict(adapter, storyId, branch, conflictDetails),
    /** Aggregate token usage from state (stub until subgraphs report tokens) */
    aggregateTokenUsage: (state: PipelineOrchestratorV2State) => aggregateTokenUsage(state),
  }
}
