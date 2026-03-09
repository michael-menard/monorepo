/**
 * HTTP Route Handlers for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Routes:
 *   POST /cohesion/audit — full Franken-feature audit
 *   POST /cohesion/check — per-feature cohesion gate check
 *
 * AC-3: handleCohesionAuditRequest
 * AC-4: handleCohesionCheckRequest
 * AC-5: Both handlers return {ok: false, error: string} on invalid input or error
 *
 * SEC-002: Authentication/authorization on these endpoints is intentionally omitted.
 * Per WINT-4010 non-goals: "Authentication/authorization on sidecar endpoints —
 * deferred per WINT-2020 precedent." This sidecar is deployed as an internal-only
 * service within the VPC and is NOT exposed to the public internet.
 * Network-level isolation is the current security boundary.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { sendJson, readBody } from '@repo/sidecar-http-utils'
import { CohesionAuditRequestSchema, CohesionCheckRequestSchema } from '../__types__/index.js'
import { computeAudit } from '../compute-audit.js'
import { computeCheck } from '../compute-check.js'

// ============================================================================
// Injectable deps type (for testability — AC-6 pattern applied to route layer)
// ============================================================================

export type CohesionRouteDeps = {
  computeAuditFn: typeof computeAudit
  computeCheckFn: typeof computeCheck
  db: NodePgDatabase<any>
}

const defaultDeps: CohesionRouteDeps = {
  computeAuditFn: computeAudit,
  computeCheckFn: computeCheck,
  db,
}

// ============================================================================
// POST /cohesion/audit handler
// ============================================================================

/**
 * Handle POST /cohesion/audit requests.
 * AC-3: Returns {ok: true, data: CohesionAuditResult}
 * AC-5: Returns {ok: false, error: string} on validation failure or internal error
 *
 * SEC-002: Authentication/authorization on this endpoint is intentionally omitted.
 * Per WINT-4010 non-goals: "Authentication/authorization on sidecar endpoints —
 * deferred per WINT-2020 precedent." This sidecar is deployed as an internal-only
 * service within the VPC and is NOT exposed to the public internet.
 * Network-level isolation is the current security boundary.
 */
export async function handleCohesionAuditRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CohesionRouteDeps = defaultDeps,
): Promise<void> {
  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[cohesion] Failed to read audit request body', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 400, { ok: false, error: 'Failed to read request body' })
    return
  }

  // Empty body is valid for /cohesion/audit — treat as {}
  let parsedBody: unknown
  try {
    parsedBody = rawBody.trim() ? JSON.parse(rawBody) : {}
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
    return
  }

  const validated = CohesionAuditRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: `Invalid request: ${validated.error.issues.map(i => i.message).join(', ')}`,
    })
    return
  }

  logger.info('[cohesion] POST /cohesion/audit', { packageName: validated.data.packageName })

  try {
    const result = await deps.computeAuditFn(validated.data, deps.db)
    sendJson(res, 200, { ok: true, data: result })
  } catch (error) {
    logger.warn('[cohesion] computeAudit error', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal error' })
  }
}

// ============================================================================
// POST /cohesion/check handler
// ============================================================================

/**
 * Handle POST /cohesion/check requests.
 * AC-4: Returns {ok: true, data: CohesionCheckResult}
 * AC-5: Returns {ok: false, error: string} on validation failure or internal error
 *
 * SEC-002: Authentication/authorization on this endpoint is intentionally omitted.
 * Per WINT-4010 non-goals: "Authentication/authorization on sidecar endpoints —
 * deferred per WINT-2020 precedent." This sidecar is deployed as an internal-only
 * service within the VPC and is NOT exposed to the public internet.
 * Network-level isolation is the current security boundary.
 */
export async function handleCohesionCheckRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CohesionRouteDeps = defaultDeps,
): Promise<void> {
  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[cohesion] Failed to read check request body', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 400, { ok: false, error: 'Failed to read request body' })
    return
  }

  let parsedBody: unknown
  try {
    parsedBody = rawBody.trim() ? JSON.parse(rawBody) : {}
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
    return
  }

  const validated = CohesionCheckRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: `Invalid input: ${validated.error.issues.map(i => i.message).join(', ')}`,
    })
    return
  }

  logger.info('[cohesion] POST /cohesion/check', { featureId: validated.data.featureId })

  try {
    const result = await deps.computeCheckFn(validated.data.featureId, deps.db)
    sendJson(res, 200, { ok: true, data: result })
  } catch (error) {
    logger.warn('[cohesion] computeCheck error', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal error' })
  }
}
