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

// =============================================================================
// ADR Types
// =============================================================================

/**
 * ADR status values.
 */
export const ADR_STATUSES = ['Active', 'Proposed', 'Deprecated', 'Superseded'] as const
export type ADRStatus = (typeof ADR_STATUSES)[number]

/**
 * Schema for a single parsed ADR from ADR-LOG.md.
 */
export const ADREntrySchema = z.object({
  /** ADR ID (e.g., "ADR-001") */
  id: z.string(),

  /** ADR title */
  title: z.string(),

  /** Date recorded */
  date: z.string().optional(),

  /** Status of the decision */
  status: z.enum(ADR_STATUSES).default('Active'),

  /** Context/background for the decision */
  context: z.string().optional(),

  /** Problem being addressed */
  problem: z.string().optional(),

  /** The decision made */
  decision: z.string(),

  /** Consequences (positive and negative) */
  consequences: z.string().optional(),

  /** Related files */
  related_files: z.array(z.string()).default([]),

  /** Source file path */
  source_file: z.string(),
})

export type ADREntry = z.infer<typeof ADREntrySchema>

/**
 * Schema for parsed ADRs from a single file.
 */
export const ParsedADRFileSchema = z.object({
  /** Source file path */
  source_file: z.string(),

  /** Parsed ADRs from this file */
  adrs: z.array(ADREntrySchema),

  /** Warnings encountered during parsing */
  warnings: z.array(z.string()),
})

export type ParsedADRFile = z.infer<typeof ParsedADRFileSchema>

/**
 * Convert an ADR entry to a KB-compatible ParsedEntry.
 */
export function adrToKbEntry(adr: ADREntry): z.infer<typeof ParsedEntrySchema> {
  const tags: string[] = ['adr', 'decision', 'architecture']

  // Add ADR ID as tag
  if (adr.id) {
    tags.push(`adr:${adr.id.toLowerCase()}`)
  }

  // Add status as tag
  if (adr.status) {
    tags.push(`status:${adr.status.toLowerCase()}`)
  }

  // Build content
  const sections: string[] = []
  sections.push(`# ${adr.id}: ${adr.title}`)
  sections.push('')
  if (adr.date) sections.push(`**Date:** ${adr.date}`)
  if (adr.status) sections.push(`**Status:** ${adr.status}`)
  sections.push('')
  if (adr.context) {
    sections.push('## Context')
    sections.push(adr.context)
    sections.push('')
  }
  if (adr.problem) {
    sections.push('## Problem')
    sections.push(adr.problem)
    sections.push('')
  }
  sections.push('## Decision')
  sections.push(adr.decision)
  sections.push('')
  if (adr.consequences) {
    sections.push('## Consequences')
    sections.push(adr.consequences)
    sections.push('')
  }
  if (adr.related_files.length > 0) {
    sections.push('## Related Files')
    sections.push(adr.related_files.map(f => `- \`${f}\``).join('\n'))
  }

  return {
    content: sections.join('\n').trim(),
    role: 'dev',
    tags,
    source_file: adr.source_file,
  }
}

// =============================================================================
// DECISIONS.yaml Types
// =============================================================================

/**
 * Schema for a critical finding from DECISIONS.yaml.
 */
export const CriticalFindingSchema = z.object({
  /** Finding ID */
  id: z.string(),

  /** Decision made (ACCEPT, DEFER, REJECT) */
  decision: z.string(),

  /** Action to take */
  action: z.string(),

  /** Source (engineering, qa, security, platform) */
  source: z.string().optional(),

  /** Additional notes */
  notes: z.string().optional(),
})

export type CriticalFinding = z.infer<typeof CriticalFindingSchema>

/**
 * Schema for parsed DECISIONS.yaml file.
 */
export const ParsedDecisionsFileSchema = z.object({
  /** Source file path */
  source_file: z.string(),

  /** Feature directory */
  feature_dir: z.string().optional(),

  /** Prefix (e.g., "WISH", "COGN") */
  prefix: z.string().optional(),

  /** Decision date */
  decided: z.string().optional(),

  /** Critical findings */
  critical_findings: z.array(CriticalFindingSchema).default([]),

  /** MVP blockers */
  mvp_blockers: z.array(CriticalFindingSchema).default([]),

  /** Action items */
  action_items: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        owner: z.string().optional(),
        stories: z.array(z.string()).optional(),
        new_story: z.string().optional(),
      }),
    )
    .default([]),

  /** New stories added */
  new_stories_added: z
    .array(
      z.object({
        title: z.string(),
        priority: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .default([]),

  /** Story splits */
  story_splits: z
    .array(
      z.object({
        story: z.string(),
        decision: z.string(),
        new_stories: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              complexity: z.string().optional(),
              scope: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .default([]),

  /** Story deferrals */
  story_deferrals: z
    .array(
      z.object({
        story: z.string(),
        decision: z.string(),
        reason: z.string().optional(),
        recommendation: z.string().optional(),
      }),
    )
    .default([]),

  /** Warnings encountered during parsing */
  warnings: z.array(z.string()).default([]),
})

export type ParsedDecisionsFile = z.infer<typeof ParsedDecisionsFileSchema>

/**
 * Convert a DECISIONS.yaml file to KB entries.
 */
export function decisionsToKbEntries(
  decisions: ParsedDecisionsFile,
): z.infer<typeof ParsedEntrySchema>[] {
  const entries: z.infer<typeof ParsedEntrySchema>[] = []
  const prefix = decisions.prefix?.toLowerCase() || 'unknown'

  // Create an entry for each critical finding
  for (const finding of decisions.critical_findings) {
    const tags: string[] = ['epic-decision', 'critical-finding', prefix]
    if (finding.source) tags.push(`source:${finding.source}`)
    tags.push(`decision:${finding.decision.toLowerCase()}`)

    entries.push({
      content: `**[${prefix.toUpperCase()}] Critical Finding: ${finding.id}**\n\n**Decision:** ${finding.decision}\n\n**Action:** ${finding.action}${finding.notes ? `\n\n**Notes:** ${finding.notes}` : ''}`,
      role: 'all',
      tags,
      source_file: decisions.source_file,
    })
  }

  // Create an entry for each MVP blocker
  for (const blocker of decisions.mvp_blockers) {
    const tags: string[] = ['epic-decision', 'mvp-blocker', prefix]
    if (blocker.source) tags.push(`source:${blocker.source}`)
    tags.push(`decision:${blocker.decision.toLowerCase()}`)

    entries.push({
      content: `**[${prefix.toUpperCase()}] MVP Blocker: ${blocker.id}**\n\n**Issue:** ${blocker.action}${blocker.notes ? `\n\n**Notes:** ${blocker.notes}` : ''}`,
      role: 'all',
      tags,
      source_file: decisions.source_file,
    })
  }

  // Create entries for new stories added
  for (const story of decisions.new_stories_added) {
    const tags: string[] = ['epic-decision', 'new-story', prefix]
    if (story.priority) tags.push(`priority:${story.priority.toLowerCase()}`)

    entries.push({
      content: `**[${prefix.toUpperCase()}] New Story Added**\n\n**Title:** ${story.title}${story.priority ? `\n\n**Priority:** ${story.priority}` : ''}${story.reason ? `\n\n**Reason:** ${story.reason}` : ''}`,
      role: 'pm',
      tags,
      source_file: decisions.source_file,
    })
  }

  return entries
}

// =============================================================================
// Tech Stack Types
// =============================================================================

/**
 * Schema for a tech stack documentation entry.
 */
export const TechStackEntrySchema = z.object({
  /** Title of the tech stack document */
  title: z.string(),

  /** Category (backend, frontend, monorepo) */
  category: z.string(),

  /** Content of the document */
  content: z.string(),

  /** Source file path */
  source_file: z.string(),
})

export type TechStackEntry = z.infer<typeof TechStackEntrySchema>

/**
 * Convert a tech stack entry to a KB-compatible ParsedEntry.
 */
export function techStackToKbEntry(entry: TechStackEntry): z.infer<typeof ParsedEntrySchema> {
  const tags: string[] = ['tech-stack', 'reference', entry.category]

  return {
    content: entry.content,
    role: 'dev',
    tags,
    source_file: entry.source_file,
  }
}
