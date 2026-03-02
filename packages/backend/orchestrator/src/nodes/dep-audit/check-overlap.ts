/**
 * Check Overlap
 *
 * Detects packages that are functionally equivalent to packages already
 * installed in the monorepo. Uses a YAML equivalence config for the
 * equivalence knowledge base.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - Injectable configPath for testability
 * - Graceful fallback if config file is missing (logger.warn + empty result)
 * - Returns OverlapFinding[] — one entry per new package that has an overlap
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas
// ============================================================================

/**
 * A single equivalence group from the YAML config.
 */
export const EquivalenceGroupSchema = z.object({
  name: z.string(),
  packages: z.array(z.string()),
})

export type EquivalenceGroup = z.infer<typeof EquivalenceGroupSchema>

/**
 * The full equivalence config file structure.
 */
export const EquivalenceConfigSchema = z.object({
  groups: z.array(EquivalenceGroupSchema),
})

export type EquivalenceConfig = z.infer<typeof EquivalenceConfigSchema>

/**
 * A single overlap finding — a new package that has a known functional equivalent
 * already present in the monorepo.
 */
export const OverlapFindingSchema = z.object({
  package: z.string(),
  overlapsWith: z.string(),
  groupName: z.string(),
  severity: z.literal('high'),
})

export type OverlapFinding = z.infer<typeof OverlapFindingSchema>

// ============================================================================
// Config Loader
// ============================================================================

/**
 * Default path to the dep-equivalences.yaml config file.
 */
function getDefaultConfigPath(): string {
  // Resolve relative to this file's location at runtime
  const thisDir = dirname(fileURLToPath(import.meta.url))
  return resolve(thisDir, '../../config/dep-equivalences.yaml')
}

/**
 * Load and parse the equivalence config from a YAML file.
 *
 * Returns null if the file does not exist or cannot be parsed.
 */
export function loadEquivalenceConfig(configPath?: string): EquivalenceConfig | null {
  const resolvedPath = configPath ?? getDefaultConfigPath()

  if (!existsSync(resolvedPath)) {
    logger.warn('dep-audit.check-overlap: equivalence config file not found', {
      configPath: resolvedPath,
    })
    return null
  }

  try {
    const content = readFileSync(resolvedPath, 'utf-8')
    const parsed = parseYaml(content)
    return EquivalenceConfigSchema.parse(parsed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit.check-overlap: failed to parse equivalence config', {
      configPath: resolvedPath,
      error: message,
    })
    return null
  }
}

// ============================================================================
// Options Schema
// ============================================================================

export const CheckOverlapOptionsSchema = z.object({
  /** Path to dep-equivalences.yaml; defaults to config/dep-equivalences.yaml */
  configPath: z.string().optional(),
  /**
   * The set of packages already installed in the monorepo.
   * Keys are package names. If not provided, overlap detection is skipped.
   */
  installedPackages: z.record(z.string(), z.string()).optional(),
})

export type CheckOverlapOptions = z.infer<typeof CheckOverlapOptionsSchema>

// ============================================================================
// Implementation
// ============================================================================

/**
 * Check whether any of the new packages are functionally equivalent to packages
 * already installed in the monorepo.
 *
 * @param newPackages - Array of package names being added (bare names, not @version)
 * @param options - Optional config path and installed package set
 * @returns Array of overlap findings (empty if no overlaps or config missing)
 *
 * @example
 * const findings = checkOverlap(['dayjs'], {
 *   installedPackages: { 'date-fns': '2.0.0' },
 * })
 * // => [{ package: 'dayjs', overlapsWith: 'date-fns', groupName: 'date-and-time', severity: 'high' }]
 */
export function checkOverlap(
  newPackages: string[],
  options: CheckOverlapOptions = {},
): OverlapFinding[] {
  const config = loadEquivalenceConfig(options.configPath)

  if (!config) {
    return []
  }

  const installedPackages = options.installedPackages ?? {}
  const findings: OverlapFinding[] = []

  for (const newPkg of newPackages) {
    // Find the equivalence group this package belongs to
    const group = config.groups.find(g => g.packages.includes(newPkg))
    if (!group) {
      continue
    }

    // Check if any other member of the group is already installed
    for (const equivalentPkg of group.packages) {
      if (equivalentPkg === newPkg) {
        continue
      }

      if (equivalentPkg in installedPackages) {
        findings.push(
          OverlapFindingSchema.parse({
            package: newPkg,
            overlapsWith: equivalentPkg,
            groupName: group.name,
            severity: 'high',
          }),
        )
        // Report first overlap only per new package (avoid duplicates)
        break
      }
    }
  }

  return findings
}
