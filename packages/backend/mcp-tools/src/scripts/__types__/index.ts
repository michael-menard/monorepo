/**
 * Zod schemas for capability inference types
 * WINT-4040: Infer Existing Capabilities from Story History
 */

import { z } from 'zod'

// ============================================================================
// Lifecycle Stage
// ============================================================================

export const LifecycleStageSchema = z.enum(['create', 'read', 'update', 'delete'])
export type LifecycleStage = z.infer<typeof LifecycleStageSchema>

// ============================================================================
// Inferred Capability
// ============================================================================

/**
 * A capability inferred from story text analysis.
 * Maps to an InsertCapability row in graph.capabilities.
 */
export const InferredCapabilitySchema = z.object({
  capabilityName: z.string().min(1),
  capabilityType: z.literal('business'),
  maturityLevel: z.literal('beta'),
  lifecycleStage: LifecycleStageSchema,
  featureId: z.string().uuid(),
})
export type InferredCapability = z.infer<typeof InferredCapabilitySchema>

// ============================================================================
// Story Entry (from scanning plans/)
// ============================================================================

/**
 * A story entry extracted from story YAML files under plans/future/platform/
 */
export const StoryEntrySchema = z.object({
  storyId: z.string(),
  epic: z.string(), // uppercase prefix, e.g. "WINT", "WISH"
  title: z.string(),
  text: z.string(), // combined AC text + title for keyword analysis
})
export type StoryEntry = z.infer<typeof StoryEntrySchema>

// ============================================================================
// Capability Inference Result
// ============================================================================

/**
 * Summary result matching CapabilityInferenceResultSchema (AC-8)
 */
export const CapabilityInferenceResultSchema = z.object({
  attempted: z.number().int().min(0),
  succeeded: z.number().int().min(0),
  failed: z.number().int().min(0),
  skipped: z.number().int().min(0),
})
export type CapabilityInferenceResult = z.infer<typeof CapabilityInferenceResultSchema>

// ============================================================================
// Infer Capabilities Options
// ============================================================================

/**
 * Options for inferCapabilities() — injectable for testability (AC-10)
 * Input type allows all fields to be optional; defaults applied inside the function.
 */
export const InferCapabilitiesOptionsSchema = z.object({
  dryRun: z.boolean().optional(),
  validate: z.boolean().optional(),
  rootDir: z.string().optional(), // override plans/ root for tests
})
export type InferCapabilitiesOptions = z.infer<typeof InferCapabilitiesOptionsSchema>

// ============================================================================
// Injectable function types
// ============================================================================

/**
 * Injectable DB insert function for testability (AC-10)
 * Production: uses real Drizzle client
 * Tests: use vi.fn() mocks
 */
export type InsertFn = (rows: InferredCapability[], dryRun: boolean) => Promise<void>

/**
 * A row returned from graph.features query
 */
export const FeatureRowSchema = z.object({
  id: z.string().uuid(),
  featureName: z.string(),
})
export type FeatureRow = z.infer<typeof FeatureRowSchema>

/**
 * Injectable DB feature query function for testability (AC-10)
 * Production: queries real graph.features
 * Tests: use mock functions
 */
export type DbFeatureQueryFn = () => Promise<FeatureRow[]>
