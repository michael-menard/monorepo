/**
 * Lessons Learned Migration Types
 *
 * Zod schemas for parsing LESSONS-LEARNED.md files and migration operations.
 *
 * @see KNOW-043 for migration requirements
 */

import crypto from 'crypto'
import { z } from 'zod'
import { ParsedEntrySchema } from '../../parsers/__types__/index.js'

/**
 * Schema for a single parsed lesson from LESSONS-LEARNED.md.
 *
 * Lessons are extracted from story sections in the markdown file.
 */
export const LessonEntrySchema = z.object({
  /** Story ID (e.g., "STORY-007", "WRKF-1000") */
  story_id: z.string(),

  /** Story title extracted from heading */
  story_title: z.string().optional(),

  /** Date the lesson was captured */
  captured_date: z.string().optional(),

  /** Category of the lesson (e.g., "Reuse Discoveries", "Blockers Hit") */
  category: z.string(),

  /** The lesson content */
  content: z.string().min(1),

  /** Source file path */
  source_file: z.string(),

  /** Line number in source file (for debugging) */
  source_line: z.number().optional(),
})

export type LessonEntry = z.infer<typeof LessonEntrySchema>

/**
 * Schema for parsed lessons from a single file.
 */
export const ParsedLessonsFileSchema = z.object({
  /** Source file path */
  source_file: z.string(),

  /** Parsed lessons from this file */
  lessons: z.array(LessonEntrySchema),

  /** Warnings encountered during parsing */
  warnings: z.array(z.string()),

  /** Count of story sections found */
  story_count: z.number().int().min(0),
})

export type ParsedLessonsFile = z.infer<typeof ParsedLessonsFileSchema>

/**
 * Schema for migration CLI options.
 */
export const MigrationOptionsSchema = z.object({
  /** Dry run mode - parse and report without importing */
  dry_run: z.boolean().default(false),

  /** Validate only - check parsing without importing */
  validate_only: z.boolean().default(false),

  /** Source paths to scan (defaults to auto-discovery) */
  source_paths: z.array(z.string()).optional(),

  /** Whether to show verbose output */
  verbose: z.boolean().default(false),
})

export type MigrationOptions = z.infer<typeof MigrationOptionsSchema>

/**
 * Schema for per-file migration result.
 */
export const FileMigrationResultSchema = z.object({
  /** Source file path */
  source_file: z.string(),

  /** Lessons found in this file */
  lessons_found: z.number().int().min(0),

  /** Lessons successfully imported */
  lessons_imported: z.number().int().min(0),

  /** Lessons skipped (duplicates) */
  lessons_skipped: z.number().int().min(0),

  /** Lessons that failed to import */
  lessons_failed: z.number().int().min(0),

  /** Parsing warnings */
  warnings: z.array(z.string()),

  /** Import errors */
  errors: z.array(z.string()),
})

export type FileMigrationResult = z.infer<typeof FileMigrationResultSchema>

/**
 * Schema for complete migration report.
 */
export const MigrationReportSchema = z.object({
  /** Whether this was a dry run */
  dry_run: z.boolean(),

  /** Start timestamp */
  started_at: z.string(),

  /** End timestamp */
  completed_at: z.string(),

  /** Duration in milliseconds */
  duration_ms: z.number().int().min(0),

  /** Files discovered */
  files_discovered: z.number().int().min(0),

  /** Files processed */
  files_processed: z.number().int().min(0),

  /** Total lessons found across all files */
  total_lessons_found: z.number().int().min(0),

  /** Total lessons imported */
  total_lessons_imported: z.number().int().min(0),

  /** Total lessons skipped (duplicates) */
  total_lessons_skipped: z.number().int().min(0),

  /** Total lessons failed */
  total_lessons_failed: z.number().int().min(0),

  /** Per-file results */
  file_results: z.array(FileMigrationResultSchema),

  /** KB entries count before migration */
  kb_count_before: z.number().int().min(0).optional(),

  /** KB entries count after migration */
  kb_count_after: z.number().int().min(0).optional(),

  /** Session ID for tracking */
  session_id: z.string().uuid().optional(),
})

export type MigrationReport = z.infer<typeof MigrationReportSchema>

/**
 * Standard lesson categories found in LESSONS-LEARNED.md files.
 */
export const LESSON_CATEGORIES = [
  'Reuse Discoveries',
  'Blockers Hit',
  'Plan vs Reality',
  'Time Sinks',
  'Verification Notes',
  'Token Usage Analysis',
  'Recommendations for Future Stories',
  'Key Decisions Made',
  'Risks Identified',
  'What Went Well',
  'Patterns Established',
  'Technical Debt Captured',
] as const

export type LessonCategory = (typeof LESSON_CATEGORIES)[number]

/**
 * Convert a lesson entry to a KB-compatible ParsedEntry.
 *
 * @param lesson - Lesson entry to convert
 * @returns ParsedEntry for kb_bulk_import
 */
export function lessonToKbEntry(lesson: LessonEntry): z.infer<typeof ParsedEntrySchema> {
  // Build tags from context
  const tags: string[] = ['lesson-learned']

  // Add story ID as tag
  if (lesson.story_id) {
    tags.push(`story:${lesson.story_id.toLowerCase()}`)
  }

  // Map category to tag-friendly format
  const categoryTag = lesson.category
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  if (categoryTag) {
    tags.push(`category:${categoryTag}`)
  }

  // Add date tag if available
  if (lesson.captured_date) {
    const dateMatch = lesson.captured_date.match(/(\d{4})-(\d{2})/)
    if (dateMatch) {
      tags.push(`date:${dateMatch[1]}-${dateMatch[2]}`)
    }
  }

  // Build content with context
  let content = lesson.content

  // Add header with context if not already present
  if (!content.startsWith('#') && !content.startsWith('**')) {
    const header = lesson.story_id ? `[${lesson.story_id}] ${lesson.category}` : lesson.category
    content = `**${header}**\n\n${content}`
  }

  return {
    content,
    role: 'dev', // Default role for lessons learned
    tags,
    source_file: lesson.source_file,
  }
}

/**
 * Generate content hash for deduplication.
 *
 * @param content - Content to hash
 * @returns SHA-256 hash of normalized content
 */
export function generateContentHash(content: string): string {
  // Normalize whitespace for consistent hashing
  const normalized = content.trim().replace(/\s+/g, ' ')
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex')
}
