/**
 * slice_flows Node
 *
 * Applies the slicing heuristic (DEC-2) to split flows into story-sized
 * SlicedFlow entries. Each flow step with a distinct side-effect or actor
 * boundary becomes a separate slice. Pure data-passing steps within the
 * same actor are merged into the predecessor.
 *
 * AC-4: Output slicedFlows[] with flow_id, step_indices, scope_description.
 *
 * APRS-4010: ST-3
 */

import { logger } from '@repo/logger'
import type { Flow, FlowStep } from '../../state/plan-refinement-state.js'
import type { SlicedFlow, StoryGenerationState } from '../../state/story-generation-state.js'

// ============================================================================
// Side-Effect Detection
// ============================================================================

/**
 * Keywords that indicate a step has a distinct side-effect.
 * Steps containing these are slice boundaries.
 */
const SIDE_EFFECT_KEYWORDS = [
  'save',
  'write',
  'send',
  'create',
  'delete',
  'update',
  'emit',
  'publish',
  'notify',
  'insert',
  'remove',
  'store',
  'persist',
  'upload',
  'download',
  'deploy',
  'execute',
  'trigger',
  'submit',
  'commit',
  'push',
  'merge',
  'approve',
  'reject',
  'validate',
]

/**
 * Determines if a flow step has a distinct side-effect.
 */
export function hasSideEffect(step: FlowStep): boolean {
  const desc = step.description.toLowerCase()
  return SIDE_EFFECT_KEYWORDS.some(keyword => desc.includes(keyword))
}

/**
 * Determines if a step has a different actor from the previous step.
 */
export function hasActorBoundary(step: FlowStep, flowActor: string, prevStep?: FlowStep): boolean {
  const currentActor = step.actor ?? flowActor
  const previousActor = prevStep?.actor ?? flowActor
  return currentActor !== previousActor
}

// ============================================================================
// Slicing Logic
// ============================================================================

/**
 * Slices a single flow into SlicedFlow entries.
 *
 * DEC-2 heuristic:
 * - Each step with a distinct side-effect or actor boundary = separate slice
 * - Pure data-passing steps within same actor merged into predecessor
 * - Single-step flows produce exactly one slice
 */
export function sliceFlow(flow: Flow): SlicedFlow[] {
  const { steps } = flow

  // Single-step flows → exactly one slice
  if (steps.length <= 1) {
    return [
      {
        flow_id: flow.id,
        step_indices: steps.map(s => s.index),
        scope_description: steps.length === 1 ? steps[0].description : `Empty flow: ${flow.name}`,
      },
    ]
  }

  const slices: SlicedFlow[] = []
  let currentIndices: number[] = []
  let currentDescriptions: string[] = []

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const prevStep = i > 0 ? steps[i - 1] : undefined
    const isBoundary = hasSideEffect(step) || hasActorBoundary(step, flow.actor, prevStep)

    if (isBoundary && currentIndices.length > 0) {
      // Flush current accumulator as a slice
      slices.push({
        flow_id: flow.id,
        step_indices: [...currentIndices],
        scope_description: currentDescriptions.join('; '),
      })
      currentIndices = []
      currentDescriptions = []
    }

    currentIndices.push(step.index)
    currentDescriptions.push(step.description)
  }

  // Flush remaining steps
  if (currentIndices.length > 0) {
    slices.push({
      flow_id: flow.id,
      step_indices: currentIndices,
      scope_description: currentDescriptions.join('; '),
    })
  }

  return slices
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the slice_flows LangGraph node.
 *
 * AC-4: Applies slicing heuristic to flows, outputs slicedFlows[].
 */
export function createSliceFlowsNode() {
  return async (state: StoryGenerationState): Promise<Partial<StoryGenerationState>> => {
    try {
      logger.info('slice_flows: starting', {
        planSlug: state.planSlug,
        flowCount: state.flows.length,
      })

      if (state.flows.length === 0) {
        logger.warn('slice_flows: no flows to slice')
        return {
          generationPhase: 'error',
          errors: ['slice_flows: no flows provided'],
        }
      }

      const allSlices: SlicedFlow[] = []
      for (const flow of state.flows) {
        const slices = sliceFlow(flow)
        allSlices.push(...slices)
      }

      logger.info('slice_flows: complete', {
        planSlug: state.planSlug,
        flowCount: state.flows.length,
        sliceCount: allSlices.length,
      })

      return {
        slicedFlows: allSlices,
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
