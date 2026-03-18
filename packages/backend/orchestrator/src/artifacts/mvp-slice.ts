import { z } from 'zod'

/**
 * MVP-SLICE Schema
 *
 * Defines which acceptance criteria are included in the MVP slice vs. deferred.
 * Written by elab-analyst or elab-completion-leader during elaboration.
 * Read by dev-setup-leader to understand story scope.
 */

export const MvpSliceSchema = z.object({
  schema_version: z.literal('1.0'),
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  included_acs: z.array(z.string()).min(1, 'MVP slice must include at least one AC'),
  excluded_acs: z.array(z.string()).default([]),
  rationale: z.string().min(1),
})

export type MvpSlice = z.infer<typeof MvpSliceSchema>

/**
 * Create an MVP slice artifact for a story
 */
export function createMvpSlice(
  storyId: string,
  includedAcs: string[],
  rationale: string,
): MvpSlice {
  return {
    schema_version: '1.0',
    story_id: storyId,
    generated_at: new Date().toISOString(),
    included_acs: includedAcs,
    excluded_acs: [],
    rationale,
  }
}
