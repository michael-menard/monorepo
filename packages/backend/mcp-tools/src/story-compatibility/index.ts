/**
 * Story Compatibility Shim Module
 * WINT-1011: DB-first, directory-fallback routing for story management
 *
 * Four shim functions that wrap story-management tools with graceful fallback
 * to filesystem directory scanning when the database is unavailable or returns
 * no results.
 *
 * Behavioral contract:
 * - DB result found → return DB result immediately (no directory scan) [AC-10]
 * - DB returns null/[] → fall back to directory scan [AC-1, AC-3, AC-4]
 * - shimUpdateStoryStatus: DB unavailable → return null + warn (NO filesystem write) [AC-2]
 * - All return types conform to existing WINT-0090 output schemas [AC-5]
 * - storiesRoot is injectable via ShimOptions [AC-12]
 *
 * WINT-9010: Uses isValidStoryId from @repo/workflow-logic (replaces STORY_ID_REGEX.test()).
 */

import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { isValidStoryId } from '@repo/workflow-logic'
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
import {
  SWIM_LANE_TO_STATE,
  SWIM_LANE_DIRS,
  type ShimOptions,
  resolveStoriesRoot,
} from './__types__/index.js'

// ---------------------------------------------------------------------------
// Directory scan helpers
// ---------------------------------------------------------------------------

/**
 * Represents a story found in a swim-lane directory via filesystem scan.
 */
const DirectoryStoryRecordSchema = z.object({
  storyId: z.string(),
  state: z.enum([
    'backlog',
    'ready_to_work',
    'in_progress',
    'ready_for_review',
    'ready_for_qa',
    'in_qa',
    'blocked',
    'done',
    'cancelled',
    'failed_code_review',
    'failed_qa',
  ]),
})

type DirectoryStoryRecord = z.infer<typeof DirectoryStoryRecordSchema>

/**
 * Scans swim-lane directories under storiesRoot to find all stories.
 * Returns an array of { storyId, state } objects.
 *
 * Only scans the known SWIM_LANE_DIRS; skips directories that do not exist.
 * Story IDs are matched using isValidStoryId from @repo/workflow-logic.
 */
function scanDirectories(storiesRoot: string): DirectoryStoryRecord[] {
  const results: DirectoryStoryRecord[] = []

  for (const laneDir of SWIM_LANE_DIRS) {
    const lanePath = path.join(storiesRoot, laneDir)
    if (!fs.existsSync(lanePath)) continue

    let entries: string[]
    try {
      entries = fs.readdirSync(lanePath)
    } catch {
      // Silently skip unreadable directories
      continue
    }

    const state = SWIM_LANE_TO_STATE[laneDir]
    for (const entry of entries) {
      if (isValidStoryId(entry)) {
        results.push({ storyId: entry, state })
      }
    }
  }

  return results
}

/**
 * Builds a StoryGetStatusOutput record from a directory scan result.
 * Uses a stable synthetic UUID derived from the storyId.
 */
function directoryRecordToStoryStatus(
  storyId: string,
  state: DirectoryStoryRecord['state'],
): NonNullable<StoryGetStatusOutput> {
  const now = new Date()
  return {
    // Synthetic UUID — directory scan has no DB record
    id: randomUUID(),
    storyId,
    title: storyId,
    state,
    priority: 'P4',
    storyType: 'feature',
    epic: null,
    wave: null,
    createdAt: now,
    updatedAt: now,
  }
}

// ---------------------------------------------------------------------------
// Shim functions
// ---------------------------------------------------------------------------

/**
 * shimGetStoryStatus
 * DB-first: delegates to storyGetStatus. If DB returns null (miss or error),
 * falls back to directory scan to find the story's current state. [AC-1, AC-10]
 *
 * @param input - storyId (UUID or human-readable)
 * @param options - ShimOptions with injectable storiesRoot [AC-12]
 * @returns Story record (DB or directory) or null if not found anywhere
 */
export async function shimGetStoryStatus(
  input: StoryGetStatusInput,
  options?: ShimOptions,
): Promise<StoryGetStatusOutput> {
  // 1. Try DB first (AC-10: only scan directory if DB misses)
  const dbResult = await storyGetStatus(input)
  if (dbResult !== null) {
    return dbResult
  }

  // 2. DB miss/error → fall back to directory scan (AC-1)
  const storiesRoot = resolveStoriesRoot(options)
  const allStories = scanDirectories(storiesRoot)
  const found = allStories.find(s => s.storyId === input.storyId)

  if (!found) {
    return null
  }

  logger.warn(
    `[shim] Story '${input.storyId}' not found in DB — ` +
      `returning directory fallback result (state: ${found.state})`,
  )

  return directoryRecordToStoryStatus(found.storyId, found.state)
}

/**
 * shimUpdateStoryStatus
 * DB-only write: delegates to storyUpdateStatus. If DB is unavailable (returns null),
 * logs a warning and returns null. Never writes to filesystem. [AC-2]
 *
 * @param input - storyId, newState, and optional metadata
 * @param options - ShimOptions (not used for write path, included for API consistency)
 * @returns Updated story record or null if DB unavailable
 */
export async function shimUpdateStoryStatus(
  input: StoryUpdateStatusInput,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options?: ShimOptions,
): Promise<StoryUpdateStatusOutput> {
  const result = await storyUpdateStatus(input)

  if (result === null) {
    logger.warn(
      `[shim] shimUpdateStoryStatus: DB write failed for story '${input.storyId}'` +
        ` — no filesystem fallback (AC-2)`,
    )
  }

  return result
}

/**
 * shimGetStoriesByStatus
 * DB-first: delegates to storyGetByStatus. If DB returns empty array (no results or error),
 * falls back to directory scan filtering by state. [AC-3, AC-10]
 *
 * @param input - state filter and pagination parameters
 * @param options - ShimOptions with injectable storiesRoot [AC-12]
 * @returns Array of stories from DB or directory fallback
 */
export async function shimGetStoriesByStatus(
  input: StoryGetByStatusInput,
  options?: ShimOptions,
): Promise<StoryGetByStatusOutput> {
  // 1. Try DB first (AC-10: only scan directory if DB returns empty)
  const dbResults = await storyGetByStatus(input)
  if (dbResults.length > 0) {
    return dbResults
  }

  // 2. DB empty/error → fall back to directory scan (AC-3)
  // Note: blocked/cancelled have no directory equivalent (KNOWN_DB_ONLY_STATES)
  const swimLaneEntry = Object.entries(SWIM_LANE_TO_STATE).find(
    ([, stateVal]) => stateVal === input.state,
  )
  if (!swimLaneEntry) {
    // DB-only state (blocked, cancelled) — no directory fallback possible
    return []
  }

  const storiesRoot = resolveStoriesRoot(options)
  const allStories = scanDirectories(storiesRoot)
  const filtered = allStories.filter(s => s.state === input.state)

  if (filtered.length === 0) {
    return []
  }

  logger.warn(
    `[shim] shimGetStoriesByStatus: DB returned empty for state '${input.state}'` +
      ` — using directory fallback (${filtered.length} stories found)`,
  )

  // Apply pagination to directory results
  const { limit = 50, offset = 0 } = input
  const paginated = filtered.slice(offset, offset + limit)

  return paginated.map(s => directoryRecordToStoryStatus(s.storyId, s.state))
}

/**
 * shimGetStoriesByFeature
 * DB-first: delegates to storyGetByFeature. If DB returns empty array (no results or error),
 * falls back to directory scan searching for storyId patterns across all swim lanes. [AC-4, AC-10]
 *
 * Directory fallback for feature (epic) uses the storyId prefix convention:
 * stories named <EPIC>-NNNN are assumed to belong to the epic.
 *
 * @param input - epic filter and pagination parameters
 * @param options - ShimOptions with injectable storiesRoot [AC-12]
 * @returns Array of stories from DB or directory fallback
 */
export async function shimGetStoriesByFeature(
  input: StoryGetByFeatureInput,
  options?: ShimOptions,
): Promise<StoryGetByFeatureOutput> {
  // 1. Try DB first (AC-10: only scan directory if DB returns empty)
  const dbResults = await storyGetByFeature(input)
  if (dbResults.length > 0) {
    return dbResults
  }

  // 2. DB empty/error → fall back to directory scan (AC-4)
  // Heuristic: storyId starts with "<epic>-" (case-sensitive, uppercase)
  const epicPrefix = `${input.epic}-`
  const storiesRoot = resolveStoriesRoot(options)
  const allStories = scanDirectories(storiesRoot)
  const filtered = allStories.filter(s => s.storyId.startsWith(epicPrefix))

  if (filtered.length === 0) {
    return []
  }

  logger.warn(
    `[shim] shimGetStoriesByFeature: DB returned empty for epic '${input.epic}'` +
      ` — using directory fallback (${filtered.length} stories found)`,
  )

  // Apply pagination to directory results
  const { limit = 50, offset = 0 } = input
  const paginated = filtered.slice(offset, offset + limit)

  return paginated.map(s => ({
    ...directoryRecordToStoryStatus(s.storyId, s.state),
    epic: input.epic,
  }))
}
