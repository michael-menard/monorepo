/**
 * Plan Revision History CRUD Operations
 *
 * Manages revision tracking for plans. Each content change creates a new
 * revision with auto-incremented revision_number.
 *
 * @see PDBM Phase 0 for requirements
 */

import { z } from 'zod'
import { eq, sql, desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { planRevisionHistory, plans } from '../db/schema.js'

// ============================================================================
// Input Schemas
// ============================================================================

export const KbCreatePlanRevisionInputSchema = z.object({
  /** Plan slug to create revision for */
  plan_slug: z.string().min(1),

  /** Full raw markdown content at this revision */
  raw_content: z.string().min(1),

  /** SHA-256 prefix (16 hex chars) for change detection */
  content_hash: z.string().optional(),

  /** Parsed heading breakdown [{heading, level, startLine}] */
  sections: z.array(z.record(z.unknown())).optional(),

  /** Why this revision was created */
  change_reason: z.string().optional(),

  /** Who created this revision (agent ID or user) */
  changed_by: z.string().optional(),
})

export type KbCreatePlanRevisionInput = z.infer<typeof KbCreatePlanRevisionInputSchema>

export const KbGetPlanRevisionsInputSchema = z.object({
  /** Plan slug to list revisions for */
  plan_slug: z.string().min(1),

  /** Maximum results (1-100, default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})

export type KbGetPlanRevisionsInput = z.infer<typeof KbGetPlanRevisionsInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface PlanRevisionCrudDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Create a new plan revision.
 *
 * Auto-increments revision_number by querying MAX(revision_number) + 1.
 */
export async function kb_create_plan_revision(
  deps: PlanRevisionCrudDeps,
  input: KbCreatePlanRevisionInput,
): Promise<{
  revision: typeof planRevisionHistory.$inferSelect
  message: string
}> {
  const validated = KbCreatePlanRevisionInputSchema.parse(input)

  // Resolve plan_slug to plan_id
  const planResult = await deps.db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.planSlug, validated.plan_slug))
    .limit(1)

  if (planResult.length === 0) {
    throw new Error(`Plan '${validated.plan_slug}' not found`)
  }

  const planId = planResult[0]!.id

  // Get next revision number
  const maxResult = await deps.db
    .select({ maxRev: sql<number>`COALESCE(MAX(revision_number), 0)` })
    .from(planRevisionHistory)
    .where(eq(planRevisionHistory.planId, planId))

  const nextRevision = (maxResult[0]?.maxRev ?? 0) + 1

  const result = await deps.db
    .insert(planRevisionHistory)
    .values({
      planId,
      revisionNumber: nextRevision,
      rawContent: validated.raw_content,
      contentHash: validated.content_hash ?? null,
      sections: validated.sections ?? null,
      changeReason: validated.change_reason ?? null,
      changedBy: validated.changed_by ?? null,
    })
    .returning()

  return {
    revision: result[0]!,
    message: `Created revision ${nextRevision} for plan '${validated.plan_slug}'`,
  }
}

/**
 * List revisions for a plan, ordered by revision_number DESC.
 */
export async function kb_get_plan_revisions(
  deps: PlanRevisionCrudDeps,
  input: KbGetPlanRevisionsInput,
): Promise<{
  revisions: Array<typeof planRevisionHistory.$inferSelect>
  total: number
  message: string
}> {
  const validated = KbGetPlanRevisionsInputSchema.parse(input)

  // Resolve plan_slug to plan_id
  const planResult = await deps.db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.planSlug, validated.plan_slug))
    .limit(1)

  if (planResult.length === 0) {
    return { revisions: [], total: 0, message: `Plan '${validated.plan_slug}' not found` }
  }

  const planId = planResult[0]!.id

  // Count total
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(planRevisionHistory)
    .where(eq(planRevisionHistory.planId, planId))

  const total = countResult[0]?.count ?? 0

  // Fetch revisions
  const revisions = await deps.db
    .select()
    .from(planRevisionHistory)
    .where(eq(planRevisionHistory.planId, planId))
    .orderBy(desc(planRevisionHistory.revisionNumber))
    .limit(validated.limit)
    .offset(validated.offset)

  return {
    revisions,
    total,
    message: `Found ${revisions.length} revisions (${total} total) for plan '${validated.plan_slug}'`,
  }
}
