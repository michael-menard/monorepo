/**
 * gap_specialists Node
 *
 * Dispatches gap findings to specialist agents (UX, QA, Security) for analysis.
 * In a full LangGraph deployment, this would use the Send API for parallel fan-out.
 * For MVP, specialists run sequentially with injectable adapters.
 * Fan-in via append reducer on specialistFindings.
 *
 * APRS-2020: ST-3
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  GapFinding,
  SpecialistFinding,
  NormalizedPlan,
  PlanRefinementState,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// Adapter Type
// ============================================================================

/**
 * Injectable adapter function for a specialist agent.
 * Receives the full list of gap findings and the normalized plan.
 * Returns specialist findings for any gaps the specialist can address.
 */
export type SpecialistAdapterFn = (
  gaps: GapFinding[],
  plan: NormalizedPlan,
) => Promise<SpecialistFinding[]>

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Configuration schema for the gap_specialists node.
 * All specialist adapters are optional — undefined means "not configured, skip".
 */
export const GapSpecialistsConfigSchema = z.object({
  uxSpecialist: z.function().optional(),
  qaSpecialist: z.function().optional(),
  securitySpecialist: z.function().optional(),
})

export type GapSpecialistsConfig = {
  uxSpecialist?: SpecialistAdapterFn
  qaSpecialist?: SpecialistAdapterFn
  securitySpecialist?: SpecialistAdapterFn
}

// ============================================================================
// Exported Phase Function
// ============================================================================

/**
 * Runs a single specialist adapter and returns its findings.
 * If the adapter is undefined, it is skipped (info logged, no findings).
 * If the adapter throws, the error is caught and warned (not fatal, no findings).
 *
 * @param type - Specialist type label for logging (e.g. 'ux', 'qa', 'security')
 * @param adapter - Optional specialist adapter function
 * @param gaps - Gap findings to analyze
 * @param plan - Normalized plan context
 * @returns Array of specialist findings (empty if skipped or errored)
 */
export async function runSpecialist(
  type: string,
  adapter: SpecialistAdapterFn | undefined,
  gaps: GapFinding[],
  plan: NormalizedPlan,
): Promise<SpecialistFinding[]> {
  if (!adapter) {
    logger.info(`gap_specialists: ${type} specialist not configured — skipping`, { type })
    return []
  }

  try {
    const findings = await adapter(gaps, plan)
    logger.info(`gap_specialists: ${type} specialist returned ${findings.length} findings`, {
      type,
      count: findings.length,
    })
    return findings
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn(`gap_specialists: ${type} specialist threw — skipping its findings`, {
      type,
      error: msg,
    })
    return []
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the gap_specialists LangGraph node.
 *
 * The node:
 * 1. Returns empty specialistFindings if no gapFindings in state (or null normalizedPlan)
 * 2. Runs each provided specialist adapter sequentially: ux, qa, security
 * 3. Skips any specialist that is not configured
 * 4. Catches specialist errors (not fatal)
 * 5. Combines all findings — the append reducer handles fan-in
 * 6. Returns empty array if all specialists fail or are missing (warning, not error)
 *
 * @param config - Injectable specialist adapter config
 * @returns LangGraph-compatible node function
 */
export function createGapSpecialistsNode(config: GapSpecialistsConfig) {
  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    const { gapFindings, normalizedPlan } = state

    // Guard: no gaps to process
    if (!gapFindings || gapFindings.length === 0) {
      logger.info('gap_specialists: no gap findings in state — returning empty specialistFindings')
      return { specialistFindings: [] }
    }

    // Guard: no normalized plan to provide context
    if (!normalizedPlan) {
      logger.warn(
        'gap_specialists: normalizedPlan is null — cannot run specialists, returning empty findings',
      )
      return { specialistFindings: [] }
    }

    // Run each specialist sequentially
    const [uxFindings, qaFindings, securityFindings] = await Promise.all([
      runSpecialist('ux', config.uxSpecialist, gapFindings, normalizedPlan),
      runSpecialist('qa', config.qaSpecialist, gapFindings, normalizedPlan),
      runSpecialist('security', config.securitySpecialist, gapFindings, normalizedPlan),
    ])

    const allFindings: SpecialistFinding[] = [...uxFindings, ...qaFindings, ...securityFindings]

    if (allFindings.length === 0) {
      logger.warn(
        'gap_specialists: all specialists produced no findings (all missing or all failed)',
        { gapCount: gapFindings.length },
      )
    } else {
      logger.info(`gap_specialists: combined ${allFindings.length} specialist findings`, {
        uxCount: uxFindings.length,
        qaCount: qaFindings.length,
        securityCount: securityFindings.length,
      })
    }

    return { specialistFindings: allFindings }
  }
}
