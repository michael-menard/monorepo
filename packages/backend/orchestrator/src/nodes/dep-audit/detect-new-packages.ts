/**
 * Detect New Packages
 *
 * Compares two workspace package.json snapshots and returns a typed
 * PackageChangeSummary (Zod-validated) with added/updated/removed arrays.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - Pure function: no I/O, fully testable without mocks
 * - Input: two records of packageName -> version strings
 * - Output: Zod-validated PackageChangeSummary
 */

import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

/**
 * A single package change entry — package@version string.
 * Examples: "dayjs@1.11.0", "lodash@4.17.21"
 */
export const PackageEntrySchema = z.string().min(1)

/**
 * Snapshot of workspace dependencies: record of package name -> semver version.
 */
export const PackageSnapshotSchema = z.record(z.string(), z.string())
export type PackageSnapshot = z.infer<typeof PackageSnapshotSchema>

/**
 * Result of comparing two package snapshots.
 *
 * - added: packages present in current but not in previous
 * - updated: packages present in both but with different versions
 * - removed: packages present in previous but not in current
 */
export const PackageChangeSummarySchema = z.object({
  added: z.array(z.string()),
  updated: z.array(z.string()),
  removed: z.array(z.string()),
})

export type PackageChangeSummary = z.infer<typeof PackageChangeSummarySchema>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Detect new, updated, and removed packages between two package.json snapshots.
 *
 * @param prevSnapshot - Previous package.json dependencies (name -> version)
 * @param currentSnapshot - Current package.json dependencies (name -> version)
 * @returns Zod-validated PackageChangeSummary
 *
 * @example
 * const prev = { lodash: '4.0.0', 'date-fns': '2.0.0' }
 * const curr = { lodash: '4.17.21', 'date-fns': '2.0.0', dayjs: '1.11.0' }
 * // => { added: ['dayjs@1.11.0'], updated: ['lodash@4.17.21'], removed: [] }
 */
export function detectNewPackages(
  prevSnapshot: PackageSnapshot,
  currentSnapshot: PackageSnapshot,
): PackageChangeSummary {
  const added: string[] = []
  const updated: string[] = []
  const removed: string[] = []

  // Find added and updated packages
  for (const [name, version] of Object.entries(currentSnapshot)) {
    if (!(name in prevSnapshot)) {
      added.push(`${name}@${version}`)
    } else if (prevSnapshot[name] !== version) {
      updated.push(`${name}@${version}`)
    }
  }

  // Find removed packages
  for (const name of Object.keys(prevSnapshot)) {
    if (!(name in currentSnapshot)) {
      removed.push(name)
    }
  }

  const summary = PackageChangeSummarySchema.parse({ added, updated, removed })
  return summary
}
