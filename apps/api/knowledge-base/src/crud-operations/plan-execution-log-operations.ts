/**
 * Plan Execution Log CRUD Operations
 *
 * Structured event logging for plan lifecycle events: status changes,
 * phase progress, story spawning, blocking, decisions, and errors.
 *
 * @see PDBM Phase 0 for requirements
 */

import { z } from 'zod'
import { eq, and, desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { planExecutionLog } from '../db/schema.js'

// ============================================================================
// Constants
// ============================================================================

const ENTRY_TYPES = [
  'status_change',
  'phase_started',
  'phase_completed',
  'story_spawned',
  'story_completed',
  'blocked',
  'unblocked',
  'decision',
  'note',
  'error',
] as const

// ============================================================================
// Input Schemas
// ============================================================================

export const KbLogPlanEventInputSchema = z.object({
  /** Plan slug to log event for */
  plan_slug: z.string().min(1),

  /** Type of log entry */
  entry_type: z.enum(ENTRY_TYPES),

  /** Phase reference (e.g., 'Phase 1') */
  phase: z.string().optional(),

  /** Related story ID (e.g., 'WKFL-020') */
  story_id: z.string().optional(),

  /** Human-readable message describing the event */
  message: z.string().min(1),

  /** Additional structured metadata */
  metadata: z.record(z.unknown()).optional(),
})

export type KbLogPlanEventInput = z.infer<typeof KbLogPlanEventInputSchema>

export const KbGetPlanEventsInputSchema = z.object({
  /** Plan slug to list events for */
  plan_slug: z.string().min(1),

  /** Filter by entry type */
  entry_type: z.enum(ENTRY_TYPES).optional(),

  /** Maximum results (1-200, default 50) */
  limit: z.number().int().min(1).max(200).optional().default(50),

  /** Offset for pagination (default 0) */
  offset: z.number().int().min(0).optional().default(0),
})

export type KbGetPlanEventsInput = z.infer<typeof KbGetPlanEventsInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface PlanExecutionLogDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Log a plan execution event.
 */
export async function kb_log_plan_event(
  deps: PlanExecutionLogDeps,
  input: KbLogPlanEventInput,
): Promise<{
  event: typeof planExecutionLog.$inferSelect
  message: string
}> {
  const validated = KbLogPlanEventInputSchema.parse(input)

  const result = await deps.db
    .insert(planExecutionLog)
    .values({
      planSlug: validated.plan_slug,
      entryType: validated.entry_type,
      phase: validated.phase ?? null,
      storyId: validated.story_id ?? null,
      message: validated.message,
      metadata: validated.metadata ?? null,
    })
    .returning()

  return {
    event: result[0]!,
    message: `Logged ${validated.entry_type} event for plan '${validated.plan_slug}'`,
  }
}

/**
 * List plan execution events with optional filters.
 */
export async function kb_get_plan_events(
  deps: PlanExecutionLogDeps,
  input: KbGetPlanEventsInput,
): Promise<{
  events: Array<typeof planExecutionLog.$inferSelect>
  total: number
  message: string
}> {
  const validated = KbGetPlanEventsInputSchema.parse(input)

  const conditions = [eq(planExecutionLog.planSlug, validated.plan_slug)]
  if (validated.entry_type) {
    conditions.push(eq(planExecutionLog.entryType, validated.entry_type))
  }

  const whereClause = and(...conditions)

  // Count total
  const countResult = await deps.db
    .select({ count: sql<number>`count(*)::int` })
    .from(planExecutionLog)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Fetch events
  const events = await deps.db
    .select()
    .from(planExecutionLog)
    .where(whereClause)
    .orderBy(desc(planExecutionLog.createdAt))
    .limit(validated.limit)
    .offset(validated.offset)

  return {
    events,
    total,
    message: `Found ${events.length} events (${total} total) for plan '${validated.plan_slug}'`,
  }
}
