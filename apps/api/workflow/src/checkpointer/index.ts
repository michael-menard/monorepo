/**
 * Checkpointer Module — Entry Point
 *
 * Provides the withCheckpointer() factory and re-exports for the checkpointer module.
 *
 * Architectural decision: Custom checkpoint repository against wint.workflow_checkpoints.
 * @langchain/langgraph-checkpoint-postgres is incompatible with @langchain/langgraph ^0.2.0
 * (peer dep conflict: requires @langchain/core ^1.0.1 vs project's <0.3.0).
 *
 * AC-001: PostgreSQL checkpointer wired to getPool() from @repo/db.
 * AC-002: Graph state serializable and restorable via withCheckpointer().
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { CheckpointRepository, createCheckpointRepository } from './checkpoint-repository.js'
import type { DbPool } from './checkpoint-repository.js'
import type { CheckpointConfig, CheckpointPayload, NodeHistoryEntry } from './__types__/index.js'
import { PHASE_TO_CHECKPOINT_MAP } from './phase-mapping.js'
import type { Phase } from '../artifacts/checkpoint.js'

// Re-export types and classes for consumers
export { CheckpointRepository, createCheckpointRepository }
export type { DbPool }
export type { CheckpointConfig, CheckpointPayload, NodeHistoryEntry }
export type { RollbackAction, CheckpointRow, ExecutionRow, SerdeResult } from './__types__/index.js'
export { serializeState, deserializeState, parseCheckpointPayload } from './serializer.js'
export { archiveExpiredCheckpoints } from './checkpoint-cleanup.js'
export { PHASE_TO_CHECKPOINT_MAP, translatePhaseToNode } from './phase-mapping.js'

// ============================================================================
// withCheckpointer() Factory
// ============================================================================

/**
 * Options for the withCheckpointer() wrapper.
 */
export const WithCheckpointerOptionsSchema = z.object({
  /** LangGraph thread ID for this graph run. Required for checkpoint persistence. */
  threadId: z.string().min(1),
  /** Optional story ID for cross-reference in workflow_executions */
  storyId: z.string().optional(),
  /** Checkpoint repository configuration */
  checkpointConfig: z.custom<Partial<CheckpointConfig>>().optional(),
  /**
   * Whether to write checkpoints after each node.
   * Default: true. Set to false to disable in tests.
   */
  enabled: z.boolean().optional().default(true),
})

export type WithCheckpointerOptions = z.infer<typeof WithCheckpointerOptionsSchema>

/**
 * Result of a node execution wrapped by withCheckpointer().
 * Generic parameter T represents the node's return type.
 */
export const CheckpointedNodeResultSchema = z.object({
  /** Whether a checkpoint was written */
  checkpointed: z.boolean(),
  /** Thread ID used for this checkpoint */
  threadId: z.string(),
  /** Node name that was checkpointed */
  nodeName: z.string(),
})

// The full result type includes the generic result field not expressible in plain Zod
export type CheckpointedNodeResult<T> = z.infer<typeof CheckpointedNodeResultSchema> & {
  /** The node's return value */
  result: T
}

/**
 * Wraps a LangGraph node function with checkpoint persistence.
 *
 * After each successful node execution, writes a checkpoint to
 * wint.workflow_checkpoints via CheckpointRepository. If the node throws,
 * the error is logged and re-thrown (checkpoint write is skipped for unhandled errors;
 * use putWithRollback() explicitly for rollback intent).
 *
 * AC-001: Uses getPool()-provided pool for all DB operations.
 * AC-002: After node completes, checkpoint is written. On resume, graph reads
 *   latest checkpoint and skips completed nodes.
 *
 * Usage:
 * ```typescript
 * import { getPool } from '@repo/db'
 * import { withCheckpointer } from './checkpointer/index.js'
 *
 * const pool = getPool()
 * const { result } = await withCheckpointer(
 *   pool,
 *   { threadId, storyId },
 *   'seed',
 *   'execute',
 *   currentState,
 *   nodeHistory,
 *   retryCounts,
 *   async () => seedNode(state),
 * )
 * ```
 *
 * @param pool - DB pool from @repo/db getPool()
 * @param options - Checkpointer options (threadId, storyId, etc.)
 * @param nodeName - LangGraph node name
 * @param phase - Workflow phase (must be a valid Phase value from PHASE_TO_CHECKPOINT_MAP)
 * @param stateSnapshot - Current graph state (will be serialized)
 * @param nodeHistory - Node execution history up to this point
 * @param retryCounts - Retry counts per node
 * @param nodeFn - The node function to execute
 * @returns CheckpointedNodeResult with node result and checkpoint status
 */
export async function withCheckpointer<T>(
  pool: DbPool,
  options: WithCheckpointerOptions,
  nodeName: string,
  phase: Phase,
  stateSnapshot: Record<string, unknown>,
  nodeHistory: NodeHistoryEntry[],
  retryCounts: Record<string, number>,
  nodeFn: () => Promise<T>,
): Promise<CheckpointedNodeResult<T>> {
  const { threadId, storyId, checkpointConfig, enabled = true } = options

  // Runtime validation: phase must be a key in PHASE_TO_CHECKPOINT_MAP
  if (!(phase in PHASE_TO_CHECKPOINT_MAP)) {
    throw new Error(
      `withCheckpointer: unknown phase '${phase}'. Must be one of: ${Object.keys(PHASE_TO_CHECKPOINT_MAP).join(', ')}`,
    )
  }

  const repo = createCheckpointRepository(pool, checkpointConfig)
  const startedAt = new Date().toISOString()

  try {
    // Execute the node
    const result = await nodeFn()

    // Write checkpoint after successful node completion
    if (enabled) {
      try {
        const completedAt = new Date().toISOString()
        const durationMs = Date.now() - new Date(startedAt).getTime()

        const historyEntry: NodeHistoryEntry = {
          nodeName,
          startedAt,
          completedAt,
          success: true,
          errorMessage: null,
          durationMs,
        }

        // Use post-node state: if the node returned an object, treat it as the
        // updated state snapshot; otherwise fall back to the pre-execution snapshot.
        const checkpointState =
          result && typeof result === 'object' ? (result as Record<string, unknown>) : stateSnapshot

        const payload = repo.buildPayload(
          threadId,
          nodeName,
          checkpointState,
          [...nodeHistory, historyEntry],
          retryCounts,
          null,
        )

        await repo.put(threadId, nodeName, phase, payload, storyId)
        logger.debug('Checkpoint written after node', { threadId, nodeName })
      } catch (checkpointError) {
        // Checkpoint write failure must not silently succeed — log and surface
        logger.error('Checkpoint write failed after node success', {
          threadId,
          nodeName,
          error:
            checkpointError instanceof Error ? checkpointError.message : String(checkpointError),
        })
        // Re-throw: AC-002 requires checkpoint failure to be surfaced
        throw checkpointError
      }
    }

    return { result, checkpointed: enabled, threadId, nodeName }
  } catch (nodeError) {
    // Node execution failed — log and re-throw
    // Caller may use repo.putWithRollback() explicitly for rollback intent
    logger.error('Node execution failed in withCheckpointer', {
      threadId,
      nodeName,
      error: nodeError instanceof Error ? nodeError.message : String(nodeError),
    })
    throw nodeError
  }
}
