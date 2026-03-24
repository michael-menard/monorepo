/**
 * reconciliation Node
 *
 * Merges gapFindings + specialistFindings into reconciledFindings.
 * Computes coverageScore (0.0-1.0). Deduplicates across iterations.
 * Injectable ReconciliationAdapterFn for LLM-based merge.
 * Optional FindingsWriterFn for persistence.
 *
 * APRS-2020: ST-4
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  ReconciledFindingSchema,
  CoverageResultSchema,
  type GapFinding,
  type SpecialistFinding,
  type ReconciledFinding,
  type CoverageResult,
  type PlanRefinementState,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable LLM reconciliation adapter function type.
 * Receives gaps, specialist findings, and previous reconciled findings.
 * Returns merged ReconciledFinding[].
 */
export type ReconciliationAdapterFn = (
  gaps: GapFinding[],
  specialistFindings: SpecialistFinding[],
  previousReconciled: ReconciledFinding[],
) => Promise<ReconciledFinding[]>

/**
 * Injectable findings writer adapter function type.
 * Persists CoverageResult for a given planSlug.
 * If absent or failing, logs warning and continues (no throw).
 */
export type FindingsWriterFn = (planSlug: string, result: CoverageResult) => Promise<void>

// ============================================================================
// Config Schema
// ============================================================================

export const ReconciliationConfigSchema = z.object({
  /** Injectable LLM adapter for reconciliation merge */
  reconciliationAdapter: z.function().optional(),
  /** Injectable findings-writer adapter (defaults to no-op) */
  findingsWriter: z.function().optional(),
})

export type ReconciliationConfig = z.infer<typeof ReconciliationConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Default reconciliation: merge gaps with specialist findings by gapId.
 * Creates a ReconciledFinding for each gap.
 * Status defaults to 'open'.
 */
export function defaultReconcile(
  gaps: GapFinding[],
  specialistFindings: SpecialistFinding[],
  previous: ReconciledFinding[],
): ReconciledFinding[] {
  return gaps.map((gap, idx) => {
    const matchingSpecialists = specialistFindings.filter(sf => sf.gapId === gap.id)

    // Check if this gap was previously reconciled — carry forward its status
    const previousFinding = previous.find(rf => rf.gapId === gap.id)

    // Build recommendation from specialist findings or use gap description as fallback
    const recommendation =
      matchingSpecialists.length > 0
        ? matchingSpecialists.map(sf => sf.recommendation).join('; ')
        : `Address gap: ${gap.description}`

    return ReconciledFindingSchema.parse({
      id: previousFinding?.id ?? `rf-${gap.id}-${idx + 1}`,
      gapId: gap.id,
      type: gap.type,
      description: gap.description,
      severity: gap.severity,
      specialistAnalyses: matchingSpecialists,
      recommendation,
      status: previousFinding?.status ?? 'open',
    })
  })
}

/**
 * Compute coverage score as ratio of addressed gaps to total gaps.
 * A gap is "addressed" if it has at least one specialist finding with a recommendation.
 * Returns 1.0 if no gaps exist (no gaps = full coverage).
 */
export function computeCoverageScore(
  gaps: GapFinding[],
  reconciledFindings: ReconciledFinding[],
): number {
  if (gaps.length === 0) return 1.0

  const addressedGapIds = new Set(
    reconciledFindings.filter(rf => rf.specialistAnalyses.length > 0).map(rf => rf.gapId),
  )

  const addressedCount = gaps.filter(g => addressedGapIds.has(g.id)).length
  return addressedCount / gaps.length
}

/**
 * Deduplicate findings across iterations.
 * Merges current findings with previous, latest takes precedence by gapId.
 */
export function deduplicateFindings(
  current: ReconciledFinding[],
  previous: ReconciledFinding[],
): ReconciledFinding[] {
  if (previous.length === 0) return current

  const merged = new Map<string, ReconciledFinding>()

  // Start with previous findings
  for (const finding of previous) {
    merged.set(finding.gapId, finding)
  }

  // Current findings take precedence (overwrite by gapId)
  for (const finding of current) {
    merged.set(finding.gapId, finding)
  }

  return Array.from(merged.values())
}

/**
 * Write coverage result via findings-writer adapter.
 * No throw on absent or failing adapter — logs warning and continues.
 */
async function writeCoverageResult(
  planSlug: string,
  result: CoverageResult,
  findingsWriter: FindingsWriterFn | undefined,
): Promise<void> {
  if (!findingsWriter) {
    logger.info('reconciliation: no findings-writer provided, result stored in-memory only', {
      planSlug,
      coverageScore: result.coverageScore,
    })
    return
  }

  try {
    await findingsWriter(planSlug, result)
    logger.info('reconciliation: coverage result written via findings-writer', {
      planSlug,
      coverageScore: result.coverageScore,
    })
  } catch (err) {
    // No throw — log warning and continue (same pattern as FlowWriterFn)
    logger.warn('reconciliation: findings-writer failed, result stored in-memory only', {
      err,
      planSlug,
    })
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the reconciliation LangGraph node.
 *
 * Merges gapFindings + specialistFindings into reconciledFindings.
 * Computes coverageScore (0.0-1.0). Deduplicates across iterations.
 * Sets refinementPhase='gap_coverage' to continue the loop (conditional edge
 * decides termination via afterGapCoverage).
 * Exception: no gaps found → refinementPhase='complete', coverageScore=1.0.
 *
 * @param config - Optional config with injectable adapters
 */
export function createReconciliationNode(
  config: {
    reconciliationAdapter?: ReconciliationAdapterFn
    findingsWriter?: FindingsWriterFn
  } = {},
) {
  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('reconciliation: starting', {
        planSlug: state.planSlug,
        gapCount: state.gapFindings.length,
        specialistCount: state.specialistFindings.length,
        previousReconciledCount: state.reconciledFindings.length,
      })

      const { gapFindings, specialistFindings, reconciledFindings: previousReconciled } = state

      // No gaps and no specialist findings → full coverage, loop ends
      if (gapFindings.length === 0 && specialistFindings.length === 0) {
        logger.info('reconciliation: no gaps found, coverage is complete', {
          planSlug: state.planSlug,
        })

        const coverageResult = CoverageResultSchema.parse({
          coverageScore: 1.0,
          totalGaps: 0,
          addressedGaps: 0,
          reconciledFindings: [],
          iterationsUsed: state.iterationCount,
          circuitBreakerTriggered: state.circuitBreakerOpen,
        })

        await writeCoverageResult(state.planSlug, coverageResult, config.findingsWriter)

        return {
          reconciledFindings: [],
          coverageScore: 1.0,
          refinementPhase: 'complete',
        }
      }

      // Reconcile findings — use adapter if provided, fall back to default
      let currentReconciled: ReconciledFinding[]
      if (config.reconciliationAdapter) {
        try {
          currentReconciled = await config.reconciliationAdapter(
            gapFindings,
            specialistFindings,
            previousReconciled,
          )
          logger.info('reconciliation: adapter produced reconciled findings', {
            planSlug: state.planSlug,
            count: currentReconciled.length,
          })
        } catch (err) {
          logger.warn('reconciliation: adapter failed, falling back to default reconciliation', {
            err,
            planSlug: state.planSlug,
          })
          currentReconciled = defaultReconcile(gapFindings, specialistFindings, previousReconciled)
        }
      } else {
        currentReconciled = defaultReconcile(gapFindings, specialistFindings, previousReconciled)
      }

      // Deduplicate across iterations
      const deduplicated = deduplicateFindings(currentReconciled, previousReconciled)

      // Compute coverage score
      const coverageScore = computeCoverageScore(gapFindings, deduplicated)
      const addressedGaps = gapFindings.filter(g =>
        deduplicated.some(rf => rf.gapId === g.id && rf.specialistAnalyses.length > 0),
      ).length

      logger.info('reconciliation: coverage computed', {
        planSlug: state.planSlug,
        coverageScore,
        totalGaps: gapFindings.length,
        addressedGaps,
      })

      const coverageResult = CoverageResultSchema.parse({
        coverageScore,
        totalGaps: gapFindings.length,
        addressedGaps,
        reconciledFindings: deduplicated,
        iterationsUsed: state.iterationCount,
        circuitBreakerTriggered: state.circuitBreakerOpen,
      })

      // Write via findings-writer adapter (no throw on failure)
      await writeCoverageResult(state.planSlug, coverageResult, config.findingsWriter)

      // refinementPhase='gap_coverage' — the afterGapCoverage conditional edge handles termination
      // previousGapCount is managed by coverage_agent, not reconciliation
      return {
        reconciledFindings: deduplicated,
        coverageScore,
        refinementPhase: 'gap_coverage',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('reconciliation: unexpected error', { err, planSlug: state.planSlug })
      return {
        refinementPhase: 'error',
        errors: [`reconciliation failed: ${message}`],
      }
    }
  }
}
