import { z } from 'zod'

/**
 * Question type enumeration for decision requests
 */
export const QuestionTypeSchema = z.enum(['single-choice', 'multi-select', 'text-input'])
export type QuestionType = z.infer<typeof QuestionTypeSchema>

/**
 * Decision option schema with optional metadata
 */
export const DecisionOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string().optional(),
  recommended: z.boolean().optional(),
})
export type DecisionOption = z.infer<typeof DecisionOptionSchema>

/**
 * Decision request schema with validation
 */
export const DecisionRequestSchema = z.object({
  id: z.string().uuid(),
  type: QuestionTypeSchema,
  question: z.string().min(1),
  options: z.array(DecisionOptionSchema).min(1),
  context: z.record(z.unknown()).optional(),
  timeout_ms: z.number().int().positive().default(30000),
})
export type DecisionRequest = z.infer<typeof DecisionRequestSchema>

/**
 * Decision response schema with status flags
 */
export const DecisionResponseSchema = z.object({
  id: z.string().uuid(),
  answer: z.union([z.string(), z.array(z.string())]),
  cancelled: z.boolean().default(false),
  timedOut: z.boolean().default(false),
  timestamp: z.string().datetime(),
})
export type DecisionResponse = z.infer<typeof DecisionResponseSchema>

/**
 * Base interface for decision callback implementations
 *
 * Note: This is the only interface allowed (not derived from Zod) as it defines
 * the contract that implementations must follow. All data types use Zod schemas.
 */
export interface DecisionCallback {
  /**
   * Request a decision from the user or automated system
   */
  ask(request: DecisionRequest): Promise<DecisionResponse>

  /**
   * Optional cleanup method for resources
   */
  cleanup?(): void
}
