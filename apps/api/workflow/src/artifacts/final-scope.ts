import { z } from 'zod'

/**
 * FINAL-SCOPE Schema
 *
 * Formalizes the final accepted scope after elaboration is complete.
 * Uses z.literal('1.0') to distinguish from provisional schema_version '1.0-draft'.
 * Written by elab-completion-leader, read by dev-setup-leader.
 */

export const FinalAcSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  in_mvp: z.boolean(),
})

export type FinalAc = z.infer<typeof FinalAcSchema>

export const FollowupSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  conflict: z.boolean(),
  suggested_story_id: z.string().optional(),
})

export type Followup = z.infer<typeof FollowupSchema>

export const FinalScopeSchema = z.object({
  schema_version: z.literal('1.0'),
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  final_acs: z.array(FinalAcSchema).min(1, 'Final scope must define at least one AC'),
  followups: z.array(FollowupSchema).default([]),
  warnings: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

export type FinalScope = z.infer<typeof FinalScopeSchema>

/**
 * Create a final scope artifact for a story
 */
export function createFinalScope(storyId: string, finalAcs: FinalAc[]): FinalScope {
  return {
    schema_version: '1.0',
    story_id: storyId,
    generated_at: new Date().toISOString(),
    final_acs: finalAcs,
    followups: [],
    warnings: [],
  }
}
