/**
 * Session Query MCP Tool
 * WINT-0110 AC-4: Retrieves sessions with flexible filtering and pagination
 *
 * Features:
 * - Filter by agentName, storyId, activeOnly (endedAt IS NULL)
 * - Pagination with limit (default 50, max 1000) and offset
 * - Results ordered by startedAt DESC (most recent first)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, and, isNull, desc, type SQL } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextSessions, type SelectContextSession } from '@repo/knowledge-base/db'
import { SessionQueryInputSchema, type SessionQueryInput } from './__types__/index.js'

/**
 * Query agent sessions with flexible filtering and pagination
 *
 * @param input - Query parameters (all optional)
 * @returns Array of matching session records
 *
 * @example Query active sessions for an agent
 * ```typescript
 * const sessions = await sessionQuery({
 *   agentName: 'dev-execute-leader',
 *   activeOnly: true,
 * })
 * ```
 *
 * @example Query all sessions for a story
 * ```typescript
 * const sessions = await sessionQuery({
 *   storyId: 'WINT-0110',
 * })
 * ```
 *
 * @example Query with pagination
 * ```typescript
 * const sessions = await sessionQuery({
 *   limit: 100,
 *   offset: 50,
 * })
 * ```
 */
export async function sessionQuery(
  input: Partial<SessionQueryInput> = {},
): Promise<SelectContextSession[]> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = SessionQueryInputSchema.parse(input)

  try {
    // Build WHERE conditions dynamically
    const conditions: SQL<unknown>[] = []

    if (parsed.agentName) {
      conditions.push(eq(contextSessions.agentName, parsed.agentName))
    }

    if (parsed.storyId) {
      conditions.push(eq(contextSessions.storyId, parsed.storyId))
    }

    if (parsed.activeOnly) {
      conditions.push(isNull(contextSessions.endedAt))
    }

    // Build query with optional WHERE clause
    const baseQuery = db.select().from(contextSessions)

    // Apply conditions if present
    const queryWithWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

    // Apply ordering, limit, and offset
    const sessions = await queryWithWhere
      .orderBy(desc(contextSessions.startedAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    return sessions
  } catch (error) {
    // Database errors: log warning, return empty array
    logger.warn(
      '[mcp-tools] Failed to query sessions:',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
