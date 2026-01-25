import { z } from 'zod'

/**
 * GateType enum - defines the categories of QA gates in the workflow.
 *
 * These are the keys used in the GraphState.gateDecisions record.
 */
export const GateTypeSchema = z.enum([
  'codeReview', // Code review gate
  'qaVerify', // QA verification gate
  'uiuxReview', // UI/UX review gate
  'qaGate', // Final QA gate
])

/** TypeScript type inferred from GateTypeSchema */
export type GateType = z.infer<typeof GateTypeSchema>

/** Array of all valid GateType values */
export const GATE_TYPES = GateTypeSchema.options
