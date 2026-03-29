/**
 * Session MCP Operations (WINT-2090)
 *
 * Implements 5 MCP tools for recording and querying agent context sessions:
 * - session_create: Creates a new record in workflow.context_sessions
 * - session_update: Updates token metrics (incremental or absolute)
 * - session_complete: Marks a session as ended
 * - session_query: Retrieves sessions with flexible filtering
 * - session_cleanup: Archives old completed sessions
 *
 * Session tracking is telemetry ONLY — never gates workflow execution.
 * Null returns from create/complete must log warning and let workflow continue.
 *
 * @see WINT-2090 for wiring these session tools into the MCP server
 * @see packages/backend/mcp-tools/src/session-management/ for original implementations
 */

import { randomUUID } from 'crypto'
import { z } from 'zod'
import { eq, and, isNull, isNotNull, lt, desc, sql, type SQL } from 'drizzle-orm'
import {
  contextSessions,
  type SelectContextSession,
  type InsertContextSession,
} from '../db/index.js'
import { createMcpLogger } from '../mcp-server/logger.js'

const logger = createMcpLogger('session-operations')

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for session_create tool.
 * Creates a new record in workflow.context_sessions.
 */
export const SessionCreateInputSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID').optional(),
  agentName: z.string().min(1, 'agentName is required'),
  storyId: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  inputTokens: z.number().int().min(0).optional().default(0),
  outputTokens: z.number().int().min(0).optional().default(0),
  cachedTokens: z.number().int().min(0).optional().default(0),
  startedAt: z.string().datetime().optional(),
})
export type SessionCreateInput = z.infer<typeof SessionCreateInputSchema>

/**
 * Input schema for session_update tool.
 * Updates token metrics with incremental/absolute modes.
 */
export const SessionUpdateInputSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  mode: z.enum(['incremental', 'absolute']).default('incremental'),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})
export type SessionUpdateInput = z.infer<typeof SessionUpdateInputSchema>

/**
 * Input schema for session_complete tool.
 * Marks a session as ended with final metrics.
 */
export const SessionCompleteInputSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
  endedAt: z.string().datetime().optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})
export type SessionCompleteInput = z.infer<typeof SessionCompleteInputSchema>

/**
 * Input schema for session_query tool.
 * Retrieves sessions with flexible filtering and pagination.
 */
export const SessionQueryInputSchema = z.object({
  agentName: z.string().optional(),
  storyId: z.string().optional(),
  activeOnly: z.boolean().default(false),
  limit: z.number().int().min(1).max(1000, 'limit cannot exceed 1000').default(50),
  offset: z.number().int().min(0).default(0),
})
export type SessionQueryInput = z.infer<typeof SessionQueryInputSchema>

/**
 * Input schema for session_cleanup tool.
 * Archives old completed sessions with dryRun safety mechanism.
 */
export const SessionCleanupInputSchema = z.object({
  retentionDays: z.number().int().min(1, 'retentionDays must be positive').default(90),
  dryRun: z.boolean().default(true),
})
export type SessionCleanupInput = z.infer<typeof SessionCleanupInputSchema>

// ============================================================================
// Deps Type
// ============================================================================

export interface SessionOpsDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Create a new agent session in workflow.context_sessions.
 *
 * Returns the created session record or null if a DB error occurs.
 * Never throws — telemetry must not gate workflow.
 */
export async function session_create(
  deps: SessionOpsDeps,
  input: SessionCreateInput,
): Promise<SelectContextSession | null> {
  const parsed = SessionCreateInputSchema.parse(input)
  const sessionId = parsed.sessionId ?? randomUUID()

  try {
    const [session] = await deps.db
      .insert(contextSessions)
      .values({
        sessionId,
        agentName: parsed.agentName,
        storyId: parsed.storyId ?? null,
        phase: parsed.phase ?? null,
        inputTokens: parsed.inputTokens ?? 0,
        outputTokens: parsed.outputTokens ?? 0,
        cachedTokens: parsed.cachedTokens ?? 0,
        startedAt: parsed.startedAt ? new Date(parsed.startedAt) : new Date(),
      })
      .returning()

    return session
  } catch (error) {
    logger.warn('session_create: failed to create session', {
      agent_name: parsed.agentName,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Update an existing agent session's token metrics.
 *
 * Returns the updated session record or null if not found/error.
 * Throws for business logic errors (session not found, already completed).
 */
export async function session_update(
  deps: SessionOpsDeps,
  input: SessionUpdateInput,
): Promise<SelectContextSession | null> {
  const parsed = SessionUpdateInputSchema.parse(input)

  try {
    const [existingSession] = await deps.db
      .select()
      .from(contextSessions)
      .where(and(eq(contextSessions.sessionId, parsed.sessionId), isNull(contextSessions.endedAt)))

    if (!existingSession) {
      throw new Error(
        `Session '${parsed.sessionId}' not found or already completed. Cannot update completed sessions.`,
      )
    }

    if (parsed.mode === 'incremental') {
      const updates = {
        updatedAt: new Date(),
        ...(parsed.inputTokens !== undefined && {
          inputTokens: sql`${contextSessions.inputTokens} + ${parsed.inputTokens}`,
        }),
        ...(parsed.outputTokens !== undefined && {
          outputTokens: sql`${contextSessions.outputTokens} + ${parsed.outputTokens}`,
        }),
        ...(parsed.cachedTokens !== undefined && {
          cachedTokens: sql`${contextSessions.cachedTokens} + ${parsed.cachedTokens}`,
        }),
      }

      const [updatedSession] = await deps.db
        .update(contextSessions)
        .set(updates)
        .where(eq(contextSessions.sessionId, parsed.sessionId))
        .returning()

      return updatedSession
    } else {
      const updates: Partial<InsertContextSession> & { updatedAt: Date } = {
        updatedAt: new Date(),
      }

      if (parsed.inputTokens !== undefined) updates.inputTokens = parsed.inputTokens
      if (parsed.outputTokens !== undefined) updates.outputTokens = parsed.outputTokens
      if (parsed.cachedTokens !== undefined) updates.cachedTokens = parsed.cachedTokens

      const [updatedSession] = await deps.db
        .update(contextSessions)
        .set(updates)
        .where(eq(contextSessions.sessionId, parsed.sessionId))
        .returning()

      return updatedSession
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) throw error
    if (error instanceof Error && error.message.includes('already completed')) throw error

    logger.warn('session_update: failed to update session', {
      session_id: parsed.sessionId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Mark an agent session as completed with final metrics.
 *
 * Returns the completed session record or null if not found/error.
 * Throws for business logic errors (session not found, already completed).
 */
export async function session_complete(
  deps: SessionOpsDeps,
  input: SessionCompleteInput,
): Promise<SelectContextSession | null> {
  const parsed = SessionCompleteInputSchema.parse(input)

  try {
    const [existingSession] = await deps.db
      .select()
      .from(contextSessions)
      .where(and(eq(contextSessions.sessionId, parsed.sessionId), isNull(contextSessions.endedAt)))

    if (!existingSession) {
      throw new Error(
        `Session '${parsed.sessionId}' not found or already completed. Cannot complete a session twice.`,
      )
    }

    const updates: Partial<InsertContextSession> & { endedAt: Date; updatedAt: Date } = {
      endedAt: parsed.endedAt ? new Date(parsed.endedAt) : new Date(),
      updatedAt: new Date(),
    }

    if (parsed.inputTokens !== undefined) updates.inputTokens = parsed.inputTokens
    if (parsed.outputTokens !== undefined) updates.outputTokens = parsed.outputTokens
    if (parsed.cachedTokens !== undefined) updates.cachedTokens = parsed.cachedTokens

    const [completedSession] = await deps.db
      .update(contextSessions)
      .set(updates)
      .where(eq(contextSessions.sessionId, parsed.sessionId))
      .returning()

    return completedSession
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) throw error
    if (error instanceof Error && error.message.includes('already completed')) throw error

    logger.warn('session_complete: failed to complete session', {
      session_id: parsed.sessionId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Query agent sessions with flexible filtering and pagination.
 *
 * Returns an array of matching session records.
 * Returns empty array on DB errors — never throws.
 */
export async function session_query(
  deps: SessionOpsDeps,
  input: Partial<SessionQueryInput> = {},
): Promise<SelectContextSession[]> {
  const parsed = SessionQueryInputSchema.parse(input)

  try {
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

    const baseQuery = deps.db.select().from(contextSessions)
    const queryWithWhere = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery

    const sessions = await queryWithWhere
      .orderBy(desc(contextSessions.startedAt))
      .limit(parsed.limit)
      .offset(parsed.offset)

    return sessions
  } catch (error) {
    logger.warn('session_query: failed to query sessions', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
}

/**
 * Session cleanup result type.
 */
export interface SessionCleanupResult {
  deletedCount: number
  dryRun: boolean
  cutoffDate: string
}

/**
 * Clean up old completed sessions.
 *
 * SAFETY: Defaults to dryRun=true — must explicitly set dryRun=false to delete.
 * Returns cleanup result even on DB errors — never throws.
 */
export async function session_cleanup(
  deps: SessionOpsDeps,
  input: Partial<SessionCleanupInput> = {},
): Promise<SessionCleanupResult> {
  const parsed = SessionCleanupInputSchema.parse(input)

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - parsed.retentionDays)

  try {
    if (parsed.dryRun) {
      const result = await deps.db
        .select({ count: sql<number>`count(*)` })
        .from(contextSessions)
        .where(and(isNotNull(contextSessions.endedAt), lt(contextSessions.endedAt, cutoffDate)))

      const count = Number(result[0]?.count ?? 0)

      return {
        deletedCount: count,
        dryRun: true,
        cutoffDate: cutoffDate.toISOString(),
      }
    } else {
      const deleted = await deps.db
        .delete(contextSessions)
        .where(and(isNotNull(contextSessions.endedAt), lt(contextSessions.endedAt, cutoffDate)))
        .returning()

      return {
        deletedCount: deleted.length,
        dryRun: false,
        cutoffDate: cutoffDate.toISOString(),
      }
    }
  } catch (error) {
    logger.warn('session_cleanup: failed to cleanup sessions', {
      dry_run: parsed.dryRun,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      deletedCount: 0,
      dryRun: parsed.dryRun,
      cutoffDate: cutoffDate.toISOString(),
    }
  }
}
