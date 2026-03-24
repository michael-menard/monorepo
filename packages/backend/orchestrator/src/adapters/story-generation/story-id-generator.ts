/**
 * Story ID Generator Adapter for Story Generation
 *
 * Production adapter that queries KB for existing stories with a prefix,
 * finds the max numeric suffix, and generates new IDs from max + step=10.
 * Falls back to 1010 start if no existing stories.
 *
 * @see APRS-5030 AC-7
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { StoryIdGeneratorFn } from '../../nodes/story-generation/write-to-kb.js'

// ============================================================================
// Injectable KB Types
// ============================================================================

/**
 * Input schema for kb_list_stories MCP tool.
 */
export const KbListStoriesInputSchema = z.object({
  prefix: z.string().optional(),
  limit: z.number().int().positive().optional(),
})

export type KbListStoriesInput = z.infer<typeof KbListStoriesInputSchema>

/**
 * A single story record from kb_list_stories.
 */
export const KbStoryRecordSchema = z.object({
  story_id: z.string(),
})

export type KbStoryRecord = z.infer<typeof KbStoryRecordSchema>

/**
 * Injectable function type for kb_list_stories.
 * In production, this delegates to the kb_list_stories MCP tool.
 * In tests, this can be mocked.
 *
 * Returns an array of story records with at least { story_id }.
 */
export type KbListStoriesFn = (input: KbListStoriesInput) => Promise<KbStoryRecord[]>

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_START = 1010
const STEP = 10

/**
 * Extracts the numeric suffix from a story ID.
 * e.g. "AUTH-1020" → 1020, "MYPLAN-1030" → 1030
 * Returns null if no numeric suffix found.
 */
export function extractNumericSuffix(storyId: string): number | null {
  const match = storyId.match(/-(\d+)$/)
  if (!match) return null
  const n = parseInt(match[1]!, 10)
  return isNaN(n) ? null : n
}

/**
 * Finds the maximum numeric suffix among existing story IDs.
 * Returns DEFAULT_START - STEP if no stories found (so next ID = DEFAULT_START).
 */
export function findMaxSuffix(existingIds: string[]): number {
  if (existingIds.length === 0) return DEFAULT_START - STEP

  const suffixes = existingIds.map(extractNumericSuffix).filter((n): n is number => n !== null)

  if (suffixes.length === 0) return DEFAULT_START - STEP

  return Math.max(...suffixes)
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Creates a StoryIdGeneratorFn that queries KB for existing stories,
 * finds the max sequence number, and generates new IDs with step=10.
 *
 * Algorithm:
 * 1. Call kb_list_stories({ prefix }) to get existing stories
 * 2. Extract numeric suffixes from story_id fields
 * 3. Find max suffix (default: 1000 → first ID = 1010)
 * 4. Generate count new IDs: maxSuffix + step, maxSuffix + 2*step, ...
 *
 * @param kbListStories - Injectable kb_list_stories function
 * @returns StoryIdGeneratorFn compatible with createWriteToKbNode
 */
export function createStoryIdGeneratorAdapter(kbListStories: KbListStoriesFn): StoryIdGeneratorFn {
  return async (prefix: string, count: number): Promise<string[]> => {
    logger.info('story-id-generator: generating IDs', { prefix, count })

    try {
      const stories = await kbListStories({ prefix, limit: 1000 })
      const existingIds = stories.map(s => s.story_id)

      const maxSuffix = findMaxSuffix(existingIds)
      const startAt = maxSuffix + STEP

      const ids = Array.from({ length: count }, (_, i) => `${prefix}-${startAt + i * STEP}`)

      logger.info('story-id-generator: generated IDs', {
        prefix,
        count,
        startAt,
        existingCount: existingIds.length,
      })

      return ids
    } catch (err) {
      logger.warn('story-id-generator: kb_list_stories failed, using default start', {
        err,
        prefix,
      })

      // Fallback: start at 1010
      return Array.from({ length: count }, (_, i) => `${prefix}-${DEFAULT_START + i * STEP}`)
    }
  }
}
