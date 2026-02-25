/**
 * Story Get Status MCP Tool
 * WINT-0090 AC-1: Retrieves current status of a story by ID
 *
 * Features:
 * - Dual ID support: UUID or human-readable format (WINT-0090)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with stories schema from @repo/database-schema
 */

import { eq, or } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { stories } from '@repo/database-schema'
import {
  StoryGetStatusInputSchema,
  type StoryGetStatusInput,
  type StoryGetStatusOutput,
} from './__types__/index.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Get current status of a story by UUID or human-readable ID
 *
 * @param input - Story ID (UUID or WINT-0090 format)
 * @returns Story record with current state or null if not found
 *
 * @example Query by UUID
 * ```typescript
 * const story = await storyGetStatus({
 *   storyId: '123e4567-e89b-12d3-a456-426614174000',
 * })
 * ```
 *
 * @example Query by human-readable ID
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
    // Query by UUID or human-readable storyId (AC-1)
    // Only include UUID comparison when the input is actually a UUID,
    // otherwise Postgres throws a cast error on the uuid column.
    const isUuid = UUID_REGEX.test(parsed.storyId)
    const whereClause = isUuid
      ? or(eq(stories.id, parsed.storyId), eq(stories.storyId, parsed.storyId))
      : eq(stories.storyId, parsed.storyId)

    const [story] = await db.select().from(stories).where(whereClause).limit(1)

    if (!story) {
      return null
    }

    return {
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
