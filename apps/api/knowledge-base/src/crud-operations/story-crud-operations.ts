/**
 * Story CRUD Operations
 *
 * MCP operations for managing story status and workflow state.
 * Provides kb_get_story, kb_list_stories, and kb_update_story_status tools.
 *
 * @see Implementation plan for story status tracking
 */

import { z } from 'zod'
import { eq, and, sql, desc, asc, inArray, notInArray, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { stories, storyDependencies } from '../db/schema.js'
import { StoryStateSchema, StoryPhaseSchema, StoryPrioritySchema } from '../__types__/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for kb_get_story tool.
 */
export const KbGetStoryInputSchema = z.object({
  /** Story ID to retrieve (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),
})

export type KbGetStoryInput = z.infer<typeof KbGetStoryInputSchema>

/**
 * Input schema for kb_list_stories tool.
 */
export const KbListStoriesInputSchema = z.object({
  /** Filter by feature prefix (e.g., 'wish') */
  feature: z.string().optional(),

  /** Filter by workflow state */
  state: StoryStateSchema.optional(),

  /** Filter by implementation phase */
  phase: StoryPhaseSchema.optional(),

  /** Filter by blocked status */
  blocked: z.boolean().optional(),

  /** Filter by priority */
  priority: StoryPrioritySchema.optional(),

  /** Maximum results (1-100, default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})

export type KbListStoriesInput = z.infer<typeof KbListStoriesInputSchema>

/**
 * Input schema for kb_update_story_status tool.
 */
export const KbUpdateStoryStatusInputSchema = z.object({
  /** Story ID to update (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** New workflow state */
  state: StoryStateSchema.optional(),

  /** New implementation phase */
  phase: StoryPhaseSchema.optional(),

  /** New iteration count */
  iteration: z.number().int().min(0).optional(),

  /** Set blocked status */
  blocked: z.boolean().optional(),

  /** Reason for being blocked */
  blocked_reason: z.string().optional().nullable(),

  /** Story ID that blocks this one */
  blocked_by_story: z.string().optional().nullable(),

  /** New priority */
  priority: StoryPrioritySchema.optional().nullable(),
})

export type KbUpdateStoryStatusInput = z.infer<typeof KbUpdateStoryStatusInputSchema>

/**
 * Input schema for kb_get_next_story tool.
 *
 * Finds the next available story to work on in an epic,
 * considering dependencies and blockers.
 */
export const KbGetNextStoryInputSchema = z.object({
  /** Epic name to find next story in (required) */
  epic: z.string().min(1, 'Epic name cannot be empty'),

  /** Filter by feature prefix (optional) */
  feature: z.string().optional(),

  /** Story IDs to exclude (e.g., already assigned) */
  exclude_story_ids: z.array(z.string()).optional(),

  /** Include stories in 'backlog' state (default: false, only 'ready' stories) */
  include_backlog: z.boolean().optional().default(false),
})

export type KbGetNextStoryInput = z.infer<typeof KbGetNextStoryInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface StoryCrudDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Get a story by its ID.
 *
 * @param deps - Database dependencies
 * @param input - Story ID to retrieve
 * @returns Story object or null if not found
 */
export async function kb_get_story(
  deps: StoryCrudDeps,
  input: KbGetStoryInput,
): Promise<{
  story: typeof stories.$inferSelect | null
  message: string
}> {
  const validated = KbGetStoryInputSchema.parse(input)

  const result = await deps.db
    .select()
    .from(stories)
    .where(eq(stories.storyId, validated.story_id))
    .limit(1)

  const story = result[0] ?? null

  return {
    story,
    message: story ? `Found story ${validated.story_id}` : `Story ${validated.story_id} not found`,
  }
}

/**
 * List stories with optional filters.
 *
 * @param deps - Database dependencies
 * @param input - Filter and pagination options
 * @returns Array of stories and total count
 */
export async function kb_list_stories(
  deps: StoryCrudDeps,
  input: KbListStoriesInput,
): Promise<{
  stories: (typeof stories.$inferSelect)[]
  total: number
  message: string
}> {
  const validated = KbListStoriesInputSchema.parse(input)

  // Build WHERE condition
  let whereCondition: SQL<unknown> | undefined

  const conditions: SQL<unknown>[] = []
  if (validated.feature) {
    conditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.state) {
    conditions.push(eq(stories.state, validated.state))
  }
  if (validated.phase) {
    conditions.push(eq(stories.phase, validated.phase))
  }
  if (validated.blocked !== undefined) {
    conditions.push(eq(stories.blocked, validated.blocked))
  }
  if (validated.priority) {
    conditions.push(eq(stories.priority, validated.priority))
  }

  if (conditions.length === 1) {
    whereCondition = conditions[0]
  } else if (conditions.length > 1) {
    whereCondition = and(...conditions)
  }

  // Count total matching
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(stories)
    .where(whereCondition)

  const total = countResult[0]?.count ?? 0

  // Get paginated results
  const result = await deps.db
    .select()
    .from(stories)
    .where(whereCondition)
    .orderBy(desc(stories.updatedAt))
    .limit(validated.limit)
    .offset(validated.offset)

  return {
    stories: result,
    total,
    message: `Found ${result.length} stories (${total} total)`,
  }
}

/**
 * Update story status and workflow state.
 *
 * @param deps - Database dependencies
 * @param input - Fields to update
 * @returns Updated story or null if not found
 */
export async function kb_update_story_status(
  deps: StoryCrudDeps,
  input: KbUpdateStoryStatusInput,
): Promise<{
  story: typeof stories.$inferSelect | null
  updated: boolean
  message: string
}> {
  const validated = KbUpdateStoryStatusInputSchema.parse(input)

  // Check if story exists
  const existing = await deps.db
    .select()
    .from(stories)
    .where(eq(stories.storyId, validated.story_id))
    .limit(1)

  if (existing.length === 0) {
    return {
      story: null,
      updated: false,
      message: `Story ${validated.story_id} not found`,
    }
  }

  // Build update object
  const updates: Partial<typeof stories.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (validated.state !== undefined) {
    updates.state = validated.state

    // Auto-set timestamps for state transitions
    if (validated.state === 'in_progress' && !existing[0].startedAt) {
      updates.startedAt = new Date()
    }
    if (validated.state === 'completed' && !existing[0].completedAt) {
      updates.completedAt = new Date()
    }
  }

  if (validated.phase !== undefined) {
    updates.phase = validated.phase
  }

  if (validated.iteration !== undefined) {
    updates.iteration = validated.iteration
  }

  if (validated.blocked !== undefined) {
    updates.blocked = validated.blocked

    // Clear blocked fields when unblocking
    if (!validated.blocked) {
      updates.blockedReason = null
      updates.blockedByStory = null
    }
  }

  if (validated.blocked_reason !== undefined) {
    updates.blockedReason = validated.blocked_reason
  }

  if (validated.blocked_by_story !== undefined) {
    updates.blockedByStory = validated.blocked_by_story
  }

  if (validated.priority !== undefined) {
    updates.priority = validated.priority
  }

  // Perform update
  const result = await deps.db
    .update(stories)
    .set(updates)
    .where(eq(stories.storyId, validated.story_id))
    .returning()

  const story = result[0] ?? null

  return {
    story,
    updated: true,
    message: `Updated story ${validated.story_id}`,
  }
}
/**
 * Get the next available story in an epic.
 *
 * Finds stories that are:
 * - In the specified epic
 * - In 'ready' state (or 'backlog' if include_backlog is true)
 * - Not blocked
 * - Have all dependencies satisfied
 *
 * Returns stories sorted by priority (critical first), then by created_at (oldest first).
 *
 * @param deps - Database dependencies
 * @param input - Epic filter and options
 * @returns Next available story or null if none found
 */
export async function kb_get_next_story(
  deps: StoryCrudDeps,
  input: KbGetNextStoryInput,
): Promise<{
  story: typeof stories.$inferSelect | null
  candidates_count: number
  blocked_by_dependencies: string[]
  message: string
}> {
  const validated = KbGetNextStoryInputSchema.parse(input)

  // Build state filter
  const validStates = validated.include_backlog ? ['ready', 'backlog'] : ['ready']

  // Build base conditions
  const conditions: SQL<unknown>[] = [
    eq(stories.epic, validated.epic),
    eq(stories.blocked, false),
    inArray(stories.state, validStates),
  ]

  if (validated.feature) {
    conditions.push(eq(stories.feature, validated.feature))
  }

  if (validated.exclude_story_ids && validated.exclude_story_ids.length > 0) {
    conditions.push(notInArray(stories.storyId, validated.exclude_story_ids))
  }

  const whereCondition = and(...conditions)

  // Get candidate stories (unblocked, in correct state)
  const candidates = await deps.db
    .select()
    .from(stories)
    .where(whereCondition)
    .orderBy(
      // Sort by priority (using CASE for custom order)
      sql`CASE
        WHEN ${stories.priority} = 'critical' THEN 1
        WHEN ${stories.priority} = 'high' THEN 2
        WHEN ${stories.priority} = 'medium' THEN 3
        WHEN ${stories.priority} = 'low' THEN 4
        ELSE 5
      END`,
      asc(stories.createdAt),
    )

  if (candidates.length === 0) {
    return {
      story: null,
      candidates_count: 0,
      blocked_by_dependencies: [],
      message: `No available stories found in epic '${validated.epic}'`,
    }
  }

  // Get all unsatisfied dependencies for candidate stories
  const candidateIds = candidates.map(c => c.storyId)

  const unsatisfiedDeps = await deps.db
    .select({
      storyId: storyDependencies.storyId,
      targetStoryId: storyDependencies.targetStoryId,
      dependencyType: storyDependencies.dependencyType,
      satisfied: storyDependencies.satisfied,
    })
    .from(storyDependencies)
    .where(
      and(
        inArray(storyDependencies.storyId, candidateIds),
        eq(storyDependencies.satisfied, false),
        // Only consider blocking dependency types
        inArray(storyDependencies.dependencyType, ['depends_on', 'blocked_by']),
      ),
    )

  // For unsatisfied dependencies, check if target story is completed
  const targetStoryIds = [...new Set(unsatisfiedDeps.map(d => d.targetStoryId))]

  let completedTargets: Set<string> = new Set()
  if (targetStoryIds.length > 0) {
    const targetStories = await deps.db
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(and(inArray(stories.storyId, targetStoryIds), eq(stories.state, 'completed')))

    completedTargets = new Set(targetStories.map(t => t.storyId))
  }

  // Build map of stories blocked by unresolved dependencies
  const blockedStories = new Map<string, string[]>()
  for (const dep of unsatisfiedDeps) {
    // If the target story is completed, the dependency is effectively satisfied
    if (completedTargets.has(dep.targetStoryId)) {
      continue
    }

    if (!blockedStories.has(dep.storyId)) {
      blockedStories.set(dep.storyId, [])
    }
    blockedStories.get(dep.storyId)!.push(dep.targetStoryId)
  }

  // Find the first candidate without unresolved dependencies
  const blockedByDependencies: string[] = []
  for (const candidate of candidates) {
    const unresolvedDeps = blockedStories.get(candidate.storyId)
    if (!unresolvedDeps || unresolvedDeps.length === 0) {
      return {
        story: candidate,
        candidates_count: candidates.length,
        blocked_by_dependencies: blockedByDependencies,
        message: `Next story: ${candidate.storyId} - ${candidate.title}`,
      }
    }
    // Track this story as blocked
    blockedByDependencies.push(`${candidate.storyId} (blocked by: ${unresolvedDeps.join(', ')})`)
  }

  // All candidates are blocked by dependencies
  return {
    story: null,
    candidates_count: candidates.length,
    blocked_by_dependencies: blockedByDependencies,
    message: `All ${candidates.length} candidate stories are blocked by unresolved dependencies`,
  }
}
