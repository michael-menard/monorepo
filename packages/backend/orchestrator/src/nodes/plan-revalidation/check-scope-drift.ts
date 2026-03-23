/**
 * Check Scope Drift Node — Plan Revalidation Graph
 *
 * Optionally calls an LLM to detect whether the plan has drifted from its
 * original goals. If no LLM adapter is provided, the node skips detection
 * and emits no findings.
 *
 * APRS-3010: Plan Revalidation Graph - Context Load and Drift Detection Nodes
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PlanRevalidationState, DriftFinding } from '../../state/plan-revalidation-state.js'
import { DriftFindingSchema } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * A summary of a related story used in scope drift prompts.
 */
export const StoryDescriptionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
})

export type StoryDescription = z.infer<typeof StoryDescriptionSchema>

/**
 * The prompt sent to the LLM for scope drift detection.
 */
export const ScopeDriftPromptSchema = z.object({
  planSlug: z.string().min(1),
  planGoals: z.array(z.string()),
  planNonGoals: z.array(z.string()),
  relatedStoryDescriptions: z.array(StoryDescriptionSchema),
})

export type ScopeDriftPrompt = z.infer<typeof ScopeDriftPromptSchema>

/**
 * The result returned by the LLM scope drift detector.
 */
export const ScopeDriftResultSchema = z.object({
  hasDrift: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  driftAreas: z.array(z.string()),
})

export type ScopeDriftResult = z.infer<typeof ScopeDriftResultSchema>

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * LLM adapter for scope drift detection.
 * If undefined, the node skips LLM detection entirely.
 */
export type LlmScopeDriftDetectorFn = (prompt: ScopeDriftPrompt) => Promise<ScopeDriftResult>

// ============================================================================
// Config Schema
// ============================================================================

export const CheckScopeDriftNodeConfigSchema = z.object({
  /** Confidence threshold below which a drift finding is escalated to 'blocking' */
  blockingDriftConfidenceThreshold: z.number().min(0).max(1).default(0.8),
  /** Confidence threshold below which a drift finding is 'warning' (else 'info') */
  warningDriftConfidenceThreshold: z.number().min(0).max(1).default(0.5),
})

export type CheckScopeDriftNodeConfig = z.infer<typeof CheckScopeDriftNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Builds a scope drift detection prompt from the current state.
 *
 * @param state - Current revalidation state
 * @returns ScopeDriftPrompt
 */
export function buildScopeDriftPrompt(state: PlanRevalidationState): ScopeDriftPrompt {
  const planContent = state.rawPlan ?? {}
  const snapshot = state.contextSnapshot

  // Extract goals and non-goals from plan content
  const planGoals = Array.isArray(planContent['goals'])
    ? (planContent['goals'] as unknown[]).map(g => String(g))
    : typeof planContent['description'] === 'string'
      ? [planContent['description']]
      : []

  const planNonGoals = Array.isArray(planContent['nonGoals'])
    ? (planContent['nonGoals'] as unknown[]).map(g => String(g))
    : Array.isArray(planContent['non_goals'])
      ? (planContent['non_goals'] as unknown[]).map(g => String(g))
      : []

  const relatedStoryDescriptions: StoryDescription[] =
    snapshot?.relatedStories.map(
      (s: { id: string; title: string; status: string; phase: string }) =>
        StoryDescriptionSchema.parse({
          id: s.id,
          title: s.title,
          description: `Status: ${s.status}, Phase: ${s.phase}`,
        }),
    ) ?? []

  return ScopeDriftPromptSchema.parse({
    planSlug: state.planSlug,
    planGoals,
    planNonGoals,
    relatedStoryDescriptions,
  })
}

/**
 * Calls the LLM adapter to detect scope drift, or returns null if no adapter.
 *
 * @param prompt - Drift detection prompt
 * @param llmAdapter - Optional LLM adapter (if absent, returns null)
 * @returns Drift detection result or null
 */
export async function detectScopeDrift(
  prompt: ScopeDriftPrompt,
  llmAdapter?: LlmScopeDriftDetectorFn,
): Promise<ScopeDriftResult | null> {
  if (!llmAdapter) {
    logger.info('check-scope-drift: no LLM adapter configured — skipping detection', {
      planSlug: prompt.planSlug,
    })
    return null
  }

  try {
    const result = await llmAdapter(prompt)
    return ScopeDriftResultSchema.parse(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('check-scope-drift: LLM detection failed', {
      planSlug: prompt.planSlug,
      error: msg,
    })
    return null
  }
}

/**
 * Converts a scope drift detection result into drift findings.
 *
 * Severity escalation logic:
 * - No drift detected → no findings
 * - hasDrift true AND confidence >= blockingThreshold → 'blocking'
 * - hasDrift true AND confidence >= warningThreshold  → 'warning'
 * - hasDrift true AND confidence < warningThreshold   → 'info'
 *
 * @param result - Scope drift result from LLM
 * @param blockingThreshold - Confidence at or above which drift is 'blocking'
 * @param warningThreshold - Confidence at or above which drift is 'warning'
 * @returns Array of DriftFindings
 */
export function buildScopeDriftFindings(
  result: ScopeDriftResult,
  blockingThreshold = 0.8,
  warningThreshold = 0.5,
): DriftFinding[] {
  if (!result.hasDrift) {
    return []
  }

  const severity =
    result.confidence >= blockingThreshold
      ? 'blocking'
      : result.confidence >= warningThreshold
        ? 'warning'
        : 'info'

  const driftAreasSummary =
    result.driftAreas.length > 0 ? result.driftAreas.join('; ') : 'No specific areas identified'

  return [
    DriftFindingSchema.parse({
      nodeId: 'check-scope-drift',
      category: 'scope_drift',
      severity,
      summary: `Scope drift detected: ${result.reasoning}`,
      detail: `Drift areas: ${driftAreasSummary}`,
      confidence: result.confidence,
    }),
  ]
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the check-scope-drift node for the Plan Revalidation Graph.
 *
 * @param config - Optional config with LLM adapter and threshold overrides
 * @returns LangGraph-compatible node function
 */
export function createCheckScopeDriftNode(
  config: Partial<CheckScopeDriftNodeConfig> & {
    llmAdapter?: LlmScopeDriftDetectorFn
  } = {},
) {
  const fullConfig = CheckScopeDriftNodeConfigSchema.parse(config)
  const llmAdapter = config.llmAdapter

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('check-scope-drift: starting', { planSlug: state.planSlug })

    try {
      const prompt = buildScopeDriftPrompt(state)
      const result = await detectScopeDrift(prompt, llmAdapter)

      if (result === null) {
        return { revalidationPhase: 'classify_drift' }
      }

      const findings = buildScopeDriftFindings(
        result,
        fullConfig.blockingDriftConfidenceThreshold,
        fullConfig.warningDriftConfidenceThreshold,
      )

      logger.info('check-scope-drift: complete', {
        planSlug: state.planSlug,
        hasDrift: result.hasDrift,
        confidence: result.confidence,
        findingCount: findings.length,
      })

      return {
        driftFindings: findings,
        revalidationPhase: 'classify_drift',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('check-scope-drift: unexpected error', { planSlug: state.planSlug, error: msg })
      return {
        revalidationPhase: 'error',
        errors: [`check-scope-drift: ${msg}`],
      }
    }
  }
}
