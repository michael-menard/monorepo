/**
 * Directory-to-status mapping for swim-lane filesystem layout.
 *
 * Maps physical swim-lane directory names to WorkflowStoryStatus values.
 * Unknown or unmapped directories return null.
 *
 * @module directory
 */

import { type WorkflowStoryStatus } from '../__types__/index.js'

// ============================================================================
// Directory → WorkflowStoryStatus Mapping
// Source: WINT-9010 KNOWLEDGE-CONTEXT.yaml (C-6)
// Covers 7 known swim-lane directories from the filesystem layout.
// ============================================================================

/**
 * Maps swim-lane directory names to their canonical WorkflowStoryStatus.
 *
 * Note: Each directory maps to the "primary" status for that lane.
 * Multiple WorkflowStoryStatus values can share a directory (e.g., pending
 * and generated both live in backlog), but the reverse mapping returns the
 * most canonical entry-point status for each directory.
 *
 * - backlog → 'pending' (primary status for the backlog swim lane)
 * - elaboration → 'in-elaboration' (primary status for the elaboration lane)
 * - ready-to-work → 'ready-to-work'
 * - in-progress → 'in-progress'
 * - ready-for-qa → 'ready-for-qa'
 * - UAT → 'uat' (case-sensitive: directory is named "UAT")
 * - done → 'completed'
 */
const DIRECTORY_TO_STATUS: Record<string, WorkflowStoryStatus> = {
  backlog: 'pending',
  elaboration: 'in-elaboration',
  'ready-to-work': 'ready-to-work',
  'in-progress': 'in-progress',
  'ready-for-qa': 'ready-for-qa',
  UAT: 'uat',
  done: 'completed',
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Returns the WorkflowStoryStatus for a given swim-lane directory name.
 *
 * @param dirName - The directory name to look up (e.g., "backlog", "UAT")
 * @returns The corresponding WorkflowStoryStatus, or null if the directory
 *          is not a known swim-lane directory
 */
export function getStatusFromDirectory(dirName: string): WorkflowStoryStatus | null {
  const status = DIRECTORY_TO_STATUS[dirName]
  return status ?? null
}
