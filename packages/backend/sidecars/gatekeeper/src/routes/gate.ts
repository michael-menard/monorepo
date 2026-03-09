/**
 * HTTP Route Handler for Gatekeeper Sidecar
 * WINT-3010: Create Gatekeeper Sidecar
 *
 * Routes:
 *   POST /gate/check — validate stage-specific proof artifacts
 *
 * AC-3: handleGateCheckRequest with Zod validation; returns 400 on invalid input
 * AC-8: sendJson and readBody imported from @repo/sidecar-http-utils
 * AC-12: SEC-002 auth-deferral comment present
 *
 * SEC-002: Authentication/authorization on this endpoint is intentionally omitted.
 * Per WINT-3010 non-goals: "Authentication/authorization on sidecar endpoints —
 * deferred per WINT-2020 precedent." This sidecar is deployed as an internal-only
 * service within the VPC and is NOT exposed to the public internet.
 * Network-level isolation is the current security boundary.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { sendJson, readBody } from '@repo/sidecar-http-utils'
import { GateCheckRequestSchema } from '../__types__/index.js'
import { gateCheck } from '../gate-check.js'

// ============================================================================
// POST /gate/check handler
// AC-3: Returns {ok: true, data: GateCheckPassedResult} on success
// AC-3: Returns {ok: false, error: string} on validation failure (400)
// AC-7: Returns {ok: false, error: string, missing_proofs: [...]} on missing proofs (422)
// ============================================================================

/**
 * Handle POST /gate/check requests.
 *
 * SEC-002: Authentication/authorization on this endpoint is intentionally omitted.
 * Per WINT-3010 non-goals: "Authentication/authorization on sidecar endpoints —
 * deferred per WINT-2020 precedent." This sidecar is deployed as an internal-only
 * service within the VPC and is NOT exposed to the public internet.
 * Network-level isolation is the current security boundary.
 */
export async function handleGateCheckRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[gatekeeper] Failed to read gate check request body', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 400, { ok: false, error: 'Failed to read request body' })
    return
  }

  if (!rawBody.trim()) {
    sendJson(res, 400, { ok: false, error: 'Request body is required' })
    return
  }

  let parsedBody: unknown
  try {
    parsedBody = JSON.parse(rawBody)
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
    return
  }

  const validated = GateCheckRequestSchema.safeParse(parsedBody)
  if (!validated.success) {
    sendJson(res, 400, {
      ok: false,
      error: `Invalid request: ${validated.error.issues.map(i => i.message).join(', ')}`,
    })
    return
  }

  logger.info('[gatekeeper] POST /gate/check', {
    stage: validated.data.stage,
    story_id: validated.data.story_id,
  })

  const result = gateCheck(validated.data)

  if (!result.ok) {
    // AC-7: 422 Unprocessable Entity when proofs are missing/invalid
    sendJson(res, 422, result)
    return
  }

  sendJson(res, 200, result)
}
