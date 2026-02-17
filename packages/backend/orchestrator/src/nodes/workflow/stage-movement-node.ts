/**
 * stage-movement-node.ts
 *
 * LangGraph node that wraps the StageMovementAdapter for orchestrated workflows.
 * Provides atomic stage movement operations with rollback support.
 *
 * LNGG-0080: Workflow Command Integration - Stage Movement Node
 *
 * @module nodes/workflow/stage-movement-node
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { StageMovementAdapter } from '../../adapters/stage-movement-adapter.js'
import type { MoveStageRequest } from '../../adapters/__types__/stage-types.js'

/**
 * Schema for stage-movement-node configuration.
 */
export const StageMovementNodeConfigSchema = z.object({
  /** Story ID to move */
  storyId: z.string(),
  /** Feature directory */
  featureDir: z.string(),
  /** Target stage */
  toStage: z.string(),
  /** Source stage (optional, will be detected if not provided) */
  fromStage: z.string().optional(),
})

export type StageMovementNodeConfig = z.infer<typeof StageMovementNodeConfigSchema>

/**
 * Schema for stage-movement-node result.
 */
export const StageMovementNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** Source stage */
  fromStage: z.string().optional(),
  /** Target stage */
  toStage: z.string().optional(),
  /** Story ID */
  storyId: z.string(),
  /** Error message if any */
  error: z.string().optional(),
})

export type StageMovementNodeResult = z.infer<typeof StageMovementNodeResultSchema>

/**
 * Extended graph state with stage-movement result.
 */
export interface GraphStateWithStageMovement extends GraphState {
  /** Result of stage-movement operation */
  stageMovement?: StageMovementNodeResult
}

/**
 * Stage-movement node implementation.
 *
 * Wraps StageMovementAdapter to provide LangGraph-compatible node interface.
 *
 * @param state - Current graph state
 * @param config - Stage-movement configuration (optional, uses state fields if not provided)
 * @returns Updated graph state with stage-movement result
 */
async function stageMovementNodeImpl(
  state: GraphState,
  config: Partial<StageMovementNodeConfig> = {},
): Promise<Partial<GraphStateWithStageMovement>> {
  // Extract config from state or use provided config
  const storyId = config.storyId || (state as any).storyId || state.storyId
  const featureDir = config.featureDir || (state as any).featureDir
  const toStage = config.toStage || (state as any).toStage
  const fromStage = config.fromStage || (state as any).fromStage

  if (!storyId || !featureDir || !toStage) {
    return updateState({
      stageMovement: {
        success: false,
        error: 'storyId, featureDir, and toStage are required',
        storyId: storyId || '',
      },
    } as Partial<GraphStateWithStageMovement>)
  }

  const adapter = new StageMovementAdapter()

  try {
    const request: MoveStageRequest = {
      storyId,
      featureDir,
      toStage: toStage as any,
      fromStage: fromStage as any,
    }

    const result = await adapter.moveStage(request)

    return updateState({
      stageMovement: {
        success: true,
        fromStage: result.fromStage,
        toStage: result.toStage,
        storyId,
      },
    } as Partial<GraphStateWithStageMovement>)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('stage-movement node failed', { error: errorMessage, storyId, toStage })

    return updateState({
      stageMovement: {
        success: false,
        error: errorMessage,
        storyId,
        toStage,
      },
    } as Partial<GraphStateWithStageMovement>)
  }
}

/**
 * Stage-movement node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @example
 * ```typescript
 * import { stageMovementNode } from './nodes/workflow/stage-movement-node.js'
 *
 * const result = await stageMovementNode(state)
 * console.log(`Moved from ${result.stageMovement?.fromStage} to ${result.stageMovement?.toStage}`)
 * ```
 */
export const stageMovementNode = createToolNode(
  'stage_movement',
  async (state: GraphState): Promise<Partial<GraphStateWithStageMovement>> => {
    return stageMovementNodeImpl(state, {})
  },
)

/**
 * Creates a stage-movement node with custom configuration.
 *
 * @param config - Stage-movement configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Move to ready-for-qa
 * const qaNode = createStageMovementNode({
 *   storyId: 'LNGG-0080',
 *   featureDir: '/path/to/feature',
 *   toStage: 'ready-for-qa',
 * })
 * ```
 */
export function createStageMovementNode(config: Partial<StageMovementNodeConfig> = {}) {
  return createToolNode(
    'stage_movement',
    async (state: GraphState): Promise<Partial<GraphStateWithStageMovement>> => {
      return stageMovementNodeImpl(state, config)
    },
  )
}
