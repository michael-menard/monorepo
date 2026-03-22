import { z } from 'zod'

/**
 * SCOPE-CHALLENGES Schema (Canonical)
 *
 * Captures scope challenges identified during story elaboration.
 * Hard constraint: max 5 challenges per story.
 * Written by story-attack-agent and scope-defend node, read by elab-completion-leader.
 *
 * WINT-8060: This is the authoritative schema. scope-defend.ts imports from here.
 */

export const RecommendationSchema = z.enum(['defer-to-backlog', 'reduce-scope', 'accept-as-mvp'])

export type Recommendation = z.infer<typeof RecommendationSchema>

export const RiskIfDeferredSchema = z.enum(['critical', 'high', 'medium', 'low', 'none'])

export type RiskIfDeferred = z.infer<typeof RiskIfDeferredSchema>

export const ScopeChallengeSchema = z.object({
  id: z.string().min(1),
  /** Human-readable description (used by story-attack-agent) */
  description: z.string().min(1).optional(),
  /** AC or feature target identifier (used by scope-defend node) */
  target: z.string().min(1).optional(),
  /** One-line challenge explanation (used by scope-defend node) */
  challenge: z.string().min(1).optional(),
  recommendation: RecommendationSchema,
  risk_if_deferred: RiskIfDeferredSchema,
  deferral_note: z.string().optional(),
})

export type ScopeChallenge = z.infer<typeof ScopeChallengeSchema>

export const ScopeChallengesSchema = z.object({
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  challenges: z.array(ScopeChallengeSchema).max(5, 'Maximum 5 scope challenges allowed'),
  /** Count of items reviewed before cap (scope-defend node) */
  total_candidates_reviewed: z.number().int().nonnegative().optional(),
  /** True if more than 5 candidates qualified (scope-defend node) */
  truncated: z.boolean().optional(),
  /** Warning identifiers (scope-defend node) */
  warnings: z.array(z.string()).optional(),
  /** Count of warnings (scope-defend node) */
  warning_count: z.number().int().nonnegative().optional(),
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
