/**
 * Classify Drift Node — Plan Revalidation Graph
 *
 * Pure heuristic node that scores accumulated drift findings and assigns
 * a final RevalidationVerdict to the graph state.
 *
 * Scoring rules (in priority order):
 * 1. Any finding with severity=blocking AND category=already_implemented → 'already_done'
 * 2. Any finding with severity=blocking (other categories) → 'needs_revision'
 * 3. Any finding with severity=warning (no blocking findings) → 'needs_revision'
 * 4. Error state (errors[] non-empty) → 'error'
 * 5. All info or empty → 'proceed'
 *
 * APRS-3020: AC-1, AC-2, AC-3
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  PlanRevalidationState,
  DriftFinding,
  RevalidationVerdict,
} from '../../state/plan-revalidation-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ClassifyDriftNodeConfigSchema = z.object({
  /** No configurable thresholds — heuristic is deterministic */
  _placeholder: z.never().optional(),
})

export type ClassifyDriftNodeConfig = z.infer<typeof ClassifyDriftNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Applies heuristic scoring to an array of drift findings and returns a verdict.
 *
 * Priority order:
 * 1. blocking + already_implemented category → 'already_done'
 * 2. blocking (any other category) → 'needs_revision'
 * 3. warning (no blocking present) → 'needs_revision'
 * 4. all info / empty → 'proceed'
 *
 * Note: 'error' verdict is only assigned by the node wrapper when state.errors
 * is non-empty — this function focuses solely on finding-based scoring.
 *
 * @param findings - Array of drift findings from all check nodes
 * @returns Verdict based on heuristic scoring
 */
export function scoreDriftFindings(
  findings: DriftFinding[],
): Exclude<RevalidationVerdict, 'error' | 'blocked'> {
  const blockingFindings = findings.filter(f => f.severity === 'blocking')
  const warningFindings = findings.filter(f => f.severity === 'warning')

  // Rule 1: blocking + already_implemented → already_done
  const alreadyImplementedBlocking = blockingFindings.filter(
    f => f.category === 'already_implemented',
  )
  if (
    alreadyImplementedBlocking.length > 0 &&
    blockingFindings.length === alreadyImplementedBlocking.length
  ) {
    // All blocking findings are already_implemented
    return 'already_done'
  }

  // Rule 2: any blocking (non-already_implemented) → needs_revision
  const otherBlocking = blockingFindings.filter(f => f.category !== 'already_implemented')
  if (otherBlocking.length > 0) {
    return 'needs_revision'
  }

  // If there's a mix of already_implemented blocking and other blocking, needs_revision wins
  if (alreadyImplementedBlocking.length > 0) {
    // Only already_implemented blocking findings, but we already handled the pure case above
    // This branch handles mixed: already_implemented blocking only (pure case handled above)
    return 'already_done'
  }

  // Rule 3: any warning (no blocking present) → needs_revision
  if (warningFindings.length > 0) {
    return 'needs_revision'
  }

  // Rule 5: all info or empty → proceed
  return 'proceed'
}

/**
 * Builds a human-readable summary of the verdict rationale.
 *
 * @param findings - Array of drift findings
 * @param verdict - Computed verdict
 * @returns Summary string for logging
 */
export function buildVerdictSummary(
  findings: DriftFinding[],
  verdict: RevalidationVerdict,
): string {
  const blockingCount = findings.filter(f => f.severity === 'blocking').length
  const warningCount = findings.filter(f => f.severity === 'warning').length
  const infoCount = findings.filter(f => f.severity === 'info').length

  const parts: string[] = []
  if (blockingCount > 0) parts.push(`${blockingCount} blocking`)
  if (warningCount > 0) parts.push(`${warningCount} warning`)
  if (infoCount > 0) parts.push(`${infoCount} info`)

  const findingSummary = parts.length > 0 ? parts.join(', ') : 'no findings'

  return `verdict=${verdict} (${findingSummary})`
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the classify-drift node for the Plan Revalidation Graph.
 *
 * This is a pure heuristic node — no LLM calls, no DB writes.
 * It reads state.driftFindings and state.errors to assign state.verdict.
 *
 * @returns LangGraph-compatible node function
 */
export function createClassifyDriftNode() {
  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('classify-drift: starting', {
      planSlug: state.planSlug,
      findingCount: state.driftFindings.length,
      errorCount: state.errors.length,
    })

    try {
      // Rule 4: error state (errors[] non-empty) → 'error'
      if (state.errors.length > 0) {
        logger.warn('classify-drift: errors present, assigning error verdict', {
          planSlug: state.planSlug,
          errors: state.errors,
        })
        return {
          verdict: 'error',
          revalidationPhase: 'classify_drift',
        }
      }

      const verdict = scoreDriftFindings(state.driftFindings)
      const summary = buildVerdictSummary(state.driftFindings, verdict)

      logger.info('classify-drift: verdict assigned', {
        planSlug: state.planSlug,
        verdict,
        summary,
      })

      return {
        verdict,
        revalidationPhase: 'classify_drift',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('classify-drift: unexpected error', { planSlug: state.planSlug, error: msg })
      return {
        verdict: 'error',
        revalidationPhase: 'error',
        errors: [`classify-drift: ${msg}`],
      }
    }
  }
}
