/**
 * validate_graph Node
 *
 * Validates the generated story graph using an injectable GraphValidatorFn adapter.
 * Default: no-op returns {passed: true, errors: [], warnings: []}.
 *
 * When a real adapter is wired:
 * - Cycle detection → hard error (generationPhase='error')
 * - Orphan/duplicate/min-path-coverage issues → warnings
 *
 * APRS-4020: ST-3 (AC-5/6)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  GeneratedStory,
  DependencyEdge,
  ValidationResult,
  StoryGenerationState,
} from '../../state/story-generation-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable graph validator function.
 * Default: no-op returning {passed: true, errors: [], warnings: []}.
 *
 * When real adapter is wired:
 * - cycles → errors[] (hard failure)
 * - orphans/duplicates/min-path-coverage → warnings[]
 */
export type GraphValidatorFn = (
  stories: GeneratedStory[],
  edges: DependencyEdge[],
) => ValidationResult

// ============================================================================
// Config Schema
// ============================================================================

export const ValidateGraphConfigSchema = z.object({
  /** Injectable graph validator adapter */
  graphValidator: z.function().optional(),
})

export type ValidateGraphConfig = z.infer<typeof ValidateGraphConfigSchema>

// ============================================================================
// Default No-Op Validator
// ============================================================================

/**
 * Default no-op graph validator.
 * Always passes — no structural validation applied.
 */
export function defaultGraphValidatorFn(
  _stories: GeneratedStory[],
  _edges: DependencyEdge[],
): ValidationResult {
  return { passed: true, errors: [], warnings: [] }
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the validate_graph LangGraph node.
 *
 * AC-5: Injectable GraphValidatorFn adapter (default: no-op).
 * AC-6: Cycle detection → generationPhase='error'; otherwise → generationPhase='complete'.
 *
 * @param config - Optional config with injectable graphValidator
 */
export function createValidateGraphNode(config: { graphValidator?: GraphValidatorFn } = {}) {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('validate_graph: starting', {
        planSlug: state.planSlug,
        storyCount: state.orderedStories.length,
        edgeCount: state.dependencyEdges.length,
      })

      const validatorFn = config.graphValidator ?? defaultGraphValidatorFn

      const validationResult = validatorFn(state.orderedStories, state.dependencyEdges)

      logger.info('validate_graph: complete', {
        planSlug: state.planSlug,
        passed: validationResult.passed,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
      })

      // Hard errors (e.g. cycles) → error phase
      if (!validationResult.passed) {
        logger.error('validate_graph: validation failed', {
          planSlug: state.planSlug,
          errors: validationResult.errors,
        })
        return {
          validationResult,
          generationPhase: 'error',
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        }
      }

      // Passed (with optional warnings) → complete
      return {
        validationResult,
        generationPhase: 'complete',
        warnings: validationResult.warnings,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('validate_graph: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationPhase: 'error',
        errors: [`validate_graph failed: ${message}`],
      }
    }
  }
}
