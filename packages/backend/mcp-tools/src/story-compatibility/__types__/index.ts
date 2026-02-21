/**
 * Types and constants for Story Compatibility Shim Module
 * WINT-1011: Story Compatibility Layer (DB-first, directory-fallback routing)
 *
 * Behavioral nuances (documented per WINT-1011 DECISIONS.yaml):
 * - storyGetStatus returns null on BOTH DB-miss AND DB-error
 *   Shim treats both as "not in DB → try directory fallback" (Phase 1 acceptable)
 * - storyGetByStatus/storyGetByFeature return [] on BOTH empty result AND DB-error
 *   Shim triggers directory fallback on empty [] for list queries (Phase 1 acceptable)
 *
 * WINT-9010: isValidStoryId imported from @repo/workflow-logic.
 * STORY_ID_REGEX is kept for backward-compatible re-export only; prefer isValidStoryId.
 */

import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'
import { isValidStoryId } from '@repo/workflow-logic'

// Re-export isValidStoryId so callers that imported from this module still work
export { isValidStoryId }

/**
 * Swim-lane directory name → storyStateEnum mapping
 * Proven mapping from WINT-1030 (swim-lane → state routing).
 *
 * Key: filesystem directory name under STORIES_ROOT
 * Value: storyStateEnum value stored in the database
 */
export const SWIM_LANE_TO_STATE = {
  backlog: 'backlog',
  'ready-to-work': 'ready_to_work',
  'in-progress': 'in_progress',
  'ready-for-qa': 'ready_for_qa',
  UAT: 'in_qa',
  done: 'done',
} as const

export type SwimLaneDir = keyof typeof SWIM_LANE_TO_STATE
export type SwimLaneState = (typeof SWIM_LANE_TO_STATE)[SwimLaneDir]

/**
 * States that only exist in the database and have no swim-lane directory equivalent.
 * Stories in these states cannot be found via directory fallback.
 */
export const KNOWN_DB_ONLY_STATES = ['blocked', 'cancelled'] as const

/**
 * All known swim-lane directory names (used for directory scanning)
 */
export const SWIM_LANE_DIRS = Object.keys(SWIM_LANE_TO_STATE) as SwimLaneDir[]

/**
 * Story ID regex for directory-based story discovery.
 * Matches human-readable story IDs like WINT-0090, KBAR-1234, TEST-9999.
 *
 * @deprecated Use isValidStoryId from @repo/workflow-logic instead.
 *   STORY_ID_REGEX is kept for backward compatibility only.
 */
export const STORY_ID_REGEX = /^[A-Z]{2,10}-\d{3,4}$/

/**
 * ShimOptions schema (Zod-first per CLAUDE.md)
 * Controls injectable configuration for shim functions.
 *
 * Resolution order for storiesRoot:
 *   1. options.storiesRoot (highest priority, injectable in tests)
 *   2. process.env.STORIES_ROOT
 *   3. detectMonorepoRoot() auto-detection
 */
export const ShimOptionsSchema = z.object({
  storiesRoot: z.string().optional(),
})

export type ShimOptions = z.infer<typeof ShimOptionsSchema>

/**
 * Detects the monorepo root by walking up directories looking for pnpm-workspace.yaml.
 * Falls back to process.cwd() if not found.
 */
function detectMonorepoRoot(): string {
  let current = process.cwd()
  // Walk up at most 10 levels
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return process.cwd()
}

/**
 * Resolves the stories root path from options, env var, or auto-detection.
 * The stories root is the parent directory containing swim-lane subdirectories
 * (e.g. plans/future/platform/wint).
 */
export function resolveStoriesRoot(options?: ShimOptions): string {
  if (options?.storiesRoot) return options.storiesRoot
  if (process.env.STORIES_ROOT) return process.env.STORIES_ROOT
  // Default: monorepo-root/plans/future/platform/wint
  return path.join(detectMonorepoRoot(), 'plans', 'future', 'platform', 'wint')
}
