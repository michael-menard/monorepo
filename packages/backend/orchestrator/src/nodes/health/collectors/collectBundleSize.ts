/**
 * collectBundleSize
 *
 * Collects the total bundle size in bytes by reading the build output manifest
 * or running the build and summing output file sizes.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04b)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectBundleSize
 *
 * Runs `du -sb dist/ 2>/dev/null` to get total bytes in the dist directory.
 * Falls back to finding all JS files and summing their sizes.
 *
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function
 * @returns Total bundle size in bytes, or null if collection failed
 */
export async function collectBundleSize(execFn: ExecFn): Promise<number | null> {
  try {
    // Use du to get total bytes of the dist/build directory
    // -s = summary, -b = bytes (GNU du) / or use find + wc on macOS
    const stdout = await execFn(
      'find dist -name "*.js" -o -name "*.mjs" 2>/dev/null | xargs wc -c 2>/dev/null | tail -1 || echo "0"',
    )

    // wc -c output for total line: "  12345 total" or just "0"
    const match = stdout.trim().match(/(\d+)(?:\s+total)?$/)
    if (match) {
      const bytes = parseInt(match[1], 10)
      return isNaN(bytes) ? null : bytes
    }

    return null
  } catch (err) {
    logger.warn('collectBundleSize: failed to collect bundle size', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
