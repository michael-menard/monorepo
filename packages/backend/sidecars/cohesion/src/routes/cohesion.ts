/**
 * HTTP Route Handlers for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * POST /cohesion/audit — Detects Franken-features across the graph
 * POST /cohesion/check — Checks cohesion for a specific featureId
 *
 * Pattern: Copied sendJson/readBody helpers from context-pack (no cross-sidecar import).
 * Both handlers accept injectable deps for computeAudit/computeCheck (testability, AC-6).
 *
 * SEC-002: Authentication/authorization on these endpoints is intentionally omitted.
 * Per WINT-4010 non-goals: "Authentication/authorization on the sidecar endpoint —
 * deferred to later phase." This sidecar is deployed as an internal-only service
 * within the VPC and is NOT exposed to the public internet. Network-level isolation
 * is the current security boundary; auth will be added in a follow-up story.
 * (WINT-2020 precedent confirmed this pattern.)
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { CohesionAuditRequestSchema, CohesionCheckRequestSchema } from '../__types__/index.js'
import type { CohesionAuditResult, CohesionCheckResult } from '../__types__/index.js'
import type { DrizzleDb } from '../compute-audit.js'

// ============================================================================
// Injectable Deps Types
// ============================================================================

export type CohesionAuditDeps = {
  computeAudit: (db: DrizzleDb, packageName?: string) => Promise<CohesionAuditResult>
  db: DrizzleDb
}

export type CohesionCheckDeps = {
  computeCheck: (db: DrizzleDb, featureId: string) => Promise<CohesionCheckResult>
  db: DrizzleDb
}

// ============================================================================
// Helpers (copied from context-pack — no cross-sidecar import per policy)
// ============================================================================

// BY DESIGN (WINT-4010 Reuse Plan): sendJson is intentionally copied here, not imported
// cross-sidecar. Each sidecar is self-contained. Do NOT extract to a shared package.
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

/**
 * Maximum allowed request body size in bytes (1 MB).
 * Prevents unbounded memory consumption from oversized payloads.
 */
const MAX_BODY_SIZE_BYTES = 1 * 1024 * 1024 // 1 MB

// BY DESIGN (WINT-4010 Reuse Plan): readBody is intentionally copied here, not imported
// cross-sidecar. Each sidecar is self-contained. Do NOT extract to a shared package.
/**
 * Read the request body as a string, enforcing a maximum size.
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

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * Handle POST /cohesion/audit requests.
 * Validates request body with Zod, calls computeAudit, returns JSON response.
 *
 * SEC-002: No auth check here — intentionally deferred per WINT-4010 non-goals.
 * Internal VPC deployment; network isolation is the current security boundary.
 */
export async function handleCohesionAuditRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CohesionAuditDeps,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[cohesion] Failed to read request body for /cohesion/audit', {
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

  // Validate with Zod (AC-7 Zod schemas, AC-5 error handling)
  const validated = CohesionAuditRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: 'Invalid request body',
      details: validated.error.issues,
    })
    return
  }

  logger.info('[cohesion] POST /cohesion/audit', {
    packageName: validated.data.packageName,
  })

  try {
    const result = await deps.computeAudit(deps.db, validated.data.packageName)
    sendJson(res, 200, { ok: true, data: result })
  } catch (error) {
    logger.warn('[cohesion] computeAudit failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal server error' })
  }
}

/**
 * Handle POST /cohesion/check requests.
 * Validates request body with Zod, calls computeCheck, returns JSON response.
 *
 * SEC-002: No auth check here — intentionally deferred per WINT-4010 non-goals.
 * Internal VPC deployment; network isolation is the current security boundary.
 */
export async function handleCohesionCheckRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CohesionCheckDeps,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed' })
    return
  }

  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[cohesion] Failed to read request body for /cohesion/check', {
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

  // Validate with Zod (AC-7 Zod schemas, AC-5 error handling)
  const validated = CohesionCheckRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: 'Invalid request body',
      details: validated.error.issues,
    })
    return
  }

  logger.info('[cohesion] POST /cohesion/check', {
    featureId: validated.data.featureId,
  })

  try {
    const result = await deps.computeCheck(deps.db, validated.data.featureId)
    sendJson(res, 200, { ok: true, data: result })
  } catch (error) {
    logger.warn('[cohesion] computeCheck failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal server error' })
  }
}

/**
 * Route dispatcher for all /cohesion/* requests.
 * Returns 404 for unknown routes.
 */
export async function handleCohesionRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CohesionAuditDeps & CohesionCheckDeps,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers['host'] ?? 'localhost'}`)

  if (url.pathname === '/cohesion/audit') {
    return handleCohesionAuditRequest(req, res, deps)
  }

  if (url.pathname === '/cohesion/check') {
    return handleCohesionCheckRequest(req, res, deps)
  }

  sendJson(res, 404, { ok: false, error: 'Not found' })
}
