/**
 * HTTP Handler for Rules Registry Sidecar
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Routes:
 *   GET  /rules                    — list rules with optional filters
 *   POST /rules                    — propose a new rule
 *   POST /rules/:id/promote        — promote proposed -> active
 *
 * Responses:
 *   200  - { ok: true, data: Rule[] }        (GET /rules)
 *   201  - { ok: true, data: Rule }          (POST /rules success)
 *   200  - { ok: true, data: Rule }          (POST /rules/:id/promote success)
 *   400  - { ok: false, error: "..." }
 *   404  - { ok: false, error: "..." }
 *   409  - { ok: false, error: "...", conflicting_ids?: string[] }
 *   422  - { ok: false, error: "..." }
 *
 * AC-2, AC-3, AC-4, AC-6, AC-10
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { sendJson, readBody } from '@repo/sidecar-http-utils'
import {
  GetRulesQuerySchema,
  ProposeRuleInputSchema,
  PromoteRuleInputSchema,
} from './__types__/index.js'
import { getRules, proposeRule, promoteRule } from './rules-registry.js'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Read and parse the request body as JSON.
 * Returns null if body is empty or unparseable.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  try {
    const raw = (await readBody(req)).trim()
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// ============================================================================
// Route handlers
// ============================================================================

/**
 * GET /rules — list rules with optional ?type, ?scope, ?status filters.
 */
async function handleGetRules(_req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const rawQuery = {
    type: url.searchParams.get('type') ?? undefined,
    scope: url.searchParams.get('scope') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
  }

  // Remove undefined keys
  const filtered = Object.fromEntries(Object.entries(rawQuery).filter(([, v]) => v !== undefined))

  const parsed = GetRulesQuerySchema.safeParse(filtered)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    sendJson(res, 400, { ok: false, error: `Validation error: ${msg}` })
    return
  }

  logger.info('[sidecar-rules-registry] GET /rules', parsed.data)

  const rulesList = await getRules(parsed.data)
  sendJson(res, 200, { ok: true, data: rulesList })
}

/**
 * POST /rules — propose a new rule.
 */
async function handlePostRules(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJsonBody(req)

  if (body === null) {
    sendJson(res, 400, { ok: false, error: 'Validation error: invalid JSON body' })
    return
  }

  const parsed = ProposeRuleInputSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    sendJson(res, 400, { ok: false, error: `Validation error: ${msg}` })
    return
  }

  logger.info('[sidecar-rules-registry] POST /rules', {
    rule_type: parsed.data.rule_type,
    scope: parsed.data.scope,
  })

  const result = await proposeRule(parsed.data)

  if (!result.ok) {
    // AC-10: Conflict response includes conflicting_ids
    sendJson(res, 409, {
      ok: false,
      error: result.error,
      conflicting_ids: result.conflicting_ids,
    })
    return
  }

  sendJson(res, 201, { ok: true, data: result.data })
}

/**
 * POST /rules/:id/promote — promote proposed rule to active.
 */
async function handlePromoteRule(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
): Promise<void> {
  const body = await readJsonBody(req)

  if (body === null) {
    sendJson(res, 400, { ok: false, error: 'Validation error: invalid JSON body' })
    return
  }

  const parsed = PromoteRuleInputSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join(', ')
    sendJson(res, 400, { ok: false, error: `Validation error: ${msg}` })
    return
  }

  logger.info('[sidecar-rules-registry] POST /rules/:id/promote', { id })

  const result = await promoteRule(id, parsed.data)

  if (!result.ok) {
    sendJson(res, result.status, { ok: false, error: result.error })
    return
  }

  sendJson(res, 200, { ok: true, data: result.data })
}

// ============================================================================
// Main handler (routing)
// ============================================================================

/**
 * Route and dispatch all requests to the rules registry sidecar.
 *
 * AC-2, AC-3, AC-4, AC-6
 */
export async function handleRulesRegistryRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const method = req.method?.toUpperCase() ?? 'GET'
  const path = url.pathname

  try {
    // GET /rules
    if (method === 'GET' && path === '/rules') {
      await handleGetRules(req, res, url)
      return
    }

    // POST /rules
    if (method === 'POST' && path === '/rules') {
      await handlePostRules(req, res)
      return
    }

    // POST /rules/:id/promote
    const promoteMatch = path.match(/^\/rules\/([^/]+)\/promote$/)
    if (method === 'POST' && promoteMatch) {
      const id = promoteMatch[1]
      await handlePromoteRule(req, res, id)
      return
    }

    // Unknown route
    sendJson(res, 404, { ok: false, error: 'Not found' })
  } catch (error) {
    logger.warn('[sidecar-rules-registry] Unhandled error in route handler', {
      method,
      path,
      error: error instanceof Error ? error.message : String(error),
    })
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: 'Internal server error' })
    }
  }
}
