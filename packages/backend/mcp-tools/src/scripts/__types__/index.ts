/**
 * Zod schemas for capability inference types
 * WINT-4040: Infer Existing Capabilities from Story History
 */

import { z } from 'zod'

// ============================================================================
// Lifecycle Stage
// ============================================================================

/** Valid CRUD lifecycle stages for capabilities */
export const LifecycleStageSchema = z.enum(['create', 'read', 'update', 'delete'])
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>

// ============================================================================
// Inferred Capability
// ============================================================================

/**
 * A single capability row inferred from story keyword analysis.
 * Matches graph.capabilities table fields.
 */
export const InferredCapabilitySchema = z.object({
  capabilityName: z.string().min(1),
  capabilityType: z.literal('business'),
  lifecycleStage: LifecycleStageSchema,
  maturityLevel: z.literal('beta'),
  featureId: z.string().uuid(),
})
export type InferredCapability = z.infer<typeof InferredCapabilitySchema>

// ============================================================================
// Story Scan Result
// ============================================================================

/**
 * A single story entry extracted from story YAML/MD files during scanning.
 */
export const StoryEntrySchema = z.object({
  storyId: z.string().min(1),
  epic: z.string().min(1),
  title: z.string(),
  text: z.string(),
})
export type StoryEntry = z.infer<typeof StoryEntrySchema>

// ============================================================================
// Capability Inference Result (matches PopulateResultSchema shape)
// ============================================================================

/**
 * Summary result emitted by inferCapabilities().
 * Shape: { attempted, succeeded, failed, skipped }
 * Matching PopulateResultSchema from populate-domain-kb.ts (extended with skipped).
 */
export const CapabilityInferenceResultSchema = z.object({
  attempted: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
})
export type CapabilityInferenceResult = z.infer<typeof CapabilityInferenceResultSchema>

// ============================================================================
// Infer Capabilities Options
// ============================================================================

/**
 * Options for inferCapabilities().
 * insertFn is injectable for testability — no real DB needed in CI.
 * dbFn is injectable for resolveFeatureId — no real DB needed in CI.
 */
export const InferCapabilitiesOptionsSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  validate: z.boolean().optional().default(false),
  rootDir: z.string().optional(),
})
export type InferCapabilitiesOptions = z.infer<typeof InferCapabilitiesOptionsSchema>

/**
 * Injectable insert function signature.
 * Default implementation uses Drizzle ORM with @repo/db.
 * Tests pass a mock — no real DB needed in CI.
 */
export type InsertFn = (rows: InferredCapability[], dryRun: boolean) => Promise<void>

/**
 * Injectable DB query function for feature resolution.
 * Returns { featureId: UUID } or null.
 */
export type FeatureRow = {
  id: string
  featureName: string
}

export type DbFeatureQueryFn = () => Promise<FeatureRow[]>
