/**
 * Capture Interview Core Logic
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-3: Structured question set per decisionType
 * AC-4: Feature vectors: storyId, phase, decisionType, storyComplexityScore, agentPhase, decisionContext
 * AC-5: Write to workflow.training_data via trainingDataIngest
 * AC-6: Read from workflow.hitl_decisions for context enrichment (read-only, no writes)
 * AC-9: Use @repo/db for DB access
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { hitlDecisions, trainingData } from '@repo/knowledge-base/db'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type {
  HitlInterviewParams,
  InterviewAnswers,
  FeatureVector,
  TrainingDataType,
} from './__types__/index.js'
import { DECISION_TYPE_TO_TRAINING_DATA_TYPE, InterviewAnswersSchema } from './__types__/index.js'

export type DrizzleDb = NodePgDatabase<any>

export type TrainingDataIngestInput = {
  dataType: string
  features: Record<string, unknown>
  labels: Record<string, unknown>
  storyId?: string
}

export type TrainingDataIngestResult = {
  id: string
  dataType: string
  storyId: string | null
} | null

export type CaptureInterviewDeps = {
  db: DrizzleDb
  ingestFn: (input: TrainingDataIngestInput) => Promise<TrainingDataIngestResult>
}

/**
 * Default ingest function — inserts directly into workflow.training_data via @repo/db
 * AC-5: Write to workflow.training_data
 */
async function defaultIngestFn(input: TrainingDataIngestInput): Promise<TrainingDataIngestResult> {
  try {
    const [inserted] = await db
      .insert(trainingData)
      .values({
        dataType: input.dataType,
        features: input.features,
        labels: input.labels,
        storyId: input.storyId ?? null,
      })
      .returning()

    return {
      id: inserted.id,
      dataType: inserted.dataType,
      storyId: inserted.storyId ?? null,
    }
  } catch (error) {
    logger.warn('[hitl-interview] Failed to ingest training data', {
      dataType: input.dataType,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Read recent HiTL decisions for a story to build decision context
 * AC-6: Read-only access to workflow.hitl_decisions
 */
export async function readHitlContext(
  storyId: string,
  injectedDb: DrizzleDb,
): Promise<{ decisionContext: string; agentPhase: string }> {
  try {
    const rows = await injectedDb
      .select({
        decisionType: hitlDecisions.decisionType,
        decisionText: hitlDecisions.decisionText,
        context: hitlDecisions.context,
      })
      .from(hitlDecisions)
      .where(eq(hitlDecisions.storyId, storyId))

    if (rows.length === 0) {
      return { decisionContext: 'no prior decisions', agentPhase: 'unknown' }
    }

    const latest = rows[rows.length - 1]
    const contextData = latest.context as Record<string, unknown> | null
    const agentPhase =
      typeof contextData?.agentPhase === 'string' ? contextData.agentPhase : 'unknown'
    const decisionContext = `${latest.decisionType}: ${latest.decisionText}`

    return { decisionContext, agentPhase }
  } catch (error) {
    logger.warn('[hitl-interview] Failed to read hitl_decisions context', {
      storyId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { decisionContext: 'context unavailable', agentPhase: 'unknown' }
  }
}

/**
 * Compute a simple complexity score for the story based on decision history
 * Returns number in range [0, 1] based on decision count heuristic
 */
export async function computeStoryComplexityScore(
  storyId: string,
  injectedDb: DrizzleDb,
): Promise<number> {
  try {
    const rows = await injectedDb
      .select({ id: hitlDecisions.id })
      .from(hitlDecisions)
      .where(eq(hitlDecisions.storyId, storyId))

    // Heuristic: more decisions → higher complexity, capped at 1
    const count = rows.length
    return Math.min(count / 10, 1)
  } catch {
    return 0
  }
}

/**
 * Build the feature vector from interview params and context
 * AC-4: storyId, phase, decisionType, storyComplexityScore, agentPhase, decisionContext
 */
export function buildFeatureVector(
  params: HitlInterviewParams,
  trainingDataType: TrainingDataType,
  storyComplexityScore: number,
  agentPhase: string,
  decisionContext: string,
): FeatureVector {
  return {
    storyId: params.storyId,
    phase: params.phase,
    decisionType: trainingDataType,
    storyComplexityScore,
    agentPhase,
    decisionContext,
  }
}

/**
 * Capture a HiTL interview and write to workflow.training_data
 *
 * AC-3: Uses structured question set per decisionType
 * AC-4: Builds feature vector with required fields
 * AC-5: Calls ingestFn (writes to workflow.training_data)
 * AC-6: Reads hitl_decisions for context enrichment (read-only)
 *
 * @param params - Interview params (storyId, phase, decisionType)
 * @param answers - Structured answers (rationale, confidence, etc.)
 * @param deps - Injectable dependencies for testability
 * @returns Inserted training data record or null on error
 */
export async function captureInterview(
  params: HitlInterviewParams,
  answers: InterviewAnswers,
  deps: CaptureInterviewDeps = {
    db,
    ingestFn: defaultIngestFn,
  },
): Promise<TrainingDataIngestResult> {
  // Validate answers
  const parsed = InterviewAnswersSchema.safeParse(answers)
  if (!parsed.success) {
    logger.warn('[hitl-interview] Invalid interview answers', {
      storyId: params.storyId,
      errors: parsed.error.issues.map(i => i.message),
    })
    return null
  }

  const validatedAnswers = parsed.data
  const trainingDataType = DECISION_TYPE_TO_TRAINING_DATA_TYPE[params.decisionType]

  // AC-6: Read hitl_decisions for context (read-only)
  const [{ decisionContext, agentPhase }, storyComplexityScore] = await Promise.all([
    readHitlContext(params.storyId, deps.db),
    computeStoryComplexityScore(params.storyId, deps.db),
  ])

  // AC-4: Build feature vector
  const featureVector = buildFeatureVector(
    params,
    trainingDataType,
    storyComplexityScore,
    agentPhase,
    decisionContext,
  )

  // AC-5: Write to workflow.training_data
  const result = await deps.ingestFn({
    dataType: trainingDataType,
    features: featureVector as unknown as Record<string, unknown>,
    labels: {
      rationale: validatedAnswers.rationale,
      confidence: validatedAnswers.confidence,
      alternativesConsidered: validatedAnswers.alternativesConsidered,
      riskAssessment: validatedAnswers.riskAssessment,
    },
    storyId: params.storyId,
  })

  if (result) {
    logger.info('[hitl-interview] Training data ingested', {
      id: result.id,
      dataType: result.dataType,
      storyId: params.storyId,
    })
  }

  return result
}
