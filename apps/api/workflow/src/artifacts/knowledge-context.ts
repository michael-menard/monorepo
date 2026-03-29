import { z } from 'zod'

/**
 * KNOWLEDGE-CONTEXT.yaml Schema
 *
 * Persisted knowledge context including lessons learned and ADRs.
 * Written by knowledge-context-loader, read by plan/execute/qa phases.
 */

export const LessonSchema = z.object({
  story_id: z.string(),
  lesson: z.string(),
  category: z.enum(['blocker', 'pattern', 'time_sink', 'reuse', 'anti_pattern']),
  applies_because: z.string(),
})

export type Lesson = z.infer<typeof LessonSchema>

export const AdrSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['active', 'proposed', 'deprecated', 'superseded']),
  constraint: z.string(),
  applies_to: z.array(z.string()),
})

export type Adr = z.infer<typeof AdrSchema>

export const HighCostOperationSchema = z.object({
  operation: z.string(),
  typical_tokens: z.number().int().positive(),
  mitigation: z.string(),
})

export type HighCostOperation = z.infer<typeof HighCostOperationSchema>

/**
 * PatternDiscoveryResultSchema — one result from artifact_search.
 *
 * Distinct from lessons_learned: lessons_learned entries come from kb_search over
 * entries tagged "lesson-learned" (manually curated). PatternDiscoveryResult entries
 * come from artifact_search over indexed artifact embeddings (semantic similarity).
 */
export const PatternDiscoveryResultSchema = z.object({
  /** Story ID the artifact belongs to (e.g. "KBAR-0130") */
  story_id: z.string(),
  /** Artifact type returned by artifact_search (e.g. "evidence", "plan") */
  artifact_type: z.string(),
  /** Brief summary of what the artifact contains */
  content_summary: z.string(),
  /** Relevance score from artifact_search (0.0–1.0) */
  relevance_score: z.number().min(0).max(1),
  /** Phase the artifact was produced in (e.g. "implementation", "planning") */
  phase: z.string().optional(),
})

export type PatternDiscoveryResult = z.infer<typeof PatternDiscoveryResultSchema>

export const KnowledgeContextSchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),
  loaded: z.boolean(),

  lessons_learned: z.object({
    count: z.number().int().min(0),
    relevant_to_scope: z.array(LessonSchema).default([]),
    blockers_to_avoid: z.array(z.string()).default([]),
    patterns_to_follow: z.array(z.string()).default([]),
    patterns_to_avoid: z.array(z.string()).default([]),
  }),

  /**
   * pattern_discovery — results from artifact_search (Phase 1.5).
   *
   * These are semantically similar artifacts from past stories, found via embedding
   * similarity rather than explicit tags. Distinct from lessons_learned which uses
   * kb_search over manually tagged "lesson-learned" entries.
   */
  pattern_discovery: z.array(PatternDiscoveryResultSchema).default([]),

  architecture_decisions: z.object({
    active_count: z.number().int().min(0),
    relevant_adrs: z.array(AdrSchema).default([]),
    constraints: z
      .object({
        api_paths: z.string().optional(),
        infrastructure: z.string().optional(),
        storage: z.string().optional(),
        auth: z.string().optional(),
        testing: z.string().optional(),
      })
      .optional(),
  }),

  token_optimization: z.object({
    high_cost_operations: z.array(HighCostOperationSchema).default([]),
    recommended_patterns: z.array(z.string()).default([]),
  }),

  // Attack vectors from past failures
  attack_vectors: z.array(z.string()).default([]),

  // Mistakes not to repeat
  do_not_repeat: z.array(z.string()).default([]),

  // Warnings about missing context
  warnings: z.array(z.string()).default([]),

  // Token usage for this load
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type KnowledgeContext = z.infer<typeof KnowledgeContextSchema>

/**
 * Create an empty knowledge context
 */
export function createKnowledgeContext(storyId: string): KnowledgeContext {
  return {
    schema: 1,
    story_id: storyId,
    timestamp: new Date().toISOString(),
    loaded: false,
    lessons_learned: {
      count: 0,
      relevant_to_scope: [],
      blockers_to_avoid: [],
      patterns_to_follow: [],
      patterns_to_avoid: [],
    },
    pattern_discovery: [],
    architecture_decisions: {
      active_count: 0,
      relevant_adrs: [],
    },
    token_optimization: {
      high_cost_operations: [],
      recommended_patterns: [],
    },
    attack_vectors: [],
    do_not_repeat: [],
    warnings: [],
  }
}
