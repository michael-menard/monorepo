/**
 * slice_flows Node
 *
 * Applies a slicing heuristic to flows and produces SlicedFlow[] output.
 *
 * Slicing heuristic (DEC-2):
 * - Distinct side-effect or actor boundary = separate slice
 * - Pure data-passing in the same actor merged into its predecessor
 * - Single-step flows → exactly one slice
 *
 * APRS-4010: ST-3
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Flow, FlowStep } from '../../state/plan-refinement-state.js'
import {
  SlicedFlowSchema,
  type SlicedFlow,
  type StoryGenerationState,
} from '../../state/story-generation-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const SliceFlowsConfigSchema = z.object({
  /** Maximum number of steps per slice (default: 5) */
  maxStepsPerSlice: z.number().int().positive().optional(),
})

export type SliceFlowsConfig = z.infer<typeof SliceFlowsConfigSchema>

// ============================================================================
// Slicing Heuristic Implementation (exported for unit testability)
// ============================================================================

/**
 * Determine if a step represents an actor or side-effect boundary.
 * A boundary exists when:
 * - The step has a different actor than the previous step
 * - The step description contains side-effect keywords (save, write, send, create, delete, update, emit, publish, notify)
 */
export function isBoundaryStep(step: FlowStep, previousStep: FlowStep | null): boolean {
  if (!previousStep) return false

  // Actor boundary
  const currentActor = step.actor ?? ''
  const previousActor = previousStep.actor ?? ''
  if (currentActor && previousActor && currentActor !== previousActor) {
    return true
  }

  // Side-effect boundary — keywords in step description
  const sideEffectPattern =
    /\b(save|write|send|create|delete|update|emit|publish|notify|store|persist|dispatch|trigger)\b/i
  if (sideEffectPattern.test(step.description)) {
    return true
  }

  return false
}

/**
 * Build a scope description for a set of steps.
 */
export function buildScopeDescription(flow: Flow, stepIndices: number[]): string {
  const steps = flow.steps.filter(s => stepIndices.includes(s.index))
  if (steps.length === 0) return `${flow.name} (no steps)`
  if (steps.length === 1) return steps[0].description
  return `${steps[0].description} through ${steps[steps.length - 1].description}`
}

/**
 * Slice a single flow into SlicedFlow[] using the DEC-2 heuristic.
 *
 * Rules:
 * - Single-step flows → exactly one slice
 * - Distinct side-effect or actor boundary = separate slice
 * - Pure data-passing in same actor → merged into predecessor
 */
export function sliceFlow(flow: Flow): SlicedFlow[] {
  const steps = flow.steps

  // Single-step flows → exactly one slice
  if (steps.length <= 1) {
    const stepIndices = steps.map(s => s.index)
    return [
      SlicedFlowSchema.parse({
        flow_id: flow.id,
        step_indices: stepIndices.length > 0 ? stepIndices : [1],
        scope_description: steps.length > 0 ? steps[0].description : flow.name,
      }),
    ]
  }

  // Multi-step: apply boundary heuristic
  const slices: SlicedFlow[] = []
  let currentIndices: number[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const previousStep = i > 0 ? steps[i - 1] : null

    if (currentIndices.length > 0 && isBoundaryStep(step, previousStep)) {
      // Commit current slice
      slices.push(
        SlicedFlowSchema.parse({
          flow_id: flow.id,
          step_indices: currentIndices,
          scope_description: buildScopeDescription(flow, currentIndices),
        }),
      )
      currentIndices = []
    }

    currentIndices.push(step.index)
  }

  // Commit final slice
  if (currentIndices.length > 0) {
    slices.push(
      SlicedFlowSchema.parse({
        flow_id: flow.id,
        step_indices: currentIndices,
        scope_description: buildScopeDescription(flow, currentIndices),
      }),
    )
  }

  return slices
}

/**
 * Slice all flows in the state into SlicedFlow[].
 */
export function sliceAllFlows(flows: Flow[]): SlicedFlow[] {
  return flows.flatMap(flow => sliceFlow(flow))
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the slice_flows LangGraph node.
 *
 * AC-4: Output: slicedFlows[] with flow_id, step_indices, scope_description.
 * Applies DEC-2 heuristic: distinct side-effect or actor boundary = separate slice.
 *
 * @param config - Optional config
 */
export function createSliceFlowsNode(_config: SliceFlowsConfig = {}) {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('slice_flows: starting', {
        planSlug: state.planSlug,
        flowCount: state.flows.length,
      })

      if (state.flows.length === 0) {
        logger.warn('slice_flows: no flows to slice', { planSlug: state.planSlug })
        return {
          slicedFlows: [],
          generationPhase: 'generate_stories',
          warnings: ['slice_flows: no confirmed flows found to slice'],
        }
      }

      const slicedFlows = sliceAllFlows(state.flows)

      logger.info('slice_flows: complete', {
        planSlug: state.planSlug,
        inputFlows: state.flows.length,
        outputSlices: slicedFlows.length,
      })

      return {
        slicedFlows,
        generationPhase: 'generate_stories',
        errors: [],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('slice_flows: unexpected error', { err, planSlug: state.planSlug })
      return {
        generationPhase: 'error',
        errors: [`slice_flows failed: ${message}`],
      }
    }
  }
}
