/**
 * story_picker Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * Dependency-aware story picker that queries the KB for a plan's stories,
 * builds a dependency graph from blockedByStory fields, and selects
 * the next unblocked story ordered by priority then storyId.
 *
 * Returns a terminal signal when all stories are done or when the
 * remaining stories are all transitively blocked.
 *
 * Idempotent — safe to re-run on resume.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas
// ============================================================================

export const StoryEntrySchema = z.object({
  storyId: z.string().min(1),
  state: z.string().min(1),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).nullable(),
  blockedByStory: z.string().nullable(),
})

export type StoryEntry = z.infer<typeof StoryEntrySchema>

export const StoryPickerSignalSchema = z.enum([
  'story_ready',
  'pipeline_complete',
  'pipeline_stalled',
])

export type StoryPickerSignal = z.infer<typeof StoryPickerSignalSchema>

export const StoryPickerResultSchema = z.object({
  storyId: z.string().nullable(),
  signal: StoryPickerSignalSchema,
  eligibleCount: z.number(),
  blockedCount: z.number(),
  completedCount: z.number(),
})

export type StoryPickerResult = z.infer<typeof StoryPickerResultSchema>

export const StoryPickerConfigSchema = z.object({
  planSlug: z.string().min(1),
})

export type StoryPickerConfig = z.infer<typeof StoryPickerConfigSchema>

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Fetches all stories for a plan. Injectable for testing.
 */
export type StoryListAdapterFn = (planSlug: string) => Promise<StoryEntry[]>

export type StoryPickerAdapters = {
  storyListAdapter: StoryListAdapterFn
}

// ============================================================================
// Constants
// ============================================================================

const DONE_STATES = new Set(['completed', 'cancelled'])
const PIPELINE_BLOCKED_STATES = new Set(['blocked'])

/**
 * Priority sort order: P1 first (lowest number = highest priority).
 * Stories with null priority sort last.
 */
const PRIORITY_ORDER: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
}

// ============================================================================
// Pure Logic
// ============================================================================

/**
 * Determines whether a story is done (completed or cancelled).
 */
export function isDone(state: string): boolean {
  return DONE_STATES.has(state)
}

/**
 * Determines whether a story is pipeline-blocked.
 */
export function isPipelineBlocked(state: string): boolean {
  return PIPELINE_BLOCKED_STATES.has(state)
}

/**
 * Determines whether a story is eligible to be picked (ready or backlog).
 */
export function isEligibleState(state: string): boolean {
  return state === 'ready' || state === 'backlog'
}

/**
 * Checks whether a story is transitively blocked.
 *
 * A story is transitively blocked if:
 * - Its blockedByStory points to a story that is pipeline-blocked, OR
 * - Its blockedByStory points to a story that is itself transitively blocked
 *
 * Uses memoization to avoid recomputation and cycle detection to prevent
 * infinite loops on circular dependencies.
 */
export function isTransitivelyBlocked(
  storyId: string,
  storiesByid: Map<string, StoryEntry>,
  memo: Map<string, boolean> = new Map(),
  visiting: Set<string> = new Set(),
): boolean {
  if (memo.has(storyId)) return memo.get(storyId)!

  const story = storiesByid.get(storyId)
  if (!story) {
    // Unknown story reference — treat as not blocked (defensive)
    memo.set(storyId, false)
    return false
  }

  // Already done — not blocked
  if (isDone(story.state)) {
    memo.set(storyId, false)
    return false
  }

  // Directly pipeline-blocked
  if (isPipelineBlocked(story.state)) {
    memo.set(storyId, true)
    return true
  }

  // No blocker — not transitively blocked
  if (!story.blockedByStory) {
    memo.set(storyId, false)
    return false
  }

  // Cycle detection
  if (visiting.has(storyId)) {
    memo.set(storyId, true)
    return true
  }

  visiting.add(storyId)

  const blockerEntry = storiesByid.get(story.blockedByStory)

  // Blocker not in plan — treat as not blocked (defensive)
  if (!blockerEntry) {
    visiting.delete(storyId)
    memo.set(storyId, false)
    return false
  }

  // Blocker is done — not blocked
  if (isDone(blockerEntry.state)) {
    visiting.delete(storyId)
    memo.set(storyId, false)
    return false
  }

  // Blocker is pipeline-blocked or transitively blocked
  const blockerBlocked =
    isPipelineBlocked(blockerEntry.state) ||
    isTransitivelyBlocked(blockerEntry.storyId, storiesByid, memo, visiting)

  visiting.delete(storyId)
  memo.set(storyId, blockerBlocked)
  return blockerBlocked
}

/**
 * Sorts stories by priority (P1 first), then by storyId alphabetically.
 * Null priority sorts after P5.
 */
export function sortByPriorityThenId(a: StoryEntry, b: StoryEntry): number {
  const aPrio = a.priority ? (PRIORITY_ORDER[a.priority] ?? 99) : 99
  const bPrio = b.priority ? (PRIORITY_ORDER[b.priority] ?? 99) : 99

  if (aPrio !== bPrio) return aPrio - bPrio
  return a.storyId.localeCompare(b.storyId)
}

/**
 * Core picking logic. Pure function operating on a list of stories.
 */
export function pickNextStory(stories: StoryEntry[]): StoryPickerResult {
  if (stories.length === 0) {
    return {
      storyId: null,
      signal: 'pipeline_complete',
      eligibleCount: 0,
      blockedCount: 0,
      completedCount: 0,
    }
  }

  const storiesById = new Map(stories.map(s => [s.storyId, s]))
  const memo = new Map<string, boolean>()

  const completed = stories.filter(s => isDone(s.state))
  const pipelineBlocked = stories.filter(s => isPipelineBlocked(s.state))

  // Find candidates: eligible state + blocker satisfied + not transitively blocked
  const eligible = stories.filter(s => {
    if (!isEligibleState(s.state)) return false

    // Check direct blocker
    if (s.blockedByStory) {
      const blocker = storiesById.get(s.blockedByStory)
      // Blocker must exist and be done
      if (!blocker || !isDone(blocker.state)) return false
    }

    // Check transitive blocking
    return !isTransitivelyBlocked(s.storyId, storiesById, memo)
  })

  // All done
  if (completed.length === stories.length) {
    return {
      storyId: null,
      signal: 'pipeline_complete',
      eligibleCount: 0,
      blockedCount: 0,
      completedCount: completed.length,
    }
  }

  // No eligible — check if stalled
  if (eligible.length === 0) {
    const remaining = stories.length - completed.length
    return {
      storyId: null,
      signal: 'pipeline_stalled',
      eligibleCount: 0,
      blockedCount: pipelineBlocked.length + (remaining - pipelineBlocked.length),
      completedCount: completed.length,
    }
  }

  // Sort and pick first
  eligible.sort(sortByPriorityThenId)
  const picked = eligible[0]!

  return {
    storyId: picked.storyId,
    signal: 'story_ready',
    eligibleCount: eligible.length,
    blockedCount: pipelineBlocked.length,
    completedCount: completed.length,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_picker LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Queries KB, builds dependency graph,
 * selects next unblocked story by priority.
 */
export function createStoryPickerNode(config: StoryPickerConfig, adapters: StoryPickerAdapters) {
  const resolved = StoryPickerConfigSchema.parse(config)
  const { storyListAdapter } = adapters

  return async (): Promise<StoryPickerResult> => {
    logger.info('story_picker: fetching stories for plan', {
      planSlug: resolved.planSlug,
    })

    const stories = await storyListAdapter(resolved.planSlug)

    logger.info('story_picker: received stories', {
      planSlug: resolved.planSlug,
      totalStories: stories.length,
    })

    const result = pickNextStory(stories)

    logger.info('story_picker: decision', {
      planSlug: resolved.planSlug,
      signal: result.signal,
      storyId: result.storyId,
      eligibleCount: result.eligibleCount,
      blockedCount: result.blockedCount,
      completedCount: result.completedCount,
    })

    return result
  }
}
