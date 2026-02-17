/**
 * index-node.ts
 *
 * LangGraph node that wraps the IndexAdapter for orchestrated workflows.
 * Provides add, update, remove, and validate operations for story index files.
 *
 * LNGG-0080: Workflow Command Integration - Index Node
 *
 * @module nodes/workflow/index-node
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { IndexAdapter } from '../../adapters/index-adapter.js'
import type { IndexStoryEntry } from '../../adapters/index-adapter.js'

/**
 * Schema for index-node configuration.
 */
export const IndexNodeConfigSchema = z.object({
  /** Operation to perform: add, update, remove, validate */
  operation: z.enum(['add', 'update', 'remove', 'validate']).default('validate'),
  /** Path to the index file */
  indexPath: z.string(),
  /** Story ID for update/remove operations */
  storyId: z.string().optional(),
  /** New status for update operation */
  status: z.string().optional(),
  /** Story entry for add operation */
  entry: z.any().optional(),
  /** Wave section for add operation */
  waveSection: z.string().optional(),
})

export type IndexNodeConfig = z.infer<typeof IndexNodeConfigSchema>

/**
 * Schema for index-node result.
 */
export const IndexNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** Updated metrics after operation */
  metrics: z.any().optional(),
  /** Validation result */
  validation: z.any().optional(),
  /** Error message if any */
  error: z.string().optional(),
  /** Path to the index file */
  indexPath: z.string(),
})

export type IndexNodeResult = z.infer<typeof IndexNodeResultSchema>

/**
 * Extended graph state with index result.
 */
export interface GraphStateWithIndex extends GraphState {
  /** Result of index operation */
  index?: IndexNodeResult
}

/**
 * Index node implementation.
 *
 * Wraps IndexAdapter to provide LangGraph-compatible node interface.
 *
 * @param state - Current graph state
 * @param config - Index configuration (optional, uses state fields if not provided)
 * @returns Updated graph state with index result
 */
async function indexNodeImpl(
  state: GraphState,
  config: Partial<IndexNodeConfig> = {},
): Promise<Partial<GraphStateWithIndex>> {
  // Extract config from state or use provided config
  const operation = config.operation || (state as any).operation || 'validate'
  const indexPath = config.indexPath || (state as any).indexPath
  const storyId = config.storyId || (state as any).storyId || state.storyId
  const status = config.status || (state as any).status
  const entry = config.entry || (state as any).entry
  const waveSection = config.waveSection || (state as any).waveSection

  if (!indexPath) {
    return updateState({
      index: {
        success: false,
        error: 'indexPath is required',
        indexPath: '',
      },
    } as Partial<GraphStateWithIndex>)
  }

  const adapter = new IndexAdapter()

  try {
    switch (operation) {
      case 'add': {
        if (!entry || !waveSection) {
          return updateState({
            index: {
              success: false,
              error: 'entry and waveSection are required for add operation',
              indexPath,
            },
          } as Partial<GraphStateWithIndex>)
        }
        await adapter.addStory(entry as IndexStoryEntry, waveSection, indexPath)

        // Recalculate metrics after add
        const index = await adapter.readIndex(indexPath)
        const metrics = adapter.recalculateMetrics(index)

        return updateState({
          index: {
            success: true,
            metrics,
            indexPath,
          },
        } as Partial<GraphStateWithIndex>)
      }

      case 'update': {
        if (!storyId || !status) {
          return updateState({
            index: {
              success: false,
              error: 'storyId and status are required for update operation',
              indexPath,
            },
          } as Partial<GraphStateWithIndex>)
        }
        await adapter.updateStoryStatus(storyId, status as any, indexPath)

        // Recalculate metrics after update
        const index = await adapter.readIndex(indexPath)
        const metrics = adapter.recalculateMetrics(index)

        return updateState({
          index: {
            success: true,
            metrics,
            indexPath,
          },
        } as Partial<GraphStateWithIndex>)
      }

      case 'remove': {
        if (!storyId) {
          return updateState({
            index: {
              success: false,
              error: 'storyId is required for remove operation',
              indexPath,
            },
          } as Partial<GraphStateWithIndex>)
        }
        await adapter.removeStory(storyId, indexPath)

        // Recalculate metrics after remove
        const index = await adapter.readIndex(indexPath)
        const metrics = adapter.recalculateMetrics(index)

        return updateState({
          index: {
            success: true,
            metrics,
            indexPath,
          },
        } as Partial<GraphStateWithIndex>)
      }

      case 'validate': {
        const index = await adapter.readIndex(indexPath)
        const validation = adapter.validate(index)
        const metrics = adapter.recalculateMetrics(index)

        return updateState({
          index: {
            success: validation.valid,
            validation,
            metrics,
            indexPath,
          },
        } as Partial<GraphStateWithIndex>)
      }

      default:
        return updateState({
          index: {
            success: false,
            error: `Unknown operation: ${operation}`,
            indexPath,
          },
        } as Partial<GraphStateWithIndex>)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('index node failed', { error: errorMessage, operation, indexPath })

    return updateState({
      index: {
        success: false,
        error: errorMessage,
        indexPath,
      },
    } as Partial<GraphStateWithIndex>)
  }
}

/**
 * Index node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @example
 * ```typescript
 * import { indexNode } from './nodes/workflow/index-node.js'
 *
 * const result = await indexNode(state)
 * console.log(`Validation: ${result.index?.validation?.valid}`)
 * ```
 */
export const indexNode = createToolNode(
  'index',
  async (state: GraphState): Promise<Partial<GraphStateWithIndex>> => {
    return indexNodeImpl(state, {})
  },
)

/**
 * Creates an index node with custom configuration.
 *
 * @param config - Index configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Validate index
 * const validateNode = createIndexNode({
 *   operation: 'validate',
 *   indexPath: '/path/to/index.md',
 * })
 *
 * // Update story status
 * const updateNode = createIndexNode({
 *   operation: 'update',
 *   indexPath: '/path/to/index.md',
 *   storyId: 'LNGG-0080',
 *   status: 'completed',
 * })
 * ```
 */
export function createIndexNode(config: Partial<IndexNodeConfig> = {}) {
  return createToolNode(
    'index',
    async (state: GraphState): Promise<Partial<GraphStateWithIndex>> => {
      return indexNodeImpl(state, config)
    },
  )
}
