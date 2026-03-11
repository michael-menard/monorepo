import { z } from 'zod'

/**
 * EVIDENCE-EXPECTATIONS Schema
 *
 * Captures the expected evidence items that must be produced during implementation.
 * Written by planner (dev-plan-leader), read by dev-execute-leader to verify evidence mapping.
 */

export const EvidenceTypeSchema = z.enum(['test', 'file', 'command', 'manual'])

export type EvidenceType = z.infer<typeof EvidenceTypeSchema>

export const ExpectationSchema = z.object({
  id: z.string().min(1),
  ac_id: z.string().min(1),
  description: z.string().min(1),
  evidence_type: EvidenceTypeSchema,
  verification_command: z.string().optional(),
  required: z.boolean().default(true),
})

export type Expectation = z.infer<typeof ExpectationSchema>

export const EvidenceExpectationsSchema = z.object({
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  expectations: z.array(ExpectationSchema).default([]),
})

export type EvidenceExpectations = z.infer<typeof EvidenceExpectationsSchema>

/**
 * Create an initial evidence expectations artifact for a story
 */
export function createEvidenceExpectations(storyId: string): EvidenceExpectations {
  return {
    story_id: storyId,
    generated_at: new Date().toISOString(),
    expectations: [],
  }
}
