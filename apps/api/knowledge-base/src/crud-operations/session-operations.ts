/**
 * Session MCP Operations
 *
 * Implements 2 lightweight MCP tools for real-time agent activity tracking:
 * - session_create: INSERT into workflow.context_sessions (ended_at = NULL → agent active)
 * - session_complete: UPDATE ended_at = NOW() (badge disappears)
 *
 * These are telemetry-only — non-blocking, fire-and-forget from caller's perspective.
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { contextSessions } from '../db/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

export const SessionCreateInputSchema = z.object({
  agentName: z.string().min(1),
  storyId: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  sessionId: z.string().uuid().optional(),
})

export const SessionCompleteInputSchema = z.object({
  sessionId: z.string().min(1),
})

export type SessionCreateInput = z.infer<typeof SessionCreateInputSchema>
export type SessionCompleteOutput = { sessionId: string; endedAt: string }

// ============================================================================
// Operations
// ============================================================================

export async function session_create(
  deps: { db: NodePgDatabase<any> },
  input: SessionCreateInput,
): Promise<{ sessionId: string; id: string }> {
  const { db } = deps
  const sessionId = input.sessionId ?? crypto.randomUUID()

  const rows = await db
    .insert(contextSessions)
    .values({
      sessionId,
      agentName: input.agentName,
      storyId: input.storyId ?? null,
      phase: input.phase ?? null,
    })
    .returning({ id: contextSessions.id, sessionId: contextSessions.sessionId })

  return { sessionId: rows[0]!.sessionId, id: rows[0]!.id }
}

export async function session_complete(
  deps: { db: NodePgDatabase<any> },
  input: z.infer<typeof SessionCompleteInputSchema>,
): Promise<SessionCompleteOutput> {
  const { db } = deps
  const now = new Date()

  await db
    .update(contextSessions)
    .set({ endedAt: now, updatedAt: now })
    .where(eq(contextSessions.sessionId, input.sessionId))

  return { sessionId: input.sessionId, endedAt: now.toISOString() }
}
