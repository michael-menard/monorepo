/**
 * HTTP Request Handler for Role Pack Sidecar
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * Handles GET /role-pack?role=&v=
 * Returns 200/400/404 JSON responses per spec.
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { logger } from '@repo/logger'
import { sendJson } from '@repo/sidecar-utils'
import { RoleSchema } from './__types__/index.js'
import { readRolePack } from './role-pack-reader.js'

/**
 * HTTP handler for GET /role-pack
 *
 * Query params:
 *   - role (required): dev | po | qa | da
 *   - v (optional): integer version number
 *
 * Responses:
 *   200 { content: string }        — success
 *   400 { error: string }          — missing or invalid role
 *   404 { error: string, available?: number } — pack not found or version mismatch
 */
export async function handleRolePackRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Only handle GET /role-pack
  const url = new URL(req.url ?? '/', `http://localhost`)

  if (url.pathname !== '/role-pack') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  const roleParam = url.searchParams.get('role')
  const vParam = url.searchParams.get('v')

  // Missing role param → 400
  if (!roleParam) {
    sendJson(res, 400, { error: 'role is required' })
    return
  }

  // Invalid role → 400 (unknown role — treat like invalid param rather than 404)
  const roleResult = RoleSchema.safeParse(roleParam)
  if (!roleResult.success) {
    sendJson(res, 400, { error: 'Unknown role' })
    return
  }

  const role = roleResult.data

  // Parse version param
  let requestedVersion: number | undefined
  if (vParam !== null) {
    const parsed = parseInt(vParam, 10)
    if (isNaN(parsed) || parsed <= 0) {
      sendJson(res, 400, { error: 'v must be a positive integer' })
      return
    }
    requestedVersion = parsed
  }

  // Read the role pack
  const pack = await readRolePack(role)

  if (pack === null) {
    logger.warn('[sidecar-role-pack] http: role pack not available', { role })
    sendJson(res, 404, { error: 'Role pack not available' })
    return
  }

  // Version constraint
  if (requestedVersion !== undefined) {
    if (pack.version !== requestedVersion) {
      sendJson(res, 404, {
        error: 'Version not found',
        available: pack.version,
      })
      return
    }
  }

  sendJson(res, 200, { content: pack.content })
}
