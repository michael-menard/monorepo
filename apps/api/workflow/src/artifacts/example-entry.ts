import { z } from 'zod'

/**
 * Example Entry Schema
 *
 * Framework for capturing positive and negative examples that guide agent decisions.
 * Supports the WINT learning loop by providing reusable decision patterns.
 *
 * Version: 1.0.0
 * Story: WINT-0180
 */

/**
 * Example category - groups examples by decision domain
 */
export const ExampleCategorySchema = z.enum([
  'decision-making', // Decision handling examples
  'code-patterns', // Code style and architecture examples
  'testing', // Testing approach examples
  'documentation', // Documentation style examples
  'error-handling', // Error handling patterns
  'validation', // Input validation patterns
  'state-management', // State management approaches
  'api-design', // API design patterns
  'performance', // Performance optimization examples
  'accessibility', // A11y best practices
  'security', // Security patterns
  'data-modeling', // Database/schema design
  'workflow', // Agent workflow patterns
  'communication', // User communication styles
  'other', // Uncategorized
])

export type ExampleCategory = z.infer<typeof ExampleCategorySchema>

/**
 * Example lifecycle state
 */
export const ExampleLifecycleStateSchema = z.enum([
  'created', // Just created, not yet validated
  'validated', // Reviewed and approved for use
  'deprecated', // No longer recommended (terminal state)
])

export type ExampleLifecycleState = z.infer<typeof ExampleLifecycleStateSchema>

/**
 * Example type - differentiates positive from negative examples
 */
export const ExampleTypeSchema = z.enum([
  'positive', // What TO do
  'negative', // What NOT to do
  'both', // Includes both positive and negative guidance
])

export type ExampleType = z.infer<typeof ExampleTypeSchema>

/**
 * Core example entry schema
 *
 * Captures both positive examples (what to do) and negative examples (what not to do)
 * with context about when each applies.
 */
export const ExampleEntrySchema = z.object({
  // Schema version for migration support
  schema_version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Must be semver format (e.g., "1.0.0")'),

  // Unique identifier
  id: z.string().min(1, 'Example ID is required'),

  // Categorization
  category: ExampleCategorySchema,
  type: ExampleTypeSchema.default('both'),

  // Scenario description - when does this example apply?
  scenario: z.string().min(10, 'Scenario must be at least 10 characters'),

  // Positive example - what TO do
  positive_example: z
    .string()
    .min(10, 'Positive example must be at least 10 characters')
    .nullable()
    .optional(),

  // Negative example - what NOT to do
  negative_example: z
    .string()
    .min(10, 'Negative example must be at least 10 characters')
    .nullable()
    .optional(),

  // Context - additional information about when/why this example applies
  context: z
    .object({
      // When this example is relevant
      applicability: z.string().nullable().optional(),

      // Prerequisites or conditions
      prerequisites: z.array(z.string()).default([]),

      // Related examples or patterns
      related_examples: z.array(z.string()).default([]),

      // Decision tier this applies to (from decision-handling.md)
      decision_tier: z.number().int().min(1).max(5).nullable().optional(),

      // Tags for searching/filtering
      tags: z.array(z.string()).default([]),
    })
    .optional(),

  // Outcome metrics - tracked separately but referenced here
  outcome_metrics: z
    .object({
      // How many times this example was queried
      times_referenced: z.number().int().min(0).default(0),

      // How many times agents followed this example
      times_followed: z.number().int().min(0).default(0),

      // Success rate when followed (0.0 - 1.0)
      success_rate: z.number().min(0).max(1).nullable().optional(),

      // Last time this example was used
      last_used_at: z.string().datetime().nullable().optional(),
    })
    .optional(),

  // Lifecycle tracking
  status: ExampleLifecycleStateSchema.default('created'),

  // Timestamps
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  validated_at: z.string().datetime().nullable().optional(),
  deprecated_at: z.string().datetime().nullable().optional(),

  // Authorship (optional)
  created_by: z.string().nullable().optional(), // Agent or user who created this
  source_story_id: z.string().nullable().optional(), // Story that inspired this example

  // Deprecation information
  deprecation_reason: z.string().nullable().optional(),
  superseded_by: z.string().nullable().optional(), // ID of example that replaces this one
})

export type ExampleEntry = z.infer<typeof ExampleEntrySchema>

/**
 * Create a new example entry with defaults
 */
export function createExampleEntry(params: {
  id: string
  category: ExampleCategory
  scenario: string
  positive_example?: string | null
  negative_example?: string | null
  type?: ExampleType
  context?: ExampleEntry['context']
  created_by?: string | null
  source_story_id?: string | null
}): ExampleEntry {
  const now = new Date().toISOString()

  return {
    schema_version: '1.0.0',
    id: params.id,
    category: params.category,
    type: params.type || 'both',
    scenario: params.scenario,
    positive_example: params.positive_example || null,
    negative_example: params.negative_example || null,
    context: params.context,
    outcome_metrics: {
      times_referenced: 0,
      times_followed: 0,
      success_rate: null,
      last_used_at: null,
    },
    status: 'created',
    created_at: now,
    updated_at: now,
    validated_at: null,
    deprecated_at: null,
    created_by: params.created_by || null,
    source_story_id: params.source_story_id || null,
    deprecation_reason: null,
    superseded_by: null,
  }
}

/**
 * Validate an example entry
 */
export function validateExampleEntry(example: ExampleEntry): ExampleEntry {
  return {
    ...example,
    status: 'validated',
    validated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

/**
 * Deprecate an example entry
 */
export function deprecateExampleEntry(
  example: ExampleEntry,
  reason: string,
  supersededBy?: string,
): ExampleEntry {
  return {
    ...example,
    status: 'deprecated',
    deprecated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deprecation_reason: reason,
    superseded_by: supersededBy || null,
  }
}

/**
 * Update example outcome metrics after usage
 */
export function recordExampleUsage(
  example: ExampleEntry,
  followed: boolean,
  success?: boolean,
): ExampleEntry {
  const currentMetrics = example.outcome_metrics || {
    times_referenced: 0,
    times_followed: 0,
    success_rate: null,
    last_used_at: null,
  }

  const newTimesReferenced = currentMetrics.times_referenced + 1
  const newTimesFollowed = followed
    ? currentMetrics.times_followed + 1
    : currentMetrics.times_followed

  // Calculate new success rate if success info provided
  let newSuccessRate = currentMetrics.success_rate
  if (followed && success !== undefined) {
    const totalSuccesses =
      (currentMetrics.success_rate || 0) * currentMetrics.times_followed + (success ? 1 : 0)
    newSuccessRate = totalSuccesses / newTimesFollowed
  }

  return {
    ...example,
    outcome_metrics: {
      times_referenced: newTimesReferenced,
      times_followed: newTimesFollowed,
      success_rate: newSuccessRate,
      last_used_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }
}
