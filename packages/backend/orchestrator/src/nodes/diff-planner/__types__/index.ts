/**
 * Diff Planner Node - Type Schemas
 *
 * Configuration and type definitions for the learning-aware diff planner node.
 * Reads model affinity profiles to inject affinity-aware summaries into the
 * decomposition prompt and pre-assigns escalation models for weak change types.
 *
 * APIP-3030: Learning-Aware Diff Planner
 */

import { z } from 'zod'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Minimum confidence level required to use an affinity profile.
 * Profiles below this threshold are treated as insufficient data.
 */
export const AFFINITY_CONFIDENCE_MIN = 0.5

/**
 * Success rate below which a change type is considered "weak" for a model.
 * Change specs with success_rate below this threshold trigger escalation pre-assignment.
 */
export const WEAKNESS_THRESHOLD = 0.6

/**
 * Maximum number of weak patterns to inject into the decomposition prompt.
 * Prevents prompt bloat on models with many weak change types.
 */
export const MAX_WEAK_PATTERNS_INJECTED = 5

/**
 * Maximum number of strong patterns to inject into the decomposition prompt.
 */
export const MAX_STRONG_PATTERNS_INJECTED = 3

/**
 * Default escalation model to use when pre-assigning escalation.
 */
export const ESCALATION_MODEL_DEFAULT = 'claude-sonnet-4-6'

/**
 * Configuration schema for the diff planner node.
 */
export const DiffPlannerConfigSchema = z.object({
  /**
   * Minimum confidence level to use an affinity profile (0-1).
   * Profiles below this are ignored (treated as cold-start).
   */
  affinityConfidenceMin: z.number().min(0).max(1).default(AFFINITY_CONFIDENCE_MIN),

  /**
   * Success rate threshold for marking a change type as "weak" (0-1).
   * Change types below this trigger escalation model pre-assignment.
   */
  weaknessThreshold: z.number().min(0).max(1).default(WEAKNESS_THRESHOLD),

  /**
   * Maximum weak patterns to inject into the prompt.
   */
  maxWeakPatternsInjected: z.number().int().positive().default(MAX_WEAK_PATTERNS_INJECTED),

  /**
   * Maximum strong patterns to inject into the prompt.
   */
  maxStrongPatternsInjected: z.number().int().positive().default(MAX_STRONG_PATTERNS_INJECTED),

  /**
   * Default escalation model ID for pre-assignment.
   */
  escalationModelDefault: z.string().min(1).default(ESCALATION_MODEL_DEFAULT),
})

export type DiffPlannerConfig = z.infer<typeof DiffPlannerConfigSchema>

// ============================================================================
// Affinity Profile Schema
// ============================================================================

/**
 * Schema for a model affinity record from wint.model_affinity.
 * Represents learned performance data for a (model_id, change_type) pair.
 */
export const AffinityProfileSchema = z.object({
  /** Model identifier (e.g., 'claude-sonnet-4-6') */
  model_id: z.string().min(1),

  /** Change type this affinity is for (e.g., 'schema_migration', 'api_endpoint') */
  change_type: z.string().min(1),

  /** Success rate on this change type (0-1) */
  success_rate: z.number().min(0).max(1),

  /** Confidence level based on sample size (0-1) */
  confidence: z.number().min(0).max(1),

  /** Number of samples used to compute this profile */
  sample_count: z.number().int().min(0),

  /** Optional notes about strong patterns for this change type */
  strong_patterns: z.array(z.string()).optional(),

  /** Optional notes about weak patterns for this change type */
  weak_patterns: z.array(z.string()).optional(),

  /** Timestamp of last update */
  updated_at: z.string().datetime().optional(),
})

export type AffinityProfile = z.infer<typeof AffinityProfileSchema>
