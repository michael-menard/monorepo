/**
 * DiffPlannerOutput Artifact Schema
 *
 * Defines the output shape for the Diff Planner node (APIP-3030).
 * Includes profile_metadata for observability into affinity-driven decisions
 * and a placeholder ChangeSpec for integration with APIP-1020.
 *
 * APIP-3030: Learning-Aware Diff Planner
 *
 * @see artifacts/plan.ts for z.literal(1) versioning pattern
 */

import { z } from 'zod'

// ============================================================================
// Change Spec (Placeholder — awaiting APIP-1020)
// ============================================================================

/**
 * Placeholder schema for a single change specification.
 *
 * TODO: Replace with full ChangeSpec schema from APIP-1020 when available.
 * APIP-1020 will provide the canonical definition of change types,
 * affected files, and decomposition metadata.
 */
export const PlaceholderChangeSpecSchema = z.object({
  /** Unique identifier for this change spec */
  id: z.string().min(1),

  /**
   * The type of change being planned.
   * TODO (APIP-1020): Replace with typed ChangeTypeEnum from change-spec schema.
   */
  change_type: z.string().min(1),

  /**
   * Human-readable description of what this change involves.
   */
  description: z.string().min(1),

  /**
   * Estimated complexity of the change.
   * TODO (APIP-1020): Integrate with scoring system from APIP-1020.
   */
  complexity: z.enum(['low', 'medium', 'high']).optional(),

  /**
   * Escalation model pre-assigned for this change spec.
   * Set when success_rate < WEAKNESS_THRESHOLD for the current model.
   * Null means no escalation needed.
   */
  escalation_model: z.string().nullable().default(null),

  /**
   * Affinity-derived notes injected into the decomposition prompt for this spec.
   */
  affinity_notes: z.string().optional(),
})

export type PlaceholderChangeSpec = z.infer<typeof PlaceholderChangeSpecSchema>

// ============================================================================
// Profile Metadata Schema
// ============================================================================

/**
 * Metadata about the affinity profile used during planning.
 * Attached to the output for observability and debugging.
 */
export const ProfileMetadataSchema = z.object({
  /** Whether an affinity profile was found and used */
  profile_used: z.boolean(),

  /** Model ID whose profile was queried */
  model_id: z.string().min(1),

  /** Confidence level of the profile (0-1), null if no profile */
  confidence_level: z.number().min(0).max(1).nullable(),

  /** Number of weak patterns injected into the prompt */
  weak_patterns_injected: z.number().int().min(0),

  /** Number of strong patterns injected into the prompt */
  strong_patterns_injected: z.number().int().min(0),

  /** Whether escalation was pre-assigned for any change spec */
  escalation_preassigned: z.boolean(),

  /** Number of change specs that received escalation pre-assignment */
  escalation_count: z.number().int().min(0),
})

export type ProfileMetadata = z.infer<typeof ProfileMetadataSchema>

// ============================================================================
// Diff Planner Output Schema
// ============================================================================

/**
 * Complete output schema for the Diff Planner node.
 *
 * Versioned at z.literal(1) following the pattern in artifacts/plan.ts.
 * All paths must produce a valid DiffPlannerOutput that passes Zod validation.
 */
export const DiffPlannerOutputSchema = z.object({
  /** Schema version — always 1 */
  schema: z.literal(1),

  /** Story ID this output belongs to */
  story_id: z.string().min(1),

  /** Timestamp when this output was produced */
  produced_at: z.string().datetime(),

  /**
   * The change specifications enriched with affinity data.
   * TODO (APIP-1020): Replace PlaceholderChangeSpecSchema with full ChangeSpecSchema.
   */
  change_specs: z.array(PlaceholderChangeSpecSchema),

  /**
   * Affinity-aware decomposition prompt injected with profile summaries.
   * This is the prompt fragment to prepend to the standard decomposition prompt.
   */
  affinity_prompt_fragment: z.string(),

  /**
   * Metadata about the affinity profile used (optional).
   * Present when a profile was queried; null on cold-start or error.
   */
  profile_metadata: ProfileMetadataSchema.nullable(),

  /**
   * Whether the diff planning completed successfully.
   */
  success: z.boolean(),

  /**
   * Error message if planning failed (graceful fallback).
   */
  error: z.string().optional(),
})

export type DiffPlannerOutput = z.infer<typeof DiffPlannerOutputSchema>

/**
 * Creates a valid DiffPlannerOutput representing a cold-start or graceful fallback.
 *
 * All change specs are returned without affinity enrichment.
 * Produces a valid DiffPlannerOutput that passes schema validation.
 *
 * @param storyId - Story ID for the output
 * @param changeSpecs - Change specs without enrichment
 * @param reason - Reason for the fallback (for error field)
 * @returns Valid DiffPlannerOutput
 */
export function createFallbackOutput(
  storyId: string,
  changeSpecs: PlaceholderChangeSpec[],
  reason?: string,
): DiffPlannerOutput {
  return DiffPlannerOutputSchema.parse({
    schema: 1,
    story_id: storyId,
    produced_at: new Date().toISOString(),
    change_specs: changeSpecs,
    affinity_prompt_fragment: '',
    profile_metadata: null,
    success: true,
    error: reason,
  })
}
