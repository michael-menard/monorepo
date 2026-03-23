/**
 * Check Approach Valid Node — Plan Revalidation Graph
 *
 * Optionally calls an LLM to validate whether the plan's proposed approach
 * is still valid given the current context. If no LLM adapter is provided,
 * the node skips validation and emits no findings.
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
 * The prompt sent to the LLM for approach validation.
 */
export const ApproachValidationPromptSchema = z.object({
  planSlug: z.string().min(1),
  contextSummary: z.string(),
  proposedApproach: z.string(),
  relatedStoryTitles: z.array(z.string()),
})

export type ApproachValidationPrompt = z.infer<typeof ApproachValidationPromptSchema>

/**
 * The result returned by the LLM approach validator.
 */
export const ApproachValidationResultSchema = z.object({
  isValid: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  issues: z.array(z.string()),
})

export type ApproachValidationResult = z.infer<typeof ApproachValidationResultSchema>

// ============================================================================
// Adapter Types
// ============================================================================

/**
 * LLM adapter for approach validation.
 * If undefined, the node skips LLM validation entirely.
 */
export type LlmApproachValidatorFn = (
  prompt: ApproachValidationPrompt,
) => Promise<ApproachValidationResult>

// ============================================================================
// Config Schema
// ============================================================================

export const CheckApproachValidNodeConfigSchema = z.object({
  /** Confidence threshold below which a finding is escalated to 'blocking' */
  blockingConfidenceThreshold: z.number().min(0).max(1).default(0.3),
  /** Confidence threshold below which a finding is 'warning' (else 'info') */
  warningConfidenceThreshold: z.number().min(0).max(1).default(0.7),
})

export type CheckApproachValidNodeConfig = z.infer<typeof CheckApproachValidNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Builds an approach validation prompt from the current state.
 *
 * @param state - Current revalidation state
 * @returns ApproachValidationPrompt
 */
export function buildApproachPrompt(state: PlanRevalidationState): ApproachValidationPrompt {
  const planContent = state.rawPlan ?? {}
  const snapshot = state.contextSnapshot
  const relatedStoryTitles =
    snapshot?.relatedStories.map((s: { title: string }) => s.title).filter(Boolean) ?? []

  const proposedApproach =
    typeof planContent['approach'] === 'string'
      ? planContent['approach']
      : typeof planContent['description'] === 'string'
        ? planContent['description']
        : JSON.stringify(planContent).slice(0, 500)

  const contextSummary = snapshot
    ? `Plan: ${snapshot.planSlug}. Stories: ${snapshot.relatedStories.length}. Loaded at: ${snapshot.loadedAt}.`
    : `Plan: ${state.planSlug}. No context snapshot available.`

  return ApproachValidationPromptSchema.parse({
    planSlug: state.planSlug,
    contextSummary,
    proposedApproach,
    relatedStoryTitles,
  })
}

/**
 * Calls the LLM adapter to validate the approach, or returns null if no adapter.
 *
 * @param prompt - Validation prompt
 * @param llmAdapter - Optional LLM adapter (if absent, returns null)
 * @returns Validation result or null
 */
export async function validateApproach(
  prompt: ApproachValidationPrompt,
  llmAdapter?: LlmApproachValidatorFn,
): Promise<ApproachValidationResult | null> {
  if (!llmAdapter) {
    logger.info('check-approach-valid: no LLM adapter configured — skipping validation', {
      planSlug: prompt.planSlug,
    })
    return null
  }

  try {
    const result = await llmAdapter(prompt)
    return ApproachValidationResultSchema.parse(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('check-approach-valid: LLM validation failed', {
      planSlug: prompt.planSlug,
      error: msg,
    })
    return null
  }
}

/**
 * Converts a validation result into drift findings.
 * Severity is determined by confidence:
 *   - confidence < blockingThreshold → 'blocking'
 *   - confidence < warningThreshold  → 'warning'
 *   - else                           → 'info'
 *
 * @param result - Validation result from LLM
 * @param blockingThreshold - Confidence below which severity is 'blocking'
 * @param warningThreshold - Confidence below which severity is 'warning'
 * @returns Array of DriftFindings (empty if approach is valid with high confidence)
 */
export function buildApproachFindings(
  result: ApproachValidationResult,
  blockingThreshold = 0.3,
  warningThreshold = 0.7,
): DriftFinding[] {
  if (result.isValid && result.confidence >= warningThreshold) {
    return []
  }

  const severity =
    result.confidence < blockingThreshold
      ? 'blocking'
      : result.confidence < warningThreshold
        ? 'warning'
        : 'info'

  const issues = result.issues.length > 0 ? result.issues.join('; ') : 'No specific issues listed'

  return [
    DriftFindingSchema.parse({
      nodeId: 'check-approach-valid',
      category: 'approach_invalid',
      severity,
      summary: result.isValid
        ? `Approach may be valid but low confidence: ${result.reasoning}`
        : `Approach may be invalid: ${result.reasoning}`,
      detail: issues,
      confidence: result.confidence,
    }),
  ]
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the check-approach-valid node for the Plan Revalidation Graph.
 *
 * @param config - Optional config with LLM adapter and threshold overrides
 * @returns LangGraph-compatible node function
 */
export function createCheckApproachValidNode(
  config: Partial<CheckApproachValidNodeConfig> & {
    llmAdapter?: LlmApproachValidatorFn
  } = {},
) {
  const fullConfig = CheckApproachValidNodeConfigSchema.parse(config)
  const llmAdapter = config.llmAdapter

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('check-approach-valid: starting', { planSlug: state.planSlug })

    try {
      const prompt = buildApproachPrompt(state)
      const result = await validateApproach(prompt, llmAdapter)

      if (result === null) {
        return { revalidationPhase: 'check_dependencies' }
      }

      const findings = buildApproachFindings(
        result,
        fullConfig.blockingConfidenceThreshold,
        fullConfig.warningConfidenceThreshold,
      )

      logger.info('check-approach-valid: complete', {
        planSlug: state.planSlug,
        isValid: result.isValid,
        confidence: result.confidence,
        findingCount: findings.length,
      })

      return {
        driftFindings: findings,
        revalidationPhase: 'check_dependencies',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('check-approach-valid: unexpected error', {
        planSlug: state.planSlug,
        error: msg,
      })
      return {
        revalidationPhase: 'error',
        errors: [`check-approach-valid: ${msg}`],
      }
    }
  }
}
