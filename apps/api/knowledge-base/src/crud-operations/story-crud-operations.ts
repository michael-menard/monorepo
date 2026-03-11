/**
 * Story CRUD Operations
 *
 * MCP operations for managing story status and workflow state.
 * Provides kb_get_story, kb_list_stories, kb_update_story_status, and kb_update_story tools.
 *
 * @see Implementation plan for story status tracking
 */

import { z } from 'zod'
import { eq, and, or, sql, desc, asc, inArray, notInArray, isNull, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import {
  stories,
  storyArtifacts,
  storyDependencies,
  plans,
  planStoryLinks,
  storyDetails,
} from '../db/schema.js'
import {
  StoryStateSchema,
  StoryPhaseSchema,
  StoryPrioritySchema,
  StoryTypeSchema,
} from '../__types__/index.js'

// ============================================================================
// Explicit column selectors — guard against schema-vs-DB drift
// ============================================================================

const storyColumns = {
  id: stories.id,
  storyId: stories.storyId,
  feature: stories.feature,
  epic: stories.epic,
  title: stories.title,
  storyType: stories.storyType,
  points: stories.points,
  priority: stories.priority,
  state: stories.state,
  phase: stories.phase,
  iteration: stories.iteration,
  blocked: stories.blocked,
  createdAt: stories.createdAt,
  updatedAt: stories.updatedAt,
  deletedAt: stories.deletedAt,
  deletedBy: stories.deletedBy,
  completedAt: stories.completedAt,
  fileSyncedAt: stories.fileSyncedAt,
  fileHash: stories.fileHash,
  description: stories.description,
  acceptanceCriteria: stories.acceptanceCriteria,
  nonGoals: stories.nonGoals,
  packages: stories.packages,
  embedding: stories.embedding,
} as const

const storyArtifactColumns = {
  id: storyArtifacts.id,
  storyId: storyArtifacts.storyId,
  artifactType: storyArtifacts.artifactType,
  artifactName: storyArtifacts.artifactName,
  kbEntryId: storyArtifacts.kbEntryId,
  phase: storyArtifacts.phase,
  iteration: storyArtifacts.iteration,
  summary: storyArtifacts.summary,
  detailTable: storyArtifacts.detailTable,
  detailId: storyArtifacts.detailId,
  createdAt: storyArtifacts.createdAt,
  updatedAt: storyArtifacts.updatedAt,
} as const

const storyDependencyColumns = {
  id: storyDependencies.id,
  storyId: storyDependencies.storyId,
  targetStoryId: storyDependencies.targetStoryId,
  dependencyType: storyDependencies.dependencyType,
  satisfied: storyDependencies.satisfied,
  createdAt: storyDependencies.createdAt,
} as const

const storyDetailColumns = {
  id: storyDetails.id,
  storyId: storyDetails.storyId,
  storyDir: storyDetails.storyDir,
  storyFile: storyDetails.storyFile,
  blockedReason: storyDetails.blockedReason,
  blockedByStory: storyDetails.blockedByStory,
  touchesBackend: storyDetails.touchesBackend,
  touchesFrontend: storyDetails.touchesFrontend,
  touchesDatabase: storyDetails.touchesDatabase,
  touchesInfra: storyDetails.touchesInfra,
  startedAt: storyDetails.startedAt,
  completedAt: storyDetails.completedAt,
  fileSyncedAt: storyDetails.fileSyncedAt,
  fileHash: storyDetails.fileHash,
  updatedAt: storyDetails.updatedAt,
} as const

// ============================================================================
// Shared Schemas
// ============================================================================

/**
 * Recursive schema for arbitrary JSON values stored in JSONB columns.
 * Replaces z.any() for acceptance_criteria and similar JSONB fields.
 */
type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }
const JSONValueSchema: z.ZodType<JSONValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JSONValueSchema),
    z.record(JSONValueSchema),
  ]),
)

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for kb_get_story tool.
 */
export const KbGetStoryInputSchema = z.object({
  /** Story ID to retrieve (e.g., 'WISH-2045') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** When true, eagerly loads story artifacts from story_artifacts table (default: false) */
  include_artifacts: z.boolean().optional().default(false),

  /** When true, eagerly loads dependency edges (inbound + outbound) from story_dependencies table (default: false) */
  include_dependencies: z.boolean().optional().default(false),
})

export type KbGetStoryInput = z.infer<typeof KbGetStoryInputSchema>

/**
 * Result schema for kb_get_story tool.
 *
 * Optional keys artifacts and dependencies are present only when the corresponding
 * include_* flag is true. When flag is false, the key is absent (not an empty array).
 * When flag is true and no records exist, the key is an empty array.
 *
 * Exception: when story is null (not found), both arrays are always present and empty
 * regardless of flags.
 */
export const KbGetStoryResultSchema = z.object({
  story: z.custom<typeof stories.$inferSelect>().nullable(),
  detail: z.custom<typeof storyDetails.$inferSelect>().nullable().optional(),
  artifacts: z.array(z.custom<typeof storyArtifacts.$inferSelect>()).optional(),
  dependencies: z.array(z.custom<typeof storyDependencies.$inferSelect>()).optional(),
  message: z.string(),
})

export type KbGetStoryResult = z.infer<typeof KbGetStoryResultSchema>

/**
 * Input schema for kb_list_stories tool.
 */
export const KbListStoriesInputSchema = z.object({
  /** Filter by feature prefix (e.g., 'wish') */
  feature: z.string().optional(),

  /** Filter by epic name (e.g., 'platform') */
  epic: z.string().optional(),

  /** Filter by workflow state (singular; ignored when states[] is provided) */
  state: StoryStateSchema.optional(),

  /** Filter by multiple workflow states (takes precedence over singular state) */
  states: z.array(StoryStateSchema).optional(),

  /** Filter by implementation phase */
  phase: StoryPhaseSchema.optional(),

  /** Filter by blocked status */
  blocked: z.boolean().optional(),

  /** Filter by priority */
  priority: StoryPrioritySchema.optional(),

  /** Filter stories linked to plans with this tag (e.g., 'elaboration', 'lego-ui') */
  plan_tag: z.string().optional(),

  /** Filter stories linked to plans with this status (e.g., 'in-progress', 'draft') */
  plan_status: z
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
    ])
    .optional(),

  /** Filter stories linked to this specific plan slug via plan_story_links */
  plan_slug: z.string().optional(),

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
 * Input schema for kb_update_story tool.
 *
 * Updates story metadata fields (epic, feature, title, priority, points).
 */
export const KbUpdateStoryInputSchema = z.object({
  /** Story ID to update (e.g., 'LNGG-0010') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** New epic value */
  epic: z.string().optional().nullable(),

  /** New feature value */
  feature: z.string().optional().nullable(),

  /** New title */
  title: z.string().optional(),

  /** New priority */
  priority: StoryPrioritySchema.optional().nullable(),

  /** New story points */
  points: z.number().int().min(0).optional().nullable(),

  /** Human-readable story description */
  description: z.string().optional().nullable(),

  /**
   * Acceptance criteria as JSONB (arbitrary structure).
   * Pass null to explicitly clear. Omit to leave unchanged.
   */
  acceptance_criteria: JSONValueSchema.optional().nullable(),

  /** Non-goals for this story (text array). Pass null to clear. */
  non_goals: z.array(z.string()).optional().nullable(),

  /** Packages touched by this story (text array). Pass null to clear. */
  packages: z.array(z.string()).optional().nullable(),
})

export type KbUpdateStoryInput = z.infer<typeof KbUpdateStoryInputSchema>

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

  /** Filter stories linked to plans with this tag (e.g., 'elaboration', 'lego-ui') */
  plan_tag: z.string().optional(),

  /** Filter stories linked to plans with this status (e.g., 'in-progress', 'draft') */
  plan_status: z
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
    ])
    .optional(),
})

export type KbGetNextStoryInput = z.infer<typeof KbGetNextStoryInputSchema>

/**
 * Input schema for kb_create_story tool.
 *
 * Upserts a story by story_id — creates a new record if the ID does not exist,
 * or merges the provided fields into the existing record (partial-merge semantics).
 * Fields not supplied in the input are NOT overwritten.
 */
export const KbCreateStoryInputSchema = z.object({
  /** Story ID (required, used as upsert key) */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Story title (required for create, optional on update) */
  title: z.string().min(1, 'Story title cannot be empty').optional(),

  /** Feature prefix (e.g., 'kfmb', 'wish') */
  feature: z.string().optional().nullable(),

  /** Epic name */
  epic: z.string().optional().nullable(),

  /** Relative path to story directory */
  story_dir: z.string().optional().nullable(),

  /** Story file name (default: 'story.yaml') */
  story_file: z.string().optional(),

  /** Type of story: 'feature' | 'bug' | 'spike' | 'chore' | 'tech_debt' */
  story_type: StoryTypeSchema.optional().nullable(),

  /** Story points estimate */
  points: z.number().int().min(0).optional().nullable(),

  /** Priority level: 'critical' | 'high' | 'medium' | 'low' */
  priority: StoryPrioritySchema.optional().nullable(),

  /** Workflow state */
  state: StoryStateSchema.optional(),

  /** Implementation phase */
  phase: StoryPhaseSchema.optional(),

  /** Whether story is blocked */
  blocked: z.boolean().optional(),

  /** Reason for being blocked */
  blocked_reason: z.string().optional().nullable(),

  /** Story ID that blocks this one */
  blocked_by_story: z.string().optional().nullable(),

  /** Scope flag: touches backend code */
  touches_backend: z.boolean().optional(),

  /** Scope flag: touches frontend code */
  touches_frontend: z.boolean().optional(),

  /** Scope flag: touches database */
  touches_database: z.boolean().optional(),

  /** Scope flag: touches infrastructure */
  touches_infra: z.boolean().optional(),

  /** Human-readable story description */
  description: z.string().optional().nullable(),

  /**
   * Acceptance criteria as JSONB (arbitrary structure).
   * Pass null to explicitly clear.
   */
  acceptance_criteria: JSONValueSchema.optional().nullable(),

  /** Non-goals for this story (text array) */
  non_goals: z.array(z.string()).optional().nullable(),

  /** Packages touched by this story (text array) */
  packages: z.array(z.string()).optional().nullable(),

  /** If provided, creates a 'spawned_from' link in plan_story_links for this plan slug */
  plan_slug: z.string().optional().nullable(),
})

export type KbCreateStoryInput = z.infer<typeof KbCreateStoryInputSchema>

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
): Promise<KbGetStoryResult> {
  const validated = KbGetStoryInputSchema.parse(input)

  const result = await deps.db
    .select(storyColumns)
    .from(stories)
    .where(and(eq(stories.storyId, validated.story_id), isNull(stories.deletedAt)))
    .limit(1)

  const story = result[0] ?? null

  // Short-circuit guard: when story not found, return empty arrays without secondary queries
  if (!story) {
    return {
      story: null,
      artifacts: [],
      dependencies: [],
      detail: null,
      message: `Story ${validated.story_id} not found`,
    }
  }

  // Fetch story details (1:1 detail table — cold columns)
  const detailResult = await deps.db
    .select(storyDetailColumns)
    .from(storyDetails)
    .where(eq(storyDetails.storyId, validated.story_id))
    .limit(1)

  const detail = detailResult[0] ?? null

  // Conditionally fetch artifacts (single SELECT, not N+1)
  let artifacts: (typeof storyArtifacts.$inferSelect)[] | undefined
  if (validated.include_artifacts) {
    artifacts = await deps.db
      .select(storyArtifactColumns)
      .from(storyArtifacts)
      .where(eq(storyArtifacts.storyId, validated.story_id))
  }

  // Conditionally fetch dependencies — bidirectional (outbound storyId=X OR inbound targetStoryId=X)
  let dependencies: (typeof storyDependencies.$inferSelect)[] | undefined
  if (validated.include_dependencies) {
    dependencies = await deps.db
      .select(storyDependencyColumns)
      .from(storyDependencies)
      .where(
        or(
          eq(storyDependencies.storyId, validated.story_id),
          eq(storyDependencies.targetStoryId, validated.story_id),
        ),
      )
  }

  return {
    story,
    detail,
    ...(artifacts !== undefined ? { artifacts } : {}),
    ...(dependencies !== undefined ? { dependencies } : {}),
    message: `Found story ${validated.story_id}`,
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

  const conditions: SQL<unknown>[] = [isNull(stories.deletedAt)]
  if (validated.feature) {
    conditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.epic) {
    conditions.push(eq(stories.epic, validated.epic))
  }
  // states[] takes precedence over singular state
  if (validated.states?.length) {
    conditions.push(inArray(stories.state, validated.states))
  } else if (validated.state) {
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

  // Filter by plan slug (direct match on plan_story_links)
  if (validated.plan_slug) {
    conditions.push(
      sql`${stories.storyId} IN (
        SELECT ${planStoryLinks.storyId}
        FROM ${planStoryLinks}
        WHERE ${eq(planStoryLinks.planSlug, validated.plan_slug)}
      )`,
    )
  }

  // Filter by plan tag or plan status via plan_story_links join
  if (validated.plan_tag || validated.plan_status) {
    const planConditions: SQL<unknown>[] = []
    if (validated.plan_tag) {
      planConditions.push(sql`${validated.plan_tag} = ANY(${plans.tags})`)
    }
    if (validated.plan_status) {
      planConditions.push(eq(plans.status, validated.plan_status))
    }
    conditions.push(
      sql`${stories.storyId} IN (
        SELECT ${planStoryLinks.storyId}
        FROM ${planStoryLinks}
        JOIN ${plans} ON ${plans.planSlug} = ${planStoryLinks.planSlug}
        WHERE ${and(...planConditions)}
      )`,
    )
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
    .select(storyColumns)
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
    .select(storyColumns)
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

  // Fetch storyDetails to check timestamps (moved from stories header in CDTS-1030)
  const existingDetails = await deps.db
    .select(storyDetailColumns)
    .from(storyDetails)
    .where(eq(storyDetails.storyId, validated.story_id))
    .limit(1)

  const currentDetail = existingDetails[0] ?? null

  // Terminal-state guard: prevent transitions OUT of terminal states
  // Same-state transitions are always allowed (idempotent)
  const TERMINAL_STATES = ['completed', 'cancelled', 'deferred']
  const currentState = existing[0].state
  if (
    validated.state !== undefined &&
    currentState !== null &&
    TERMINAL_STATES.includes(currentState) &&
    validated.state !== currentState
  ) {
    return {
      story: existing[0],
      updated: false,
      message: `Cannot transition story ${validated.story_id} from terminal state '${currentState}' to '${validated.state}'`,
    }
  }

  // Build update object for stories header
  const updates: Partial<typeof stories.$inferInsert> = {
    updatedAt: new Date(),
  }

  // Build update object for storyDetails (moved columns)
  const detailUpdates: Partial<typeof storyDetails.$inferInsert> = {}

  if (validated.state !== undefined) {
    updates.state = validated.state

    // Auto-set timestamps for state transitions (stored in storyDetails)
    if (validated.state === 'in_progress' && !currentDetail?.startedAt) {
      detailUpdates.startedAt = new Date()
    }
    if (validated.state === 'completed' && !currentDetail?.completedAt) {
      detailUpdates.completedAt = new Date()
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

    // Clear blocked fields when unblocking (stored in storyDetails)
    if (!validated.blocked) {
      detailUpdates.blockedReason = null
      detailUpdates.blockedByStory = null
    }
  }

  if (validated.blocked_reason !== undefined) {
    detailUpdates.blockedReason = validated.blocked_reason
  }

  if (validated.blocked_by_story !== undefined) {
    detailUpdates.blockedByStory = validated.blocked_by_story
  }

  if (validated.priority !== undefined) {
    updates.priority = validated.priority
  }

  // Perform update on stories header
  const result = await deps.db
    .update(stories)
    .set(updates)
    .where(eq(stories.storyId, validated.story_id))
    .returning()

  // Upsert storyDetails if there are detail fields to update
  if (Object.keys(detailUpdates).length > 0) {
    await deps.db
      .insert(storyDetails)
      .values({
        storyId: validated.story_id,
        ...detailUpdates,
      })
      .onConflictDoUpdate({
        target: storyDetails.storyId,
        set: { ...detailUpdates, updatedAt: new Date() },
      })
  }

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
    isNull(stories.deletedAt),
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

  // Filter by plan tag or plan status via plan_story_links join
  if (validated.plan_tag || validated.plan_status) {
    const planConditions: SQL<unknown>[] = []
    if (validated.plan_tag) {
      planConditions.push(sql`${validated.plan_tag} = ANY(${plans.tags})`)
    }
    if (validated.plan_status) {
      planConditions.push(eq(plans.status, validated.plan_status))
    }
    conditions.push(
      sql`${stories.storyId} IN (
        SELECT ${planStoryLinks.storyId}
        FROM ${planStoryLinks}
        JOIN ${plans} ON ${plans.planSlug} = ${planStoryLinks.planSlug}
        WHERE ${and(...planConditions)}
      )`,
    )
  }

  const whereCondition = and(...conditions)

  // Get candidate stories (unblocked, in correct state)
  const candidates = await deps.db
    .select(storyColumns)
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

/**
 * Update story metadata fields (epic, feature, title, priority, points).
 *
 * Use this to correct metadata like epic assignment without touching workflow state.
 *
 * @param deps - Database dependencies
 * @param input - Fields to update
 * @returns Updated story or null if not found
 */
export async function kb_update_story(
  deps: StoryCrudDeps,
  input: KbUpdateStoryInput,
): Promise<{
  story: typeof stories.$inferSelect | null
  updated: boolean
  message: string
}> {
  const validated = KbUpdateStoryInputSchema.parse(input)

  const existing = await deps.db
    .select(storyColumns)
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

  const updates: Partial<typeof stories.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (validated.epic !== undefined) {
    updates.epic = validated.epic
  }

  if (validated.feature !== undefined) {
    updates.feature = validated.feature
  }

  if (validated.title !== undefined) {
    updates.title = validated.title
  }

  if (validated.priority !== undefined) {
    updates.priority = validated.priority
  }

  if (validated.points !== undefined) {
    updates.points = validated.points
  }

  if (validated.description !== undefined) {
    updates.description = validated.description
  }

  if (validated.acceptance_criteria !== undefined) {
    updates.acceptanceCriteria = validated.acceptance_criteria
  }

  if (validated.non_goals !== undefined) {
    updates.nonGoals = validated.non_goals
  }

  if (validated.packages !== undefined) {
    updates.packages = validated.packages
  }

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
 * Create or update a story record (upsert by story_id).
 *
 * Implements partial-merge semantics:
 *   - If the story does not exist, it is created with the supplied fields.
 *   - If the story already exists, only the fields explicitly supplied in the
 *     input are written — omitted fields retain their current DB values.
 *
 * This is intentionally different from kb_upsert_plan which overwrites all
 * fields on conflict. Here we must never clobber existing metadata during
 * re-bootstrap calls that only supply a subset of fields.
 *
 * @param deps - Database dependencies
 * @param input - Story fields to create/merge
 * @returns Upserted story and whether it was newly created
 */
export async function kb_create_story(
  deps: StoryCrudDeps,
  input: KbCreateStoryInput,
): Promise<{
  story: typeof stories.$inferSelect
  created: boolean
  message: string
}> {
  const validated = KbCreateStoryInputSchema.parse(input)

  const now = new Date()

  const hasDetailFields =
    validated.story_dir !== undefined ||
    validated.story_file !== undefined ||
    validated.blocked_reason !== undefined ||
    validated.blocked_by_story !== undefined ||
    validated.touches_backend !== undefined ||
    validated.touches_frontend !== undefined ||
    validated.touches_database !== undefined ||
    validated.touches_infra !== undefined

  // ---------------------------------------------------------------------------
  // Atomic INSERT ON CONFLICT(story_id) DO NOTHING
  // Eliminates the SELECT-then-INSERT race condition.
  // If the insert succeeds (new row), wasCreated = true.
  // If the insert is a no-op (conflict), wasCreated = false and we fall through
  // to the partial-merge UPDATE path.
  // ---------------------------------------------------------------------------
  let wasCreated = false
  let story: typeof stories.$inferSelect

  const transactionResult = await deps.db.transaction(async tx => {
    // Attempt atomic insert — do nothing on conflict (story already exists)
    const insertResult = await tx
      .insert(stories)
      .values({
        storyId: validated.story_id,
        // title is required for new stories — validated after insert attempt
        title: validated.title ?? '',
        feature: validated.feature ?? null,
        epic: validated.epic ?? null,
        storyType: validated.story_type ?? null,
        points: validated.points ?? null,
        priority: validated.priority ?? null,
        state: validated.state ?? null,
        phase: validated.phase ?? null,
        blocked: validated.blocked ?? false,
        description: validated.description ?? null,
        acceptanceCriteria: validated.acceptance_criteria ?? null,
        nonGoals: validated.non_goals ?? null,
        packages: validated.packages ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: stories.storyId })
      .returning()

    if (insertResult.length > 0) {
      // Row was newly inserted — validate title requirement
      if (!validated.title) {
        // Roll back by deleting the placeholder row, then throw
        await tx.delete(stories).where(eq(stories.storyId, validated.story_id))
        throw new Error(
          `title is required when creating a new story (story_id: ${validated.story_id})`,
        )
      }

      // Insert story details if any detail fields were supplied
      if (hasDetailFields) {
        await tx
          .insert(storyDetails)
          .values({
            storyId: validated.story_id,
            storyDir: validated.story_dir ?? null,
            storyFile: validated.story_file ?? 'story.yaml',
            blockedReason: validated.blocked_reason ?? null,
            blockedByStory: validated.blocked_by_story ?? null,
            touchesBackend: validated.touches_backend ?? false,
            touchesFrontend: validated.touches_frontend ?? false,
            touchesDatabase: validated.touches_database ?? false,
            touchesInfra: validated.touches_infra ?? false,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: storyDetails.storyId,
            set: {
              storyDir: validated.story_dir ?? null,
              storyFile: validated.story_file ?? 'story.yaml',
              blockedReason: validated.blocked_reason ?? null,
              blockedByStory: validated.blocked_by_story ?? null,
              touchesBackend: validated.touches_backend ?? false,
              touchesFrontend: validated.touches_frontend ?? false,
              touchesDatabase: validated.touches_database ?? false,
              touchesInfra: validated.touches_infra ?? false,
              updatedAt: now,
            },
          })
      }

      if (validated.plan_slug) {
        await tx
          .insert(planStoryLinks)
          .values({
            planSlug: validated.plan_slug,
            storyId: validated.story_id,
            linkType: 'spawned_from',
          })
          .onConflictDoNothing()
      }

      return { row: insertResult[0]!, isNew: true }
    }

    // Conflict: story already exists — perform partial-merge UPDATE
    const updates: Partial<typeof stories.$inferInsert> = { updatedAt: now }

    if (validated.title !== undefined) updates.title = validated.title
    if (validated.feature !== undefined) updates.feature = validated.feature
    if (validated.epic !== undefined) updates.epic = validated.epic
    if (validated.story_type !== undefined) updates.storyType = validated.story_type
    if (validated.points !== undefined) updates.points = validated.points
    if (validated.priority !== undefined) updates.priority = validated.priority
    if (validated.state !== undefined) updates.state = validated.state
    if (validated.phase !== undefined) updates.phase = validated.phase
    if (validated.blocked !== undefined) updates.blocked = validated.blocked
    if (validated.description !== undefined) updates.description = validated.description
    if (validated.acceptance_criteria !== undefined)
      updates.acceptanceCriteria = validated.acceptance_criteria
    if (validated.non_goals !== undefined) updates.nonGoals = validated.non_goals
    if (validated.packages !== undefined) updates.packages = validated.packages

    const updateResult = await tx
      .update(stories)
      .set(updates)
      .where(eq(stories.storyId, validated.story_id))
      .returning()

    // Upsert detail fields if any were supplied
    const detailUpdates: Partial<typeof storyDetails.$inferInsert> = { updatedAt: now }
    let hasDetailUpdates = false

    if (validated.story_dir !== undefined) {
      detailUpdates.storyDir = validated.story_dir
      hasDetailUpdates = true
    }
    if (validated.story_file !== undefined) {
      detailUpdates.storyFile = validated.story_file
      hasDetailUpdates = true
    }
    if (validated.blocked_reason !== undefined) {
      detailUpdates.blockedReason = validated.blocked_reason
      hasDetailUpdates = true
    }
    if (validated.blocked_by_story !== undefined) {
      detailUpdates.blockedByStory = validated.blocked_by_story
      hasDetailUpdates = true
    }
    // Clear stale blocker metadata when unblocking
    if (validated.blocked === false) {
      detailUpdates.blockedReason = null
      detailUpdates.blockedByStory = null
      hasDetailUpdates = true
    }
    if (validated.touches_backend !== undefined) {
      detailUpdates.touchesBackend = validated.touches_backend
      hasDetailUpdates = true
    }
    if (validated.touches_frontend !== undefined) {
      detailUpdates.touchesFrontend = validated.touches_frontend
      hasDetailUpdates = true
    }
    if (validated.touches_database !== undefined) {
      detailUpdates.touchesDatabase = validated.touches_database
      hasDetailUpdates = true
    }
    if (validated.touches_infra !== undefined) {
      detailUpdates.touchesInfra = validated.touches_infra
      hasDetailUpdates = true
    }

    if (hasDetailUpdates) {
      await tx
        .insert(storyDetails)
        .values({ storyId: validated.story_id, ...detailUpdates })
        .onConflictDoUpdate({ target: storyDetails.storyId, set: detailUpdates })
    }

    if (validated.plan_slug) {
      await tx
        .insert(planStoryLinks)
        .values({
          planSlug: validated.plan_slug,
          storyId: validated.story_id,
          linkType: 'spawned_from',
        })
        .onConflictDoNothing()
    }

    return { row: updateResult[0]!, isNew: false }
  })

  wasCreated = transactionResult.isNew
  story = transactionResult.row

  return {
    story,
    created: wasCreated,
    message: wasCreated
      ? `Story ${validated.story_id} created successfully`
      : `Story ${validated.story_id} updated successfully`,
  }
}
