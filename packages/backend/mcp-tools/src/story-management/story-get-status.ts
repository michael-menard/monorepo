/**
 * Story Get Status MCP Tool
 * WINT-0090 AC-1: Retrieves current status of a story by ID
 *
 * Features:
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with stories schema from @repo/knowledge-base
 */

import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories } from '@repo/knowledge-base/db'
import {
  StoryGetStatusInputSchema,
  type StoryGetStatusInput,
  type StoryGetStatusOutput,
} from './__types__/index.js'

/**
 * Get current status of a story by human-readable ID
 *
 * @param input - Story ID (e.g., WINT-0090)
 * @returns Story record with current state or null if not found
 *
 * @example Query by ID
 * ```typescript
 * const story = await storyGetStatus({
 *   storyId: 'WINT-0090',
 * })
 * ```
 */
export async function storyGetStatus(input: StoryGetStatusInput): Promise<StoryGetStatusOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryGetStatusInputSchema.parse(input)

  try {
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.storyId, parsed.storyId))
      .limit(1)

    if (!story) {
      return null
    }

    return {
      storyId: story.storyId,
      feature: story.feature,
      title: story.title,
      state: story.state,
      priority: story.priority,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }
  } catch (error) {
    // Resilient error handling: log warning, return null
    logger.warn(
      `[mcp-tools] Failed to get status for story '${parsed.storyId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
