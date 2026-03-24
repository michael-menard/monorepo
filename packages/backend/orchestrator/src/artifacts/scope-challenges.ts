import { z } from 'zod'

/**
 * SCOPE-CHALLENGES Schema
 *
 * Captures scope challenges identified during story elaboration.
 * Hard constraint: max 5 challenges per story.
 * Written by story-attack-agent, read by elab-completion-leader.
 */

export const RecommendationSchema = z.enum(['defer-to-backlog', 'reduce-scope', 'accept-as-mvp'])

export type Recommendation = z.infer<typeof RecommendationSchema>

export const RiskIfDeferredSchema = z.enum(['critical', 'high', 'medium', 'low', 'none'])

export type RiskIfDeferred = z.infer<typeof RiskIfDeferredSchema>

export const ScopeChallengeSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  recommendation: RecommendationSchema,
  risk_if_deferred: RiskIfDeferredSchema,
  deferral_note: z.string().optional(),
})

export type ScopeChallenge = z.infer<typeof ScopeChallengeSchema>

export const ScopeChallengesSchema = z.object({
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  challenges: z.array(ScopeChallengeSchema).max(5, 'Maximum 5 scope challenges allowed'),
})

export type ScopeChallenges = z.infer<typeof ScopeChallengesSchema>

/**
 * Create an initial scope challenges artifact for a story
 */
export function createScopeChallenges(storyId: string): ScopeChallenges {
  return {
    story_id: storyId,
    generated_at: new Date().toISOString(),
    challenges: [],
  }
}
