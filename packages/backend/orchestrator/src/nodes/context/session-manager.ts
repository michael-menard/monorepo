/**
 * session-manager.ts
 *
 * Native LangGraph node for session management operations.
 * Ports sessionCreate, sessionUpdate, sessionComplete, sessionCleanup MCP tool behavior.
 *
 * Operation dispatch pattern (state.sessionOperation):
 *   'create'   → create new session row, set sessionId in state
 *   'update'   → update token counts (incremental or absolute)
 *   'complete' → mark session as ended with final metrics
 *   'cleanup'  → archive old completed sessions
 *
 * Graceful degradation: never throws on DB failure, returns null sessionId.
 * Note: sessionUpdate/sessionComplete throw on business logic errors (not-found,
 * already-completed). The node wraps these in try/catch, returning null sessionId
 * instead of propagating (AC-11).
 *
 * WINT-9090: Create contextWarmerNode and sessionManagerNode LangGraph Nodes
 *
 * @module nodes/context/session-manager
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import type { GraphStateWithContext } from '../reality/retrieve-context.js'
import type { SelectContextSession } from '@repo/database-schema'

// ============================================================================
// Input Schemas (matching mcp-tools session-management/__types__/index.ts — AC-14)
// ============================================================================

export const SessionManagerCreateInputSchema = z.object({
  sessionId: z.string().uuid().optional(),
  agentName: z.string().min(1),
  storyId: z.string().nullable().optional(),
  phase: z.string().nullable().optional(),
  inputTokens: z.number().int().min(0).optional().default(0),
  outputTokens: z.number().int().min(0).optional().default(0),
  cachedTokens: z.number().int().min(0).optional().default(0),
  startedAt: z.date().optional(),
})

export type SessionManagerCreateInput = z.infer<typeof SessionManagerCreateInputSchema>

export const SessionManagerUpdateInputSchema = z.object({
  sessionId: z.string().uuid(),
  mode: z.enum(['incremental', 'absolute']).default('incremental'),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})

export type SessionManagerUpdateInput = z.infer<typeof SessionManagerUpdateInputSchema>

export const SessionManagerCompleteInputSchema = z.object({
  sessionId: z.string().uuid(),
  endedAt: z.date().optional(),
  inputTokens: z.number().int().min(0).optional(),
  outputTokens: z.number().int().min(0).optional(),
  cachedTokens: z.number().int().min(0).optional(),
})

export type SessionManagerCompleteInput = z.infer<typeof SessionManagerCompleteInputSchema>

export const SessionManagerCleanupInputSchema = z.object({
  retentionDays: z.number().int().min(1).default(90),
  dryRun: z.boolean().default(true),
})

export type SessionManagerCleanupInput = z.infer<typeof SessionManagerCleanupInputSchema>

// ============================================================================
// Injectable DB function types (AC-10)
// ============================================================================

export type SessionCleanupResult = {
  deletedCount: number
  dryRun: boolean
  cutoffDate: Date
}

/**
 * Injectable DB function for session create.
 */
export type SessionCreateFn = (
  input: SessionManagerCreateInput,
) => Promise<SelectContextSession | null>

/**
 * Injectable DB function for session update.
 */
export type SessionUpdateFn = (
  input: SessionManagerUpdateInput,
) => Promise<SelectContextSession | null>

/**
 * Injectable DB function for session complete.
 */
export type SessionCompleteFn = (
  input: SessionManagerCompleteInput,
) => Promise<SelectContextSession | null>

/**
 * Injectable DB function for session cleanup.
 */
export type SessionCleanupFn = (
  input: Partial<SessionManagerCleanupInput>,
) => Promise<SessionCleanupResult>

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for session manager node configuration.
 */
export const SessionManagerConfigSchema = z.object({
  _placeholder: z.undefined().optional(),
})

export type SessionManagerConfig = z.infer<typeof SessionManagerConfigSchema> & {
  /** Injectable DB create function (for testing — AC-10) */
  sessionCreateFn?: SessionCreateFn
  /** Injectable DB update function (for testing — AC-10) */
  sessionUpdateFn?: SessionUpdateFn
  /** Injectable DB complete function (for testing — AC-10) */
  sessionCompleteFn?: SessionCompleteFn
  /** Injectable DB cleanup function (for testing — AC-10) */
  sessionCleanupFn?: SessionCleanupFn
}

/**
 * Schema for session manager result.
 */
export const SessionManagerResultSchema = z.object({
  /** Operation performed */
  operation: z.enum(['create', 'update', 'complete', 'cleanup']),
  /** Session ID (create/update/complete operations) */
  sessionId: z.string().nullable(),
  /** Number of sessions deleted (cleanup operation) */
  deletedCount: z.number().int().min(0),
  /** Whether cleanup was a dry run */
  dryRun: z.boolean(),
  /** Error message if operation failed */
  error: z.string().nullable(),
})

export type SessionManagerResult = z.infer<typeof SessionManagerResultSchema>

// ============================================================================
// Extended Graph State
// ============================================================================

/**
 * Extended graph state with session management fields.
 * Extends GraphStateWithContext (from retrieve-context.ts) per AC-9.
 */
export interface GraphStateWithSession extends GraphStateWithContext {
  /** Operation to perform: 'create' | 'update' | 'complete' | 'cleanup' */
  sessionOperation?: 'create' | 'update' | 'complete' | 'cleanup'

  // Create fields
  /** Agent name for the session (create) */
  sessionAgentName?: string
  /** Story ID for the session (create, optional) */
  sessionStoryId?: string | null
  /** Phase name (create, optional) */
  sessionPhase?: string | null
  /** Initial input tokens (create) */
  sessionInputTokens?: number
  /** Initial output tokens (create) */
  sessionOutputTokens?: number
  /** Initial cached tokens (create) */
  sessionCachedTokens?: number

  // Update / complete fields
  /** Session ID to update/complete */
  sessionId?: string | null
  /** Update mode: 'incremental' (default) or 'absolute' */
  sessionUpdateMode?: 'incremental' | 'absolute'
  /** Input tokens delta (update) or final value (complete) */
  sessionInputTokensDelta?: number
  /** Output tokens delta (update) or final value (complete) */
  sessionOutputTokensDelta?: number
  /** Cached tokens delta (update) or final value (complete) */
  sessionCachedTokensDelta?: number
  /** End time for complete operation */
  sessionEndedAt?: Date

  // Cleanup fields
  /** Retention period in days (cleanup, default 90) */
  sessionRetentionDays?: number
  /** Whether to dry run (cleanup, default true) */
  sessionDryRun?: boolean

  /** Result of session manager operation */
  sessionManagerResult?: SessionManagerResult | null
}

// ============================================================================
// Default DB functions (dynamically loaded at runtime)
// ============================================================================

async function defaultSessionCreate(
  input: SessionManagerCreateInput,
): Promise<SelectContextSession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { sessionCreate } = await import('@repo/mcp-tools/session-management/session-create.js' as any)
  return sessionCreate(input)
}

async function defaultSessionUpdate(
  input: SessionManagerUpdateInput,
): Promise<SelectContextSession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { sessionUpdate } = await import('@repo/mcp-tools/session-management/session-update.js' as any)
  return sessionUpdate(input)
}

async function defaultSessionComplete(
  input: SessionManagerCompleteInput,
): Promise<SelectContextSession | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { sessionComplete } = await import('@repo/mcp-tools/session-management/session-complete.js' as any)
  return sessionComplete(input)
}

async function defaultSessionCleanup(
  input: Partial<SessionManagerCleanupInput>,
): Promise<SessionCleanupResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { sessionCleanup } = await import('@repo/mcp-tools/session-management/session-cleanup.js' as any)
  return sessionCleanup(input)
}

// ============================================================================
// Node implementation
// ============================================================================

async function sessionManagerImpl(
  state: GraphStateWithSession,
  config: Partial<SessionManagerConfig>,
): Promise<Partial<GraphStateWithSession>> {
  const operation = state.sessionOperation ?? 'create'

  // Resolve injectable functions — AC-10
  const sessionCreateFn = config.sessionCreateFn ?? defaultSessionCreate
  const sessionUpdateFn = config.sessionUpdateFn ?? defaultSessionUpdate
  const sessionCompleteFn = config.sessionCompleteFn ?? defaultSessionComplete
  const sessionCleanupFn = config.sessionCleanupFn ?? defaultSessionCleanup

  if (operation === 'create') {
    if (!state.sessionAgentName) {
      logger.warn('[session-manager] create: missing sessionAgentName')
      const result: SessionManagerResult = {
        operation: 'create',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: 'sessionAgentName is required for create operation',
      }
      return { sessionManagerResult: result, sessionId: null }
    }

    try {
      const session = await sessionCreateFn({
        agentName: state.sessionAgentName,
        storyId: state.sessionStoryId ?? null,
        phase: state.sessionPhase ?? null,
        inputTokens: state.sessionInputTokens ?? 0,
        outputTokens: state.sessionOutputTokens ?? 0,
        cachedTokens: state.sessionCachedTokens ?? 0,
      })

      if (!session) {
        const result: SessionManagerResult = {
          operation: 'create',
          sessionId: null,
          deletedCount: 0,
          dryRun: false,
          error: 'DB create returned null',
        }
        return { sessionManagerResult: result, sessionId: null }
      }

      logger.info('[session-manager] session created', {
        sessionId: session.sessionId,
        agentName: session.agentName,
        storyId: session.storyId,
        phase: session.phase,
      })

      const result: SessionManagerResult = {
        operation: 'create',
        sessionId: session.sessionId,
        deletedCount: 0,
        dryRun: false,
        error: null,
      }
      return { sessionManagerResult: result, sessionId: session.sessionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[session-manager] create failed', {
        error: errorMessage,
        agentName: state.sessionAgentName,
      })
      const result: SessionManagerResult = {
        operation: 'create',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: errorMessage,
      }
      return { sessionManagerResult: result, sessionId: null }
    }
  }

  if (operation === 'update') {
    if (!state.sessionId) {
      logger.warn('[session-manager] update: missing sessionId')
      const result: SessionManagerResult = {
        operation: 'update',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: 'sessionId is required for update operation',
      }
      return { sessionManagerResult: result, sessionId: null }
    }

    try {
      const session = await sessionUpdateFn({
        sessionId: state.sessionId,
        mode: state.sessionUpdateMode ?? 'incremental',
        inputTokens: state.sessionInputTokensDelta,
        outputTokens: state.sessionOutputTokensDelta,
        cachedTokens: state.sessionCachedTokensDelta,
      })

      if (!session) {
        const result: SessionManagerResult = {
          operation: 'update',
          sessionId: state.sessionId,
          deletedCount: 0,
          dryRun: false,
          error: 'DB update returned null',
        }
        return { sessionManagerResult: result, sessionId: state.sessionId }
      }

      logger.info('[session-manager] session updated', {
        sessionId: session.sessionId,
        inputTokens: session.inputTokens,
        outputTokens: session.outputTokens,
      })

      const result: SessionManagerResult = {
        operation: 'update',
        sessionId: session.sessionId,
        deletedCount: 0,
        dryRun: false,
        error: null,
      }
      return { sessionManagerResult: result, sessionId: session.sessionId }
    } catch (error) {
      // Graceful degradation: catch both business logic and DB errors (AC-11)
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[session-manager] update failed', {
        error: errorMessage,
        sessionId: state.sessionId,
      })
      const result: SessionManagerResult = {
        operation: 'update',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: errorMessage,
      }
      return { sessionManagerResult: result, sessionId: null }
    }
  }

  if (operation === 'complete') {
    if (!state.sessionId) {
      logger.warn('[session-manager] complete: missing sessionId')
      const result: SessionManagerResult = {
        operation: 'complete',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: 'sessionId is required for complete operation',
      }
      return { sessionManagerResult: result, sessionId: null }
    }

    try {
      const session = await sessionCompleteFn({
        sessionId: state.sessionId,
        endedAt: state.sessionEndedAt,
        inputTokens: state.sessionInputTokensDelta,
        outputTokens: state.sessionOutputTokensDelta,
        cachedTokens: state.sessionCachedTokensDelta,
      })

      if (!session) {
        const result: SessionManagerResult = {
          operation: 'complete',
          sessionId: state.sessionId,
          deletedCount: 0,
          dryRun: false,
          error: 'DB complete returned null',
        }
        return { sessionManagerResult: result, sessionId: state.sessionId }
      }

      logger.info('[session-manager] session completed', {
        sessionId: session.sessionId,
        endedAt: session.endedAt,
      })

      const result: SessionManagerResult = {
        operation: 'complete',
        sessionId: session.sessionId,
        deletedCount: 0,
        dryRun: false,
        error: null,
      }
      return { sessionManagerResult: result, sessionId: session.sessionId }
    } catch (error) {
      // Graceful degradation: catch both business logic and DB errors (AC-11)
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[session-manager] complete failed', {
        error: errorMessage,
        sessionId: state.sessionId,
      })
      const result: SessionManagerResult = {
        operation: 'complete',
        sessionId: null,
        deletedCount: 0,
        dryRun: false,
        error: errorMessage,
      }
      return { sessionManagerResult: result, sessionId: null }
    }
  }

  if (operation === 'cleanup') {
    try {
      const cleanupResult = await sessionCleanupFn({
        retentionDays: state.sessionRetentionDays ?? 90,
        dryRun: state.sessionDryRun !== false, // default true (safety)
      })

      logger.info('[session-manager] cleanup complete', {
        deletedCount: cleanupResult.deletedCount,
        dryRun: cleanupResult.dryRun,
        cutoffDate: cleanupResult.cutoffDate,
      })

      const result: SessionManagerResult = {
        operation: 'cleanup',
        sessionId: null,
        deletedCount: cleanupResult.deletedCount,
        dryRun: cleanupResult.dryRun,
        error: null,
      }
      return { sessionManagerResult: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[session-manager] cleanup failed', { error: errorMessage })
      const result: SessionManagerResult = {
        operation: 'cleanup',
        sessionId: null,
        deletedCount: 0,
        dryRun: state.sessionDryRun !== false,
        error: errorMessage,
      }
      return { sessionManagerResult: result }
    }
  }

  // Unknown operation
  logger.warn('[session-manager] unknown sessionOperation', { operation })
  const result: SessionManagerResult = {
    operation: 'create',
    sessionId: null,
    deletedCount: 0,
    dryRun: false,
    error: `Unknown operation: ${String(operation)}`,
  }
  return { sessionManagerResult: result, sessionId: null }
}

// ============================================================================
// Exported node factory functions (AC-2, AC-8)
// ============================================================================

/**
 * Session manager node — default configuration.
 *
 * Reads sessionOperation from state and dispatches to create/update/complete/cleanup logic.
 * Graceful degradation: never throws on DB failure, returns null sessionId.
 *
 * @example
 * ```typescript
 * import { sessionManagerNode } from './nodes/context/session-manager.js'
 *
 * // Create session
 * const result = await sessionManagerNode({
 *   ...state,
 *   sessionOperation: 'create',
 *   sessionAgentName: 'dev-execute-leader',
 *   sessionStoryId: 'WINT-9090',
 *   sessionPhase: 'execute',
 * })
 * console.log(`Session ID: ${result.sessionId}`)
 * ```
 */
export const sessionManagerNode = createToolNode(
  'session_manager',
  async (state: GraphState): Promise<Partial<GraphStateWithSession>> => {
    return sessionManagerImpl(state as GraphStateWithSession, {})
  },
)

/**
 * Creates a session manager node with custom configuration.
 *
 * @param config - Session manager configuration (injectable DB functions for testing — AC-10)
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // With injectable mock DB functions for testing
 * const node = createSessionManagerNode({
 *   sessionCreateFn: mockSessionCreate,
 *   sessionUpdateFn: mockSessionUpdate,
 *   sessionCompleteFn: mockSessionComplete,
 *   sessionCleanupFn: mockSessionCleanup,
 * })
 * ```
 */
export function createSessionManagerNode(config: Partial<SessionManagerConfig> = {}) {
  return createToolNode(
    'session_manager',
    async (state: GraphState): Promise<Partial<GraphStateWithSession>> => {
      return sessionManagerImpl(state as GraphStateWithSession, config)
    },
  )
}
