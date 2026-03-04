/**
 * Role Pack File Reader with In-Memory Cache
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Reads .claude/prompts/role-packs/{role}.md files.
 * Parses frontmatter for version using regex.
 * Caches results in-memory per role.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { type Role } from './__types__/index.js'

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/

const CachedPackSchema = z.object({
  content: z.string(),
  version: z.number().optional(),
})

type CachedPack = z.infer<typeof CachedPackSchema>

// In-memory cache: role -> CachedPack
const cache = new Map<Role, CachedPack>()

/**
 * Parse version from YAML frontmatter string.
 * Extracts `version: <value>` using regex — no gray-matter dependency.
 */
function parseVersion(frontmatter: string): number | undefined {
  const match = frontmatter.match(/^version:\s*["']?([0-9.]+)["']?/m)
  if (!match) return undefined
  const parsed = parseFloat(match[1])
  return isNaN(parsed) ? undefined : parsed
}

/**
 * Resolve the absolute path to a role pack file.
 * Walks up from this file to find the monorepo root, then looks in .claude/prompts/role-packs/.
 */
function resolveRolePackPath(role: Role): string {
  // Allow override via env for testing
  const baseDir = process.env.ROLE_PACK_DIR ?? resolve(process.cwd(), '.claude/prompts/role-packs')
  return resolve(baseDir, `${role}.md`)
}

/**
 * Read a role pack file, parse its frontmatter, and cache the result.
 *
 * @param role - The role to read (dev | po | qa | da)
 * @returns Cached pack with content and optional version, or null on miss/error
 */
export async function readRolePack(role: Role): Promise<CachedPack | null> {
  // Cache hit
  if (cache.has(role)) {
    return cache.get(role)!
  }

  const filePath = resolveRolePackPath(role)

  try {
    const raw = await readFile(filePath, 'utf-8')

    let version: number | undefined
    const fmMatch = raw.match(FRONTMATTER_RE)
    if (fmMatch) {
      version = parseVersion(fmMatch[1])
    }

    const pack: CachedPack = { content: raw, version }
    cache.set(role, pack)
    return pack
  } catch (error) {
    const isNotFound =
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'

    if (isNotFound) {
      logger.warn('[sidecar-role-pack] Role pack file not found', { role, filePath })
    } else {
      logger.warn('[sidecar-role-pack] Failed to read role pack file', {
        role,
        filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return null
  }
}

/**
 * Clear the in-memory cache.
 * Primarily for testing — allows fresh reads without restarting the process.
 */
export function clearRolePackCache(): void {
  cache.clear()
}
