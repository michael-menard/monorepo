/**
 * Plan CRUD Operations
 *
 * MCP operations for reading plans from the KB plans table.
 * Used by /pm-bootstrap-workflow to fetch plan content for story generation.
 *
 * @see plans table in db/schema.ts
 */

import { z } from 'zod'
import { eq, sql, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { plans } from '../db/schema.js'

// ============================================================================
// Upsert Input Schema
// ============================================================================

/**
 * Input schema for kb_upsert_plan tool.
 */
export const KbUpsertPlanInputSchema = z.object({
  /** Filename slug without extension (e.g., 'autonomous-pipeline') */
  plan_slug: z.string().min(1),

  /** Title extracted from the first # heading */
  title: z.string().min(1),

  /** Full raw markdown content */
  raw_content: z.string().min(1).max(200_000),

  /** First paragraph — quick description */
  summary: z.string().optional(),

  /** Category of plan */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** Status lifecycle */
  status: z
    .enum(['draft', 'accepted', 'stories-created', 'in-progress', 'implemented', 'superseded', 'archived'])
    .optional()
    .default('draft'),

  /** Target feature directory (e.g., 'plans/future/platform/autonomous-pipeline') */
  feature_dir: z.string().optional(),

  /** Story ID prefix (e.g., 'APIP') */
  story_prefix: z.string().optional(),

  /** Estimated number of stories */
  estimated_stories: z.number().int().optional(),

  /** Priority level (P1 highest, P5 lowest, default P3) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional().default('P3'),

  /** Tags for categorization */
  tags: z.array(z.string()).optional(),

  /** Original source file path (e.g., '~/.claude/plans/jiggly-cooking-patterson.md') */
  source_file: z.string().optional(),
})

export type KbUpsertPlanInput = z.infer<typeof KbUpsertPlanInputSchema>

// ============================================================================
// Update Plan Input Schema
// ============================================================================

/**
 * Input schema for kb_update_plan tool.
 * Lightweight update — only touches the fields you provide.
 */
export const KbUpdatePlanInputSchema = z.object({
  /** Plan slug to update (required) */
  plan_slug: z.string().min(1, 'Plan slug cannot be empty'),

  /** New priority (P1 highest, P5 lowest) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),

  /** New status */
  status: z
    .enum(['draft', 'accepted', 'stories-created', 'in-progress', 'implemented', 'superseded', 'archived'])
    .optional(),

  /** New tags (replaces existing tags) */
  tags: z.array(z.string()).optional(),

  /** New title */
  title: z.string().min(1).optional(),

  /** New plan type */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** New feature directory */
  feature_dir: z.string().optional().nullable(),

  /** New story prefix */
  story_prefix: z.string().optional().nullable(),

  /** New estimated stories count */
  estimated_stories: z.number().int().optional().nullable(),
})

export type KbUpdatePlanInput = z.infer<typeof KbUpdatePlanInputSchema>

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for kb_get_plan tool.
 */
export const KbGetPlanInputSchema = z.object({
  /** Plan slug to retrieve (e.g., 'kb-native-story-creation') */
  plan_slug: z.string().min(1, 'Plan slug cannot be empty'),
})

export type KbGetPlanInput = z.infer<typeof KbGetPlanInputSchema>

/**
 * Input schema for kb_list_plans tool.
 */
export const KbListPlansInputSchema = z.object({
  /** Filter by plan status */
  status: z
    .enum(['draft', 'accepted', 'stories-created', 'in-progress', 'implemented', 'superseded', 'archived'])
    .optional(),

  /** Filter by plan type */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** Filter by story prefix (e.g., 'SKCR') */
  story_prefix: z.string().optional(),

  /** Filter by priority (P1-P5) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),

  /** Maximum results (1-100, default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),

  /** Include raw_content in response (default: false, saves bandwidth) */
  include_content: z.boolean().optional().default(false),
})

export type KbListPlansInput = z.infer<typeof KbListPlansInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface PlanCrudDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Get a plan by its slug.
 *
 * Returns the full plan record including raw_content.
 */
export async function kb_get_plan(
  deps: PlanCrudDeps,
  input: KbGetPlanInput,
): Promise<{
  plan: typeof plans.$inferSelect | null
  message: string
}> {
  const validated = KbGetPlanInputSchema.parse(input)

  const result = await deps.db
    .select()
    .from(plans)
    .where(eq(plans.planSlug, validated.plan_slug))
    .limit(1)

  const plan = result[0] ?? null

  return {
    plan,
    message: plan
      ? `Found plan: ${plan.title}`
      : `No plan found with slug '${validated.plan_slug}'`,
  }
}

/**
 * List plans with optional filters.
 *
 * By default omits raw_content to reduce response size.
 * Use include_content: true to get full plan content.
 */
export async function kb_list_plans(
  deps: PlanCrudDeps,
  input: KbListPlansInput,
): Promise<{
  plans: Array<Partial<typeof plans.$inferSelect>>
  total: number
  message: string
}> {
  const validated = KbListPlansInputSchema.parse(input)

  const conditions: SQL[] = []

  if (validated.status) {
    conditions.push(eq(plans.status, validated.status))
  }
  if (validated.plan_type) {
    conditions.push(eq(plans.planType, validated.plan_type))
  }
  if (validated.story_prefix) {
    conditions.push(eq(plans.storyPrefix, validated.story_prefix))
  }
  if (validated.priority) {
    conditions.push(eq(plans.priority, validated.priority))
  }

  const whereClause =
    conditions.length > 0
      ? sql`${sql.join(conditions, sql` AND `)}`
      : undefined

  // Count total
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(plans)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Select columns based on include_content flag
  const selectColumns = validated.include_content
    ? undefined // select all
    : {
        id: plans.id,
        planSlug: plans.planSlug,
        title: plans.title,
        summary: plans.summary,
        planType: plans.planType,
        status: plans.status,
        featureDir: plans.featureDir,
        storyPrefix: plans.storyPrefix,
        estimatedStories: plans.estimatedStories,
        priority: plans.priority,
        phases: plans.phases,
        tags: plans.tags,
        sourceFile: plans.sourceFile,
        createdAt: plans.createdAt,
        updatedAt: plans.updatedAt,
      }

  const result = selectColumns
    ? await deps.db
        .select(selectColumns)
        .from(plans)
        .where(whereClause)
        .limit(validated.limit)
        .offset(validated.offset)
        .orderBy(plans.createdAt)
    : await deps.db
        .select()
        .from(plans)
        .where(whereClause)
        .limit(validated.limit)
        .offset(validated.offset)
        .orderBy(plans.createdAt)

  return {
    plans: result,
    total,
    message: `Found ${result.length} plans (${total} total)`,
  }
}

/**
 * Upsert a plan record.
 *
 * Inserts a new plan or updates the existing one if plan_slug already exists.
 */
export async function kb_upsert_plan(
  deps: PlanCrudDeps,
  input: KbUpsertPlanInput,
): Promise<{
  plan: typeof plans.$inferSelect
  created: boolean
  message: string
}> {
  const validated = KbUpsertPlanInputSchema.parse(input)

  const now = new Date()

  const values = {
    planSlug: validated.plan_slug,
    title: validated.title,
    rawContent: validated.raw_content,
    summary: validated.summary ?? null,
    planType: validated.plan_type ?? null,
    status: validated.status ?? 'draft',
    featureDir: validated.feature_dir ?? null,
    storyPrefix: validated.story_prefix ?? null,
    estimatedStories: validated.estimated_stories ?? null,
    priority: validated.priority ?? 'P3',
    tags: validated.tags ?? null,
    sourceFile: validated.source_file ?? null,
    updatedAt: now,
  }

  const result = await deps.db
    .insert(plans)
    .values({ ...values, importedAt: now, createdAt: now })
    .onConflictDoUpdate({
      target: plans.planSlug,
      set: { ...values },
    })
    .returning()

  const plan = result[0]!
  const created = plan.createdAt.getTime() === now.getTime()

  return {
    plan,
    created,
    message: created
      ? `Plan '${validated.plan_slug}' created successfully`
      : `Plan '${validated.plan_slug}' updated successfully`,
  }
}

/**
 * Update a plan's metadata fields.
 *
 * Lightweight update — only touches the fields you provide.
 * Use this to change priority, status, tags, etc. without supplying raw_content.
 */
export async function kb_update_plan(
  deps: PlanCrudDeps,
  input: KbUpdatePlanInput,
): Promise<{
  plan: typeof plans.$inferSelect | null
  updated: boolean
  message: string
}> {
  const validated = KbUpdatePlanInputSchema.parse(input)

  // Check if plan exists
  const existing = await deps.db
    .select()
    .from(plans)
    .where(eq(plans.planSlug, validated.plan_slug))
    .limit(1)

  if (existing.length === 0) {
    return {
      plan: null,
      updated: false,
      message: `Plan '${validated.plan_slug}' not found`,
    }
  }

  // Build update object from provided fields
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (validated.priority !== undefined) updates.priority = validated.priority
  if (validated.status !== undefined) updates.status = validated.status
  if (validated.tags !== undefined) updates.tags = validated.tags
  if (validated.title !== undefined) updates.title = validated.title
  if (validated.plan_type !== undefined) updates.planType = validated.plan_type
  if (validated.feature_dir !== undefined) updates.featureDir = validated.feature_dir
  if (validated.story_prefix !== undefined) updates.storyPrefix = validated.story_prefix
  if (validated.estimated_stories !== undefined) updates.estimatedStories = validated.estimated_stories

  const result = await deps.db
    .update(plans)
    .set(updates)
    .where(eq(plans.planSlug, validated.plan_slug))
    .returning()

  const plan = result[0] ?? null

  return {
    plan,
    updated: true,
    message: `Plan '${validated.plan_slug}' updated successfully`,
  }
}
