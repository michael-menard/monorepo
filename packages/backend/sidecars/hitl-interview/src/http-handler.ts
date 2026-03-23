/**
 * HTTP Request Handler for HiTL Interview Sidecar
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * Handles POST /hitl-interview
 * AC-9: Uses @repo/sidecar-http-utils (sendJson, readBody)
 * ARCH-002: readBody + JSON.parse (readJsonBody not exported from @repo/sidecar-http-utils)
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { logger } from '@repo/logger'
import { sendJson, readBody } from '@repo/sidecar-http-utils'
import { HitlInterviewParamsSchema, InterviewAnswersSchema } from './__types__/index.js'
import { captureInterview } from './capture-interview.js'
import type { CaptureInterviewDeps } from './capture-interview.js'

// ============================================================================
// Injectable deps for testability
// ============================================================================

export type HitlInterviewHandlerDeps = {
  captureInterviewFn: typeof captureInterview
  deps?: CaptureInterviewDeps
}

const defaultHandlerDeps: HitlInterviewHandlerDeps = {
  captureInterviewFn: captureInterview,
}

// ============================================================================
// POST /hitl-interview handler
// ============================================================================

/**
 * Handle POST /hitl-interview requests.
 *
 * Request body shape:
 * {
 *   storyId: string,
 *   phase: string,
 *   decisionType: 'qa_gate' | 'code_review' | 'story_approval',
 *   answers: {
 *     rationale: string,
 *     confidence: number,
 *     alternativesConsidered: string,
 *     riskAssessment: string
 *   }
 * }
 *
 * Responses:
 *   200 { ok: true, data: { id, dataType, storyId } }
 *   400 { ok: false, error: string }
 *   500 { ok: false, error: string }
 */
export async function handleHitlInterviewRequest(
  req: IncomingMessage,
  res: ServerResponse,
  handlerDeps: HitlInterviewHandlerDeps = defaultHandlerDeps,
): Promise<void> {
  // ARCH-002: readBody + JSON.parse
  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch (error) {
    logger.warn('[hitl-interview] Failed to read request body', {
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

  // Validate params
  const bodyObj = parsedBody as Record<string, unknown>

  const paramsResult = HitlInterviewParamsSchema.safeParse({
    storyId: bodyObj.storyId,
    phase: bodyObj.phase,
    decisionType: bodyObj.decisionType,
  })

  if (!paramsResult.success) {
    sendJson(res, 400, {
      ok: false,
      error: `Invalid params: ${paramsResult.error.issues.map(i => i.message).join(', ')}`,
    })
    return
  }

  const answersResult = InterviewAnswersSchema.safeParse(bodyObj.answers)

  if (!answersResult.success) {
    sendJson(res, 400, {
      ok: false,
      error: `Invalid answers: ${answersResult.error.issues.map(i => i.message).join(', ')}`,
    })
    return
  }

  logger.info('[hitl-interview] POST /hitl-interview', {
    storyId: paramsResult.data.storyId,
    phase: paramsResult.data.phase,
    decisionType: paramsResult.data.decisionType,
  })

  try {
    const captureArgs: Parameters<typeof captureInterview> = handlerDeps.deps
      ? [paramsResult.data, answersResult.data, handlerDeps.deps]
      : [paramsResult.data, answersResult.data]

    const result = await handlerDeps.captureInterviewFn(...captureArgs)

    if (!result) {
      sendJson(res, 500, { ok: false, error: 'Failed to ingest training data' })
      return
    }

    sendJson(res, 200, {
      ok: true,
      data: {
        id: result.id,
        dataType: result.dataType,
        storyId: result.storyId,
      },
    })
  } catch (error) {
    logger.warn('[hitl-interview] captureInterview error', {
      error: error instanceof Error ? error.message : String(error),
    })
    sendJson(res, 500, { ok: false, error: 'Internal error' })
  }
}
