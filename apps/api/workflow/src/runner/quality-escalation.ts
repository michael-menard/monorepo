/**
 * Quality-based escalation chain: Sonnet → Opus → human.
 *
 * APRS-1060: Implements three-level quality-based escalation triggered when
 * an LLM node exhausts retries (NodeRetryExhaustedError). This is distinct
 * from the provider-availability escalation chain in model-router.ts.
 *
 * AC-GAP1: Triggered exclusively by NodeRetryExhaustedError
 * AC-GAP2: Human tier sets blocked + KB note, no interactive prompt
 * AC-GAP3: Budget guard before Opus (BudgetAccumulator.checkBudget)
 * AC-DEC2: Chain always starts from Sonnet regardless of original model
 * AC-DEC4: Structured telemetry at each escalation step
 * AC-2: withQualityEscalation composable wrapper
 * AC-3: Sonnet retry exhaustion → budget check → Opus invocation
 * AC-4: Opus exhaustion or budget insufficient → human tier
 * AC-5: Budget guard skips Opus with distinct blocked_reason
 */

import { z } from 'zod'
import { createLogger } from '@repo/logger'
import type { GraphState } from '../state/index.js'
import type { BudgetAccumulator } from '../pipeline/budget-accumulator.js'
import { BudgetExhaustedError } from '../pipeline/__types__/index.js'
import { NodeRetryExhaustedError } from './errors.js'
import { createBlockedUpdate, type StateUpdate } from './state-helpers.js'
import type { NodeFunction } from './node-factory.js'

const logger = createLogger('orchestrator:quality-escalation')

// ============================================================================
// Schemas & Types
// ============================================================================

/**
 * Configuration for the quality escalation chain.
 * AC-2: Composable with createNode/createLLMNode without modifying signatures.
 */
export const QualityEscalationConfigSchema = z.object({
  /** Estimated tokens for an Opus call (for budget check) */
  estimatedOpusTokens: z.number().int().positive().default(50000),
  /** Hard budget cap for the story */
  hardBudgetCap: z.number().int().positive().default(500000),
})

export type QualityEscalationConfig = z.infer<typeof QualityEscalationConfigSchema>

/**
 * Schema for withQualityEscalation options.
 * AC-2: Accepts sonnetNodeFn, opusNodeFn, and optional budget/KB callbacks.
 * Note: Functions and class instances use z.any() (same pattern as NodeConfigSchema).
 */
export const QualityEscalationOptionsSchema = z.object({
  sonnetNodeFn: z.any(),
  opusNodeFn: z.any(),
  budgetAccumulator: z.any().optional(),
  onHumanEscalation: z.any().optional(),
  config: QualityEscalationConfigSchema.partial().optional(),
})

export type QualityEscalationOptions = Omit<
  z.infer<typeof QualityEscalationOptionsSchema>,
  'sonnetNodeFn' | 'opusNodeFn' | 'budgetAccumulator' | 'onHumanEscalation'
> & {
  sonnetNodeFn: NodeFunction
  opusNodeFn: NodeFunction
  budgetAccumulator?: BudgetAccumulator
  onHumanEscalation?: (context: HumanEscalationContext) => Promise<void>
}

/**
 * Context passed to the human escalation callback.
 * AC-GAP2: Structured context for KB note.
 */
export const HumanEscalationContextSchema = z.object({
  storyId: z.string().min(1),
  nodeName: z.string().min(1),
  modelsTried: z.array(z.string()),
  lastError: z.any(),
  reason: z.enum(['escalation_chain_exhausted', 'escalation_skipped_budget_exhausted']),
})

export type HumanEscalationContext = Omit<
  z.infer<typeof HumanEscalationContextSchema>,
  'lastError'
> & {
  lastError: Error
}

/**
 * Result of an escalation attempt.
 */
export const EscalationResultSchema = z.object({
  stateUpdate: z.any(),
  resolvedTier: z.enum(['sonnet', 'opus']),
  escalationSteps: z.number().int().min(0),
})

export type EscalationResult = Omit<z.infer<typeof EscalationResultSchema>, 'stateUpdate'> & {
  stateUpdate: StateUpdate
}

// ============================================================================
// Telemetry (AC-DEC4)
// ============================================================================

function logEscalationStep(params: {
  event: string
  fromModel: string
  toModel: string
  reason: string
  storyId: string
  nodeName: string
  attemptCount: number
}): void {
  logger.info('escalation_step', {
    event: 'escalation_step',
    from_model: params.fromModel,
    to_model: params.toModel,
    reason: params.reason,
    story_id: params.storyId,
    node_name: params.nodeName,
    attempt_count: params.attemptCount,
  })
}

// ============================================================================
// withQualityEscalation (AC-2)
// ============================================================================

/**
 * Higher-order function that wraps node execution with quality-based escalation.
 *
 * Flow:
 * 1. Execute sonnetNodeFn
 * 2. If NodeRetryExhaustedError → check budget → execute opusNodeFn
 * 3. If Opus also fails or budget insufficient → human tier (blocked + KB note)
 *
 * AC-GAP1: Triggered exclusively by NodeRetryExhaustedError
 * AC-DEC2: Chain always starts from Sonnet
 * AC-2: Composable wrapper, does not modify factory signatures
 *
 * @param options - Escalation chain configuration
 * @returns A NodeFunction that wraps the escalation chain
 */
export function withQualityEscalation(options: QualityEscalationOptions): NodeFunction {
  const config = QualityEscalationConfigSchema.parse({
    ...options.config,
  })

  return async function qualityEscalationNode(state, runnableConfig) {
    const storyId = state.storyId
    const nodeName = 'quality-escalation'

    // ---- Tier 1: Sonnet ----
    try {
      const result = await options.sonnetNodeFn(state, runnableConfig)
      return result
    } catch (error) {
      // AC-GAP1: Only escalate on NodeRetryExhaustedError
      if (!(error instanceof NodeRetryExhaustedError)) {
        throw error
      }

      const sonnetError = error

      // AC-DEC4: Log escalation from Sonnet
      logEscalationStep({
        event: 'sonnet_retry_exhausted',
        fromModel: 'sonnet',
        toModel: 'opus',
        reason: 'retry_exhausted',
        storyId,
        nodeName,
        attemptCount: sonnetError.attempts,
      })

      // ---- Budget Guard (AC-GAP3, AC-5) ----
      if (options.budgetAccumulator) {
        try {
          options.budgetAccumulator.checkBudget(
            storyId,
            config.estimatedOpusTokens,
            config.hardBudgetCap,
          )
        } catch (budgetError) {
          if (budgetError instanceof BudgetExhaustedError) {
            // AC-5: Skip Opus, go directly to human tier
            logEscalationStep({
              event: 'budget_exhausted_skipping_opus',
              fromModel: 'sonnet',
              toModel: 'human',
              reason: 'budget_exhausted_before_escalation',
              storyId,
              nodeName,
              attemptCount: sonnetError.attempts,
            })

            return handleHumanEscalation(state, {
              storyId,
              nodeName,
              modelsTried: ['sonnet'],
              lastError: sonnetError.lastError,
              reason: 'escalation_skipped_budget_exhausted',
              onHumanEscalation: options.onHumanEscalation,
            })
          }
          throw budgetError
        }
      }

      // ---- Tier 2: Opus ----
      try {
        const opusResult = await options.opusNodeFn(state, runnableConfig)

        // AC-DEC4: Log successful Opus resolution
        logEscalationStep({
          event: 'opus_succeeded',
          fromModel: 'sonnet',
          toModel: 'opus',
          reason: 'escalation_resolved',
          storyId,
          nodeName,
          attemptCount: sonnetError.attempts,
        })

        return opusResult
      } catch (opusError) {
        // AC-4: Opus also failed → human tier
        if (!(opusError instanceof NodeRetryExhaustedError)) {
          throw opusError
        }

        logEscalationStep({
          event: 'opus_retry_exhausted',
          fromModel: 'opus',
          toModel: 'human',
          reason: 'retry_exhausted',
          storyId,
          nodeName,
          attemptCount: opusError.attempts,
        })

        return handleHumanEscalation(state, {
          storyId,
          nodeName,
          modelsTried: ['sonnet', 'opus'],
          lastError: opusError.lastError,
          reason: 'escalation_chain_exhausted',
          onHumanEscalation: options.onHumanEscalation,
        })
      }
    }
  }
}

// ============================================================================
// Human Tier (AC-GAP2, AC-4)
// ============================================================================

const HumanEscalationParamsSchema = z.object({
  storyId: z.string().min(1),
  nodeName: z.string().min(1),
  modelsTried: z.array(z.string()),
  lastError: z.any(),
  reason: z.enum(['escalation_chain_exhausted', 'escalation_skipped_budget_exhausted']),
  onHumanEscalation: z.any().optional(),
})

type HumanEscalationParams = Omit<
  z.infer<typeof HumanEscalationParamsSchema>,
  'lastError' | 'onHumanEscalation'
> & {
  lastError: Error
  onHumanEscalation?: (context: HumanEscalationContext) => Promise<void>
}

/**
 * Handles human tier escalation.
 * AC-GAP2: Sets blocked state + writes KB note via callback.
 * AC-4: Returns blocked state update with appropriate reason.
 */
async function handleHumanEscalation(
  state: GraphState,
  params: HumanEscalationParams,
): Promise<StateUpdate> {
  const { storyId, nodeName, modelsTried, lastError, reason, onHumanEscalation } = params

  // AC-DEC4: Log human escalation
  logEscalationStep({
    event: 'human_escalation',
    fromModel: modelsTried[modelsTried.length - 1],
    toModel: 'human',
    reason,
    storyId,
    nodeName,
    attemptCount: 0,
  })

  // AC-GAP2: Write KB note with structured context (fire-and-forget pattern)
  if (onHumanEscalation) {
    try {
      await onHumanEscalation({
        storyId,
        nodeName,
        modelsTried,
        lastError,
        reason,
      })
    } catch (kbError) {
      // KB write failure should not block the escalation response
      logger.warn('Failed to write KB note for human escalation', {
        storyId,
        error: kbError instanceof Error ? kbError.message : String(kbError),
      })
    }
  }

  // AC-GAP2, AC-4: Return blocked state with appropriate code
  return createBlockedUpdate(state, {
    nodeId: nodeName,
    error: lastError,
    code:
      reason === 'escalation_skipped_budget_exhausted'
        ? 'ESCALATION_SKIPPED_BUDGET_EXHAUSTED'
        : 'ESCALATION_CHAIN_EXHAUSTED',
  })
}
