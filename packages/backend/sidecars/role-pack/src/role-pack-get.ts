/**
 * rolePackGet MCP Tool
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * MCP tool wrapper for retrieving role pack content.
 * Mirrors the context-cache-get.ts pattern:
 *   - Zod parse at entry (throws ZodError on invalid input)
 *   - Returns content string on success, null on miss
 *   - logger.warn on null return
 */

import { logger } from '@repo/logger'
import { RolePackGetInputSchema } from './__types__/index.js'
import type { RolePackGetInput } from './__types__/index.js'
import { readRolePack } from './role-pack-reader.js'

/**
 * Retrieve role pack content for a given role and optional version.
 *
 * @param input - { role: 'dev' | 'po' | 'qa' | 'da', version?: number }
 * @returns Role pack content string on success, null on miss
 * @throws ZodError if input is invalid (e.g. unknown role)
 *
 * @example Happy path
 * ```typescript
 * const content = await rolePackGet({ role: 'dev' })
 * if (content) {
 *   console.log(`Role pack: ${content}`)
 * }
 * ```
 *
 * @example With version constraint
 * ```typescript
 * const content = await rolePackGet({ role: 'qa', version: 1 })
 * // Returns null if file has version !== 1
 * ```
 */
export async function rolePackGet(input: RolePackGetInput): Promise<string | null> {
  // Validate input — throws ZodError on invalid role
  const validated = RolePackGetInputSchema.parse(input)

  const pack = await readRolePack(validated.role)

  if (pack === null) {
    logger.warn('[sidecar-role-pack] rolePackGet: role pack not found', {
      role: validated.role,
      version: validated.version,
    })
    return null
  }

  // Version constraint check
  if (validated.version !== undefined) {
    if (pack.version !== validated.version) {
      logger.warn('[sidecar-role-pack] rolePackGet: version mismatch', {
        role: validated.role,
        requested: validated.version,
        available: pack.version,
      })
      return null
    }
  }

  return pack.content
}
