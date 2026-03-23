/**
 * coverage_agent Node
 *
 * Analyzes normalizedPlan + flows to identify coverage gaps.
 * Injectable CoverageAdapterFn for LLM-based gap detection.
 * Increments iterationCount. Checks circuit breaker BEFORE LLM call.
 *
 * APRS-2020: ST-2
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  GapFindingSchema,
  type GapFinding,
  type NormalizedPlan,
  type Flow,
  type PlanRefinementState,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// Adapter Type
// ============================================================================

/**
 * Injectable adapter function for the coverage agent.
 * Receives the normalized plan, flows, and any existing gaps from prior iterations.
 * Returns new gap findings identified by the LLM.
 */
export type CoverageAdapterFn = (
  normalizedPlan: NormalizedPlan,
  flows: Flow[],
  existingGaps: GapFinding[],
) => Promise<GapFinding[]>

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Configuration schema for the coverage_agent node.
 * coverageAdapter is optional — undefined means "not configured, use no-op".
 */
export const CoverageAgentConfigSchema = z.object({
  coverageAdapter: z.function().optional(),
})

export type CoverageAgentConfig = {
  coverageAdapter?: CoverageAdapterFn
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

/**
 * Default no-op adapter — returns empty gaps when no real adapter is provided.
 */
const defaultCoverageAdapter: CoverageAdapterFn = async () => []

// ============================================================================
// Exported Phase Functions (for unit testability)
// ============================================================================

/**
 * Checks whether the circuit breaker should prevent the LLM call.
 *
 * @param state - Current plan refinement state
 * @returns { shouldSkip: boolean, reason?: string }
 */
export function checkCircuitBreaker(state: PlanRefinementState): {
  shouldSkip: boolean
  reason?: string
} {
  if (state.circuitBreakerOpen) {
    return { shouldSkip: true, reason: 'circuitBreakerOpen is true' }
  }
  if (state.iterationCount >= state.maxIterations) {
    return {
      shouldSkip: true,
      reason: `iterationCount (${state.iterationCount}) >= maxIterations (${state.maxIterations})`,
    }
  }
  return { shouldSkip: false }
}

/**
 * Calls the coverage adapter to identify gap findings.
 * Returns empty array if adapter is not provided.
 *
 * @param normalizedPlan - The normalized plan to analyze
 * @param flows - Extracted flows from the plan
 * @param existingGaps - Gap findings from prior iterations
 * @param adapter - Optional coverage adapter function
 * @returns Array of GapFinding objects
 */
export async function analyzeGaps(
  normalizedPlan: NormalizedPlan,
  flows: Flow[],
  existingGaps: GapFinding[],
  adapter: CoverageAdapterFn | undefined,
): Promise<GapFinding[]> {
  if (!adapter) {
    logger.info('coverage_agent: no adapter provided — returning empty gaps')
    return []
  }

  const gaps = await adapter(normalizedPlan, flows, existingGaps)
  return gaps
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the coverage_agent LangGraph node.
 *
 * The node:
 * 1. Checks circuit breaker BEFORE calling adapter — routes to reconciliation if open or exhausted
 * 2. Returns empty gapFindings if normalizedPlan is null (graceful degradation)
 * 3. Calls coverageAdapter(normalizedPlan, flows, existingGaps) to get new gaps
 * 4. Tracks previousGapCount for convergence detection downstream
 * 5. Increments iterationCount by 1
 * 6. On adapter failure: increments consecutiveLlmFailures; if >= 2, sets circuitBreakerOpen
 * 7. On adapter success: resets consecutiveLlmFailures to 0
 * 8. Returns gapFindings via append reducer, updated iterationCount, phase stays 'gap_coverage'
 * 9. If no adapter configured: logs warning, returns empty gapFindings (no error)
 *
 * @param config - Injectable coverage adapter config
 * @returns LangGraph-compatible node function
 */
export function createCoverageAgentNode(config: CoverageAgentConfig) {
  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    const { normalizedPlan, flows, gapFindings, iterationCount } = state

    // Check circuit breaker BEFORE any LLM call
    const circuitCheck = checkCircuitBreaker(state)
    if (circuitCheck.shouldSkip) {
      logger.info(`coverage_agent: skipping due to circuit breaker — ${circuitCheck.reason}`, {
        iterationCount,
        circuitBreakerOpen: state.circuitBreakerOpen,
        maxIterations: state.maxIterations,
      })
      return {
        gapFindings: [],
        iterationCount: iterationCount + 1,
        previousGapCount: gapFindings.length,
        refinementPhase: 'gap_coverage',
      }
    }

    // Guard: no normalized plan — cannot analyze
    if (!normalizedPlan) {
      logger.warn('coverage_agent: normalizedPlan is null — returning empty gaps, no error')
      return {
        gapFindings: [],
        iterationCount: iterationCount + 1,
        previousGapCount: gapFindings.length,
        refinementPhase: 'gap_coverage',
      }
    }

    const adapter = config.coverageAdapter ?? defaultCoverageAdapter

    // Check if using no-op adapter (no adapter was configured)
    if (!config.coverageAdapter) {
      logger.warn('coverage_agent: no coverageAdapter configured — returning empty gapFindings')
      return {
        gapFindings: [],
        iterationCount: iterationCount + 1,
        previousGapCount: gapFindings.length,
        refinementPhase: 'gap_coverage',
      }
    }

    // Track previous gap count for convergence detection
    const previousGapCount = gapFindings.length

    try {
      const newGaps = await analyzeGaps(normalizedPlan, flows, gapFindings, adapter)

      logger.info(
        `coverage_agent: found ${newGaps.length} gap(s) in iteration ${iterationCount + 1}`,
        {
          newGapCount: newGaps.length,
          previousGapCount,
          iterationCount: iterationCount + 1,
        },
      )

      return {
        gapFindings: newGaps,
        iterationCount: iterationCount + 1,
        previousGapCount,
        consecutiveLlmFailures: 0,
        refinementPhase: 'gap_coverage',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      const newConsecutiveFailures = state.consecutiveLlmFailures + 1

      logger.warn(
        `coverage_agent: adapter threw error (consecutiveLlmFailures=${newConsecutiveFailures})`,
        {
          error: msg,
          consecutiveLlmFailures: newConsecutiveFailures,
        },
      )

      const shouldOpenCircuitBreaker = newConsecutiveFailures >= 2

      if (shouldOpenCircuitBreaker) {
        logger.warn('coverage_agent: consecutive LLM failures >= 2 — opening circuit breaker')
      }

      return {
        gapFindings: [],
        iterationCount: iterationCount + 1,
        previousGapCount,
        consecutiveLlmFailures: newConsecutiveFailures,
        circuitBreakerOpen: shouldOpenCircuitBreaker,
        refinementPhase: 'gap_coverage',
      }
    }
  }
}
