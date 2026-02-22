/**
 * Story Update Status MCP Tool
 * WINT-0090 AC-2, AC-3: Updates story state with atomic state transition tracking
 *
 * Features:
 * - Dual ID support: UUID or human-readable format
 * - Database transaction for atomic updates (story + storyStates + storyTransitions)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with stories, storyStates, storyTransitions schemas
 */

import { eq, or, and, isNull } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories, storyStates, storyTransitions } from '@repo/database-schema'
import {
  StoryUpdateStatusInputSchema,
  type StoryUpdateStatusInput,
  type StoryUpdateStatusOutput,
} from './__types__/index.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Update story state with atomic state transition tracking
 *
 * @param input - Story ID, new state, and optional metadata
 * @returns Updated story record or null if update failed
 *
 * @example Update story to in_progress
 * ```typescript
 * const updated = await storyUpdateStatus({
 *   storyId: 'WINT-0090',
 *   newState: 'in_progress',
 *   reason: 'Starting implementation phase',
 *   triggeredBy: 'dev-execute-leader',
 * })
 * ```
 */
export async function storyUpdateStatus(
  input: StoryUpdateStatusInput,
): Promise<StoryUpdateStatusOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryUpdateStatusInputSchema.parse(input)

  try {
    // Transaction for atomic update (AC-2, AC-3)
    const result = await db.transaction(async tx => {
      // 1. Get current story to capture fromState
      // Only include UUID comparison when the input is actually a UUID,
      // otherwise Postgres throws a cast error on the uuid column.
      const isUuid = UUID_REGEX.test(parsed.storyId)
      const whereClause = isUuid
        ? or(eq(stories.id, parsed.storyId), eq(stories.storyId, parsed.storyId))
        : eq(stories.storyId, parsed.storyId)

      const [currentStory] = await tx.select().from(stories).where(whereClause).limit(1)

      if (!currentStory) {
        logger.warn(`[mcp-tools] Story '${parsed.storyId}' not found for status update`)
        return null
      }

      const fromState = currentStory.state
      const toState = parsed.newState

      // Skip update if state hasn't changed
      if (fromState === toState) {
        return {
          id: currentStory.id,
          storyId: currentStory.storyId,
          state: currentStory.state,
          updatedAt: currentStory.updatedAt,
        }
      }

      // 2. Update stories table
      const [updatedStory] = await tx
        .update(stories)
        .set({
          state: toState,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, currentStory.id))
        .returning()

      // 3. Exit previous state in storyStates (find active state entry with isNull for exitedAt)
      const now = new Date()
      await tx
        .update(storyStates)
        .set({
          exitedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(storyStates.storyId, currentStory.id),
            eq(storyStates.state, fromState),
            isNull(storyStates.exitedAt),
          ),
        )

      // 4. Create new storyStates entry for new state
      await tx.insert(storyStates).values({
        storyId: currentStory.id,
        state: toState,
        enteredAt: now,
        reason: parsed.reason ?? null,
        triggeredBy: parsed.triggeredBy,
      })

      // 5. Record state transition in storyTransitions
      await tx.insert(storyTransitions).values({
        storyId: currentStory.id,
        fromState,
        toState,
        transitionedAt: now,
        triggeredBy: parsed.triggeredBy,
        reason: parsed.reason ?? null,
        metadata: parsed.metadata ?? null,
      })

      return {
        id: updatedStory.id,
        storyId: updatedStory.storyId,
        state: updatedStory.state,
        updatedAt: updatedStory.updatedAt,
      }
    })

    return result
  } catch (error) {
    // Resilient error handling: log warning, return null
    logger.warn(
      `[mcp-tools] Failed to update status for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
