/**
 * Session Complete MCP Tool
 * WINT-0110 AC-3: Marks session as ended with final metrics
 *
 * Features:
 * - Sets endedAt timestamp (defaults to now() if not provided)
 * - Optionally updates final token counts
 * - Prevents double-completion (endedAt IS NOT NULL check)
 * - Zod validation at entry
 * - Resilient error handling
 */

import { eq, and, isNull } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import {
  contextSessions,
  type SelectContextSession,
  type InsertContextSession,
} from '@repo/database-schema'
import { SessionCompleteInputSchema, type SessionCompleteInput } from './__types__/index.js'

/**
 * Mark an agent session as completed with final metrics
 *
 * @param input - Session completion parameters
 * @returns Completed session record or null if not found/error
 *
 * @example Complete with current timestamp
 * ```typescript
 * const session = await sessionComplete({
 *   sessionId: 'abc-123',
 * })
 * ```
 *
 * @example Complete with final token counts
 * ```typescript
 * const session = await sessionComplete({
 *   sessionId: 'abc-123',
 *   inputTokens: 5000,
 *   outputTokens: 2500,
 *   cachedTokens: 1000,
 * })
 * ```
 */
export async function sessionComplete(
  input: SessionCompleteInput,
): Promise<SelectContextSession | null> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = SessionCompleteInputSchema.parse(input)

  try {
    // Check if session exists and is not already completed
    const [existingSession] = await db
      .select()
      .from(contextSessions)
      .where(and(eq(contextSessions.sessionId, parsed.sessionId), isNull(contextSessions.endedAt)))

    if (!existingSession) {
      throw new Error(
        `Session '${parsed.sessionId}' not found or already completed. Cannot complete a session twice.`,
      )
    }

    // Build update values
    const updates: Partial<InsertContextSession> & { endedAt: Date; updatedAt: Date } = {
      endedAt: parsed.endedAt ?? new Date(),
      updatedAt: new Date(),
    }

    // Update token counts if provided (absolute values)
    if (parsed.inputTokens !== undefined) {
      updates.inputTokens = parsed.inputTokens
    }
    if (parsed.outputTokens !== undefined) {
      updates.outputTokens = parsed.outputTokens
    }
    if (parsed.cachedTokens !== undefined) {
      updates.cachedTokens = parsed.cachedTokens
    }

    const [completedSession] = await db
      .update(contextSessions)
      .set(updates)
      .where(eq(contextSessions.sessionId, parsed.sessionId))
      .returning()

    return completedSession
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
      `[mcp-tools] Failed to complete session '${parsed.sessionId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
