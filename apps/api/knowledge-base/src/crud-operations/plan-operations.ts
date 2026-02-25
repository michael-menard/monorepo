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
    .enum(['draft', 'active', 'implemented', 'superseded', 'archived'])
    .optional(),

  /** Filter by plan type */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** Filter by story prefix (e.g., 'SKCR') */
  story_prefix: z.string().optional(),

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
