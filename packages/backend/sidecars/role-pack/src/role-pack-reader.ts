/**
 * Role Pack File Reader with In-Memory Cache
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Reads .claude/prompts/role-packs/{role}.md files.
 * Parses frontmatter using gray-matter (same approach as @repo/database-schema parseFrontmatter).
 * Caches results in memory per role; cache is invalidated on process restart.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import matter from 'gray-matter'
import { logger } from '@repo/logger'
import type { Role, CachedPack } from './__types__/index.js'

/** In-memory cache: role → { content, version } */
const cache = new Map<Role, CachedPack>()

/**
 * Default path to role pack files (relative to process.cwd())
 * Can be overridden via ROLE_PACK_DIR env var for testing/UAT.
 */
function getRolePackDir(): string {
  return process.env['ROLE_PACK_DIR'] ?? join(process.cwd(), '.claude', 'prompts', 'role-packs')
}

/**
 * Parse frontmatter from markdown content using gray-matter.
 * Returns { content, version } where version is extracted from frontmatter data.
 * Returns null on parse error.
 */
function parsePack(
  fileContent: string,
  role: Role,
): { content: string; version: number | null } | null {
  try {
    const { data, content } = matter(fileContent)
    const rawVersion = (data as Record<string, unknown>)['version']
    const version = typeof rawVersion === 'number' ? rawVersion : null
    return { content: content.trim(), version }
  } catch (err) {
    const error = err as Error
    logger.warn('[sidecar-role-pack] Failed to parse frontmatter', {
      role,
      error: error.message,
    })
    return null
  }
}

/**
 * Read a role pack file from disk, parse frontmatter, and cache the result.
 *
 * @param role - The role to read (dev, po, qa, da)
 * @param rolePackDir - Optional override for the role pack directory (for tests)
 * @returns CachedPack with content and version, or null on miss/error
 */
export async function readRolePack(
  role: Role,
  rolePackDir?: string,
): Promise<CachedPack | null> {
  // Return from cache if available
  const cached = cache.get(role)
  if (cached !== undefined) {
    return cached
  }

  const dir = rolePackDir ?? getRolePackDir()
  const filePath = join(dir, `${role}.md`)

  try {
    const fileContent = await readFile(filePath, 'utf-8')
    const parsed = parsePack(fileContent, role)

    if (parsed === null) {
      logger.warn('[sidecar-role-pack] Role pack parse failed — returning null', { role, filePath })
      return null
    }

    const pack: CachedPack = { content: parsed.content, version: parsed.version }
    cache.set(role, pack)
    return pack
  } catch (err) {
    const error = err as Error & { code?: string }
    if (error.code === 'ENOENT') {
      logger.warn('[sidecar-role-pack] Role pack file not found', { role, filePath })
    } else {
      logger.warn('[sidecar-role-pack] Role pack file read error', {
        role,
        filePath,
        error: error.message,
      })
    }
    return null
  }
}

/**
 * Clear the in-memory cache (used in tests to reset state between runs).
 */
export function clearRolePackCache(): void {
  cache.clear()
}
