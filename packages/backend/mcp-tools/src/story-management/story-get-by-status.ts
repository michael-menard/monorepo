/**
 * Story Get By Status MCP Tool
 * WINT-0090 AC-4, AC-5: Retrieves stories filtered by state with pagination
 *
 * Features:
 * - Filter by story state
 * - Pagination with limit (default 50, max 1000) and offset
 * - Results ordered by createdAt DESC (newest first)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, desc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories } from '@repo/database-schema'
import {
  StoryGetByStatusInputSchema,
  type StoryGetByStatusInput,
  type StoryGetByStatusOutput,
} from './__types__/index.js'

/**
 * Query stories by state with pagination
 *
 * @param input - State filter and pagination parameters
 * @returns Array of stories in the specified state
 *
 * @example Get all in-progress stories
 * ```typescript
 * const inProgress = await storyGetByStatus({
 *   state: 'in_progress',
 * })
 * ```
 *
 * @example Get ready stories with pagination
 * ```typescript
 * const readyStories = await storyGetByStatus({
 *   state: 'ready',
 *   limit: 100,
 *   offset: 50,
 * })
 * ```
 */
export async function storyGetByStatus(
  input: StoryGetByStatusInput,
): Promise<StoryGetByStatusOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryGetByStatusInputSchema.parse(input)

  try {
    // Query stories by state with pagination (AC-4, AC-5)
    const results = await db
      .select()
      .from(stories)
      .where(eq(stories.state, parsed.state))
      .orderBy(desc(stories.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    return results.map(story => ({
      id: story.id,
      storyId: story.storyId,
      title: story.title,
      state: story.state,
      priority: story.priority,
      storyType: story.storyType,
      epic: story.epic,
      wave: story.wave,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }))
  } catch (error) {
    // Database errors: log warning, return empty array
    logger.warn(
      `[mcp-tools] Failed to query stories by status '${parsed.state}':`,
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
