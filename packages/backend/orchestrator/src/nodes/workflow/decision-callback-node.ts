/**
 * decision-callback-node.ts
 *
 * LangGraph node that wraps the DecisionCallback system for orchestrated workflows.
 * Provides interactive and automated decision-making during workflow execution.
 *
 * LNGG-0080: Workflow Command Integration - Decision Callback Node
 *
 * @module nodes/workflow/decision-callback-node
 */

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { DecisionCallbackRegistry } from '../../adapters/decision-callbacks/registry.js'
import type {
  DecisionRequest,
  DecisionResponse,
  DecisionOption,
} from '../../adapters/decision-callbacks/types.js'

/**
 * Schema for decision-callback-node configuration.
 */
export const DecisionCallbackNodeConfigSchema = z.object({
  /** Callback mode: cli, auto, noop */
  mode: z.enum(['cli', 'auto', 'noop']).default('cli'),
  /** Question text */
  question: z.string(),
  /** Decision options */
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().optional(),
      recommended: z.boolean().optional(),
    }),
  ),
  /** Question type */
  type: z.enum(['single-choice', 'multi-select', 'text-input']).default('single-choice'),
  /** Timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(30000),
  /** Context for auto-decision rules */
  context: z.record(z.unknown()).optional(),
})

export type DecisionCallbackNodeConfig = z.infer<typeof DecisionCallbackNodeConfigSchema>

/**
 * Schema for decision-callback-node result.
 */
export const DecisionCallbackNodeResultSchema = z.object({
  /** Whether operation was successful */
  success: z.boolean(),
  /** The decision made */
  decision: z.union([z.string(), z.array(z.string())]).optional(),
  /** Whether decision was cancelled */
  cancelled: z.boolean().default(false),
  /** Whether decision timed out */
  timedOut: z.boolean().default(false),
  /** Error message if any */
  error: z.string().optional(),
})

export type DecisionCallbackNodeResult = z.infer<typeof DecisionCallbackNodeResultSchema>

/**
 * Extended graph state with decision-callback result.
 */
export interface GraphStateWithDecisionCallback extends GraphState {
  /** Result of decision-callback operation */
  decision?: DecisionCallbackNodeResult
}

/**
 * Decision-callback node implementation.
 *
 * Wraps DecisionCallbackRegistry to provide LangGraph-compatible node interface.
 *
 * @param state - Current graph state
 * @param config - Decision-callback configuration
 * @returns Updated graph state with decision result
 */
async function decisionCallbackNodeImpl(
  state: GraphState,
  config: Partial<DecisionCallbackNodeConfig> = {},
): Promise<Partial<GraphStateWithDecisionCallback>> {
  // Extract config from state or use provided config
  const mode = config.mode || (state as any).mode || 'cli'
  const question = config.question || (state as any).question
  const options = config.options || (state as any).options
  const type = config.type || (state as any).type || 'single-choice'
  const timeoutMs = config.timeoutMs || (state as any).timeoutMs || 30000
  const context = config.context || (state as any).context || {}

  if (!question || !options || options.length === 0) {
    return updateState({
      decision: {
        success: false,
        error: 'question and options are required',
      },
    } as Partial<GraphStateWithDecisionCallback>)
  }

  try {
    // Get callback instance from registry
    const registry = DecisionCallbackRegistry.getInstance()
    const callback = registry.get(mode)

    // Create decision request
    const request: DecisionRequest = {
      id: randomUUID(),
      type,
      question,
      options: options as DecisionOption[],
      context,
      timeout_ms: timeoutMs,
    }

    // Ask for decision
    const response: DecisionResponse = await callback.ask(request)

    // Log decision
    logger.info('Decision made', {
      mode,
      question,
      decision: response.answer,
      cancelled: response.cancelled,
      timedOut: response.timedOut,
    })

    return updateState({
      decision: {
        success: !response.cancelled && !response.timedOut,
        decision: response.answer,
        cancelled: response.cancelled,
        timedOut: response.timedOut,
      },
    } as Partial<GraphStateWithDecisionCallback>)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('decision-callback node failed', { error: errorMessage, mode, question })

    return updateState({
      decision: {
        success: false,
        error: errorMessage,
      },
    } as Partial<GraphStateWithDecisionCallback>)
  }
}

/**
 * Decision-callback node - default configuration.
 *
 * Uses tool preset (lower retries, shorter timeout) since this is a user interaction.
 *
 * @example
 * ```typescript
 * import { decisionCallbackNode } from './nodes/workflow/decision-callback-node.js'
 *
 * const result = await decisionCallbackNode(state)
 * console.log(`Decision: ${result.decision?.decision}`)
 * ```
 */
export const decisionCallbackNode = createToolNode(
  'decision_callback',
  async (state: GraphState): Promise<Partial<GraphStateWithDecisionCallback>> => {
    return decisionCallbackNodeImpl(state, {})
  },
)

/**
 * Creates a decision-callback node with custom configuration.
 *
 * @param config - Decision-callback configuration
 * @returns Configured node function
 *
 * @example
 * ```typescript
 * // CLI mode
 * const cliNode = createDecisionCallbackNode({
 *   mode: 'cli',
 *   question: 'Proceed with deployment?',
 *   options: [
 *     { value: 'yes', label: 'Yes, deploy now' },
 *     { value: 'no', label: 'No, cancel' },
 *   ],
 * })
 *
 * // Auto mode
 * const autoNode = createDecisionCallbackNode({
 *   mode: 'auto',
 *   question: 'Select retry strategy',
 *   options: [
 *     { value: 'exponential', label: 'Exponential backoff', recommended: true },
 *     { value: 'linear', label: 'Linear backoff' },
 *   ],
 * })
 * ```
 */
export function createDecisionCallbackNode(config: Partial<DecisionCallbackNodeConfig> = {}) {
  return createToolNode(
    'decision_callback',
    async (state: GraphState): Promise<Partial<GraphStateWithDecisionCallback>> => {
      return decisionCallbackNodeImpl(state, config)
    },
  )
}
