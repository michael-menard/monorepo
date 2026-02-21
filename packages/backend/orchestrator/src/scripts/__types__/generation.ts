/**
 * Generation Artifact Schemas
 *
 * Zod-first type definitions for stories index generation script artifacts.
 * Used for:
 * - Index file rendering
 * - Generation reports
 * - Field source tracking
 *
 * Story: WINT-1070
 */

import { z } from 'zod'

// ============================================================================
// Story State Enum (DB-native underscore format)
// ============================================================================

/**
 * Valid story state enum values matching database enum wint.story_state.
 * Uses underscore format as stored in DB (not hyphenated display format).
 *
 * AC-13: This constant must be defined from the live DB enum before any
 * rendering code. Values confirmed from population.ts StoryStateSchema
 * which reflects the actual DB wint.story_state enum.
 *
 * ARCHITECTURAL NOTE: This enum intentionally duplicates (not reuses) the
 * canonical StoryStateSchema from packages/backend/orchestrator/src/state/enums/story-state.ts.
 * The two enums serve fundamentally different purposes and use incompatible formats:
 *
 *   - Canonical StoryStateSchema uses hyphenated format: 'ready-to-work', 'in-progress'
 *     These match the filesystem directory names and human-readable display labels.
 *
 *   - STORY_STATE_ENUM here uses DB underscore format: 'ready_to_work', 'in_progress'
 *     PostgreSQL enums cannot contain hyphens, so the DB schema uses underscores.
 *
 * Consolidation is not possible without changing either the DB schema (migration cost)
 * or breaking the canonical naming convention used across the codebase. The explicit
 * duplication here documents this format boundary and makes the DB-native representation
 * first-class rather than an implicit coercion scattered throughout query code.
 */
export const STORY_STATE_ENUM = [
  'draft',
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
] as const

export type StoryStateEnum = (typeof STORY_STATE_ENUM)[number]

/**
 * Zod schema for DB-native story state values
 */
export const StoryStateEnumSchema = z.enum(STORY_STATE_ENUM)

// ============================================================================
// Display Label Mapping
// ============================================================================

/**
 * Maps DB underscore state values to display labels used in stories.index.md.
 * Bridges the gap between DB storage (underscores) and display format (hyphens).
 *
 * AC-4: Progress Summary table columns match these display labels.
 */
export const STATE_TO_DISPLAY_LABEL: Record<StoryStateEnum, string> = {
  draft: 'draft',
  backlog: 'backlog',
  ready_to_work: 'ready-to-work',
  in_progress: 'in-progress',
  ready_for_qa: 'ready-for-qa',
  in_qa: 'in-qa',
  blocked: 'blocked',
  done: 'done',
  cancelled: 'cancelled',
}

// ============================================================================
// Field Source Map
// ============================================================================

/**
 * Documents the data source for each field in the generated index.
 * Used to populate field_source_breakdown in the generation report.
 *
 * AC-2: Generation report must list each field and its source.
 */
export const FIELD_SOURCE_MAP: Record<string, 'db' | 'yaml_fallback' | 'computed'> = {
  story_id: 'db',
  title: 'db',
  state: 'db',
  depends_on: 'db',
  goal: 'db',
  phase: 'yaml_fallback',
  feature: 'yaml_fallback',
  infrastructure: 'yaml_fallback',
  risk_notes: 'yaml_fallback',
  ready_to_start: 'computed',
  progress_summary: 'computed',
}

// ============================================================================
// Index Frontmatter Schema
// ============================================================================

/**
 * YAML frontmatter for the generated stories.index.md file.
 * Validated before writing to ensure structural integrity.
 *
 * AC-3: Generated frontmatter passes z.parse(IndexFrontmatterSchema, frontmatter).
 */
export const IndexFrontmatterSchema = z.object({
  /** Document type identifier */
  doc_type: z.literal('stories_index'),
  /** Human-readable title */
  title: z.string(),
  /** Status must be 'generated' for machine-generated files */
  status: z.literal('generated'),
  /** Story prefix this index covers */
  story_prefix: z.string(),
  /** ISO timestamp of when the index was generated */
  generated_at: z.string(),
  /** Script that generated this file (AC-10) */
  generated_by: z.string(),
  /** Total story count */
  story_count: z.number().int().min(0),
})

export type IndexFrontmatter = z.infer<typeof IndexFrontmatterSchema>

// ============================================================================
// Story Section Schema
// ============================================================================

/**
 * Data for rendering a single story section in the index.
 * Combines DB data with YAML fallback fields.
 *
 * AC-6: All section headers rendered (Status, Depends On, Phase, Feature,
 * Infrastructure, Goal, Risk Notes). Missing fields render as —.
 */
export const StorySectionSchema = z.object({
  /** Story ID (e.g., "WINT-0010") */
  story_id: z.string(),
  /** Story title */
  title: z.string(),
  /** Display label for state (hyphenated format) */
  status: z.string(),
  /** Raw DB state (underscore format) */
  state: StoryStateEnumSchema,
  /** Dependency story IDs */
  depends_on: z.array(z.string()).default([]),
  /** Phase number (from YAML fallback) */
  phase: z.union([z.number(), z.string()]).nullable().default(null),
  /** Feature description (from YAML fallback) */
  feature: z.string().nullable().default(null),
  /** Infrastructure details (from YAML fallback) */
  infrastructure: z.string().nullable().default(null),
  /** Story goal */
  goal: z.string().nullable().default(null),
  /** Risk notes (from YAML fallback) */
  risk_notes: z.string().nullable().default(null),
  /** Source tracking: which fields came from DB vs YAML */
  field_sources: z.record(z.enum(['db', 'yaml_fallback', 'computed'])).optional(),
})

export type StorySection = z.infer<typeof StorySectionSchema>

// ============================================================================
// Skipped Story Schema
// ============================================================================

/**
 * Tracks stories that could not be rendered (for generation report).
 * AC-9: skipped_stories included in generation report.
 */
export const SkippedStorySchema = z.object({
  /** Story ID or identifier */
  story_id: z.string(),
  /** Reason for skipping */
  reason: z.string(),
  /** Error details if applicable */
  error: z.string().optional(),
})

export type SkippedStory = z.infer<typeof SkippedStorySchema>

// ============================================================================
// Field Source Breakdown Schema
// ============================================================================

/**
 * Breakdown of how many stories had each field sourced from DB vs YAML.
 * AC-2: Included in generation report.
 */
export const FieldSourceBreakdownSchema = z.object({
  /** Field name */
  field: z.string(),
  /** Data source */
  source: z.enum(['db', 'yaml_fallback', 'computed']),
  /** Number of stories where this field came from this source */
  count: z.number().int().min(0),
})

export type FieldSourceBreakdown = z.infer<typeof FieldSourceBreakdownSchema>

// ============================================================================
// Generation Report Schema
// ============================================================================

/**
 * Written to generation-report.json after --generate runs.
 * Validates against this schema before writing.
 *
 * AC-9: timestamp, story_count_by_phase, story_count_by_status,
 * field_source_breakdown, skipped_stories, duration_ms all required.
 */
export const GenerationReportSchema = z.object({
  /** ISO timestamp of generation */
  timestamp: z.string(),
  /** Total stories processed */
  total_stories: z.number().int().min(0),
  /** Story count grouped by phase */
  story_count_by_phase: z.record(z.string(), z.number().int().min(0)),
  /** Story count grouped by DB state */
  story_count_by_status: z.record(z.string(), z.number().int().min(0)),
  /** Field source breakdown (AC-2) */
  field_source_breakdown: z.array(FieldSourceBreakdownSchema),
  /** Stories that could not be rendered */
  skipped_stories: z.array(SkippedStorySchema),
  /** Generation duration in milliseconds */
  duration_ms: z.number().min(0),
  /** Output file path */
  output_file: z.string(),
  /** Generation mode used */
  mode: z.enum(['dry-run', 'generate']),
})

export type GenerationReport = z.infer<typeof GenerationReportSchema>
