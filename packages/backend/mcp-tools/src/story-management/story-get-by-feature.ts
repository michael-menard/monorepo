/**
 * Story Get By Feature MCP Tool
 * WINT-0090 AC-7, AC-8: Retrieves stories filtered by feature with pagination
 *
 * Features:
 * - Filter by feature identifier
 * - Pagination with limit (default 50, max 1000) and offset
 * - Results ordered by createdAt ASC (chronological)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, asc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories } from '@repo/knowledge-base/db'
import {
  StoryGetByFeatureInputSchema,
  type StoryGetByFeatureInput,
  type StoryGetByFeatureOutput,
} from './__types__/index.js'

/**
 * Query stories by feature with pagination
 *
 * @param input - Feature filter and pagination parameters
 * @returns Array of stories belonging to the specified feature
 */
export async function storyGetByFeature(
  input: StoryGetByFeatureInput,
): Promise<StoryGetByFeatureOutput> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = StoryGetByFeatureInputSchema.parse(input)

  try {
    const results = await db
      .select()
      .from(stories)
      .where(eq(stories.feature, parsed.feature))
      .orderBy(asc(stories.createdAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    return results.map(story => ({
      storyId: story.storyId,
      feature: story.feature,
      title: story.title,
      state: story.state,
      priority: story.priority,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }))
  } catch (error) {
    // Database errors: log warning, return empty array
    logger.warn(
      `[mcp-tools] Failed to query stories by feature '${parsed.feature}':`,
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
