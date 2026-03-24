/**
 * log-invocation LangGraph Node
 *
 * Fire-and-continue node for recording agent invocations via the
 * workflow_log_invocation MCP tool (injected via adapter).
 *
 * Contract: adapter failures NEVER propagate as graph errors.
 * On any error (network, Zod, adapter throw), logs a warning and returns state.
 *
 * AC-1, AC-4, AC-5, AC-6, AC-13
 *
 * Story: WINT-9100
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { mapArtifactPhaseToMcpPhase } from '@repo/workflow-logic'

// ============================================================================
// Adapter Types (AC-13: injectable — no direct MCP client imports)
// ============================================================================

/**
 * Injectable adapter for the workflow_log_invocation MCP tool.
 * Default: no-op returning an empty invocationId.
 */
export type InvocationLoggerFn = (input: {
  agentName: string
  storyId?: string
  phase?: 'setup' | 'plan' | 'execute' | 'review' | 'qa'
  status: 'success' | 'failure' | 'partial'
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  modelName?: string
}) => Promise<{ invocationId: string }>

// ============================================================================
// State Extension (AC-6)
// Extends GraphState with telemetry input fields (for all three nodes)
// and telemetry output fields.
// ============================================================================

/**
 * Extended graph state with telemetry input/output fields.
 * All telemetry fields are optional — base GraphState fields are always present.
 */
export interface GraphStateWithTelemetry extends GraphState {
  // Inputs for log-invocation
  agentName?: string
  /** Accepts ArtifactPhase or MCP phase string — node will map if needed */
  phase?: string
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
  modelName?: string
  status?: 'success' | 'failure' | 'partial'
  // Inputs for log-outcome
  verdict?: 'pass' | 'fail' | 'blocked' | 'cancelled'
  totalInputTokens?: number
  totalOutputTokens?: number
  qualityScore?: number
  primaryBlocker?: string
  // Outputs
  invocationId?: string | null
  outcomeLogged?: boolean
  tokensLogged?: boolean
}

// ============================================================================
// Input Schema (AC-5: Zod-first — no TypeScript interfaces for data shapes)
// ============================================================================

export const LogInvocationInputSchema = z.object({
  storyId: z.string().min(1),
  agentName: z.string().min(1),
  phase: z.string().optional(),
  status: z.enum(['success', 'failure', 'partial']),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  modelName: z.string().optional(),
})

export type LogInvocationInput = z.infer<typeof LogInvocationInputSchema>

// ============================================================================
// Default No-Op Adapter
// ============================================================================

export const defaultInvocationLoggerFn: InvocationLoggerFn = async _input => ({
  invocationId: '',
})

// ============================================================================
// Node Factory (AC-4: createToolNode)
// ============================================================================

/**
 * Creates the log-invocation telemetry node.
 *
 * Reads invocation fields from state, calls the injected InvocationLoggerFn adapter,
 * and returns a state update with invocationId.
 *
 * Fire-and-continue: adapter failures never propagate as graph errors.
 *
 * @param config - Optional adapter injection config
 * @returns LangGraph-compatible node function
 */
export function createLogInvocationNode(config: { adapter?: InvocationLoggerFn } = {}) {
  const adapter = config.adapter ?? defaultInvocationLoggerFn

  return createToolNode(
    'log_invocation',
    async (state: GraphState): Promise<Partial<GraphStateWithTelemetry>> => {
      const telemetryState = state as GraphStateWithTelemetry
      try {
        const input = LogInvocationInputSchema.parse({
          storyId: telemetryState.storyId,
          agentName: telemetryState.agentName,
          phase: telemetryState.phase,
          status: telemetryState.status,
          inputTokens: telemetryState.inputTokens,
          outputTokens: telemetryState.outputTokens,
          durationMs: telemetryState.durationMs,
          modelName: telemetryState.modelName,
        })

        const mcpPhase = mapArtifactPhaseToMcpPhase(input.phase)

        const result = await adapter({
          agentName: input.agentName,
          storyId: input.storyId,
          phase: mcpPhase,
          status: input.status,
          inputTokens: input.inputTokens,
          outputTokens: input.outputTokens,
          durationMs: input.durationMs,
          modelName: input.modelName,
        })

        return updateState({
          invocationId: result.invocationId,
        } as Partial<GraphStateWithTelemetry>)
      } catch (err) {
        logger.warn('log_invocation: failed — continuing', {
          err: err instanceof Error ? err.message : String(err),
          storyId: state.storyId,
        })
        return {}
      }
    },
  )
}
