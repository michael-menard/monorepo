import { z } from 'zod'

/**
 * GAPS Schema
 *
 * Captures MVP-blocking and non-blocking gaps identified during elaboration.
 * Written by elab-analyst, read by elab-completion-leader and downstream agents.
 */

export const GapSeveritySchema = z.enum(['critical', 'high', 'medium', 'low'])

export type GapSeverity = z.infer<typeof GapSeveritySchema>

export const GapItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  blocking: z.boolean(),
  severity: GapSeveritySchema,
  source: z.string().min(1),
  resolution: z.string().nullable().default(null),
})

export type GapItem = z.infer<typeof GapItemSchema>

export const GapsSchema = z.object({
  story_id: z.string().min(1),
  generated_at: z.string().datetime(),
  gaps: z.array(GapItemSchema).default([]),
})

export type Gaps = z.infer<typeof GapsSchema>

/**
 * Create an initial gaps artifact for a story
 */
export function createGaps(storyId: string): Gaps {
  return {
    story_id: storyId,
    generated_at: new Date().toISOString(),
    gaps: [],
  }
}
