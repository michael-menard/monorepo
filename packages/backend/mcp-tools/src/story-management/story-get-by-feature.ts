/**
 * Story Get By Feature MCP Tool
 * WINT-0090 AC-7, AC-8: Retrieves stories filtered by epic (feature) with pagination
 *
 * Features:
 * - Filter by epic identifier
 * - Pagination with limit (default 50, max 1000) and offset
 * - Results ordered by wave ASC, createdAt ASC (wave priority, then chronological)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, asc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories } from '@repo/knowledge-base/src/db'
import {
  StoryGetByFeatureInputSchema,
  type StoryGetByFeatureInput,
  type StoryGetByFeatureOutput,
} from './__types__/index.js'

/**
 * Query stories by epic (feature) with pagination
 *
 * @param input - Epic filter and pagination parameters
 * @returns Array of stories belonging to the specified epic
 *
 * @example Get all stories for WINT epic
 * ```typescript
 * const wintStories = await storyGetByFeature({
 *   epic: 'WINT',
 * })
 * ```
 *
 * @example Get KBAR stories with pagination
 * ```typescript
 * const kbarStories = await storyGetByFeature({
 *   epic: 'KBAR',
 *   limit: 20,
 *   offset: 0,
 * })
 * ```
 */
export async function storyGetByFeature(
  input: StoryGetByFeatureInput,
): Promise<StoryGetByFeatureOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryGetByFeatureInputSchema.parse(input)

  try {
    // Query stories by epic with pagination (AC-7, AC-8)
    // Order by wave (nulls last), then createdAt for predictable ordering
    const results = await db
      .select()
      .from(stories)
      .where(eq(stories.epic, parsed.epic))
      .orderBy(asc(stories.wave), asc(stories.createdAt))
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
      `[mcp-tools] Failed to query stories by epic '${parsed.epic}':`,
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
