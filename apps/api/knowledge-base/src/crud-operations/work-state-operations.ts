/**
 * Work State Operations (Bucket B - Session State)
 *
 * Operations for managing story work state in the KB.
 * This serves as backup/sync target for the /.agent/working-set.md file.
 *
 * @see KBMEM-006 for implementation requirements
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { workState, workStateHistory } from '../db/schema.js'
import type * as schema from '../db/schema.js'
import {
  WorkPhaseSchema,
  WorkConstraintSchema,
  RecentActionSchema,
  BlockerSchema,
} from '../__types__/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for kb_get_work_state input.
 */
export const KbGetWorkStateInputSchema = z.object({
  /** Story ID to get work state for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),
})

export type KbGetWorkStateInput = z.infer<typeof KbGetWorkStateInputSchema>

/**
 * Schema for kb_update_work_state input.
 *
 * Creates or updates work state for a story (upsert behavior).
 */
export const KbUpdateWorkStateInputSchema = z.object({
  /** Story ID this work state belongs to */
  story_id: z.string().min(1, 'Story ID cannot be empty'),

  /** Git branch associated with this story */
  branch: z.string().optional().nullable(),

  /** Current workflow phase */
  phase: WorkPhaseSchema.optional().nullable(),

  /** Constraints for this story (replaces existing) */
  constraints: z.array(WorkConstraintSchema).optional(),

  /** Recent actions taken (replaces existing) */
  recent_actions: z.array(RecentActionSchema).optional(),

  /** Planned next steps (replaces existing) */
  next_steps: z.array(z.string()).optional(),

  /** Active blockers (replaces existing) */
  blockers: z.array(BlockerSchema).optional(),

  /** KB entry references: {name: kb_id} map (merges with existing) */
  kb_references: z.record(z.string().uuid()).optional(),
})

export type KbUpdateWorkStateInput = z.infer<typeof KbUpdateWorkStateInputSchema>

/**
 * Schema for kb_archive_work_state input.
 */
export const KbArchiveWorkStateInputSchema = z.object({
  /** Story ID to archive work state for */
  story_id: z.string().min(1, 'Story ID cannot be empty'),
})

export type KbArchiveWorkStateInput = z.infer<typeof KbArchiveWorkStateInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface WorkStateOperationsDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Work state response format (snake_case for MCP API consistency).
 */
export interface WorkStateResponse {
  id: string
  story_id: string
  branch: string | null
  phase: string | null
  constraints: Array<{ constraint: string; source?: string; priority?: number }>
  recent_actions: Array<{ action: string; completed: boolean; timestamp?: string }>
  next_steps: string[]
  blockers: Array<{ title: string; description?: string; waiting_on?: string }>
  kb_references: Record<string, string>
  created_at: Date
  updated_at: Date
}

/**
 * Convert DB work state to API response format.
 */
function toWorkStateResponse(ws: schema.WorkState): WorkStateResponse {
  return {
    id: ws.id,
    story_id: ws.storyId,
    branch: ws.branch,
    phase: ws.phase,
    constraints: (ws.constraints as WorkStateResponse['constraints']) ?? [],
    recent_actions: (ws.recentActions as WorkStateResponse['recent_actions']) ?? [],
    next_steps: (ws.nextSteps as string[]) ?? [],
    blockers: (ws.blockers as WorkStateResponse['blockers']) ?? [],
    kb_references: (ws.kbReferences as Record<string, string>) ?? {},
    created_at: ws.createdAt,
    updated_at: ws.updatedAt,
  }
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Get work state for a story.
 *
 * @param input - Story ID
 * @param deps - Database dependency
 * @returns Work state or null if not found
 */
export async function kb_get_work_state(
  input: KbGetWorkStateInput,
  deps: WorkStateOperationsDeps,
): Promise<WorkStateResponse | null> {
  const validatedInput = KbGetWorkStateInputSchema.parse(input)
  const { db } = deps

  const result = await db
    .select()
    .from(workState)
    .where(eq(workState.storyId, validatedInput.story_id))
    .limit(1)

  if (result.length === 0) {
    return null
  }

  return toWorkStateResponse(result[0])
}

/**
 * Update or create work state for a story (upsert).
 *
 * @param input - Story ID and fields to update
 * @param deps - Database dependency
 * @returns Updated/created work state
 */
export async function kb_update_work_state(
  input: KbUpdateWorkStateInput,
  deps: WorkStateOperationsDeps,
): Promise<WorkStateResponse> {
  const validatedInput = KbUpdateWorkStateInputSchema.parse(input)
  const { db } = deps

  const now = new Date()

  // Check if work state exists
  const existing = await db
    .select()
    .from(workState)
    .where(eq(workState.storyId, validatedInput.story_id))
    .limit(1)

  if (existing.length === 0) {
    // Create new work state
    const result = await db
      .insert(workState)
      .values({
        storyId: validatedInput.story_id,
        branch: validatedInput.branch ?? null,
        phase: validatedInput.phase ?? null,
        constraints: validatedInput.constraints ?? [],
        recentActions: validatedInput.recent_actions ?? [],
        nextSteps: validatedInput.next_steps ?? [],
        blockers: validatedInput.blockers ?? [],
        kbReferences: validatedInput.kb_references ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    logger.info('Work state created', {
      storyId: validatedInput.story_id,
      phase: validatedInput.phase,
    })

    return toWorkStateResponse(result[0])
  }

  // Update existing work state
  const updateData: Record<string, unknown> = {
    updatedAt: now,
  }

  if (validatedInput.branch !== undefined) {
    updateData.branch = validatedInput.branch
  }
  if (validatedInput.phase !== undefined) {
    updateData.phase = validatedInput.phase
  }
  if (validatedInput.constraints !== undefined) {
    updateData.constraints = validatedInput.constraints
  }
  if (validatedInput.recent_actions !== undefined) {
    updateData.recentActions = validatedInput.recent_actions
  }
  if (validatedInput.next_steps !== undefined) {
    updateData.nextSteps = validatedInput.next_steps
  }
  if (validatedInput.blockers !== undefined) {
    updateData.blockers = validatedInput.blockers
  }
  if (validatedInput.kb_references !== undefined) {
    // Merge with existing kb_references
    const existingRefs = (existing[0].kbReferences as Record<string, string>) ?? {}
    updateData.kbReferences = { ...existingRefs, ...validatedInput.kb_references }
  }

  const result = await db
    .update(workState)
    .set(updateData)
    .where(eq(workState.storyId, validatedInput.story_id))
    .returning()

  logger.info('Work state updated', {
    storyId: validatedInput.story_id,
    fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
  })

  return toWorkStateResponse(result[0])
}

/**
 * Archive work state for a completed story.
 *
 * Moves the work state to history table and deletes from active table.
 *
 * @param input - Story ID
 * @param deps - Database dependency
 * @returns Archive result with history ID
 */
export async function kb_archive_work_state(
  input: KbArchiveWorkStateInput,
  deps: WorkStateOperationsDeps,
): Promise<{ archived: boolean; history_id: string | null; message: string }> {
  const validatedInput = KbArchiveWorkStateInputSchema.parse(input)
  const { db } = deps

  // Get existing work state
  const existing = await db
    .select()
    .from(workState)
    .where(eq(workState.storyId, validatedInput.story_id))
    .limit(1)

  if (existing.length === 0) {
    return {
      archived: false,
      history_id: null,
      message: `No work state found for story: ${validatedInput.story_id}`,
    }
  }

  const ws = existing[0]

  // Create snapshot for history (exclude id, include all other fields)
  const snapshot = {
    story_id: ws.storyId,
    branch: ws.branch,
    phase: ws.phase,
    constraints: ws.constraints,
    recent_actions: ws.recentActions,
    next_steps: ws.nextSteps,
    blockers: ws.blockers,
    kb_references: ws.kbReferences,
    created_at: ws.createdAt.toISOString(),
    updated_at: ws.updatedAt.toISOString(),
  }

  // Insert into history table
  const historyResult = await db
    .insert(workStateHistory)
    .values({
      storyId: validatedInput.story_id,
      stateSnapshot: snapshot,
      archivedAt: new Date(),
    })
    .returning({ id: workStateHistory.id })

  // Delete from active table
  await db.delete(workState).where(eq(workState.storyId, validatedInput.story_id))

  logger.info('Work state archived', {
    storyId: validatedInput.story_id,
    historyId: historyResult[0].id,
  })

  return {
    archived: true,
    history_id: historyResult[0].id,
    message: `Work state for ${validatedInput.story_id} archived successfully`,
  }
}

/**
 * Get archived work state history for a story.
 *
 * @param storyId - Story ID to get history for
 * @param deps - Database dependency
 * @returns Array of archived work states
 */
export async function kb_get_work_state_history(
  storyId: string,
  deps: WorkStateOperationsDeps,
): Promise<schema.WorkStateHistory[]> {
  const { db } = deps

  const result = await db
    .select()
    .from(workStateHistory)
    .where(eq(workStateHistory.storyId, storyId))
    .orderBy(workStateHistory.archivedAt)

  return result
}
