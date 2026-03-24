/**
 * Story CRUD Operations
 *
 * MCP operations for managing story status and workflow state.
 * Provides kb_get_story, kb_list_stories, kb_update_story_status, and kb_update_story tools.
 *
 * @see Implementation plan for story status tracking
 */

import { z } from 'zod'
import { eq, and, or, sql, desc, asc, inArray, notInArray, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { stories, storyArtifacts, storyDependencies, plans, planStoryLinks } from '../db/schema.js'
import {
  StoryStateSchema,
  StoryPhaseSchema,
  StoryPrioritySchema,
  StoryTypeSchema,
  DependencyTypeSchema,
} from '../__types__/index.js'

// ============================================================================
// Explicit column selectors — guard against schema-vs-DB drift
// ============================================================================

const storyColumns = {
  storyId: stories.storyId,
  feature: stories.feature,
  title: stories.title,
  description: stories.description,
  state: stories.state,
  priority: stories.priority,
  blockedReason: stories.blockedReason,
  blockedByStory: stories.blockedByStory,
  startedAt: stories.startedAt,
  completedAt: stories.completedAt,
  fileHash: stories.fileHash,
  createdAt: stories.createdAt,
  updatedAt: stories.updatedAt,
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
  dependsOnId: storyDependencies.dependsOnId,
  dependencyType: storyDependencies.dependencyType,
  createdAt: storyDependencies.createdAt,
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
  story: z.custom<Partial<typeof stories.$inferSelect>>().nullable(),
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

  /** Filter by epic name (e.g., 'platform') — note: epic is not a column on workflow.stories; this filter is ignored */
  epic: z.string().optional(),

  /** Filter by workflow state (singular; ignored when states[] is provided) */
  state: StoryStateSchema.optional(),

  /** Filter by multiple workflow states (takes precedence over singular state) */
  states: z.array(StoryStateSchema).optional(),

  /** Filter by implementation phase — note: phase is not a column on workflow.stories; this filter is ignored */
  phase: StoryPhaseSchema.optional(),

  /** Filter by blocked status — note: blocked is not a column on workflow.stories; this filter is ignored */
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

  /** New implementation phase — note: phase is not a column on workflow.stories; this field is accepted but not persisted */
  phase: StoryPhaseSchema.optional(),

  /** New iteration count — note: iteration is not a column on workflow.stories; this field is accepted but not persisted */
  iteration: z.number().int().min(0).optional(),

  /** Set blocked status — note: blocked is not a column on workflow.stories; this field is accepted but not persisted */
  blocked: z.boolean().optional(),

  /** Reason for being blocked */
  blocked_reason: z.string().nullable().optional(),

  /** Story ID that blocks this one */
  blocked_by_story: z.string().nullable().optional(),

  /** New priority */
  priority: StoryPrioritySchema.nullable().optional(),
})

export type KbUpdateStoryStatusInput = z.infer<typeof KbUpdateStoryStatusInputSchema>

/**
 * Input schema for kb_update_story tool.
 *
 * Updates story metadata fields (feature, title, priority).
 */
export const KbUpdateStoryInputSchema = z.object({
  /** Story ID to update (e.g., 'LNGG-0010') */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** New epic value — note: epic is not a column on workflow.stories; this field is accepted but not persisted */
  epic: z.string().nullable().optional(),

  /** New feature value */
  feature: z.string().nullable().optional(),

  /** New title */
  title: z.string().optional(),

  /** New priority */
  priority: StoryPrioritySchema.nullable().optional(),

  /** New story points — note: points is not a column on workflow.stories; this field is accepted but not persisted */
  points: z.number().int().min(0).nullable().optional(),

  /** Human-readable story description */
  description: z.string().nullable().optional(),

  /**
   * Acceptance criteria as JSONB (arbitrary structure).
   * Note: acceptanceCriteria is not a column on workflow.stories; this field is accepted but not persisted.
   * Pass null to explicitly clear. Omit to leave unchanged.
   */
  acceptance_criteria: JSONValueSchema.nullable().optional(),

  /** Non-goals for this story (text array). Note: nonGoals is not a column on workflow.stories; not persisted. */
  non_goals: z.array(z.string()).nullable().optional(),

  /** Packages touched by this story (text array). Note: packages is not a column on workflow.stories; not persisted. */
  packages: z.array(z.string()).nullable().optional(),
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
  feature: z.string().nullable().optional(),

  /** Epic name — note: epic is not a column on workflow.stories; accepted but not persisted */
  epic: z.string().nullable().optional(),

  /** Relative path to story directory — not a column on workflow.stories; accepted but not persisted */
  story_dir: z.string().nullable().optional(),

  /** Story file name — not a column on workflow.stories; accepted but not persisted */
  story_file: z.string().optional(),

  /** Type of story: 'feature' | 'bug' | 'spike' | 'chore' | 'tech_debt' — not a column on workflow.stories; accepted but not persisted */
  story_type: StoryTypeSchema.nullable().optional(),

  /** Story points estimate — not a column on workflow.stories; accepted but not persisted */
  points: z.number().int().min(0).nullable().optional(),

  /** Priority level: 'critical' | 'high' | 'medium' | 'low' */
  priority: StoryPrioritySchema.nullable().optional(),

  /** Workflow state */
  state: StoryStateSchema.optional(),

  /** Implementation phase — not a column on workflow.stories; accepted but not persisted */
  phase: StoryPhaseSchema.optional(),

  /** Whether story is blocked — not a column on workflow.stories; accepted but not persisted */
  blocked: z.boolean().optional(),

  /** Reason for being blocked */
  blocked_reason: z.string().nullable().optional(),

  /** Story ID that blocks this one */
  blocked_by_story: z.string().nullable().optional(),

  /** Scope flag: touches backend code — not a column on workflow.stories; accepted but not persisted */
  touches_backend: z.boolean().optional(),

  /** Scope flag: touches frontend code — not a column on workflow.stories; accepted but not persisted */
  touches_frontend: z.boolean().optional(),

  /** Scope flag: touches database — not a column on workflow.stories; accepted but not persisted */
  touches_database: z.boolean().optional(),

  /** Scope flag: touches infrastructure — not a column on workflow.stories; accepted but not persisted */
  touches_infra: z.boolean().optional(),

  /** Human-readable story description */
  description: z.string().nullable().optional(),

  /**
   * Acceptance criteria as JSONB (arbitrary structure).
   * Note: acceptanceCriteria is not a column on workflow.stories; not persisted.
   */
  acceptance_criteria: JSONValueSchema.nullable().optional(),

  /** Non-goals for this story — not a column on workflow.stories; not persisted */
  non_goals: z.array(z.string()).nullable().optional(),

  /** Packages touched by this story — not a column on workflow.stories; not persisted */
  packages: z.array(z.string()).nullable().optional(),

  /** If provided, creates a 'spawned_from' link in plan_story_links for this plan slug */
  plan_slug: z.string().nullable().optional(),
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
    .where(eq(stories.storyId, validated.story_id))
    .limit(1)

  const story = result[0] ?? null

  // Short-circuit guard: when story not found, return empty arrays without secondary queries
  if (!story) {
    return {
      story: null,
      artifacts: [],
      dependencies: [],
      message: `Story ${validated.story_id} not found`,
    }
  }

  // Conditionally fetch artifacts (single SELECT, not N+1)
  let artifacts: (typeof storyArtifacts.$inferSelect)[] | undefined
  if (validated.include_artifacts) {
    artifacts = await deps.db
      .select(storyArtifactColumns)
      .from(storyArtifacts)
      .where(eq(storyArtifacts.storyId, validated.story_id))
  }

  // Conditionally fetch dependencies — bidirectional (outbound storyId=X OR inbound dependsOnId=X)
  let dependencies: (typeof storyDependencies.$inferSelect)[] | undefined
  if (validated.include_dependencies) {
    dependencies = await deps.db
      .select(storyDependencyColumns)
      .from(storyDependencies)
      .where(
        or(
          eq(storyDependencies.storyId, validated.story_id),
          eq(storyDependencies.dependsOnId, validated.story_id),
        ),
      )
  }

  return {
    story,
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
  stories: Partial<typeof stories.$inferSelect>[]
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
  // states[] takes precedence over singular state
  if (validated.states?.length) {
    conditions.push(inArray(stories.state, validated.states))
  } else if (validated.state) {
    conditions.push(eq(stories.state, validated.state))
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
  story: Partial<typeof stories.$inferSelect> | null
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

  // Terminal-state guard: prevent transitions OUT of terminal states
  // Same-state transitions are always allowed (idempotent)
  const TERMINAL_STATES = ['completed', 'cancelled']
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

  // Artifact pre-condition gate: certain transitions require a KB artifact to exist first.
  // Maps "fromState→toState" to the required artifact_type in artifacts.story_artifacts.
  const ARTIFACT_GATES: Partial<Record<string, string>> = {
    'elab→ready': 'elaboration',
    'in_progress→needs_code_review': 'proof',
    'needs_code_review→ready_for_qa': 'review',
    // Note: The artifact type here is 'qa_gate' (not 'qa_verify'). Historical story descriptions
    // used the name 'qa_verify', but the canonical artifact type in story_artifacts is 'qa_gate'.
    'in_qa→completed': 'qa_gate',
  }

  if (validated.state !== undefined && currentState !== null) {
    const gateKey = `${currentState}→${validated.state}`
    const requiredArtifactType = ARTIFACT_GATES[gateKey]
    if (requiredArtifactType) {
      const found = await deps.db
        .select({ id: storyArtifacts.id })
        .from(storyArtifacts)
        .where(
          and(
            eq(storyArtifacts.storyId, validated.story_id),
            eq(storyArtifacts.artifactType, requiredArtifactType),
          ),
        )
        .limit(1)

      if (found.length === 0) {
        return {
          story: existing[0],
          updated: false,
          message: `Cannot transition story ${validated.story_id} from '${currentState}' to '${validated.state}': required artifact '${requiredArtifactType}' not found in KB`,
        }
      }
    }
  }

  // Build update object for stories
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

  if (validated.blocked_reason !== undefined) {
    updates.blockedReason = validated.blocked_reason
  }

  if (validated.blocked_by_story !== undefined) {
    updates.blockedByStory = validated.blocked_by_story
  }

  // Clear blocked fields when unblocking (blocked=false signals intent to clear)
  if (validated.blocked === false) {
    updates.blockedReason = null
    updates.blockedByStory = null
  }

  if (validated.priority !== undefined) {
    updates.priority = validated.priority
  }

  // Perform update on stories
  const result = await deps.db
    .update(stories)
    .set(updates)
    .where(eq(stories.storyId, validated.story_id))
    .returning(storyColumns)

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
 * - In the specified epic (matched via feature prefix since epic is not on workflow.stories)
 * - In 'ready' state (or 'backlog' if include_backlog is true)
 * - Have no blocking dependencies
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
  story: Partial<typeof stories.$inferSelect> | null
  candidates_count: number
  blocked_by_dependencies: string[]
  message: string
}> {
  const validated = KbGetNextStoryInputSchema.parse(input)

  // Build state filter
  const validStates = validated.include_backlog ? ['ready', 'backlog'] : ['ready']

  // Build base conditions — epic filter mapped to feature since epic is not on workflow.stories
  const conditions: SQL<unknown>[] = [
    eq(stories.feature, validated.epic),
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

  // Get candidate stories (in correct state)
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

  // Get all dependencies for candidate stories
  const candidateIds = candidates.map(c => c.storyId)

  const deps_ = await deps.db
    .select({
      storyId: storyDependencies.storyId,
      dependsOnId: storyDependencies.dependsOnId,
      dependencyType: storyDependencies.dependencyType,
    })
    .from(storyDependencies)
    .where(
      and(
        inArray(storyDependencies.storyId, candidateIds),
        // Only consider blocking dependency types
        inArray(storyDependencies.dependencyType, ['depends_on', 'blocked_by']),
      ),
    )

  // For dependencies, check if target story is completed
  const dependsOnIds = [...new Set(deps_.map(d => d.dependsOnId))]

  let completedTargets: Set<string> = new Set()
  if (dependsOnIds.length > 0) {
    const targetStories = await deps.db
      .select({ storyId: stories.storyId })
      .from(stories)
      .where(
        and(inArray(stories.storyId, dependsOnIds), inArray(stories.state, ['completed', 'UAT'])),
      )

    completedTargets = new Set(targetStories.map(t => t.storyId))
  }

  // Build map of stories blocked by unresolved dependencies
  const blockedStories = new Map<string, string[]>()
  for (const dep of deps_) {
    // If the target story is completed, the dependency is effectively satisfied
    if (completedTargets.has(dep.dependsOnId)) {
      continue
    }

    if (!blockedStories.has(dep.storyId)) {
      blockedStories.set(dep.storyId, [])
    }
    blockedStories.get(dep.storyId)!.push(dep.dependsOnId)
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
 * Update story metadata fields (feature, title, priority, description).
 *
 * Use this to correct metadata like feature assignment without touching workflow state.
 *
 * @param deps - Database dependencies
 * @param input - Fields to update
 * @returns Updated story or null if not found
 */
export async function kb_update_story(
  deps: StoryCrudDeps,
  input: KbUpdateStoryInput,
): Promise<{
  story: Partial<typeof stories.$inferSelect> | null
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

  if (validated.feature !== undefined) {
    updates.feature = validated.feature ?? undefined
  }

  if (validated.title !== undefined) {
    updates.title = validated.title
  }

  if (validated.priority !== undefined) {
    updates.priority = validated.priority
  }

  if (validated.description !== undefined) {
    updates.description = validated.description
  }

  const result = await deps.db
    .update(stories)
    .set(updates)
    .where(eq(stories.storyId, validated.story_id))
    .returning(storyColumns)

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
  story: Partial<typeof stories.$inferSelect>
  created: boolean
  message: string
}> {
  const validated = KbCreateStoryInputSchema.parse(input)

  const now = new Date()

  // ---------------------------------------------------------------------------
  // Atomic INSERT ON CONFLICT(story_id) DO NOTHING
  // Eliminates the SELECT-then-INSERT race condition.
  // If the insert succeeds (new row), wasCreated = true.
  // If the insert is a no-op (conflict), wasCreated = false and we fall through
  // to the partial-merge UPDATE path.
  // ---------------------------------------------------------------------------
  let wasCreated = false

  const transactionResult = await deps.db.transaction(async tx => {
    // Attempt atomic insert — do nothing on conflict (story already exists)
    const insertResult = await tx
      .insert(stories)
      .values({
        storyId: validated.story_id,
        // title is required for new stories — validated after insert attempt
        title: validated.title ?? '',
        feature: validated.feature ?? 'unknown',
        state: validated.state ?? null,
        priority: validated.priority ?? null,
        description: validated.description ?? null,
        blockedReason: validated.blocked_reason ?? null,
        blockedByStory: validated.blocked_by_story ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: stories.storyId })
      .returning(storyColumns)

    if (insertResult.length > 0) {
      // Row was newly inserted — validate title requirement
      if (!validated.title) {
        // Roll back by deleting the placeholder row, then throw
        await tx.delete(stories).where(eq(stories.storyId, validated.story_id))
        throw new Error(
          `title is required when creating a new story (story_id: ${validated.story_id})`,
        )
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
    if (validated.feature !== undefined) updates.feature = validated.feature ?? undefined
    if (validated.state !== undefined) updates.state = validated.state
    if (validated.priority !== undefined) updates.priority = validated.priority
    if (validated.description !== undefined) updates.description = validated.description
    if (validated.blocked_reason !== undefined) updates.blockedReason = validated.blocked_reason
    if (validated.blocked_by_story !== undefined)
      updates.blockedByStory = validated.blocked_by_story
    // Clear stale blocker metadata when unblocking
    if (validated.blocked === false) {
      updates.blockedReason = null
      updates.blockedByStory = null
    }

    const updateResult = await tx
      .update(stories)
      .set(updates)
      .where(eq(stories.storyId, validated.story_id))
      .returning(storyColumns)

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
  const story = transactionResult.row

  return {
    story,
    created: wasCreated,
    message: wasCreated
      ? `Story ${validated.story_id} created successfully`
      : `Story ${validated.story_id} updated successfully`,
  }
}

// ============================================================================
// Dependency graph validation helpers
// ============================================================================

const MAX_CYCLE_DEPTH = 10

/**
 * Detect if adding an edge (storyId → dependsOnId) would create a cycle.
 *
 * BFS from dependsOnId following existing edges. If any traversal reaches
 * storyId, the proposed edge would create a cycle.
 *
 * Ported from migration 1090 recursive CTE (P0004 cycle detection).
 *
 * @returns Cycle message string if cycle detected, null if safe
 */
async function detectCycle(
  db: NodePgDatabase<typeof schema>,
  storyId: string,
  dependsOnId: string,
): Promise<string | null> {
  const visited = new Set<string>()
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: dependsOnId, path: [storyId, dependsOnId] },
  ]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current.path.length >= MAX_CYCLE_DEPTH + 1) {
      continue // Bounded traversal — do not expand nodes at max depth
    }

    if (visited.has(current.nodeId)) {
      continue
    }
    visited.add(current.nodeId)

    // Find all outgoing edges from this node (nodeId depends_on X → follow to X)
    const edges = await db
      .select({ dependsOnId: storyDependencies.dependsOnId })
      .from(storyDependencies)
      .where(eq(storyDependencies.storyId, current.nodeId))

    for (const edge of edges) {
      if (edge.dependsOnId === storyId) {
        // Cycle detected — the target of the proposed edge eventually leads back to source
        const cyclePath = [...current.path, edge.dependsOnId].join(' → ')
        return `Cycle detected: ${cyclePath}`
      }

      if (!visited.has(edge.dependsOnId)) {
        queue.push({
          nodeId: edge.dependsOnId,
          path: [...current.path, edge.dependsOnId],
        })
      }
    }
  }

  return null
}

// ============================================================================
// kb_add_dependency
// ============================================================================

/**
 * Input schema for kb_add_dependency tool.
 */
export const KbAddDependencyInputSchema = z.object({
  /** Story that has the dependency */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Story that is depended upon */
  depends_on_id: z.string().min(1, 'Depends-on ID cannot be empty'),

  /** Type of dependency relationship */
  dependency_type: DependencyTypeSchema,
})

export type KbAddDependencyInput = z.infer<typeof KbAddDependencyInputSchema>

/**
 * Add a dependency relationship between two stories.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING on the (story_id, depends_on_id, dependency_type) triple.
 * Rejects self-referential dependencies (story_id === depends_on_id).
 *
 * @param deps - Database dependencies
 * @param input - Dependency to create
 * @returns Created dependency info
 */
export async function kb_add_dependency(
  deps: StoryCrudDeps,
  input: KbAddDependencyInput,
): Promise<{
  created: boolean
  message: string
}> {
  const validated = KbAddDependencyInputSchema.parse(input)

  // Self-referential guard
  if (validated.story_id === validated.depends_on_id) {
    return {
      created: false,
      message: `Cannot create self-referential dependency: ${validated.story_id} → ${validated.depends_on_id}`,
    }
  }

  // Orphan guard — depends_on_id must reference an existing story
  const targetExists = await deps.db
    .select({ storyId: stories.storyId })
    .from(stories)
    .where(eq(stories.storyId, validated.depends_on_id))
    .limit(1)

  if (targetExists.length === 0) {
    return {
      created: false,
      message: `depends_on_id not found: ${validated.depends_on_id}`,
    }
  }

  // Also verify story_id exists (prevents dangling edges from either side)
  const sourceExists = await deps.db
    .select({ storyId: stories.storyId })
    .from(stories)
    .where(eq(stories.storyId, validated.story_id))
    .limit(1)

  if (sourceExists.length === 0) {
    return {
      created: false,
      message: `story_id not found: ${validated.story_id}`,
    }
  }

  // Cycle detection — BFS traversal from depends_on_id to see if it reaches story_id
  // Ported from migration 1090 recursive CTE (P0004 cycle detection)
  const cycleMessage = await detectCycle(deps.db, validated.story_id, validated.depends_on_id)
  if (cycleMessage) {
    return {
      created: false,
      message: cycleMessage,
    }
  }

  // Idempotent: check if the exact triple already exists before inserting.
  // DB has uq_story_dependency on (story_id, depends_on_id) which is MORE restrictive
  // than triple uniqueness — prevents multiple edge types between the same story pair.
  const existing = await deps.db
    .select({ id: storyDependencies.id })
    .from(storyDependencies)
    .where(
      and(
        eq(storyDependencies.storyId, validated.story_id),
        eq(storyDependencies.dependsOnId, validated.depends_on_id),
        eq(storyDependencies.dependencyType, validated.dependency_type),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    return {
      created: false,
      message: `Dependency already exists: ${validated.story_id} ${validated.dependency_type} ${validated.depends_on_id}`,
    }
  }

  await deps.db.insert(storyDependencies).values({
    storyId: validated.story_id,
    dependsOnId: validated.depends_on_id,
    dependencyType: validated.dependency_type,
  })

  return {
    created: true,
    message: `Dependency created: ${validated.story_id} ${validated.dependency_type} ${validated.depends_on_id}`,
  }
}

// ============================================================================
// kb_get_story_plan_links
// ============================================================================

/**
 * Input schema for kb_get_story_plan_links tool.
 */
export const KbGetStoryPlanLinksInputSchema = z.object({
  /** Story ID to look up plan links for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),
})

export type KbGetStoryPlanLinksInput = z.infer<typeof KbGetStoryPlanLinksInputSchema>

/**
 * Get all plan linkages for a story.
 *
 * Returns the plans that reference this story via plan_story_links.
 *
 * @param deps - Database dependencies
 * @param input - Story ID to look up
 * @returns Array of plan links
 */
export async function kb_get_story_plan_links(
  deps: StoryCrudDeps,
  input: KbGetStoryPlanLinksInput,
): Promise<{
  links: { plan_slug: string; link_type: string }[]
  message: string
}> {
  const validated = KbGetStoryPlanLinksInputSchema.parse(input)

  const result = await deps.db
    .select({
      planSlug: planStoryLinks.planSlug,
      linkType: planStoryLinks.linkType,
    })
    .from(planStoryLinks)
    .where(eq(planStoryLinks.storyId, validated.story_id))

  const links = result.map(r => ({
    plan_slug: r.planSlug,
    link_type: r.linkType,
  }))

  return {
    links,
    message:
      links.length > 0
        ? `Found ${links.length} plan link(s) for story ${validated.story_id}`
        : `No plan links found for story ${validated.story_id}`,
  }
}
