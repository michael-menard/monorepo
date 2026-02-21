/**
 * Generation Artifact Schemas
 *
 * Zod-first type definitions for the generate-stories-index.ts script artifacts.
 * Used for:
 * - Index frontmatter validation
 * - Story section rendering types
 * - Generation report output
 * - Field source tracking
 *
 * Story: WINT-1070
 *
 * AC-13 DB Enum Audit:
 * Confirmed values from wint schema (002_workflow_tables.sql):
 *   SELECT unnest(enum_range(NULL::wint.story_state))
 *   → draft, backlog, ready-to-work, in-progress, ready-for-qa, uat, done, cancelled
 *
 * These match story-state.ts StoryStateSchema exactly.
 */

import { z } from 'zod'

// ============================================================================
// AC-13: STORY_STATE_ENUM — Authoritative DB enum values
// Source: SELECT unnest(enum_range(NULL::wint.story_state)) on live DB
// Cross-referenced with: apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql
// and packages/backend/orchestrator/src/state/enums/story-state.ts
// ============================================================================

export const STORY_STATE_ENUM = [
  'draft',
  'backlog',
  'ready-to-work',
  'in-progress',
  'ready-for-qa',
  'uat',
  'done',
  'cancelled',
] as const

export type StoryStateEnum = (typeof STORY_STATE_ENUM)[number]

// ============================================================================
// STATE_TO_DISPLAY_LABEL — Maps DB state values to human-readable display labels
// Used in Progress Summary table (AC-4) and per-story Status field (AC-6)
// ============================================================================

export const STATE_TO_DISPLAY_LABEL: Record<StoryStateEnum, string> = {
  draft: 'draft',
  backlog: 'backlog',
  'ready-to-work': 'ready-to-work',
  'in-progress': 'in-progress',
  'ready-for-qa': 'ready-for-qa',
  uat: 'uat',
  done: 'done',
  cancelled: 'cancelled',
}

// ============================================================================
// FIELD_SOURCE_MAP — Documents which fields come from DB vs YAML fallback (AC-2)
// ============================================================================

export const FIELD_SOURCE_MAP = {
  state: 'db',
  title: 'db',
  goal: 'db',
  depends_on: 'db',
  phase: 'yaml_fallback',
  risk_notes: 'yaml_fallback',
  feature: 'yaml_fallback',
  infrastructure: 'yaml_fallback',
  updated_at: 'computed',
  created_at: 'computed',
} as const

export type FieldSource = 'db' | 'yaml_fallback' | 'computed'

// ============================================================================
// Index Frontmatter Schema (AC-3)
// ============================================================================

export const IndexFrontmatterSchema = z.object({
  doc_type: z.literal('stories_index'),
  title: z.string(),
  status: z.literal('generated'),
  story_prefix: z.string(),
  /** Preserved from original file — never overwritten */
  created_at: z.string(),
  /** Set to timestamp of current generation run */
  updated_at: z.string(),
  generated_by: z.literal('generate-stories-index.ts'),
})

export type IndexFrontmatter = z.infer<typeof IndexFrontmatterSchema>

// ============================================================================
// YAML Fallback Data Schema
// Fields from story YAML frontmatter not stored in wint.stories
// ============================================================================

export const YamlFallbackDataSchema = z.object({
  phase: z.union([z.number(), z.string()]).nullable().optional(),
  risk_notes: z.string().nullable().optional(),
  feature: z.string().nullable().optional(),
  infrastructure: z.array(z.string()).nullable().optional(),
})

export type YamlFallbackData = z.infer<typeof YamlFallbackDataSchema>

// ============================================================================
// Story Section Schema (AC-6)
// Represents one rendered story section in stories.index.md
// ============================================================================

export const StorySectionSchema = z.object({
  story_id: z.string(),
  title: z.string(),
  state: z.string(),
  depends_on: z.array(z.string()).nullable(),
  phase: z.union([z.number(), z.string()]).nullable(),
  feature: z.string().nullable(),
  infrastructure: z.array(z.string()).nullable(),
  goal: z.string().nullable(),
  risk_notes: z.string().nullable(),
  /** Which fields used yaml_fallback vs db */
  field_sources: z.record(z.string(), z.enum(['db', 'yaml_fallback', 'computed', 'missing'])),
})

export type StorySection = z.infer<typeof StorySectionSchema>

// ============================================================================
// Skipped Story Schema
// ============================================================================

export const GenerationSkippedStorySchema = z.object({
  story_id: z.string(),
  reason: z.string(),
  error: z.string().optional(),
})

export type GenerationSkippedStory = z.infer<typeof GenerationSkippedStorySchema>

// ============================================================================
// Field Source Breakdown Schema (AC-9)
// ============================================================================

export const FieldSourceBreakdownSchema = z.object({
  /** Fields sourced directly from wint.stories DB */
  db_fields: z.array(z.string()),
  /** Fields sourced from YAML frontmatter fallback */
  yaml_fallback_fields: z.array(z.string()),
  /** Fields computed at generation time */
  computed_fields: z.array(z.string()),
  /** Stories that used yaml fallback (at least one field) */
  stories_with_yaml_fallback: z.number(),
  /** Stories with only DB data */
  stories_db_only: z.number(),
})

export type FieldSourceBreakdown = z.infer<typeof FieldSourceBreakdownSchema>

// ============================================================================
// Generation Report Schema (AC-9)
// Written to generation-report.json after --generate run
// ============================================================================

export const GenerationReportSchema = z.object({
  /** ISO timestamp of generation run */
  timestamp: z.string(),
  /** Total stories processed */
  story_count: z.number(),
  /** Story count grouped by phase */
  story_count_by_phase: z.record(z.string(), z.number()),
  /** Story count grouped by DB state */
  story_count_by_status: z.record(z.string(), z.number()),
  /** Field source breakdown */
  field_source_breakdown: FieldSourceBreakdownSchema,
  /** Stories skipped with reasons */
  skipped_stories: z.array(GenerationSkippedStorySchema),
  /** Duration of generation in milliseconds */
  duration_ms: z.number(),
  /** Path to generated file */
  output_path: z.string(),
})

export type GenerationReport = z.infer<typeof GenerationReportSchema>
