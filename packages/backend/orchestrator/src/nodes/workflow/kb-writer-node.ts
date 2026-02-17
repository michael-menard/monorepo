/**
 * kb-writer-node.ts
 *
 * LangGraph node that wraps the KBWriterAdapter for orchestrated workflows.
 * Provides non-blocking KB write operations for lessons, decisions, and constraints.
 *
 * LNGG-0080: Workflow Command Integration - KB Writer Node
 *
 * @module nodes/workflow/kb-writer-node
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { createKbWriter } from '../../adapters/kb-writer/factory.js'
import type {
  KbLessonRequest,
  KbDecisionRequest,
  KbConstraintRequest,
  KbWriteRequest,
} from '../../adapters/kb-writer/__types__/index.js'

/**
 * Schema for kb-writer-node configuration.
 */
export const KBWriterNodeConfigSchema = z.object({
  /** Operation to perform: addLesson, addDecision, addConstraint, addMany */
  operation: z.enum(['addLesson', 'addDecision', 'addConstraint', 'addMany']).default('addLesson'),
  /** Lesson request data */
  lessonRequest: z.any().optional(),
  /** Decision request data */
  decisionRequest: z.any().optional(),
  /** Constraint request data */
  constraintRequest: z.any().optional(),
  /** Batch write requests */
  batchRequests: z.array(z.any()).optional(),
  /** Mock mode (for testing) */
  mockMode: z.boolean().default(false),
  /** KB dependencies (optional - uses no-op writer if missing) */
  kbDeps: z.any().optional(),
})

export type KBWriterNodeConfig = z.infer<typeof KBWriterNodeConfigSchema>

/**
 * Schema for kb-writer-node result.
 */
export const KBWriterNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** Number of entries written */
  entriesWritten: z.number().int().nonnegative().default(0),
  /** Number of entries deferred */
  entriesDeferred: z.number().int().nonnegative().default(0),
  /** Error message if any (non-blocking) */
  error: z.string().optional(),
  /** Deferred write log path */
  deferredLogPath: z.string().optional(),
})

export type KBWriterNodeResult = z.infer<typeof KBWriterNodeResultSchema>

/**
 * Extended graph state with kb-writer result.
 */
export interface GraphStateWithKBWriter extends GraphState {
  /** Result of kb-writer operation */
  kbWriter?: KBWriterNodeResult
}

/**
 * KB writer node implementation.
 *
 * Wraps KBWriterAdapter to provide LangGraph-compatible node interface.
 * Non-blocking: failures are logged but don't block workflow execution.
 *
 * @param state - Current graph state
 * @param config - KB writer configuration
 * @returns Updated graph state with kb-writer result
 */
async function kbWriterNodeImpl(
  state: GraphState,
  config: Partial<KBWriterNodeConfig> = {},
): Promise<Partial<GraphStateWithKBWriter>> {
  // Extract config from state or use provided config
  const operation = config.operation || (state as any).operation || 'addLesson'
  const lessonRequest = config.lessonRequest || (state as any).lessonRequest
  const decisionRequest = config.decisionRequest || (state as any).decisionRequest
  const constraintRequest = config.constraintRequest || (state as any).constraintRequest
  const batchRequests = config.batchRequests || (state as any).batchRequests
  const mockMode = config.mockMode || (state as any).mockMode || false
  const kbDeps = config.kbDeps || (state as any).kbDeps

  try {
    // Create KB writer (no-op if kbDeps missing or mockMode enabled)
    const writer =
      mockMode || !kbDeps ? createKbWriter({ kbDeps: undefined }) : createKbWriter({ kbDeps })

    switch (operation) {
      case 'addLesson': {
        if (!lessonRequest) {
          logger.warn('KB write skipped: lessonRequest is required for addLesson operation')
          return updateState({
            kbWriter: {
              success: true, // Non-blocking
              entriesWritten: 0,
              entriesDeferred: 1,
            },
          } as Partial<GraphStateWithKBWriter>)
        }
        const result = await writer.addLesson(lessonRequest as KbLessonRequest)
        return updateState({
          kbWriter: {
            success: result.success,
            entriesWritten: result.success ? 1 : 0,
            entriesDeferred: result.success ? 0 : 1,
          },
        } as Partial<GraphStateWithKBWriter>)
      }

      case 'addDecision': {
        if (!decisionRequest) {
          logger.warn('KB write skipped: decisionRequest is required for addDecision operation')
          return updateState({
            kbWriter: {
              success: true, // Non-blocking
              entriesWritten: 0,
              entriesDeferred: 1,
            },
          } as Partial<GraphStateWithKBWriter>)
        }
        const result = await writer.addDecision(decisionRequest as KbDecisionRequest)
        return updateState({
          kbWriter: {
            success: result.success,
            entriesWritten: result.success ? 1 : 0,
            entriesDeferred: result.success ? 0 : 1,
          },
        } as Partial<GraphStateWithKBWriter>)
      }

      case 'addConstraint': {
        if (!constraintRequest) {
          logger.warn('KB write skipped: constraintRequest is required for addConstraint operation')
          return updateState({
            kbWriter: {
              success: true, // Non-blocking
              entriesWritten: 0,
              entriesDeferred: 1,
            },
          } as Partial<GraphStateWithKBWriter>)
        }
        const result = await writer.addConstraint(constraintRequest as KbConstraintRequest)
        return updateState({
          kbWriter: {
            success: result.success,
            entriesWritten: result.success ? 1 : 0,
            entriesDeferred: result.success ? 0 : 1,
          },
        } as Partial<GraphStateWithKBWriter>)
      }

      case 'addMany': {
        if (!batchRequests || batchRequests.length === 0) {
          logger.warn('KB write skipped: batchRequests is required for addMany operation')
          return updateState({
            kbWriter: {
              success: true, // Non-blocking
              entriesWritten: 0,
              entriesDeferred: 0,
            },
          } as Partial<GraphStateWithKBWriter>)
        }
        const result = await writer.addMany(batchRequests as KbWriteRequest[])
        return updateState({
          kbWriter: {
            success: result.successCount > 0 || result.errorCount === 0,
            entriesWritten: result.successCount,
            entriesDeferred: result.errorCount,
          },
        } as Partial<GraphStateWithKBWriter>)
      }

      default:
        logger.warn(`Unknown KB writer operation: ${operation}`)
        return updateState({
          kbWriter: {
            success: true, // Non-blocking
            entriesWritten: 0,
            entriesDeferred: 0,
            error: `Unknown operation: ${operation}`,
          },
        } as Partial<GraphStateWithKBWriter>)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // KB writer is non-blocking: log error but return success=true
    logger.warn('KB write failed (non-blocking)', { error: errorMessage, operation })

    return updateState({
      kbWriter: {
        success: true, // Non-blocking
        entriesWritten: 0,
        entriesDeferred: 1,
        error: errorMessage,
      },
    } as Partial<GraphStateWithKBWriter>)
  }
}

/**
 * KB writer node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a database operation.
 *
 * @example
 * ```typescript
 * import { kbWriterNode } from './nodes/workflow/kb-writer-node.js'
 *
 * const result = await kbWriterNode(state)
 * console.log(`Entries written: ${result.kbWriter?.entriesWritten}`)
 * ```
 */
export const kbWriterNode = createToolNode(
  'kb_writer',
  async (state: GraphState): Promise<Partial<GraphStateWithKBWriter>> => {
    return kbWriterNodeImpl(state, {})
  },
)

/**
 * Creates a kb-writer node with custom configuration.
 *
 * @param config - KB writer configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // Add lesson
 * const lessonNode = createKBWriterNode({
 *   operation: 'addLesson',
 *   lessonRequest: {
 *     content: 'Always validate input',
 *     storyId: 'LNGG-0080',
 *     severity: 'high',
 *   },
 * })
 *
 * // Add decision
 * const decisionNode = createKBWriterNode({
 *   operation: 'addDecision',
 *   decisionRequest: {
 *     content: 'Use Zod for runtime validation',
 *     storyId: 'LNGG-0080',
 *     rationale: 'Type safety at runtime',
 *   },
 * })
 * ```
 */
export function createKBWriterNode(config: Partial<KBWriterNodeConfig> = {}) {
  return createToolNode(
    'kb_writer',
    async (state: GraphState): Promise<Partial<GraphStateWithKBWriter>> => {
      return kbWriterNodeImpl(state, config)
    },
  )
}
