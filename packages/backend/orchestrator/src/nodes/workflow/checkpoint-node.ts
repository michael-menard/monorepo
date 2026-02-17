/**
 * checkpoint-node.ts
 *
 * LangGraph node that wraps the CheckpointAdapter for orchestrated workflows.
 * Provides read, write, update, and advancePhase operations for checkpoint files.
 *
 * LNGG-0080: Workflow Command Integration - Checkpoint Node
 *
 * @module nodes/workflow/checkpoint-node
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { CheckpointAdapter } from '../../adapters/checkpoint-adapter.js'
import type { Checkpoint, Phase } from '../../artifacts/checkpoint.js'

/**
 * Schema for checkpoint-node configuration.
 */
export const CheckpointNodeConfigSchema = z.object({
  /** Operation to perform: read, write, update, advancePhase */
  operation: z.enum(['read', 'write', 'update', 'advancePhase']).default('read'),
  /** Path to the checkpoint file */
  filePath: z.string(),
  /** Checkpoint data for write operation */
  checkpoint: z.any().optional(),
  /** Partial update for update operation */
  partialUpdate: z.record(z.any()).optional(),
  /** Source phase for advancePhase operation */
  fromPhase: z.string().optional(),
  /** Target phase for advancePhase operation */
  toPhase: z.string().optional(),
  /** Resume from phase */
  resumeFromPhase: z.string().optional(),
})

export type CheckpointNodeConfig = z.infer<typeof CheckpointNodeConfigSchema>

/**
 * Schema for checkpoint-node result.
 */
export const CheckpointNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** The checkpoint data (for read operations) */
  checkpoint: z.any().optional(),
  /** Error message if any */
  error: z.string().optional(),
  /** Path to the file */
  filePath: z.string(),
})

export type CheckpointNodeResult = z.infer<typeof CheckpointNodeResultSchema>

/**
 * Extended graph state with checkpoint result.
 */
export interface GraphStateWithCheckpoint extends GraphState {
  /** Result of checkpoint operation */
  checkpoint?: CheckpointNodeResult
}

/**
 * Checkpoint node implementation.
 *
 * Wraps CheckpointAdapter to provide LangGraph-compatible node interface.
 *
 * @param state - Current graph state
 * @param config - Checkpoint configuration (optional, uses state fields if not provided)
 * @returns Updated graph state with checkpoint result
 */
async function checkpointNodeImpl(
  state: GraphState,
  config: Partial<CheckpointNodeConfig> = {},
): Promise<Partial<GraphStateWithCheckpoint>> {
  // Extract config from state or use provided config
  const operation = config.operation || (state as any).operation || 'read'
  const filePath = config.filePath || (state as any).filePath
  const checkpoint = config.checkpoint || (state as any).checkpoint
  const partialUpdate = config.partialUpdate || (state as any).partialUpdate
  const fromPhase = config.fromPhase || (state as any).fromPhase
  const toPhase = config.toPhase || (state as any).toPhase
  const resumeFromPhase = config.resumeFromPhase || (state as any).resumeFromPhase

  if (!filePath) {
    return updateState({
      checkpoint: {
        success: false,
        error: 'filePath is required',
        filePath: '',
      },
    } as Partial<GraphStateWithCheckpoint>)
  }

  const adapter = new CheckpointAdapter()

  try {
    switch (operation) {
      case 'read': {
        const checkpointData = await adapter.read(filePath)

        // Handle resume-from logic
        if (resumeFromPhase && checkpointData.current_phase !== resumeFromPhase) {
          logger.info('Resuming from specific phase', {
            resumeFromPhase,
            currentPhase: checkpointData.current_phase,
          })
          // Update checkpoint to resume from specified phase
          await adapter.update(filePath, { current_phase: resumeFromPhase as Phase })
          const updatedCheckpoint = await adapter.read(filePath)

          return updateState({
            checkpoint: {
              success: true,
              checkpoint: updatedCheckpoint,
              filePath,
            },
          } as Partial<GraphStateWithCheckpoint>)
        }

        return updateState({
          checkpoint: {
            success: true,
            checkpoint: checkpointData,
            filePath,
          },
        } as Partial<GraphStateWithCheckpoint>)
      }

      case 'write': {
        if (!checkpoint) {
          return updateState({
            checkpoint: {
              success: false,
              error: 'checkpoint data is required for write operation',
              filePath,
            },
          } as Partial<GraphStateWithCheckpoint>)
        }
        await adapter.write(filePath, checkpoint as Checkpoint)
        return updateState({
          checkpoint: {
            success: true,
            filePath,
          },
        } as Partial<GraphStateWithCheckpoint>)
      }

      case 'update': {
        if (!partialUpdate) {
          return updateState({
            checkpoint: {
              success: false,
              error: 'partialUpdate is required for update operation',
              filePath,
            },
          } as Partial<GraphStateWithCheckpoint>)
        }
        await adapter.update(filePath, partialUpdate)
        return updateState({
          checkpoint: {
            success: true,
            filePath,
          },
        } as Partial<GraphStateWithCheckpoint>)
      }

      case 'advancePhase': {
        if (!fromPhase || !toPhase) {
          return updateState({
            checkpoint: {
              success: false,
              error: 'fromPhase and toPhase are required for advancePhase operation',
              filePath,
            },
          } as Partial<GraphStateWithCheckpoint>)
        }
        await adapter.advancePhase(filePath, fromPhase as Phase, toPhase as Phase)
        const updatedCheckpoint = await adapter.read(filePath)
        return updateState({
          checkpoint: {
            success: true,
            checkpoint: updatedCheckpoint,
            filePath,
          },
        } as Partial<GraphStateWithCheckpoint>)
      }

      default:
        return updateState({
          checkpoint: {
            success: false,
            error: `Unknown operation: ${operation}`,
            filePath,
          },
        } as Partial<GraphStateWithCheckpoint>)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('checkpoint node failed', { error: errorMessage, operation, filePath })

    return updateState({
      checkpoint: {
        success: false,
        error: errorMessage,
        filePath,
      },
    } as Partial<GraphStateWithCheckpoint>)
  }
}

/**
 * Checkpoint node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @example
 * ```typescript
 * import { checkpointNode } from './nodes/workflow/checkpoint-node.js'
 *
 * const result = await checkpointNode(state)
 * console.log(`Current phase: ${result.checkpoint?.checkpoint?.current_phase}`)
 * ```
 */
export const checkpointNode = createToolNode(
  'checkpoint',
  async (state: GraphState): Promise<Partial<GraphStateWithCheckpoint>> => {
    return checkpointNodeImpl(state, {})
  },
)

/**
 * Creates a checkpoint node with custom configuration.
 *
 * @param config - Checkpoint configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Read checkpoint
 * const readNode = createCheckpointNode({
 *   operation: 'read',
 *   filePath: '/path/to/CHECKPOINT.yaml',
 * })
 *
 * // Advance phase
 * const advanceNode = createCheckpointNode({
 *   operation: 'advancePhase',
 *   filePath: '/path/to/CHECKPOINT.yaml',
 *   fromPhase: 'plan',
 *   toPhase: 'execute',
 * })
 * ```
 */
export function createCheckpointNode(config: Partial<CheckpointNodeConfig> = {}) {
  return createToolNode(
    'checkpoint',
    async (state: GraphState): Promise<Partial<GraphStateWithCheckpoint>> => {
      return checkpointNodeImpl(state, config)
    },
  )
}
