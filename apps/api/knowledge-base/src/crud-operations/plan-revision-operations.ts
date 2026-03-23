/**
 * Plan Revision History CRUD Operations
 *
 * Manages revision tracking for plans. Each content change creates a new
 * revision with auto-incremented revision_number.
 *
 * @see PDBM Phase 0 for requirements
 */

import { z } from 'zod'
import { eq, sql, desc, and } from 'drizzle-orm'
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
  sections: z
    .array(
      z
        .object({
          heading: z.string(),
          level: z.number().int(),
          startLine: z.number().int(),
        })
        .passthrough(),
    )
    .optional(),

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

export const PlanRevisionCrudDepsSchema = z.object({
  db: z.custom<NodePgDatabase<typeof schema>>(),
})

export type PlanRevisionCrudDeps = z.infer<typeof PlanRevisionCrudDepsSchema>

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

// ============================================================================
// Revision Diff (APRS-1050)
// ============================================================================

export const ChangeTypeSchema = z.enum(['added', 'removed', 'modified', 'unchanged'])
export type ChangeType = z.infer<typeof ChangeTypeSchema>

export const FieldDiffSchema = z.object({
  field: z.string(),
  oldValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
  changeType: ChangeTypeSchema,
})
export type FieldDiff = z.infer<typeof FieldDiffSchema>

export const RevisionDiffResultSchema = z.object({
  plan_slug: z.string(),
  revision_a: z.number(),
  revision_b: z.number(),
  fields: z.record(z.string(), FieldDiffSchema),
  has_changes: z.boolean(),
})
export type RevisionDiffResult = z.infer<typeof RevisionDiffResultSchema>

export const KbGetPlanRevisionDiffInputSchema = z.object({
  /** Plan slug to diff revisions for */
  plan_slug: z.string().min(1),

  /** First revision number (older) */
  revision_a: z.number().int().min(1),

  /** Second revision number (newer) */
  revision_b: z.number().int().min(1),
})

export type KbGetPlanRevisionDiffInput = z.infer<typeof KbGetPlanRevisionDiffInputSchema>

/** Fields to compare between revisions */
const DIFF_FIELDS = ['rawContent', 'contentHash', 'sections', 'changeReason', 'changedBy'] as const

/**
 * Compare two values for equality using JSON serialization for deep comparison.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Determine the change type between two values.
 */
function getChangeType(oldVal: unknown, newVal: unknown): ChangeType {
  if (valuesEqual(oldVal, newVal)) return 'unchanged'
  if (oldVal == null && newVal != null) return 'added'
  if (oldVal != null && newVal == null) return 'removed'
  return 'modified'
}

/**
 * Compute a structured field-level diff between two plan revision records.
 *
 * Pure function — no DB access. Compares rawContent, contentHash, sections,
 * changeReason, and changedBy fields.
 */
export function computeRevisionDiff(
  revisionA: typeof planRevisionHistory.$inferSelect | null,
  revisionB: typeof planRevisionHistory.$inferSelect | null,
  planSlug: string,
  revNumA: number,
  revNumB: number,
): RevisionDiffResult {
  const fields: Record<string, FieldDiff> = {}
  let hasChanges = false

  for (const field of DIFF_FIELDS) {
    const oldVal = revisionA ? revisionA[field] : null
    const newVal = revisionB ? revisionB[field] : null
    const changeType = getChangeType(oldVal, newVal)

    if (changeType !== 'unchanged') hasChanges = true

    fields[field] = {
      field,
      oldValue: oldVal ?? null,
      newValue: newVal ?? null,
      changeType,
    }
  }

  return {
    plan_slug: planSlug,
    revision_a: revNumA,
    revision_b: revNumB,
    fields,
    has_changes: hasChanges,
  }
}

/**
 * Get a structured diff between two plan revisions.
 *
 * Fetches both revisions from the database and computes a field-level diff.
 * If revision_a does not exist (e.g., comparing first revision), treats it as
 * all-null fields (all fields will show as 'added').
 */
export async function kb_get_plan_revision_diff(
  deps: PlanRevisionCrudDeps,
  input: KbGetPlanRevisionDiffInput,
): Promise<{
  diff: RevisionDiffResult
  message: string
}> {
  const validated = KbGetPlanRevisionDiffInputSchema.parse(input)

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

  // Fetch both revisions
  const revisions = await deps.db
    .select()
    .from(planRevisionHistory)
    .where(
      and(
        eq(planRevisionHistory.planId, planId),
        sql`${planRevisionHistory.revisionNumber} IN (${validated.revision_a}, ${validated.revision_b})`,
      ),
    )

  const revA = revisions.find(r => r.revisionNumber === validated.revision_a) ?? null
  const revB = revisions.find(r => r.revisionNumber === validated.revision_b) ?? null

  if (!revA && !revB) {
    throw new Error(
      `Neither revision ${validated.revision_a} nor ${validated.revision_b} found for plan '${validated.plan_slug}'`,
    )
  }

  const diff = computeRevisionDiff(
    revA,
    revB,
    validated.plan_slug,
    validated.revision_a,
    validated.revision_b,
  )

  return {
    diff,
    message: `Diff computed for plan '${validated.plan_slug}' between revisions ${validated.revision_a} and ${validated.revision_b}: ${diff.has_changes ? 'changes detected' : 'no changes'}`,
  }
}
