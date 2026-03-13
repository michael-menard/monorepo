/**
 * Story Compatibility Shim Module
 * WINT-1011: DB-first routing for story management
 *
 * Four shim functions that wrap story-management tools.
 * CDBN-3010: Removed filesystem fallback - all operations are now DB-only.
 * Stories must exist in the database; no directory scanning.
 *
 * Behavioral contract:
 * - All operations query the database only
 * - Returns null/[] when stories not found in DB
 * - All return types conform to existing WINT-0090 output schemas
 */

import { logger } from '@repo/logger'
import { storyGetStatus } from '../story-management/story-get-status.js'
import { storyUpdateStatus } from '../story-management/story-update-status.js'
import { storyGetByStatus } from '../story-management/story-get-by-status.js'
import { storyGetByFeature } from '../story-management/story-get-by-feature.js'
import type {
  StoryGetStatusInput,
  StoryGetStatusOutput,
  StoryUpdateStatusInput,
  StoryUpdateStatusOutput,
  StoryGetByStatusInput,
  StoryGetByStatusOutput,
  StoryGetByFeatureInput,
  StoryGetByFeatureOutput,
} from '../story-management/__types__/index.js'

// ---------------------------------------------------------------------------
// Shim functions - DB only, no filesystem fallback
// ---------------------------------------------------------------------------

/**
 * shimGetStoryStatus
 * Queries database for story by ID. Returns null if not found.
 *
 * @param input - storyId (UUID or human-readable)
 * @returns Story record from DB or null if not found
 */
export async function shimGetStoryStatus(
  input: StoryGetStatusInput,
): Promise<StoryGetStatusOutput> {
  const result = await storyGetStatus(input)

  if (result === null) {
    logger.warn(`[shim] Story '${input.storyId}' not found in database`)
  }

  return result
}

/**
 * shimUpdateStoryStatus
 * Updates story status in database.
 *
 * @param input - storyId, newState, and optional metadata
 * @returns Updated story record or null if story not found
 */
export async function shimUpdateStoryStatus(
  input: StoryUpdateStatusInput,
): Promise<StoryUpdateStatusOutput> {
  const result = await storyUpdateStatus(input)

  if (result === null) {
    logger.warn(`[shim] shimUpdateStoryStatus: Story '${input.storyId}' not found in database`)
  }

  return result
}

/**
 * shimGetStoriesByStatus
 * Queries database for stories filtered by state.
 *
 * @param input - state filter and pagination parameters
 * @returns Array of stories from database
 */
export async function shimGetStoriesByStatus(
  input: StoryGetByStatusInput,
): Promise<StoryGetByStatusOutput> {
  const results = await storyGetByStatus(input)

  if (results.length === 0) {
    logger.warn(`[shim] No stories found in database for state '${input.state}'`)
  }

  return results
}

/**
 * shimGetStoriesByFeature
 * Queries database for stories filtered by epic.
 *
 * @param input - epic filter and pagination parameters
 * @returns Array of stories from database
 */
export async function shimGetStoriesByFeature(
  input: StoryGetByFeatureInput,
): Promise<StoryGetByFeatureOutput> {
  const results = await storyGetByFeature(input)

  if (results.length === 0) {
    logger.warn(`[shim] No stories found in database for epic '${input.epic}'`)
  }

  return results
}
