/**
 * Story Update Status MCP Tool
 * WINT-0090 AC-2, AC-3: Updates story state with state history tracking
 *
 * Features:
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with stories, storyStateHistory schemas
 */

import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories, storyStateHistory } from '@repo/knowledge-base/db'
import {
  StoryUpdateStatusInputSchema,
  type StoryUpdateStatusInput,
  type StoryUpdateStatusOutput,
} from './__types__/index.js'

/**
 * Update story state with history tracking
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
    const result = await db.transaction(async tx => {
      // 1. Get current story
      const [currentStory] = await tx
        .select()
        .from(stories)
        .where(eq(stories.storyId, parsed.storyId))
        .limit(1)

      if (!currentStory) {
        logger.warn(`[mcp-tools] Story '${parsed.storyId}' not found for status update`)
        return null
      }

      const fromState = currentStory.state
      const toState = parsed.newState

      // Skip update if state hasn't changed
      if (fromState === toState) {
        return {
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
        .where(eq(stories.storyId, currentStory.storyId))
        .returning()

      // 3. Record state transition in storyStateHistory
      await tx.insert(storyStateHistory).values({
        storyId: currentStory.storyId,
        eventType: 'state_transition',
        fromState,
        toState,
        metadata: {
          reason: parsed.reason ?? null,
          triggeredBy: parsed.triggeredBy,
          ...(parsed.metadata ?? {}),
        },
      })

      return {
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
