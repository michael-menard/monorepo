import { z } from 'zod'

/**
 * ChangeSpec Schema — v1
 *
 * A ChangeSpec describes a single atomic unit of implementation work
 * decomposed from a story's acceptance criteria. It is the bridge
 * between planning (PLAN.yaml) and execution (implementation, review,
 * QA, telemetry, affinity, merge).
 *
 * Design principles:
 * - Discriminated union on change_type for variant-specific fields
 * - schema: z.literal(1) version pinning (same pattern as PlanSchema)
 * - All 6 consuming systems can find their required fields:
 *   - Implementation: change_type, file_path, description, ac_ids, test_hints
 *   - Review: description, rationale, ac_ids, estimated_tokens
 *   - QA: ac_ids, test_hints, test_strategy, expected_behavior
 *   - Telemetry: story_id, change_type, estimated_tokens, complexity
 *   - Affinity: story_id, ac_ids, file_path, change_type
 *   - Merge: story_id, file_path, change_type, dependencies
 *
 * Versioning strategy:
 *   - Add optional fields: increment literal (schema: z.literal(2))
 *   - Breaking field rename/removal: major literal bump; handle both versions during transition
 */

// ============================================================================
// Shared sub-schemas
// ============================================================================

/**
 * Complexity rating for a single change.
 */
export const ChangeComplexitySchema = z.enum(['trivial', 'low', 'medium', 'high', 'unknown'])
export type ChangeComplexity = z.infer<typeof ChangeComplexitySchema>

/**
 * Test strategy for the change — what test tier owns coverage.
 */
export const TestStrategySchema = z.enum([
  'unit',
  'integration',
  'e2e',
  'manual',
  'none',
  'unit+integration',
])
export type TestStrategy = z.infer<typeof TestStrategySchema>

/**
 * Common fields present in every ChangeSpec variant.
 * Pulled out to avoid repetition in the discriminated union.
 */
const ChangeSpecBaseSchema = z.object({
  /** Schema version — increment when fields change (breaking = major bump) */
  schema: z.literal(1),

  /** Story this change belongs to (e.g. "APIP-1020") */
  story_id: z.string().regex(/^[A-Z]+-\d+$/),

  /** Unique identifier for this change within a story (e.g. "CS-1") */
  id: z.string().min(1),

  /** Human-readable description of what this change does */
  description: z.string().min(1),

  /** Why this change is needed — consumed by Review system */
  rationale: z.string().optional(),

  /** ACs this change satisfies — consumed by QA and Affinity systems */
  ac_ids: z.array(z.string()).min(1),

  /** Estimated token cost for this change — consumed by Telemetry and Review */
  estimated_tokens: z.number().int().positive().optional(),

  /** Complexity rating — consumed by Telemetry */
  complexity: ChangeComplexitySchema.default('unknown'),

  /** Test strategy — consumed by QA system */
  test_strategy: TestStrategySchema.default('unit'),

  /** Hints for test generation — consumed by QA system */
  test_hints: z.array(z.string()).default([]),

  /** Expected behavior after the change — consumed by QA system */
  expected_behavior: z.string().optional(),

  /** Change IDs this change depends on (within same story) — consumed by Merge system */
  dependencies: z.array(z.string()).default([]),

  /** Timestamp when this ChangeSpec was created */
  created_at: z.string().datetime().optional(),
})

// ============================================================================
// Variant: file_change
// ============================================================================

/**
 * A change to a source file (create, modify, or delete).
 * Used by Implementation system to identify what files to touch.
 */
export const FileChangeSpecSchema = ChangeSpecBaseSchema.extend({
  change_type: z.literal('file_change'),

  /** Path to the file being changed — consumed by Implementation, Affinity, Merge */
  file_path: z.string().min(1),

  /** What action to take on the file */
  file_action: z.enum(['create', 'modify', 'delete']),

  /** Language/type of the file (for tooling context) */
  file_language: z
    .enum(['typescript', 'javascript', 'yaml', 'json', 'markdown', 'sql', 'other'])
    .optional(),
})

export type FileChangeSpec = z.infer<typeof FileChangeSpecSchema>

// ============================================================================
// Variant: migration_change
// ============================================================================

/**
 * A database schema migration.
 * Used by Implementation for SQL generation and by Merge for ordering.
 */
export const MigrationChangeSpecSchema = ChangeSpecBaseSchema.extend({
  change_type: z.literal('migration_change'),

  /** Path to the migration file */
  file_path: z.string().min(1),

  /** Migration version number (e.g. "002") */
  migration_version: z.string().optional(),

  /** Short name for the migration (e.g. "add_pipeline_schema") */
  migration_name: z.string().optional(),

  /** Whether the migration is reversible */
  reversible: z.boolean().default(false),

  /** Tables affected by this migration */
  affected_tables: z.array(z.string()).default([]),
})

export type MigrationChangeSpec = z.infer<typeof MigrationChangeSpecSchema>

// ============================================================================
// Variant: config_change
// ============================================================================

/**
 * A change to configuration files (package.json, tsconfig, env, etc).
 * Used by Implementation and Merge systems.
 */
export const ConfigChangeSpecSchema = ChangeSpecBaseSchema.extend({
  change_type: z.literal('config_change'),

  /** Path to the config file being changed */
  file_path: z.string().min(1),

  /** Type of config file */
  config_type: z
    .enum([
      'package_json',
      'tsconfig',
      'env',
      'docker_compose',
      'vitest_config',
      'build_config',
      'other',
    ])
    .optional(),

  /** Whether this is adding a new dependency */
  adds_dependency: z.boolean().default(false),

  /** Packages being added/removed (if adds_dependency) */
  dependency_names: z.array(z.string()).default([]),
})

export type ConfigChangeSpec = z.infer<typeof ConfigChangeSpecSchema>

// ============================================================================
// Variant: test_change
// ============================================================================

/**
 * A change to test files.
 * Used by QA system for coverage tracking and by Implementation to plan test authoring.
 */
export const TestChangeSpecSchema = ChangeSpecBaseSchema.extend({
  change_type: z.literal('test_change'),

  /** Path to the test file */
  file_path: z.string().min(1),

  /** What implementation file this test covers */
  covers_file: z.string().optional(),

  /** Test framework */
  test_framework: z.enum(['vitest', 'playwright', 'jest', 'other']).optional(),

  /** Test type */
  test_type: z.enum(['unit', 'integration', 'e2e', 'manual']),
})

export type TestChangeSpec = z.infer<typeof TestChangeSpecSchema>

// ============================================================================
// Discriminated union — the canonical ChangeSpec
// ============================================================================

/**
 * ChangeSpec — a single atomic implementation unit derived from story ACs.
 *
 * Discriminated on `change_type` to enable variant-specific required fields
 * while sharing a common base. Consumers parse the union; downstream systems
 * narrow to their relevant variant via `change_type`.
 */
export const ChangeSpecSchema = z.discriminatedUnion('change_type', [
  FileChangeSpecSchema,
  MigrationChangeSpecSchema,
  ConfigChangeSpecSchema,
  TestChangeSpecSchema,
])

export type ChangeSpec = z.infer<typeof ChangeSpecSchema>

// ============================================================================
// Collection schema
// ============================================================================

/**
 * A collection of ChangeSpecs for a single story.
 * This is what gets serialized to YAML decomposition files.
 */
export const ChangeSpecCollectionSchema = z.object({
  schema: z.literal(1),
  story_id: z.string().regex(/^[A-Z]+-\d+$/),
  generated_at: z.string().datetime().optional(),
  changes: z.array(ChangeSpecSchema).min(1),
})

export type ChangeSpecCollection = z.infer<typeof ChangeSpecCollectionSchema>

// ============================================================================
// Helper factories
// ============================================================================

/**
 * Create a minimal file_change ChangeSpec.
 */
export function createFileChangeSpec(
  storyId: string,
  id: string,
  filePath: string,
  description: string,
  acIds: string[],
  action: 'create' | 'modify' | 'delete' = 'create',
): FileChangeSpec {
  return FileChangeSpecSchema.parse({
    schema: 1,
    story_id: storyId,
    id,
    description,
    ac_ids: acIds,
    change_type: 'file_change',
    file_path: filePath,
    file_action: action,
    complexity: 'unknown',
    test_strategy: 'unit',
    test_hints: [],
    dependencies: [],
  })
}
