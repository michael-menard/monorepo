/**
 * log-outcome LangGraph Node
 *
 * Fire-and-continue node for recording story outcomes via the
 * workflow_log_outcome MCP tool (injected via adapter).
 *
 * Contract: adapter failures NEVER propagate as graph errors.
 *
 * AC-2, AC-4, AC-5, AC-6, AC-13
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
 * Injectable adapter for the workflow_log_outcome MCP tool.
 * Default: no-op returning logged: false.
 */
export type OutcomeLoggerFn = (input: {
  story_id: string
  final_verdict: 'pass' | 'fail' | 'blocked' | 'cancelled'
  quality_score?: number
  total_input_tokens?: number
  total_output_tokens?: number
  duration_ms?: number
  primary_blocker?: string
}) => Promise<{ logged: boolean }>

// ============================================================================
// Input Schema (AC-5: Zod-first)
// ============================================================================

export const LogOutcomeInputSchema = z.object({
  storyId: z.string().min(1),
  verdict: z.enum(['pass', 'fail', 'blocked', 'cancelled']),
  qualityScore: z.number().int().min(0).max(100).optional(),
  totalInputTokens: z.number().int().nonnegative().optional(),
  totalOutputTokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  primaryBlocker: z.string().optional(),
})

export type LogOutcomeInput = z.infer<typeof LogOutcomeInputSchema>

// ============================================================================
// Default No-Op Adapter
// ============================================================================

export const defaultOutcomeLoggerFn: OutcomeLoggerFn = async _input => ({ logged: false })

// ============================================================================
// Node Factory (AC-4: createToolNode)
// ============================================================================

/**
 * Creates the log-outcome telemetry node.
 *
 * Reads final verdict, token totals, quality score, duration, and primary
 * blocker from state, calls the injected OutcomeLoggerFn adapter.
 *
 * Fire-and-continue: adapter failures never propagate as graph errors.
 *
 * @param config - Optional adapter injection config
 * @returns LangGraph-compatible node function
 */
export function createLogOutcomeNode(config: { adapter?: OutcomeLoggerFn } = {}) {
  const adapter = config.adapter ?? defaultOutcomeLoggerFn

  return createToolNode(
    'log_outcome',
    async (state: GraphState): Promise<Partial<GraphStateWithTelemetry>> => {
      const telemetryState = state as GraphStateWithTelemetry
      try {
        const input = LogOutcomeInputSchema.parse({
          storyId: telemetryState.storyId,
          verdict: telemetryState.verdict,
          qualityScore: telemetryState.qualityScore,
          totalInputTokens: telemetryState.totalInputTokens,
          totalOutputTokens: telemetryState.totalOutputTokens,
          durationMs: telemetryState.durationMs,
          primaryBlocker: telemetryState.primaryBlocker,
        })

        await adapter({
          story_id: input.storyId,
          final_verdict: input.verdict,
          quality_score: input.qualityScore,
          total_input_tokens: input.totalInputTokens,
          total_output_tokens: input.totalOutputTokens,
          duration_ms: input.durationMs,
          primary_blocker: input.primaryBlocker,
        })

        return updateState({ outcomeLogged: true } as Partial<GraphStateWithTelemetry>)
      } catch (err) {
        logger.warn('log_outcome: failed — continuing', {
          err: err instanceof Error ? err.message : String(err),
          storyId: state.storyId,
        })
        return {}
      }
    },
  )
}
