/**
 * story-file-node.ts
 *
 * LangGraph node that wraps the StoryFileAdapter for orchestrated workflows.
 * Provides read, write, and update operations for story YAML files.
 *
 * LNGG-0080: Workflow Command Integration - Story File Node
 *
 * @module nodes/workflow/story-file-node
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { StoryFileAdapter } from '../../adapters/story-file-adapter.js'
import type { StoryArtifact } from '../../artifacts/story-v2-compatible.js'

/**
 * Schema for story-file-node configuration.
 */
export const StoryFileNodeConfigSchema = z.object({
  /** Operation to perform: read, write, update */
  operation: z.enum(['read', 'write', 'update']).default('read'),
  /** Path to the story file */
  filePath: z.string(),
  /** Story data for write operation */
  story: z.any().optional(),
  /** Partial update for update operation */
  partialUpdate: z.record(z.any()).optional(),
})

export type StoryFileNodeConfig = z.infer<typeof StoryFileNodeConfigSchema>

/**
 * Schema for story-file-node result.
 */
export const StoryFileNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** The story data (for read operations) */
  story: z.any().optional(),
  /** Error message if any */
  error: z.string().optional(),
  /** Path to the file */
  filePath: z.string(),
})

export type StoryFileNodeResult = z.infer<typeof StoryFileNodeResultSchema>

/**
 * Extended graph state with story-file result.
 */
export interface GraphStateWithStoryFile extends GraphState {
  /** Result of story-file operation */
  storyFile?: StoryFileNodeResult
}

/**
 * Story-file node implementation.
 *
 * Wraps StoryFileAdapter to provide LangGraph-compatible node interface.
 *
 * @param state - Current graph state
 * @param config - Story-file configuration (optional, uses state fields if not provided)
 * @returns Updated graph state with story-file result
 */
async function storyFileNodeImpl(
  state: GraphState,
  config: Partial<StoryFileNodeConfig> = {},
): Promise<Partial<GraphStateWithStoryFile>> {
  // Extract config from state or use provided config
  const operation = config.operation || (state as any).operation || 'read'
  const filePath = config.filePath || (state as any).filePath
  const story = config.story || (state as any).story
  const partialUpdate = config.partialUpdate || (state as any).partialUpdate

  if (!filePath) {
    return updateState({
      storyFile: {
        success: false,
        error: 'filePath is required',
        filePath: '',
      },
    } as Partial<GraphStateWithStoryFile>)
  }

  const adapter = new StoryFileAdapter()

  try {
    switch (operation) {
      case 'read': {
        const storyData = await adapter.read(filePath)
        return updateState({
          storyFile: {
            success: true,
            story: storyData,
            filePath,
          },
        } as Partial<GraphStateWithStoryFile>)
      }

      case 'write': {
        if (!story) {
          return updateState({
            storyFile: {
              success: false,
              error: 'story data is required for write operation',
              filePath,
            },
          } as Partial<GraphStateWithStoryFile>)
        }
        await adapter.write(filePath, story as StoryArtifact)
        return updateState({
          storyFile: {
            success: true,
            filePath,
          },
        } as Partial<GraphStateWithStoryFile>)
      }

      case 'update': {
        if (!partialUpdate) {
          return updateState({
            storyFile: {
              success: false,
              error: 'partialUpdate is required for update operation',
              filePath,
            },
          } as Partial<GraphStateWithStoryFile>)
        }
        await adapter.update(filePath, partialUpdate)
        return updateState({
          storyFile: {
            success: true,
            filePath,
          },
        } as Partial<GraphStateWithStoryFile>)
      }

      default:
        return updateState({
          storyFile: {
            success: false,
            error: `Unknown operation: ${operation}`,
            filePath,
          },
        } as Partial<GraphStateWithStoryFile>)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('story-file node failed', { error: errorMessage, operation, filePath })

    return updateState({
      storyFile: {
        success: false,
        error: errorMessage,
        filePath,
      },
    } as Partial<GraphStateWithStoryFile>)
  }
}

/**
 * Story-file node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a file I/O operation.
 *
 * @example
 * ```typescript
 * import { storyFileNode } from './nodes/workflow/story-file-node.js'
 *
 * const result = await storyFileNode(state)
 * console.log(`Story loaded: ${result.storyFile?.story?.id}`)
 * ```
 */
export const storyFileNode = createToolNode(
  'story_file',
  async (state: GraphState): Promise<Partial<GraphStateWithStoryFile>> => {
    return storyFileNodeImpl(state, {})
  },
)

/**
 * Creates a story-file node with custom configuration.
 *
 * @param config - Story-file configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Read story
 * const readNode = createStoryFileNode({
 *   operation: 'read',
 *   filePath: '/path/to/story.yaml',
 * })
 *
 * // Write story
 * const writeNode = createStoryFileNode({
 *   operation: 'write',
 *   filePath: '/path/to/story.yaml',
 *   story: storyArtifact,
 * })
 * ```
 */
export function createStoryFileNode(config: Partial<StoryFileNodeConfig> = {}) {
  return createToolNode(
    'story_file',
    async (state: GraphState): Promise<Partial<GraphStateWithStoryFile>> => {
      return storyFileNodeImpl(state, config)
    },
  )
}
