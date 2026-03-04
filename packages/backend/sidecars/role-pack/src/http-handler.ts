/**
 * HTTP Handler for Role Pack Sidecar
 * WINT-2010: Create Role Pack Sidecar Service
 *
 * GET /role-pack?role=<role>&v=<version>
 *
 * Responses:
 *   200 - { ok: true, role, content, version? }
 *   400 - { ok: false, error: "..." }
 *   404 - { ok: false, error: "..." }
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { RoleSchema } from './__types__/index.js'
import { readRolePack } from './role-pack-reader.js'
import { type Role } from './__types__/index.js'

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/**
 * Handle GET /role-pack requests.
 * Validates the `role` query parameter using Zod, reads the pack, returns JSON.
 */
export async function handleRolePackRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)

  // Route guard — only handle /role-pack
  if (url.pathname !== '/role-pack') {
    sendJson(res, 404, { ok: false, error: 'Not found' })
    return
  }

  const roleParam = url.searchParams.get('role')
  const versionParam = url.searchParams.get('v')

  // Validate role
  const roleParsed = RoleSchema.safeParse(roleParam)
  if (!roleParsed.success) {
    sendJson(res, 400, {
      ok: false,
      error: roleParsed.error.issues.map(i => i.message).join(', '),
    })
    return
  }

  const role: Role = roleParsed.data
  const version = versionParam !== null ? parseInt(versionParam, 10) : undefined

  logger.info('[sidecar-role-pack] HTTP GET /role-pack', { role, version })

  const pack = await readRolePack(role)

  if (!pack) {
    sendJson(res, 404, { ok: false, error: `Role pack not found: ${role}` })
    return
  }

  sendJson(res, 200, {
    ok: true,
    role,
    content: pack.content,
    ...(pack.version !== undefined ? { version: pack.version } : {}),
  })
}
