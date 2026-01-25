import { z } from 'zod'

/**
 * GateDecision enum - defines the possible outcomes of a QA gate evaluation.
 *
 * These are the values used in the GraphState.gateDecisions record.
 */
export const GateDecisionSchema = z.enum([
  'PASS', // Gate passed
  'CONCERNS', // Gate passed with concerns
  'FAIL', // Gate failed
  'WAIVED', // Gate waived (not applicable)
  'PENDING', // Gate not yet evaluated
])

/** TypeScript type inferred from GateDecisionSchema */
export type GateDecision = z.infer<typeof GateDecisionSchema>

/** Array of all valid GateDecision values */
export const GATE_DECISIONS = GateDecisionSchema.options
