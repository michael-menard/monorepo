/**
 * Detect Unmaintained
 *
 * Queries the npm registry for each package and flags packages with no new
 * release in 12+ months (configurable) or with a `deprecated` field in their
 * npm metadata. Handles 404s and network errors gracefully.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - Injectable fetchFn for full testability
 * - Graceful 404 handling — private/unknown packages are skipped with logger.warn
 * - Never throws — returns empty findings on unhandled errors
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Constants
// ============================================================================

const NPM_REGISTRY_BASE = 'https://registry.npmjs.org'

/** Default: flag packages with no release for this many days */
const DEFAULT_UNMAINTAINED_AGE_DAYS = 365

// ============================================================================
// Schemas
// ============================================================================

/**
 * Minimal npm registry response for a package.
 * We only extract the fields we need; passthrough allows additional fields.
 */
export const NpmRegistryResponseSchema = z
  .object({
    name: z.string(),
    deprecated: z.string().optional(),
    time: z.record(z.string(), z.string()).optional(),
    'dist-tags': z
      .object({
        latest: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export type NpmRegistryResponse = z.infer<typeof NpmRegistryResponseSchema>

/**
 * An unmaintained package finding.
 */
export const UnmaintainedFindingSchema = z.object({
  package: z.string(),
  reason: z.enum(['stale', 'deprecated']),
  lastPublished: z.string().nullable(),
  daysSincePublish: z.number().nullable(),
  deprecationMessage: z.string().nullable(),
})

export type UnmaintainedFinding = z.infer<typeof UnmaintainedFindingSchema>

// ============================================================================
// Injectable fetch type
// ============================================================================

export type FetchFn = (url: string) => Promise<{
  ok: boolean
  status: number
  json: () => Promise<unknown>
}>

// ============================================================================
// Options Schema
// ============================================================================

export const DetectUnmaintainedOptionsSchema = z.object({
  /** Injectable fetch function; defaults to globalThis.fetch */
  fetchFn: z.function().optional(),
  /** Base URL for npm registry; defaults to https://registry.npmjs.org */
  registryBaseUrl: z.string().url().optional(),
  /** Days without a release to flag as unmaintained; defaults to 365 */
  unmaintainedAgeDays: z.number().int().positive().optional(),
})

export type DetectUnmaintainedOptions = z.infer<typeof DetectUnmaintainedOptionsSchema>

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract the most recent publish date from the npm `time` field.
 * The `time` object has special keys `created` and `modified` plus
 * one entry per version. We want the most recent version date.
 */
function getLatestPublishDate(
  timeMap: Record<string, string>,
  latestVersion: string | undefined,
): string | null {
  if (latestVersion && timeMap[latestVersion]) {
    return timeMap[latestVersion]
  }

  // Fallback: find the most recent date across all version entries
  const versionDates = Object.entries(timeMap)
    .filter(([key]) => key !== 'created' && key !== 'modified')
    .map(([, date]) => date)
    .sort()

  return versionDates.at(-1) ?? null
}

/**
 * Calculate days since a date string.
 */
function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Check a single package against the npm registry.
 *
 * @returns UnmaintainedFinding or null if the package appears well-maintained
 */
async function checkPackage(
  packageName: string,
  fetchFn: FetchFn,
  registryBaseUrl: string,
  unmaintainedAgeDays: number,
): Promise<UnmaintainedFinding | null> {
  const url = `${registryBaseUrl}/${encodeURIComponent(packageName)}`

  let response: Awaited<ReturnType<FetchFn>>

  try {
    response = await fetchFn(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit.detect-unmaintained: network error querying npm registry', {
      package: packageName,
      error: message,
    })
    return null
  }

  if (response.status === 404) {
    logger.warn('dep-audit.detect-unmaintained: package not found in npm registry (private?)', {
      package: packageName,
    })
    return null
  }

  if (!response.ok) {
    logger.warn('dep-audit.detect-unmaintained: npm registry returned error status', {
      package: packageName,
      status: response.status,
    })
    return null
  }

  let data: unknown
  try {
    data = await response.json()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('dep-audit.detect-unmaintained: failed to parse npm registry response', {
      package: packageName,
      error: message,
    })
    return null
  }

  const parsed = NpmRegistryResponseSchema.safeParse(data)
  if (!parsed.success) {
    logger.warn('dep-audit.detect-unmaintained: unexpected npm registry response shape', {
      package: packageName,
      error: parsed.error.message,
    })
    return null
  }

  const pkg = parsed.data

  // Check deprecated field first
  if (pkg.deprecated) {
    const latestVersion = pkg['dist-tags']?.latest
    const timeMap = pkg.time ?? {}
    const lastPublished = getLatestPublishDate(timeMap, latestVersion)
    const daysSincePublish = lastPublished ? daysSince(lastPublished) : null

    return UnmaintainedFindingSchema.parse({
      package: packageName,
      reason: 'deprecated',
      lastPublished,
      daysSincePublish,
      deprecationMessage: pkg.deprecated,
    })
  }

  // Check publish staleness
  const timeMap = pkg.time ?? {}
  const latestVersion = pkg['dist-tags']?.latest
  const lastPublished = getLatestPublishDate(timeMap, latestVersion)

  if (!lastPublished) {
    // Cannot determine publish date — skip
    return null
  }

  const days = daysSince(lastPublished)
  if (days >= unmaintainedAgeDays) {
    return UnmaintainedFindingSchema.parse({
      package: packageName,
      reason: 'stale',
      lastPublished,
      daysSincePublish: days,
      deprecationMessage: null,
    })
  }

  return null
}

/**
 * Detect packages that are unmaintained (no release in 12+ months or deprecated).
 *
 * @param packages - Array of package names to check
 * @param options - Injectable fetch function, registry URL, age threshold
 * @returns Array of UnmaintainedFinding — empty if all packages are well-maintained
 *
 * @example
 * const findings = await detectUnmaintained(['old-package'], { fetchFn: mockFetch })
 * // => [{ package: 'old-package', reason: 'stale', daysSincePublish: 730, ... }]
 */
export async function detectUnmaintained(
  packages: string[],
  options: DetectUnmaintainedOptions = {},
): Promise<UnmaintainedFinding[]> {
  const fetchFn = (options.fetchFn as FetchFn | undefined) ?? (globalThis.fetch as unknown as FetchFn)
  const registryBaseUrl = options.registryBaseUrl ?? NPM_REGISTRY_BASE
  const unmaintainedAgeDays = options.unmaintainedAgeDays ?? DEFAULT_UNMAINTAINED_AGE_DAYS

  const findings: UnmaintainedFinding[] = []

  for (const pkg of packages) {
    const finding = await checkPackage(pkg, fetchFn, registryBaseUrl, unmaintainedAgeDays)
    if (finding) {
      findings.push(finding)
    }
  }

  return findings
}
