import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { logger } from '@repo/logger'

// Resolve from monorepo root (packages/backend/mcp-tools/src/scripts/utils -> ../../../../../..)
const MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../../')

/**
 * Reads a file relative to the monorepo root. Returns null if not found.
 *
 * @param relPath - Path relative to the monorepo root
 * @param callerTag - Log tag to identify the calling script (e.g. '[populate-library-cache]')
 */
export function readDoc(relPath: string, callerTag = '[read-doc]'): string | null {
  try {
    return readFileSync(resolve(MONOREPO_ROOT, relPath), 'utf-8')
  } catch (err) {
    logger.warn(`${callerTag} Could not read source doc`, {
      path: relPath,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
