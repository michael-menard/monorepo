/**
 * Checkpointer Module Types
 *
 * Zod schemas for the LangGraph checkpointer module.
 * Implements DB-backed checkpoint persistence using wint.workflow_checkpoints
 * and wint.workflow_executions tables (provided by WINT-0070 migration).
 *
 * Architectural decision (ARCH-003 / feasibility analysis):
 * - Using custom BaseCheckpointSaver pattern (NOT native @langchain/langgraph-checkpoint-postgres)
 * - Reason: @langchain/langgraph-checkpoint-postgres@1.0.1 requires @langchain/core ^1.0.1
 *   but this project uses @langchain/langgraph ^0.2.0 which requires @langchain/core <0.3.0.
 *   Version mismatch makes the native package incompatible.
 * - Implementation: custom CheckpointRepository using pg client.query() against
 *   wint.workflow_checkpoints and wint.workflow_executions via getPool() from @repo/db.
 *
 * AC-001: PostgreSQL checkpointer via getPool() from @repo/db
 * AC-002: All graph state serializable/restorable
 * AC-003: Checkpoint payload includes node_history, state_snapshot, retry_counts, error_context
 */

import { z } from 'zod'

// ============================================================================
// Rollback Action Schema
// ============================================================================

/**
 * A single compensating transaction action to undo a partial side effect.
 * AC-004: Rollback intent recorded — execution deferred to future story.
 */
export const RollbackActionSchema = z.object({
  /** Type of compensating action */
  actionType: z.enum(['delete_row', 'update_field', 'call_api', 'custom']),
  /** Table or resource to act on */
  target: z.string().min(1),
  /** Identifier of the affected row or resource */
  resourceId: z.string().min(1),
  /** Additional parameters for the compensating transaction */
  params: z.record(z.unknown()).default({}),
  /** Human-readable description of this rollback action */
  description: z.string().optional(),
})

export type RollbackAction = z.infer<typeof RollbackActionSchema>

// ============================================================================
// Node History Entry Schema
// ============================================================================

/**
 * Record of a single node execution within a graph run.
 * AC-003: Node execution history in checkpoint payload.
 */
export const NodeHistoryEntrySchema = z.object({
  /** Name of the node (matches LangGraph node name) */
  nodeName: z.string().min(1),
  /** Timestamp when this node started (ISO 8601) */
  startedAt: z.string().datetime(),
  /** Timestamp when this node completed (ISO 8601), null if still running */
  completedAt: z.string().datetime().nullable(),
  /** Whether this node completed successfully */
  success: z.boolean(),
  /** Error message if the node failed */
  errorMessage: z.string().nullable().default(null),
  /** Duration of node execution in milliseconds */
  durationMs: z.number().int().min(0).nullable().default(null),
})

export type NodeHistoryEntry = z.infer<typeof NodeHistoryEntrySchema>

// ============================================================================
// Checkpoint Payload Schema
// ============================================================================

/**
 * Full checkpoint payload stored in wint.workflow_checkpoints.state JSONB.
 * AC-003: Includes node_history, state_snapshot, retry_counts, error_context.
 * AC-004: Includes rollback_actions for compensating transaction intent.
 */
export const CheckpointPayloadSchema = z.object({
  /** Ordered history of node executions in this graph run */
  node_history: z.array(NodeHistoryEntrySchema).default([]),

  /** Serialized LangGraph state snapshot at the time of checkpointing */
  state_snapshot: z.record(z.unknown()).default({}),

  /**
   * Retry count per node name.
   * Key: LangGraph node name (e.g., "seed", "synthesis")
   * Value: number of retry attempts consumed
   * AC-003: retry_counts per node
   */
  retry_counts: z.record(z.string(), z.number().int().min(0)).default({}),

  /**
   * Error context captured at time of failure.
   * AC-003: error_context in checkpoint payload
   */
  error_context: z
    .object({
      /** Node name where the error occurred */
      nodeName: z.string(),
      /** Error message */
      message: z.string(),
      /** Error stack trace if available */
      stack: z.string().optional(),
      /** Timestamp when the error occurred */
      errorAt: z.string().datetime(),
    })
    .nullable()
    .default(null),

  /**
   * Compensating transaction plan for rollback intent.
   * AC-004: Rollback actions recorded — NOT executed (deferred to future story).
   */
  rollback_actions: z.array(RollbackActionSchema).default([]),

  /** Version of this checkpoint payload schema (for forward compatibility) */
  schema_version: z.literal(1).default(1),

  /** Thread ID (= execution_id) for LangGraph graph resumption */
  thread_id: z.string().min(1),

  /** Name of the LangGraph node that was executing when checkpoint was taken */
  current_node: z.string().min(1),
})

export type CheckpointPayload = z.infer<typeof CheckpointPayloadSchema>

// ============================================================================
// Checkpoint Config Schema
// ============================================================================

/**
 * Configuration for the CheckpointRepository.
 * AC-001: Connection pooling via getPool() from @repo/db.
 */
export const CheckpointConfigSchema = z.object({
  /**
   * Name of the workflow (stored in wint.workflow_executions.workflow_name).
   * Defaults to 'story-creation'.
   */
  workflowName: z.string().min(1).default('story-creation'),

  /**
   * Workflow version (stored in wint.workflow_executions.workflow_version).
   */
  workflowVersion: z.string().min(1).default('1.0.0'),

  /**
   * Who triggered this workflow. Stored in wint.workflow_executions.triggered_by.
   */
  triggeredBy: z.string().min(1).default('orchestrator'),

  /**
   * Whether to enable checkpoint writing. Set to false to disable for testing.
   */
  enabled: z.boolean().default(true),
})

export type CheckpointConfig = z.infer<typeof CheckpointConfigSchema>

// ============================================================================
// Checkpoint Row Schema (DB read result)
// ============================================================================

/**
 * A row from wint.workflow_checkpoints as returned by the DB.
 */
export const CheckpointRowSchema = z.object({
  id: z.string().uuid(),
  execution_id: z.string().uuid(),
  checkpoint_name: z.string(),
  phase: z.string(),
  state: z.record(z.unknown()),
  status: z.string(),
  reached_at: z.coerce.date(),
  created_at: z.coerce.date(),
})

export type CheckpointRow = z.infer<typeof CheckpointRowSchema>

// ============================================================================
// Execution Row Schema (DB read result)
// ============================================================================

/**
 * A row from wint.workflow_executions as returned by the DB.
 */
export const ExecutionRowSchema = z.object({
  id: z.string().uuid(),
  execution_id: z.string(),
  workflow_name: z.string(),
  workflow_version: z.string(),
  story_id: z.string().nullable(),
  triggered_by: z.string(),
  status: z.string(),
  started_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
})

export type ExecutionRow = z.infer<typeof ExecutionRowSchema>

// ============================================================================
// Serde Interface Types
// ============================================================================

/**
 * Serializer/deserializer interface for graph state.
 * Used by CheckpointRepository to convert LangGraph state to/from JSONB.
 * AC-002: All graph state serializable and restorable.
 */
export const SerdeResultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.record(z.unknown()),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
])

export type SerdeResult = z.infer<typeof SerdeResultSchema>
