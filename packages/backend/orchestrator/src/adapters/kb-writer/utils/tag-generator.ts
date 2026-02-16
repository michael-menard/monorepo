/**
 * Tag Generation Utilities
 *
 * Generates standard tags for KB entries with consistent format.
 * Extracted from persist-learnings.ts generateLearningTags().
 *
 * @see LNGG-0050 AC-4
 */

import { z } from 'zod'
import { EntryTypeSchema } from '../__types__/index.js'

/**
 * Tag generator options schema
 *
 * Defines the configuration for generating KB entry tags.
 */
export const TagGeneratorOptionsSchema = z.object({
  entryType: EntryTypeSchema,
  storyId: z.string().optional(),
  domain: z.string().optional(),
  customTags: z.array(z.string()).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
})

export type TagGeneratorOptions = z.infer<typeof TagGeneratorOptionsSchema>

/**
 * Generate tags for a KB entry
 *
 * Standard tags:
 * - Entry type (e.g., 'lesson-learned', 'decision', 'constraint')
 * - Story ID (e.g., 'story:lngg-0050')
 * - Date (e.g., 'date:2026-02')
 *
 * Optional tags:
 * - Domain (e.g., 'domain:backend')
 * - Severity (e.g., 'severity:high')
 * - Priority (e.g., 'priority:medium')
 * - Custom tags passed in
 *
 * @param options - Tag generation options
 * @returns Array of deduplicated tags
 */
export function generateTags(options: TagGeneratorOptions): string[] {
  const tags: string[] = []

  // Entry type tag
  if (options.entryType === 'lesson') {
    tags.push('lesson-learned')
  } else if (options.entryType === 'decision') {
    tags.push('decision', 'architecture')
  } else {
    tags.push(options.entryType)
  }

  // Story ID tag
  if (options.storyId) {
    tags.push(`story:${options.storyId.toLowerCase()}`)
  }

  // Date tag (YYYY-MM format)
  const dateTag = `date:${new Date().toISOString().slice(0, 7)}`
  tags.push(dateTag)

  // Domain tag
  if (options.domain) {
    tags.push(`domain:${options.domain.toLowerCase()}`)
  }

  // Severity tag
  if (options.severity) {
    tags.push(`severity:${options.severity}`)
  }

  // Priority tag
  if (options.priority) {
    tags.push(`priority:${options.priority}`)
  }

  // Custom tags
  if (options.customTags && options.customTags.length > 0) {
    tags.push(...options.customTags)
  }

  // Deduplicate tags
  return Array.from(new Set(tags))
}
