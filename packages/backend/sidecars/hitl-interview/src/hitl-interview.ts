/**
 * hitlInterview MCP Tool Wrapper
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-2: MCP tool hitlInterview exported from src/index.ts
 * ARCH-001: Calls captureInterview in-process (not via HTTP) — matches cohesion_audit pattern
 */

import { logger } from '@repo/logger'
import { HitlInterviewParamsSchema, InterviewAnswersSchema } from './__types__/index.js'
import { captureInterview } from './capture-interview.js'
import type { TrainingDataIngestResult } from './capture-interview.js'

export type HitlInterviewInput = {
  storyId: string
  phase: string
  decisionType: 'qa_gate' | 'code_review' | 'story_approval'
  answers: {
    rationale: string
    confidence: number
    alternativesConsidered: string
    riskAssessment: string
  }
}

/**
 * MCP tool: hitlInterview
 *
 * Captures a structured HiTL interview during a workflow decision point
 * and writes labeled training data to workflow.training_data.
 *
 * ARCH-001: Calls captureInterview directly (no HTTP call to localhost:3094).
 *
 * @param input - Interview params and answers
 * @returns Inserted training data record or null on error
 */
export async function hitlInterview(input: HitlInterviewInput): Promise<TrainingDataIngestResult> {
  try {
    logger.info('[hitl-interview] hitlInterview called', {
      storyId: input.storyId,
      phase: input.phase,
      decisionType: input.decisionType,
    })

    const paramsResult = HitlInterviewParamsSchema.safeParse({
      storyId: input.storyId,
      phase: input.phase,
      decisionType: input.decisionType,
    })

    if (!paramsResult.success) {
      logger.warn('[hitl-interview] Invalid params', {
        errors: paramsResult.error.issues.map(i => i.message),
      })
      return null
    }

    const answersResult = InterviewAnswersSchema.safeParse(input.answers)

    if (!answersResult.success) {
      logger.warn('[hitl-interview] Invalid answers', {
        errors: answersResult.error.issues.map(i => i.message),
      })
      return null
    }

    const result = await captureInterview(paramsResult.data, answersResult.data)

    if (result) {
      logger.info('[hitl-interview] hitlInterview succeeded', {
        id: result.id,
        dataType: result.dataType,
      })
    } else {
      logger.warn('[hitl-interview] hitlInterview returned null', {
        storyId: input.storyId,
      })
    }

    return result
  } catch (error) {
    logger.warn('[hitl-interview] hitlInterview failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
