/**
 * story_picker Node (pipeline-orchestrator) — DETERMINISTIC
 *
 * Selects the next story to process from the available story list.
 * Emits a signal indicating whether a story is ready, the pipeline
 * is complete, or the pipeline is stalled.
 *
 * When planSlug is provided and no storyIds are pre-populated,
 * queries the KB via storyListAdapter to load plan-linked stories.
 * Applies dependency-aware ordering: stories with completed blockers
 * come first, transitively blocked stories are skipped.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas & Types
// ============================================================================

export const StoryEntrySchema = z.object({
  storyId: z.string().min(1),
  state: z.string(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).nullable().default(null),
  blockedByStory: z.string().nullable().default(null),
})

export type StoryEntry = z.infer<typeof StoryEntrySchema>

export const StoryPickerSignalSchema = z.enum([
  'story_ready',
  'pipeline_complete',
  'pipeline_stalled',
])

export type StoryPickerSignal = z.infer<typeof StoryPickerSignalSchema>

export const StoryPickerResultSchema = z.object({
  signal: StoryPickerSignalSchema,
  storyId: z.string().nullable().default(null),
  reason: z.string().default(''),
  eligibleCount: z.number().int().min(0).default(0),
  completedCount: z.number().int().min(0).default(0),
  blockedCount: z.number().int().min(0).default(0),
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
 * Fetches stories linked to a plan from the KB.
 * Returns StoryEntry[] with state, priority, and blocker info.
 */
export type StoryListAdapterFn = (planSlug: string) => Promise<StoryEntry[]>

export type StoryPickerAdapters = {
  storyListAdapter: StoryListAdapterFn
}

// ============================================================================
// Terminal / Eligible State Helpers
// ============================================================================

const DONE_STATES = new Set(['completed', 'cancelled'])
const BLOCKED_STATES = new Set(['blocked'])
const ELIGIBLE_STATES = new Set(['ready', 'backlog', 'created', 'elab'])

/** Returns true when a story is in a terminal (done) state. */
export function isDone(state: string): boolean {
  return DONE_STATES.has(state)
}

/** Returns true when a story is pipeline-blocked. */
export function isPipelineBlocked(state: string): boolean {
  return BLOCKED_STATES.has(state)
}

/** Returns true when a story is in an eligible-for-pickup state. */
export function isEligibleState(state: string): boolean {
  return ELIGIBLE_STATES.has(state)
}

// ============================================================================
// Priority Sort
// ============================================================================

const PRIORITY_RANK: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5,
}

/**
 * Sort comparator: higher priority first (P1 < P2 < ...),
 * null priority sorts after P5. Ties broken by storyId ascending.
 */
export function sortByPriorityThenId(a: StoryEntry, b: StoryEntry): number {
  const pa = a.priority ? (PRIORITY_RANK[a.priority] ?? 99) : 99
  const pb = b.priority ? (PRIORITY_RANK[b.priority] ?? 99) : 99
  if (pa !== pb) return pa - pb
  return a.storyId.localeCompare(b.storyId)
}

// ============================================================================
// Transitive Blocking
// ============================================================================

/**
 * Checks whether a story is transitively blocked by following
 * the blockedByStory chain. Handles cycles by tracking visited nodes.
 *
 * A story is blocked if:
 * - It is in a pipeline-blocked state itself
 * - Its blocker is pipeline-blocked
 * - Its blocker is transitively blocked (recursive)
 * - The blocker chain forms a cycle
 */
export function isTransitivelyBlocked(
  storyId: string,
  storyMap: Map<string, StoryEntry>,
  visited: Set<string> = new Set(),
): boolean {
  if (visited.has(storyId)) return true // cycle → treat as blocked
  visited.add(storyId)

  const entry = storyMap.get(storyId)
  if (!entry) return false // unknown story → not blocked

  // Directly pipeline-blocked
  if (isPipelineBlocked(entry.state)) return true

  // No blocker dependency → not blocked
  if (!entry.blockedByStory) return false

  const blocker = storyMap.get(entry.blockedByStory)
  if (!blocker) return false // blocker unknown → assume not blocked

  // If blocker is done, this story is unblocked
  if (isDone(blocker.state)) return false

  // Recurse into blocker to check transitive blocking
  return isTransitivelyBlocked(entry.blockedByStory, storyMap, visited)
}

// ============================================================================
// Pure Logic — pickNextStory
// ============================================================================

/**
 * Determines the next story to pick from available entries.
 * Filters by eligible state, excludes transitively blocked,
 * sorts by priority then ID, and returns the first eligible story.
 */
export function pickNextStory(stories: StoryEntry[]): StoryPickerResult {
  if (stories.length === 0) {
    return {
      signal: 'pipeline_complete',
      storyId: null,
      reason: 'No stories available to process',
      eligibleCount: 0,
      completedCount: 0,
      blockedCount: 0,
    }
  }

  // Build lookup map for dependency resolution
  const storyMap = new Map(stories.map(s => [s.storyId, s]))

  const completedCount = stories.filter(s => isDone(s.state)).length
  const blockedCount = stories.filter(s => isPipelineBlocked(s.state)).length

  // Filter to eligible stories whose blockers are satisfied
  const eligible = stories
    .filter(s => isEligibleState(s.state))
    .filter(s => {
      // Skip stories whose direct blocker is not yet done
      if (s.blockedByStory) {
        const blocker = storyMap.get(s.blockedByStory)
        if (blocker && !isDone(blocker.state)) return false
      }
      return true
    })
    .filter(s => !isTransitivelyBlocked(s.storyId, storyMap))
    .sort(sortByPriorityThenId)

  if (eligible.length === 0) {
    if (completedCount === stories.length) {
      return {
        signal: 'pipeline_complete',
        storyId: null,
        reason: `All ${completedCount} stories completed`,
        eligibleCount: 0,
        completedCount,
        blockedCount,
      }
    }
    return {
      signal: 'pipeline_stalled',
      storyId: null,
      reason: `No eligible stories: ${completedCount} completed, ${blockedCount} blocked, ${stories.length - completedCount - blockedCount} in other states`,
      eligibleCount: 0,
      completedCount,
      blockedCount,
    }
  }

  const picked = eligible[0]!
  return {
    signal: 'story_ready',
    storyId: picked.storyId,
    reason: `Picked story ${picked.storyId}, ${eligible.length - 1} remaining eligible`,
    eligibleCount: eligible.length,
    completedCount,
    blockedCount,
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the story_picker LangGraph node.
 *
 * DETERMINISTIC — no LLM calls. Fetches stories from the KB via
 * the storyListAdapter, then picks the next eligible story using
 * dependency-aware priority ordering.
 */
export function createStoryPickerNode(
  config: z.input<typeof StoryPickerConfigSchema>,
  adapters: StoryPickerAdapters,
) {
  const resolved = StoryPickerConfigSchema.parse(config)

  return async (): Promise<StoryPickerResult> => {
    logger.info('story_picker: fetching stories from KB', {
      planSlug: resolved.planSlug,
    })

    const stories = await adapters.storyListAdapter(resolved.planSlug)

    logger.info('story_picker: loaded stories', {
      planSlug: resolved.planSlug,
      count: stories.length,
    })

    const result = pickNextStory(stories)

    logger.info('story_picker: result', {
      signal: result.signal,
      storyId: result.storyId,
      reason: result.reason,
      eligibleCount: result.eligibleCount,
      completedCount: result.completedCount,
      blockedCount: result.blockedCount,
    })

    return result
  }
}
