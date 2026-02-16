/**
 * Session Update MCP Tool
 * WINT-0110 AC-2: Updates token metrics with incremental/absolute modes
 *
 * Features:
 * - Incremental mode (default): Uses SQL arithmetic for concurrent-safe updates
 * - Absolute mode: Last-write-wins behavior
 * - Prevents updates to completed sessions (endedAt IS NOT NULL check)
 * - Zod validation at entry (fail fast)
 * - Resilient error handling
 */

import { eq, and, isNull, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db, contextSessions } from '@repo/db'
import type { SelectContextSession } from '@repo/db'
import { SessionUpdateInputSchema, type SessionUpdateInput } from './__types__/index.js'

/**
 * Update an existing agent session's token metrics
 *
 * @param input - Session update parameters with mode selection
 * @returns Updated session record or null if not found/error
 *
 * @example Incremental mode (default - concurrent-safe)
 * ```typescript
 * const session = await sessionUpdate({
 *   sessionId: 'abc-123',
 *   inputTokens: 1000, // Adds 1000 to existing count
 *   outputTokens: 500,
 * })
 * ```
 *
 * @example Absolute mode (last-write-wins)
 * ```typescript
 * const session = await sessionUpdate({
 *   sessionId: 'abc-123',
 *   mode: 'absolute',
 *   inputTokens: 5000, // Sets to exactly 5000
 * })
 * ```
 */
export async function sessionUpdate(
  input: SessionUpdateInput,
): Promise<SelectContextSession | null> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = SessionUpdateInputSchema.parse(input)

  try {
    // Check if session exists and is not completed
    const [existingSession] = await db
      .select()
      .from(contextSessions)
      .where(
        and(eq(contextSessions.sessionId, parsed.sessionId), isNull(contextSessions.endedAt)),
      )

    if (!existingSession) {
      throw new Error(
        `Session '${parsed.sessionId}' not found or already completed. Cannot update completed sessions.`,
      )
    }

    // Build update values based on mode
    if (parsed.mode === 'incremental') {
      // Incremental mode: Use SQL arithmetic for concurrent-safe updates (AC-2)
      const updates: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (parsed.inputTokens !== undefined) {
        updates.inputTokens = sql`${contextSessions.inputTokens} + ${parsed.inputTokens}`
      }
      if (parsed.outputTokens !== undefined) {
        updates.outputTokens = sql`${contextSessions.outputTokens} + ${parsed.outputTokens}`
      }
      if (parsed.cachedTokens !== undefined) {
        updates.cachedTokens = sql`${contextSessions.cachedTokens} + ${parsed.cachedTokens}`
      }

      const [updatedSession] = await db
        .update(contextSessions)
        .set(updates)
        .where(eq(contextSessions.sessionId, parsed.sessionId))
        .returning()

      return updatedSession
    } else {
      // Absolute mode: Last-write-wins (AC-2)
      const updates: Record<string, any> = {
        updatedAt: new Date(),
      }

      if (parsed.inputTokens !== undefined) {
        updates.inputTokens = parsed.inputTokens
      }
      if (parsed.outputTokens !== undefined) {
        updates.outputTokens = parsed.outputTokens
      }
      if (parsed.cachedTokens !== undefined) {
        updates.cachedTokens = parsed.cachedTokens
      }

      const [updatedSession] = await db
        .update(contextSessions)
        .set(updates)
        .where(eq(contextSessions.sessionId, parsed.sessionId))
        .returning()

      return updatedSession
    }
  } catch (error) {
    // Business logic errors (session not found, already completed) should throw
    if (error instanceof Error && error.message.includes('not found')) {
      throw error
    }
    if (error instanceof Error && error.message.includes('already completed')) {
      throw error
    }

    // Database errors: log warning, don't crash
    logger.warn(
      `[mcp-tools] Failed to update session '${parsed.sessionId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
