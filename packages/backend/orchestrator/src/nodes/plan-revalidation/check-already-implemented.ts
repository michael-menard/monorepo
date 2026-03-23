/**
 * Check Already Implemented Node — Plan Revalidation Graph
 *
 * Checks whether the plan has already been fully implemented by looking up
 * completion artifacts and computing story completion ratios.
 *
 * APRS-3010: Plan Revalidation Graph - Context Load and Drift Detection Nodes
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  PlanRevalidationState,
  ContextSnapshot,
  DriftFinding,
} from '../../state/plan-revalidation-state.js'
import { DriftFindingSchema } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Adapter Types & Schemas
// ============================================================================

/**
 * Result of looking up completion artifacts for a plan.
 */
export const ArtifactLookupResultSchema = z.object({
  hasCompletionArtifact: z.boolean(),
  hasEvidenceArtifact: z.boolean(),
  completedStoryCount: z.number().int().min(0),
  totalStoryCount: z.number().int().min(0),
})

export type ArtifactLookupResult = z.infer<typeof ArtifactLookupResultSchema>

/**
 * Adapter that looks up completion artifacts for a plan.
 * Default: returns all-false/zero (no artifact store available).
 */
export type ArtifactLookupFn = (planSlug: string) => Promise<ArtifactLookupResult>

const defaultArtifactLookup: ArtifactLookupFn = async () => ({
  hasCompletionArtifact: false,
  hasEvidenceArtifact: false,
  completedStoryCount: 0,
  totalStoryCount: 0,
})

// ============================================================================
// Config Schema
// ============================================================================

export const CheckAlreadyImplementedNodeConfigSchema = z.object({
  /** Completion ratio threshold (inclusive) to consider a plan fully implemented */
  completionRatioThreshold: z.number().min(0).max(1).default(0.9),
})

export type CheckAlreadyImplementedNodeConfig = z.infer<
  typeof CheckAlreadyImplementedNodeConfigSchema
>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Looks up completion artifacts for the given plan slug.
 *
 * @param planSlug - Plan to query artifacts for
 * @param artifactLookup - Adapter to perform the lookup
 * @returns ArtifactLookupResult
 */
export async function lookupArtifacts(
  planSlug: string,
  artifactLookup: ArtifactLookupFn = defaultArtifactLookup,
): Promise<ArtifactLookupResult> {
  try {
    const result = await artifactLookup(planSlug)
    return ArtifactLookupResultSchema.parse(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('check-already-implemented: artifact lookup failed', { planSlug, error: msg })
    return defaultArtifactLookup(planSlug)
  }
}

/**
 * Evaluates whether a plan is already implemented based on artifact lookup results
 * and the current context snapshot.
 *
 * Heuristic:
 * - isAlreadyImplemented if hasCompletionArtifact is true, OR
 * - completedStoryCount / totalStoryCount >= threshold AND totalStoryCount > 0
 *
 * @param lookupResult - Result from artifact lookup
 * @param _contextSnapshot - Context snapshot (reserved for future heuristics)
 * @param threshold - Completion ratio threshold (default 0.9)
 * @returns Evaluation result
 */
export function evaluateImplementationStatus(
  lookupResult: ArtifactLookupResult,
  _contextSnapshot: ContextSnapshot | null,
  threshold = 0.9,
): { isAlreadyImplemented: boolean; confidence: number; reason: string } {
  if (lookupResult.hasCompletionArtifact) {
    return {
      isAlreadyImplemented: true,
      confidence: 1.0,
      reason: 'Completion artifact found for this plan',
    }
  }

  if (lookupResult.totalStoryCount > 0) {
    const ratio = lookupResult.completedStoryCount / lookupResult.totalStoryCount
    if (ratio >= threshold) {
      return {
        isAlreadyImplemented: true,
        confidence: ratio,
        reason: `${lookupResult.completedStoryCount}/${lookupResult.totalStoryCount} stories completed (${Math.round(ratio * 100)}% >= ${Math.round(threshold * 100)}% threshold)`,
      }
    }
  }

  return {
    isAlreadyImplemented: false,
    confidence: 1.0,
    reason: 'No completion artifact and story completion below threshold',
  }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the check-already-implemented node for the Plan Revalidation Graph.
 *
 * @param config - Optional config with adapter and threshold overrides
 * @returns LangGraph-compatible node function
 */
export function createCheckAlreadyImplementedNode(
  config: Partial<CheckAlreadyImplementedNodeConfig> & {
    artifactLookup?: ArtifactLookupFn
  } = {},
) {
  const fullConfig = CheckAlreadyImplementedNodeConfigSchema.parse(config)
  const artifactLookup: ArtifactLookupFn = config.artifactLookup ?? defaultArtifactLookup

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('check-already-implemented: starting', { planSlug: state.planSlug })

    try {
      const lookupResult = await lookupArtifacts(state.planSlug, artifactLookup)
      const evaluation = evaluateImplementationStatus(
        lookupResult,
        state.contextSnapshot,
        fullConfig.completionRatioThreshold,
      )

      const findings: DriftFinding[] = []

      if (evaluation.isAlreadyImplemented) {
        findings.push(
          DriftFindingSchema.parse({
            nodeId: 'check-already-implemented',
            category: 'already_implemented',
            severity: 'info',
            summary: evaluation.reason,
            detail: JSON.stringify(lookupResult),
            confidence: evaluation.confidence,
          }),
        )
        logger.info('check-already-implemented: plan appears already implemented', {
          planSlug: state.planSlug,
          reason: evaluation.reason,
          confidence: evaluation.confidence,
        })
      } else {
        logger.info('check-already-implemented: plan not yet implemented', {
          planSlug: state.planSlug,
          reason: evaluation.reason,
        })
      }

      return {
        driftFindings: findings,
        revalidationPhase: 'check_approach_valid',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('check-already-implemented: unexpected error', {
        planSlug: state.planSlug,
        error: msg,
      })
      return {
        revalidationPhase: 'error',
        errors: [`check-already-implemented: ${msg}`],
      }
    }
  }
}
