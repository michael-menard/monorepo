/**
 * Estimate Bundle Impact
 *
 * Returns estimated minified+gzipped byte count for new packages using
 * the bundlephobia public API. Gracefully returns null on network errors,
 * private packages, or API failures — never blocks the pipeline.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * Design:
 * - Injectable fetchFn for full testability without HTTP calls
 * - Single retry with exponential backoff on transient failures
 * - Returns null for any error — bundle estimation is info-only severity
 * - Never throws — caller must handle null as "unknown size"
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Bundlephobia API response for a single package.
 * Uses .passthrough() to survive API schema additions without breaking.
 */
export const BundlephobiaResponseSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    size: z.number(),
    gzip: z.number(),
  })
  .passthrough()

export type BundlephobiaResponse = z.infer<typeof BundlephobiaResponseSchema>

/**
 * Result for a single package's bundle size estimation.
 *
 * - estimatedBytes: gzipped bundle size in bytes, or null if unavailable
 */
export const BundleImpactResultSchema = z.object({
  package: z.string(),
  estimatedBytes: z.number().nullable(),
  version: z.string().optional(),
})

export type BundleImpactResult = z.infer<typeof BundleImpactResultSchema>

// ============================================================================
// Options Schema
// ============================================================================

/**
 * Injectable fetch function type.
 * Matches the global fetch signature for easy substitution in tests.
 */
export type FetchFn = (
  url: string,
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export const EstimateBundleImpactOptionsSchema = z.object({
  /** Injectable fetch function; defaults to globalThis.fetch */
  fetchFn: z.function().optional(),
  /** Base URL for bundlephobia API; defaults to https://bundlephobia.com/api */
  apiBaseUrl: z.string().url().optional(),
  /** Retry delay in ms; defaults to 1000 */
  retryDelayMs: z.number().int().positive().optional(),
})

export type EstimateBundleImpactOptions = z.infer<typeof EstimateBundleImpactOptionsSchema>

// ============================================================================
// Implementation
// ============================================================================

const BUNDLEPHOBIA_API = 'https://bundlephobia.com/api'
const DEFAULT_RETRY_DELAY_MS = 1000

/**
 * Sleep for the specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch bundle size for a single package with one retry on failure.
 *
 * @param packageName - Package name (bare, e.g. "lodash" or "lodash@4.17.21")
 * @param fetchFn - Injectable fetch function
 * @param apiBaseUrl - Base URL for bundlephobia
 * @param retryDelayMs - Delay before retry in ms
 * @returns Gzipped size in bytes, or null on any error
 */
async function fetchBundleSize(
  packageName: string,
  fetchFn: FetchFn,
  apiBaseUrl: string,
  retryDelayMs: number,
): Promise<number | null> {
  const url = `${apiBaseUrl}/size?package=${encodeURIComponent(packageName)}`

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await sleep(retryDelayMs * Math.pow(2, attempt - 1))
      }

      const response = await fetchFn(url)

      if (!response.ok) {
        // 404 = private or unknown package; log at debug and return null
        if (response.status === 404) {
          logger.debug('dep-audit.estimate-bundle-impact: package not found on bundlephobia', {
            package: packageName,
          })
          return null
        }
        // Other HTTP errors — will retry once
        logger.debug('dep-audit.estimate-bundle-impact: bundlephobia API error', {
          package: packageName,
          status: response.status,
          attempt,
        })
        continue
      }

      const data = await response.json()
      const parsed = BundlephobiaResponseSchema.safeParse(data)

      if (!parsed.success) {
        logger.warn('dep-audit.estimate-bundle-impact: unexpected bundlephobia response shape', {
          package: packageName,
          error: parsed.error.message,
        })
        return null
      }

      return parsed.data.gzip
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.debug('dep-audit.estimate-bundle-impact: network error', {
        package: packageName,
        attempt,
        error: message,
      })
      // Will retry once, then return null
    }
  }

  return null
}

/**
 * Estimate the minified+gzipped bundle impact for a list of new packages.
 *
 * @param packages - Array of package names to estimate
 * @param options - Injectable fetch function and API config
 * @returns Array of BundleImpactResult — one per package; estimatedBytes is null on failure
 *
 * @example
 * const results = await estimateBundleImpact(['lodash'], { fetchFn: myFetch })
 * // => [{ package: 'lodash', estimatedBytes: 24000 }]
 */
export async function estimateBundleImpact(
  packages: string[],
  options: EstimateBundleImpactOptions = {},
): Promise<BundleImpactResult[]> {
  const fetchFn =
    (options.fetchFn as FetchFn | undefined) ?? (globalThis.fetch as unknown as FetchFn)
  const apiBaseUrl = options.apiBaseUrl ?? BUNDLEPHOBIA_API
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS

  const results: BundleImpactResult[] = []

  for (const pkg of packages) {
    try {
      const estimatedBytes = await fetchBundleSize(pkg, fetchFn, apiBaseUrl, retryDelayMs)
      results.push(
        BundleImpactResultSchema.parse({
          package: pkg,
          estimatedBytes,
        }),
      )
    } catch (error) {
      // Should not throw, but guard defensively
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('dep-audit.estimate-bundle-impact: unexpected error', {
        package: pkg,
        error: message,
      })
      results.push(
        BundleImpactResultSchema.parse({
          package: pkg,
          estimatedBytes: null,
        }),
      )
    }
  }

  return results
}
