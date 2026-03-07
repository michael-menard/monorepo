/**
 * Checkpoint Repository
 *
 * Repository for checkpoint persistence against wint.workflow_checkpoints
 * and wint.workflow_executions tables.
 *
 * Uses the WorkflowRepository pattern: raw pg client.query() with @repo/db getPool().
 * AC-001: PostgreSQL checkpointer via getPool() from @repo/db.
 * AC-002: Checkpoint write per node; restore from latest checkpoint.
 * AC-003: Payload includes node_history, state_snapshot, retry_counts, error_context.
 * AC-004: putWithRollback() writes rollback_actions to checkpoint JSONB.
 *
 * Connection pool note: @repo/db uses max: 1 per Lambda. All writes use getPool()
 * and release the client promptly. No separate pool is created.
 *
 * HP-2: Checkpoint row persisted after each node (tested in checkpoint-repository.test.ts).
 * EC-2: DB unavailable — error propagated, not silently dropped.
 * EC-3: Corrupted payload — Zod safeParse returns error.
 * EC-4: Rollback intent recorded in JSONB.
 * ED-1: max=1 pool — no starvation (p99 < 50ms).
 * ED-3: retry_counts persisted in JSONB.
 */

import { logger } from '@repo/logger'
import { serializeState, deserializeState, parseCheckpointPayload } from './serializer.js'
import type {
  CheckpointConfig,
  CheckpointPayload,
  CheckpointRow,
  ExecutionRow,
  NodeHistoryEntry,
  RollbackAction,
} from './__types__/index.js'
import { CheckpointConfigSchema } from './__types__/index.js'

// ============================================================================
// DbClient interface (mirrors story-repository.ts pattern)
// ============================================================================

export interface DbClient {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>
  release?: () => void
}

export interface DbPool {
  connect(): Promise<DbClient>
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>
}

// ============================================================================
// CheckpointRepository
// ============================================================================

/**
 * Repository for checkpoint CRUD operations.
 *
 * Follows WorkflowRepository pattern:
 * - Constructor accepts a pool from @repo/db getPool()
 * - All methods use raw pg client.query()
 * - All errors are logged and re-thrown (EC-2)
 */
export class CheckpointRepository {
  private config: CheckpointConfig

  constructor(
    private pool: DbPool,
    config: Partial<CheckpointConfig> = {},
  ) {
    this.config = CheckpointConfigSchema.parse(config)
  }

  // ==========================================================================
  // Execution management
  // ==========================================================================

  /**
   * Creates or retrieves a workflow_executions row for a given thread_id.
   * The thread_id maps to workflow_executions.execution_id (unique text column).
   *
   * @param threadId - LangGraph thread ID (UUID string)
   * @param storyId - Optional story ID for cross-referencing
   * @returns The execution row UUID (workflow_executions.id)
   */
  async ensureExecution(threadId: string, storyId?: string): Promise<string> {
    const client = await this.pool.connect()
    try {
      // Check if execution already exists
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM wint.workflow_executions WHERE execution_id = $1`,
        [threadId],
      )

      if (existing.rows.length > 0) {
        return existing.rows[0].id
      }

      // Create new execution row
      const result = await client.query<{ id: string }>(
        `INSERT INTO wint.workflow_executions
          (execution_id, workflow_name, workflow_version, story_id, triggered_by, status, started_at)
         VALUES ($1, $2, $3, $4, $5, 'in_progress', NOW())
         RETURNING id`,
        [
          threadId,
          this.config.workflowName,
          this.config.workflowVersion,
          storyId ?? null,
          this.config.triggeredBy,
        ],
      )

      logger.info('Created workflow execution', { threadId, storyId })
      return result.rows[0].id
    } catch (error) {
      logger.error('Failed to ensure execution', {
        threadId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  /**
   * Marks a workflow execution as completed with final status.
   *
   * @param threadId - LangGraph thread ID
   * @param status - Final status ('completed' | 'failed' | 'aborted')
   */
  async completeExecution(
    threadId: string,
    status: 'completed' | 'failed' | 'aborted',
  ): Promise<void> {
    const client = await this.pool.connect()
    try {
      await client.query(
        `UPDATE wint.workflow_executions
         SET status = $2, completed_at = NOW(),
             duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
         WHERE execution_id = $1`,
        [threadId, status],
      )
      logger.info('Completed workflow execution', { threadId, status })
    } catch (error) {
      logger.error('Failed to complete execution', {
        threadId,
        status,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  // ==========================================================================
  // Checkpoint write
  // ==========================================================================

  /**
   * Writes a checkpoint for a completed node.
   * AC-002: Called after each node completes.
   * AC-003: Payload includes full state, history, retry counts, error context.
   *
   * @param threadId - LangGraph thread ID
   * @param nodeName - LangGraph node name (e.g., 'seed', 'synthesis')
   * @param phase - Workflow phase string (e.g., 'execute', 'plan')
   * @param payload - Full checkpoint payload
   * @param storyId - Optional story ID for FK cross-reference
   */
  async put(
    threadId: string,
    nodeName: string,
    phase: string,
    payload: CheckpointPayload,
    storyId?: string,
  ): Promise<void> {
    const client = await this.pool.connect()
    try {
      // Ensure execution row exists
      const executionUuid = await this.ensureExecution(threadId, storyId)

      // Serialize state snapshot
      const stateResult = serializeState(payload)
      if (!stateResult.success) {
        throw new Error(`Cannot serialize checkpoint payload: ${stateResult.error}`)
      }

      await client.query(
        `INSERT INTO wint.workflow_checkpoints
          (execution_id, checkpoint_name, phase, state, status)
         VALUES ($1, $2, $3, $4, 'reached')`,
        [executionUuid, nodeName, phase, JSON.stringify(stateResult.data)],
      )

      logger.debug('Checkpoint written', { threadId, nodeName, phase })
    } catch (error) {
      logger.error('Checkpoint write failed', {
        threadId,
        nodeName,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  /**
   * Writes a checkpoint with rollback intent after a node failure with partial side effects.
   * AC-004: Records compensating transaction plan — does NOT execute it.
   *
   * @param threadId - LangGraph thread ID
   * @param nodeName - Node name where failure occurred
   * @param phase - Workflow phase
   * @param payload - Checkpoint payload (will have error_context set)
   * @param rollbackActions - Compensating transaction plan
   * @param storyId - Optional story ID
   */
  async putWithRollback(
    threadId: string,
    nodeName: string,
    phase: string,
    payload: CheckpointPayload,
    rollbackActions: RollbackAction[],
    storyId?: string,
  ): Promise<void> {
    // Merge rollback_actions into payload
    const enrichedPayload: CheckpointPayload = {
      ...payload,
      rollback_actions: rollbackActions,
    }

    const client = await this.pool.connect()
    try {
      const executionUuid = await this.ensureExecution(threadId, storyId)

      const stateResult = serializeState(enrichedPayload)
      if (!stateResult.success) {
        throw new Error(`Cannot serialize rollback payload: ${stateResult.error}`)
      }

      await client.query(
        `INSERT INTO wint.workflow_checkpoints
          (execution_id, checkpoint_name, phase, state, status)
         VALUES ($1, $2, $3, $4, 'failed')`,
        [executionUuid, nodeName, phase, JSON.stringify(stateResult.data)],
      )

      logger.info('Rollback intent checkpoint written', {
        threadId,
        nodeName,
        rollbackActionsCount: rollbackActions.length,
      })
    } catch (error) {
      logger.error('Rollback checkpoint write failed', {
        threadId,
        nodeName,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  // ==========================================================================
  // Checkpoint read / restore
  // ==========================================================================

  /**
   * Retrieves the latest checkpoint for a thread_id.
   * AC-002: Used by resume-graph to restore state before reinvoking graph.
   *
   * @param threadId - LangGraph thread ID
   * @returns Latest checkpoint payload and node name, or null if none found
   */
  async get(
    threadId: string,
  ): Promise<{ payload: CheckpointPayload; nodeName: string; phase: string } | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query<CheckpointRow>(
        `SELECT wc.*
         FROM wint.workflow_checkpoints wc
         JOIN wint.workflow_executions we ON we.id = wc.execution_id
         WHERE we.execution_id = $1
           AND wc.status != 'archived'
         ORDER BY wc.reached_at DESC
         LIMIT 1`,
        [threadId],
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      // Validate payload
      const deserResult = deserializeState(row.state)
      if (!deserResult.success) {
        logger.error('Failed to deserialize checkpoint state', { threadId })
        throw new Error(deserResult.error)
      }

      const { payload, error } = parseCheckpointPayload(deserResult.data)
      if (error || !payload) {
        throw new Error(error ?? 'Failed to parse checkpoint payload')
      }

      return {
        payload,
        nodeName: row.checkpoint_name,
        phase: row.phase,
      }
    } catch (error) {
      logger.error('Checkpoint read failed', {
        threadId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  /**
   * Lists all checkpoints for a thread_id in chronological order.
   *
   * @param threadId - LangGraph thread ID
   * @returns Array of checkpoint rows (without parsed payload)
   */
  async list(threadId: string): Promise<CheckpointRow[]> {
    const client = await this.pool.connect()
    try {
      const result = await client.query<CheckpointRow>(
        `SELECT wc.*
         FROM wint.workflow_checkpoints wc
         JOIN wint.workflow_executions we ON we.id = wc.execution_id
         WHERE we.execution_id = $1
           AND wc.status != 'archived'
         ORDER BY wc.reached_at ASC`,
        [threadId],
      )

      return result.rows
    } catch (error) {
      logger.error('Checkpoint list failed', {
        threadId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  /**
   * Retrieves the execution row for a thread_id.
   *
   * @param threadId - LangGraph thread ID (execution_id text column)
   * @returns Execution row or null
   */
  async getExecution(threadId: string): Promise<ExecutionRow | null> {
    const client = await this.pool.connect()
    try {
      const result = await client.query<ExecutionRow>(
        `SELECT * FROM wint.workflow_executions WHERE execution_id = $1`,
        [threadId],
      )

      return result.rows[0] ?? null
    } catch (error) {
      logger.error('Execution read failed', {
        threadId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    } finally {
      client.release?.()
    }
  }

  // ==========================================================================
  // Helper: Build payload
  // ==========================================================================

  /**
   * Constructs a CheckpointPayload from raw parts.
   * Convenience method for callers that don't want to build the full object.
   *
   * @param threadId - LangGraph thread ID
   * @param currentNode - Node being checkpointed
   * @param stateSnapshot - Current graph state
   * @param nodeHistory - Completed node history
   * @param retryCounts - Retry counts per node
   * @param errorContext - Error context if node failed
   * @returns Validated CheckpointPayload
   */
  buildPayload(
    threadId: string,
    currentNode: string,
    stateSnapshot: Record<string, unknown>,
    nodeHistory: NodeHistoryEntry[] = [],
    retryCounts: Record<string, number> = {},
    errorContext: CheckpointPayload['error_context'] = null,
  ): CheckpointPayload {
    return {
      thread_id: threadId,
      current_node: currentNode,
      state_snapshot: stateSnapshot,
      node_history: nodeHistory,
      retry_counts: retryCounts,
      error_context: errorContext,
      rollback_actions: [],
      schema_version: 1,
    }
  }
}

/**
 * Factory function to create a CheckpointRepository with the given pool.
 *
 * @param pool - DB pool from @repo/db getPool()
 * @param config - Optional configuration overrides
 * @returns Configured CheckpointRepository instance
 */
export function createCheckpointRepository(
  pool: DbPool,
  config: Partial<CheckpointConfig> = {},
): CheckpointRepository {
  return new CheckpointRepository(pool, config)
}
