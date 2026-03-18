/**
 * Session Create MCP Tool
 * WINT-0110 AC-1: Creates new record in workflow.context_sessions
 *
 * Features:
 * - Auto-generates UUID sessionId if not provided
 * - Zod validation at entry (fail fast)
 * - Resilient error handling (logs warnings, never throws DB errors)
 * - Uses Drizzle ORM with contextSessions schema from @repo/db
 */

import { randomUUID } from 'crypto'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { contextSessions, type SelectContextSession } from '@repo/knowledge-base/db'
import { SessionCreateInputSchema, type SessionCreateInput } from './__types__/index.js'

/**
 * Create a new agent session in workflow.context_sessions
 *
 * @param input - Session creation parameters
 * @returns Created session record or null if DB error occurs
 *
 * @example
 * ```typescript
 * const session = await sessionCreate({
 *   agentName: 'dev-execute-leader',
 *   storyId: 'WINT-0110',
 *   phase: 'execute',
 * })
 * ```
 */
export async function sessionCreate(
  input: SessionCreateInput,
): Promise<SelectContextSession | null> {
  // Validate input - fail fast if invalid (AC-6)
  const parsed = SessionCreateInputSchema.parse(input)

  // Auto-generate sessionId if not provided (AC-1)
  const sessionId = parsed.sessionId ?? randomUUID()

  try {
    const [session] = await db
      .insert(contextSessions)
      .values({
        sessionId,
        agentName: parsed.agentName,
        storyId: parsed.storyId ?? null,
        phase: parsed.phase ?? null,
        inputTokens: parsed.inputTokens ?? 0,
        outputTokens: parsed.outputTokens ?? 0,
        cachedTokens: parsed.cachedTokens ?? 0,
        startedAt: parsed.startedAt ?? new Date(),
      })
      .returning()

    return session
  } catch (error) {
    // Resilient error handling: log warning, don't crash (pattern from insertWorkflowEvent)
    logger.warn(
      `[mcp-tools] Failed to create session for agent '${parsed.agentName}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
