/**
 * Story ID validation.
 *
 * Provides isValidStoryId: validates that a string conforms to the
 * human-readable story ID format (e.g., WINT-9010, KBAR-0030).
 *
 * Pattern: /^[A-Z]{2,10}-\d{3,4}$/
 * - Prefix: 2–10 uppercase letters
 * - Separator: hyphen
 * - Number: exactly 3 or 4 digits
 *
 * This pattern is identical to STORY_ID_REGEX in story-compatibility/__types__/index.ts
 * and must remain backward-compatible per constraint C-5.
 *
 * @module validation
 */

import { z } from 'zod'

// ============================================================================
// Story ID Schema
// Source: packages/backend/mcp-tools/src/story-compatibility/__types__/index.ts
// Pattern must match STORY_ID_REGEX exactly: /^[A-Z]{2,10}-\d{3,4}$/
// ============================================================================

const StoryIdSchema = z
  .string()
  .regex(
    /^[A-Z]{2,10}-\d{3,4}$/,
    'Story ID must be in format PREFIX-NNNN (e.g., WINT-9010, KBAR-0030)',
  )

// ============================================================================
// Public API
// ============================================================================

/**
 * Validates whether a string is a valid human-readable story ID.
 *
 * Valid formats: WINT-9010, KBAR-0030, AB-123, ABCDEFGHIJ-9999
 * Invalid: lowercase, UUID, empty string, missing separator, >10 char prefix, >4 digit suffix
 *
 * @param id - The string to validate
 * @returns true if the string is a valid story ID, false otherwise
 */
export function isValidStoryId(id: string): boolean {
  const result = StoryIdSchema.safeParse(id)
  return result.success
}
