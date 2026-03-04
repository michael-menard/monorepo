/**
 * Role Pack Get MCP Tool
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Retrieves role pack content by role identifier.
 * Validates input with Zod, delegates to file reader.
 */

import { logger } from '@repo/logger'
import { RolePackGetInputSchema, type RolePackGetInput } from './__types__/index.js'
import { readRolePack } from './role-pack-reader.js'

/**
 * Retrieve a role pack by role identifier.
 *
 * Zod validation at entry — throws ZodError on invalid input.
 * Returns null if the file is not found or cannot be read.
 *
 * @param input - Role pack get input (role, optional version)
 * @returns Role pack content string or null on miss
 *
 * @example Fetch dev role pack
 * ```typescript
 * const content = await rolePackGet({ role: 'dev' })
 * if (content) {
 *   console.log(`Got role pack: ${content.substring(0, 80)}`)
 * }
 * ```
 */
export async function rolePackGet(input: RolePackGetInput): Promise<string | null> {
  // Validate input — throws ZodError on invalid
  const validated = RolePackGetInputSchema.parse(input)

  logger.info('[sidecar-role-pack] rolePackGet called', { role: validated.role })

  const pack = await readRolePack(validated.role)

  if (!pack) {
    return null
  }

  // If version requested, verify it matches
  if (validated.version !== undefined && pack.version !== undefined) {
    if (pack.version !== validated.version) {
      logger.warn('[sidecar-role-pack] Version mismatch', {
        role: validated.role,
        requested: validated.version,
        found: pack.version,
      })
    }
  }

  return pack.content
}
