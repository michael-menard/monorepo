/**
 * Plan CRUD Operations
 *
 * MCP operations for reading plans from the KB plans table.
 * Used by /pm-bootstrap-workflow to fetch plan content for story generation.
 *
 * @see plans table in db/schema.ts
 */

import { z } from 'zod'
import { eq, sql, and, ne, isNotNull, isNull, notInArray, inArray, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { plans, planDetails, planDependencies, planExecutionLog } from '../db/schema.js'
import { kb_create_plan_revision } from './plan-revision-operations.js'

// ============================================================================
// Explicit column selectors — guard against schema-vs-DB drift
// ============================================================================

const planColumns = {
  id: plans.id,
  planSlug: plans.planSlug,
  title: plans.title,
  summary: plans.summary,
  planType: plans.planType,
  status: plans.status,
  storyPrefix: plans.storyPrefix,
  priority: plans.priority,
  parentPlanId: plans.parentPlanId,
  tags: plans.tags,
  supersededBy: plans.supersededBy,
  createdAt: plans.createdAt,
  updatedAt: plans.updatedAt,
  deletedAt: plans.deletedAt,
} as const

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a story_prefix is already used by another plan.
 * Throws a descriptive error if a conflict is found.
 */
async function assertUniquePrefixOrThrow(
  db: NodePgDatabase<typeof schema>,
  storyPrefix: string | null | undefined,
  excludePlanSlug?: string,
): Promise<void> {
  if (!storyPrefix) return

  const conditions: SQL[] = [eq(plans.storyPrefix, storyPrefix), isNotNull(plans.storyPrefix)]
  if (excludePlanSlug) {
    conditions.push(ne(plans.planSlug, excludePlanSlug))
  }

  const conflict = await db
    .select({ planSlug: plans.planSlug, title: plans.title })
    .from(plans)
    .where(and(...conditions))
    .limit(1)

  if (conflict.length > 0) {
    throw new Error(
      `Story prefix '${storyPrefix}' is already used by plan '${conflict[0]!.planSlug}' (${conflict[0]!.title}). Each plan must have a unique story prefix.`,
    )
  }
}

/**
 * Resolve a parent plan slug to its UUID.
 * Returns null if no slug provided, throws if slug not found.
 */
async function resolveParentPlanId(
  db: NodePgDatabase<typeof schema>,
  parentPlanSlug: string | null | undefined,
): Promise<string | null> {
  if (!parentPlanSlug) return null
  const result = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.planSlug, parentPlanSlug))
    .limit(1)
  if (result.length === 0) {
    throw new Error(`Parent plan '${parentPlanSlug}' not found. Create the parent plan first.`)
  }
  return result[0]!.id
}

/**
 * Sync the `plan_dependencies` join table to match a desired set of dependency slugs.
 *
 * Performs a diff: inserts missing rows, deletes stale rows, and leaves existing
 * rows untouched. The join table is the single source of truth for plan blocking
 * dependencies, powering `plan_summary_view`, auto-block, and auto-unblock.
 *
 * Passing an empty array clears all dependency rows for the plan.
 * Passing null/undefined is a no-op (caller should guard).
 */
async function syncPlanDependencies(
  db: NodePgDatabase<typeof schema>,
  planSlug: string,
  desiredSlugs: string[],
): Promise<void> {
  // Fetch current rows from the join table
  const currentRows = await db
    .select({ dependsOnSlug: planDependencies.dependsOnSlug })
    .from(planDependencies)
    .where(eq(planDependencies.planSlug, planSlug))

  const currentSet = new Set(currentRows.map(r => r.dependsOnSlug))
  const desiredSet = new Set(desiredSlugs)

  // Slugs to insert (in desired but not in current)
  const toInsert = desiredSlugs.filter(s => !currentSet.has(s))

  // Slugs to delete (in current but not in desired)
  const toDelete = currentRows.map(r => r.dependsOnSlug).filter(s => !desiredSet.has(s))

  // Delete stale rows
  if (toDelete.length > 0) {
    await db
      .delete(planDependencies)
      .where(
        and(
          eq(planDependencies.planSlug, planSlug),
          inArray(planDependencies.dependsOnSlug, toDelete),
        ),
      )
  }

  // Insert missing rows
  if (toInsert.length > 0) {
    await db.insert(planDependencies).values(
      toInsert.map(depSlug => ({
        planSlug,
        dependsOnSlug: depSlug,
        satisfied: false,
      })),
    )
  }
}

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

  /** Category of plan - simple types or compound format {work_type}:{domain} */
  plan_type: z.string().optional(),

  /** Status lifecycle */
  status: z
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
      'blocked',
    ])
    .optional()
    .default('draft'),

  /** Story ID prefix (e.g., 'APIP') */
  story_prefix: z.string().optional(),

  /** Priority level (P1 highest, P5 lowest, default P3) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional().default('P3'),

  /** Tags for categorization */
  tags: z.array(z.string()).optional(),

  /** Plan slugs that must reach 'implemented' before this plan can start */
  dependencies: z.array(z.string()).optional(),

  /** Original source file path (e.g., '~/.claude/plans/jiggly-cooking-patterson.md') */
  source_file: z.string().optional(),

  /** Parent plan slug for hierarchical relationships (e.g., sub-epic pointing to program plan) */
  parent_plan_slug: z.string().optional(),

  /** Parsed heading breakdown [{heading, level, startLine}] */
  sections: z.array(z.record(z.unknown())).optional(),

  /** Format version for content parsing (yaml_frontmatter, inline_header, etc.) */
  format_version: z.string().optional(),
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
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
      'blocked',
    ])
    .optional(),

  /** New tags (replaces existing tags) */
  tags: z.array(z.string()).optional(),

  /** New title */
  title: z.string().min(1).optional(),

  /** New plan type - simple types or compound format {work_type}:{domain} */
  plan_type: z.string().optional(),

  /** New story prefix */
  story_prefix: z.string().nullable().optional(),

  /** Plan slugs that must reach 'implemented' before this plan can start (null to clear) */
  dependencies: z.array(z.string()).nullable().optional(),

  /** Parent plan slug (null to clear, string to set) */
  parent_plan_slug: z.string().nullable().optional(),

  /** UUID of the plan that supersedes/replaces this one */
  superseded_by: z.string().uuid().nullable().optional(),
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
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
      'blocked',
    ])
    .optional(),

  /** Filter by plan type */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** Filter by story prefix (e.g., 'SKCR') */
  story_prefix: z.string().optional(),

  /** Filter by priority (P1-P5) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),

  /** Filter by parent plan slug (returns child plans of the given parent) */
  parent_plan_slug: z.string().optional(),

  /** Maximum results (1-100, default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),

  /** Include raw_content in response (default: false, saves bandwidth) */
  include_content: z.boolean().optional().default(false),
})

export type KbListPlansInput = z.infer<typeof KbListPlansInputSchema>

/**
 * Input schema for kb_get_roadmap tool.
 *
 * Same as kb_list_plans but without status filter — status is hardcoded
 * to exclude completed/deferred plans (implemented, superseded, archived).
 */
export const KbGetRoadmapInputSchema = z.object({
  /** Filter by plan type */
  plan_type: z
    .enum(['feature', 'refactor', 'migration', 'infra', 'tooling', 'workflow', 'audit', 'spike'])
    .optional(),

  /** Filter by story prefix (e.g., 'SKCR') */
  story_prefix: z.string().optional(),

  /** Filter by priority (P1-P5) */
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional(),

  /** Maximum results (1-100, default 50) */
  limit: z.number().int().min(1).max(100).optional().default(50),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),

  /** Include raw_content in response (default: false, saves bandwidth) */
  include_content: z.boolean().optional().default(false),
})

export type KbGetRoadmapInput = z.infer<typeof KbGetRoadmapInputSchema>

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
  plan: (Partial<typeof plans.$inferSelect> & { dependencies?: string[] }) | null
  message: string
}> {
  const validated = KbGetPlanInputSchema.parse(input)

  // Use explicit column selection to avoid schema-vs-DB drift
  const result = await deps.db
    .select(planColumns)
    .from(plans)
    .where(and(eq(plans.planSlug, validated.plan_slug), isNull(plans.deletedAt)))
    .limit(1)

  const plan = result[0] ?? null

  // Fetch plan details (1:1 detail table — cold columns like raw_content)
  let detail: typeof planDetails.$inferSelect | null = null
  if (plan) {
    const detailResult = await deps.db
      .select()
      .from(planDetails)
      .where(eq(planDetails.planId, plan.id))
      .limit(1)
    detail = detailResult[0] ?? null
  }

  // Fetch dependencies from the join table (single source of truth)
  let dependencies: string[] = []
  if (plan) {
    const depRows = await deps.db
      .select({ dependsOnSlug: planDependencies.dependsOnSlug })
      .from(planDependencies)
      .where(eq(planDependencies.planSlug, validated.plan_slug))
    dependencies = depRows.map(r => r.dependsOnSlug)
  }

  return {
    plan: plan
      ? {
          ...plan,
          ...(detail
            ? {
                rawContent: detail.rawContent,
                phases: detail.phases,
                sourceFile: detail.sourceFile,
                sections: detail.sections,
                formatVersion: detail.formatVersion,
              }
            : {}),
          dependencies,
        }
      : null,
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

  const conditions: SQL[] = [isNull(plans.deletedAt)]

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
  if (validated.parent_plan_slug) {
    conditions.push(
      sql`${plans.parentPlanId} = (SELECT id FROM workflow.plans WHERE plan_slug = ${validated.parent_plan_slug})`,
    )
  }

  const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined

  // Count total
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(plans)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Always use explicit columns; include_content adds planDetails join
  const result = await deps.db
    .select(planColumns)
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

  // Enforce unique story_prefix across plans
  await assertUniquePrefixOrThrow(deps.db, validated.story_prefix, validated.plan_slug)

  // Resolve parent plan slug to UUID
  const parentPlanId = await resolveParentPlanId(deps.db, validated.parent_plan_slug)

  const now = new Date()

  const values = {
    planSlug: validated.plan_slug,
    title: validated.title,
    summary: validated.summary ?? null,
    planType: validated.plan_type ?? null,
    status: validated.status ?? 'draft',
    storyPrefix: validated.story_prefix ?? null,
    priority: validated.priority ?? 'P3',
    parentPlanId,
    tags: validated.tags ?? null,
    updatedAt: now,
  }

  const result = await deps.db
    .insert(plans)
    .values({ ...values, createdAt: now })
    .onConflictDoUpdate({
      target: plans.planSlug,
      set: { ...values },
    })
    .returning()

  const plan = result[0]!
  const created = plan.createdAt.getTime() === now.getTime()

  // Upsert plan details (moved columns — dependencies NOT stored here)
  await deps.db
    .insert(planDetails)
    .values({
      planId: plan.id,
      rawContent: validated.raw_content,
      phases: null,
      sourceFile: validated.source_file ?? null,
      contentHash: null,
      sections: validated.sections ?? null,
      formatVersion: validated.format_version ?? 'v1',
      importedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: planDetails.planId,
      set: {
        rawContent: validated.raw_content,
        sourceFile: validated.source_file ?? null,
        sections: validated.sections ?? null,
        formatVersion: validated.format_version ?? 'v1',
        updatedAt: now,
      },
    })

  // Sync plan_dependencies join table (the single source of truth for deps).
  // This powers the plan_summary_view (blocking_plans, is_blocked) and the
  // auto-block / auto-unblock logic in handlePlanImplemented.
  await syncPlanDependencies(deps.db, validated.plan_slug, validated.dependencies ?? [])

  // Auto-block if the plan now has unsatisfied dependencies
  if ((validated.dependencies ?? []).length > 0) {
    await autoBlockPlanIfNeeded(deps.db, validated.plan_slug)
  }

  // Create revision history entry
  try {
    await kb_create_plan_revision(deps, {
      plan_slug: validated.plan_slug,
      raw_content: validated.raw_content,
      sections: validated.sections,
      change_reason: created ? 'Initial import' : 'Content update via upsert',
      changed_by: 'kb_upsert_plan',
    })
  } catch {
    // Non-fatal: revision history is best-effort
  }

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
    .select(planColumns)
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

  // Enforce unique story_prefix across plans
  if (validated.story_prefix !== undefined) {
    await assertUniquePrefixOrThrow(deps.db, validated.story_prefix, validated.plan_slug)
  }

  // Build update object from provided fields
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (validated.priority !== undefined) updates.priority = validated.priority
  if (validated.status !== undefined) updates.status = validated.status
  if (validated.tags !== undefined) updates.tags = validated.tags
  if (validated.title !== undefined) updates.title = validated.title
  if (validated.plan_type !== undefined) updates.planType = validated.plan_type
  if (validated.story_prefix !== undefined) updates.storyPrefix = validated.story_prefix
  if (validated.superseded_by !== undefined) updates.supersededBy = validated.superseded_by
  if (validated.parent_plan_slug !== undefined) {
    updates.parentPlanId =
      validated.parent_plan_slug === null
        ? null
        : await resolveParentPlanId(deps.db, validated.parent_plan_slug)
  }

  const result = await deps.db
    .update(plans)
    .set(updates)
    .where(eq(plans.planSlug, validated.plan_slug))
    .returning()

  const plan = result[0] ?? null

  // Sync plan_dependencies join table when dependencies are provided.
  // The join table is the single source of truth — no JSONB column.
  if (plan && validated.dependencies !== undefined) {
    await syncPlanDependencies(deps.db, validated.plan_slug, validated.dependencies ?? [])

    // Auto-block if the plan now has unsatisfied dependencies
    if ((validated.dependencies ?? []).length > 0) {
      await autoBlockPlanIfNeeded(deps.db, validated.plan_slug)
    }
  }

  // Auto-unblock: when status changes to 'implemented', check dependent plans
  if (plan && validated.status === 'implemented') {
    await handlePlanImplemented(deps.db, validated.plan_slug)
  }

  return {
    plan,
    updated: true,
    message: `Plan '${validated.plan_slug}' updated successfully`,
  }
}

// ============================================================================
// Auto-Block / Auto-Unblock Helpers
// ============================================================================

/**
 * When a plan reaches 'implemented', mark the dependency as satisfied
 * and unblock any dependent plans whose deps are now all satisfied.
 */
async function handlePlanImplemented(
  db: NodePgDatabase<typeof schema>,
  implementedSlug: string,
): Promise<void> {
  // Mark all dependencies on this plan as satisfied
  await db
    .update(planDependencies)
    .set({ satisfied: true })
    .where(eq(planDependencies.dependsOnSlug, implementedSlug))

  // Find all plans that depend on this one
  const dependentSlugs = await db
    .select({ planSlug: planDependencies.planSlug })
    .from(planDependencies)
    .where(eq(planDependencies.dependsOnSlug, implementedSlug))

  // For each dependent plan, check if ALL its deps are now satisfied
  for (const { planSlug } of dependentSlugs) {
    const unsatisfied = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(planDependencies)
      .where(and(eq(planDependencies.planSlug, planSlug), eq(planDependencies.satisfied, false)))

    if ((unsatisfied[0]?.count ?? 0) === 0) {
      // All deps satisfied — unblock the plan, restore to 'accepted'
      const current = await db
        .select({ status: plans.status })
        .from(plans)
        .where(eq(plans.planSlug, planSlug))
        .limit(1)

      if (current[0]?.status === 'blocked') {
        await db
          .update(plans)
          .set({ status: 'accepted', updatedAt: new Date() })
          .where(eq(plans.planSlug, planSlug))

        // Log the unblock event
        try {
          await db.insert(planExecutionLog).values({
            planSlug,
            entryType: 'unblocked',
            message: `Auto-unblocked: dependency '${implementedSlug}' reached implemented`,
            metadata: { trigger: implementedSlug },
          })
        } catch {
          // Non-fatal
        }
      }
    }
  }
}

/**
 * Auto-block a plan when it has unsatisfied dependencies.
 * Saves current status to pre_blocked_status and sets status to 'blocked'.
 */
export async function autoBlockPlanIfNeeded(
  db: NodePgDatabase<typeof schema>,
  planSlug: string,
): Promise<boolean> {
  // Check for unsatisfied dependencies
  const unsatisfied = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(planDependencies)
    .where(and(eq(planDependencies.planSlug, planSlug), eq(planDependencies.satisfied, false)))

  if ((unsatisfied[0]?.count ?? 0) === 0) return false

  // Check current status — don't re-block if already blocked
  const current = await db
    .select({ status: plans.status })
    .from(plans)
    .where(eq(plans.planSlug, planSlug))
    .limit(1)

  if (!current[0] || current[0].status === 'blocked') return false

  // Block the plan
  await db
    .update(plans)
    .set({ status: 'blocked', updatedAt: new Date() })
    .where(eq(plans.planSlug, planSlug))

  // Log the block event
  try {
    await db.insert(planExecutionLog).values({
      planSlug,
      entryType: 'blocked',
      message: `Auto-blocked: has unsatisfied dependencies`,
    })
  } catch {
    // Non-fatal
  }

  return true
}

/**
 * Statuses excluded from roadmap view (complete + deferred).
 */
const ROADMAP_EXCLUDED_STATUSES = ['implemented', 'superseded', 'archived'] as const

/**
 * Get the active roadmap — plans with actionable statuses only.
 *
 * Excludes implemented, superseded, and archived plans.
 * Sorted by priority ASC (P1 first), then status, then slug.
 */
export async function kb_get_roadmap(
  deps: PlanCrudDeps,
  input: KbGetRoadmapInput,
): Promise<{
  plans: Array<Partial<typeof plans.$inferSelect> & { dependencies: string[] }>
  total: number
  message: string
}> {
  const validated = KbGetRoadmapInputSchema.parse(input)

  const conditions: SQL[] = [notInArray(plans.status, [...ROADMAP_EXCLUDED_STATUSES])]

  if (validated.plan_type) {
    conditions.push(eq(plans.planType, validated.plan_type))
  }
  if (validated.story_prefix) {
    conditions.push(eq(plans.storyPrefix, validated.story_prefix))
  }
  if (validated.priority) {
    conditions.push(eq(plans.priority, validated.priority))
  }

  const whereClause = sql`${sql.join(conditions, sql` AND `)}`

  // Count total
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(plans)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  const orderBy = [plans.priority, plans.status, plans.planSlug]

  // Fetch plans (no left-join on planDetails — dependencies come from join table)
  const result = await deps.db
    .select(planColumns)
    .from(plans)
    .where(whereClause)
    .limit(validated.limit)
    .offset(validated.offset)
    .orderBy(...orderBy)

  // Batch-fetch dependencies from the join table for all returned plans
  const slugs = result.map(r => r.planSlug)
  const depRows =
    slugs.length > 0
      ? await deps.db
          .select({
            planSlug: planDependencies.planSlug,
            dependsOnSlug: planDependencies.dependsOnSlug,
          })
          .from(planDependencies)
          .where(inArray(planDependencies.planSlug, slugs))
      : []

  // Group by plan slug
  const depsBySlug = new Map<string, string[]>()
  for (const row of depRows) {
    const arr = depsBySlug.get(row.planSlug) ?? []
    arr.push(row.dependsOnSlug)
    depsBySlug.set(row.planSlug, arr)
  }

  return {
    plans: result.map(r => ({
      ...r,
      dependencies: depsBySlug.get(r.planSlug) ?? [],
    })),
    total,
    message: `Roadmap: ${result.length} active plans (${total} total)`,
  }
}
