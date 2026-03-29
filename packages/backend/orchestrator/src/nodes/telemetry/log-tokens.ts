/**
 * log-tokens LangGraph Node
 *
 * Fire-and-continue node for recording token usage via the
 * kb_log_tokens MCP tool (injected via adapter).
 *
 * Contract: adapter failures NEVER propagate as graph errors.
 *
 * AC-3, AC-4, AC-5, AC-6, AC-13
 *
 * Story: WINT-9100
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { GraphStateWithTelemetry } from './log-invocation.js'

// ============================================================================
// Adapter Types (AC-13: injectable — no direct MCP client imports)
// ============================================================================

/**
 * Injectable adapter for the kb_log_tokens MCP tool.
 * Default: no-op returning logged: false.
 */
export type TokenLoggerFn = (input: {
  story_id: string
  input_tokens: number
  output_tokens: number
  phase?: string
  agent?: string
}) => Promise<{ logged: boolean }>

// ============================================================================
// Input Schema (AC-5: Zod-first)
// ============================================================================

export const LogTokensInputSchema = z.object({
  storyId: z.string().min(1),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  phase: z.string().optional(),
  agentName: z.string().optional(),
})

export type LogTokensInput = z.infer<typeof LogTokensInputSchema>

// ============================================================================
// Default No-Op Adapter
// ============================================================================

export const defaultTokenLoggerFn: TokenLoggerFn = async _input => ({ logged: false })

// ============================================================================
// Node Factory (AC-4: createToolNode)
// ============================================================================

/**
 * Creates the log-tokens telemetry node.
 *
 * Accumulates token usage from state (inputTokens + outputTokens) and calls
 * the injected TokenLoggerFn adapter.
 *
 * Fire-and-continue: adapter failures never propagate as graph errors.
 * Zero token counts are valid and written without guard.
 *
 * @param config - Optional adapter injection config
 * @returns LangGraph-compatible node function
 */
export function createLogTokensNode(config: { adapter?: TokenLoggerFn } = {}) {
  const adapter = config.adapter ?? defaultTokenLoggerFn

  return createToolNode(
    'log_tokens',
    async (state: GraphState): Promise<Partial<GraphStateWithTelemetry>> => {
      const telemetryState = state as GraphStateWithTelemetry
      try {
        const input = LogTokensInputSchema.parse({
          storyId: telemetryState.storyId,
          inputTokens: telemetryState.inputTokens ?? 0,
          outputTokens: telemetryState.outputTokens ?? 0,
          phase: telemetryState.phase,
          agentName: telemetryState.agentName,
        })

        await adapter({
          story_id: input.storyId,
          input_tokens: input.inputTokens,
          output_tokens: input.outputTokens,
          phase: input.phase,
          agent: input.agentName,
        })

        return updateState({ tokensLogged: true } as Partial<GraphStateWithTelemetry>)
      } catch (err) {
        logger.warn('log_tokens: failed — continuing', {
          err: err instanceof Error ? err.message : String(err),
          storyId: state.storyId,
        })
        return {}
      }
    },
  )
}
