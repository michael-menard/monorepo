/**
 * HTTP Route Handler for POST /context-pack
 * WINT-2020: Create Context Pack Sidecar
 *
 * POST /context-pack
 *
 * Request body: ContextPackRequestSchema (story_id, node_type, role, optional ttl)
 * Responses:
 *   200 - { ok: true, data: ContextPackResponse }
 *   400 - { ok: false, error: "...", details: [...] }
 *   500 - { ok: false, error: "Internal server error" }
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { sendJson } from '@repo/sidecar-utils'
import { ContextPackRequestSchema } from '../__types__/index.js'
import { assembleContextPack, type AssembleContextPackDeps } from '../assemble-context-pack.js'

/**
 * Maximum allowed request body size in bytes (1 MB).
 * Prevents unbounded memory consumption from oversized payloads.
 */
const MAX_BODY_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB

/**
 * Read the request body as a string, enforcing a maximum size.
 * Rejects with an error if the body exceeds MAX_BODY_SIZE_BYTES.
 */
async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_SIZE_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_SIZE_BYTES} bytes`))
        req.destroy()
        return
      }
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

/**
 * Handle POST /context-pack requests.
 * Validates request body with Zod, calls assembleContextPack, returns JSON response.
 *
 * SEC-002: Authentication/authorization on this endpoint is intentionally omitted.
 * Per WINT-2020 non-goals: "Authentication/authorization on the sidecar endpoint —
 * deferred to later phase." This sidecar is deployed as an internal-only service
 * within the VPC and is NOT exposed to the public internet. Network-level isolation
 * is the current security boundary; auth will be added in a follow-up story.
 */
export async function handleContextPackRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: AssembleContextPackDeps,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers['host'] ?? 'localhost'}`)

  // Only handle POST /context-pack
  if (url.pathname !== '/context-pack') {
    sendJson(res, 404, { ok: false, error: 'Not found' })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[context-pack] Failed to read request body', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 400, { ok: false, error: 'Failed to read request body' })
    return
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
    return
  }

  // Validate with Zod
  const validated = ContextPackRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: 'Invalid request body',
      details: validated.error.issues,
    })
    return
  }

  logger.info('[context-pack] POST /context-pack', {
    story_id: validated.data.story_id,
    node_type: validated.data.node_type,
    role: validated.data.role,
  })

  try {
    const result = await assembleContextPack(validated.data, deps)
    sendJson(res, 200, { ok: true, data: result })
  } catch (error) {
    logger.warn('[context-pack] assembleContextPack failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal server error' })
  }
}
