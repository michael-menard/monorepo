/**
 * HiTL Interview Sidecar Package Entry Point
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-2: hitlInterview MCP tool exported from src/index.ts
 */

// AC-2: MCP tool export
export { hitlInterview } from './hitl-interview.js'
export type { HitlInterviewInput } from './hitl-interview.js'

// Core logic
export { captureInterview, buildFeatureVector, readHitlContext } from './capture-interview.js'
export type {
  CaptureInterviewDeps,
  TrainingDataIngestInput,
  TrainingDataIngestResult,
} from './capture-interview.js'

// Types
export {
  TrainingDataTypeSchema,
  DecisionTypeSchema,
  HitlInterviewParamsSchema,
  InterviewAnswersSchema,
  FeatureVectorSchema,
  INTERVIEW_QUESTIONS,
  DECISION_TYPE_TO_TRAINING_DATA_TYPE,
} from './__types__/index.js'

export type {
  TrainingDataType,
  DecisionType,
  HitlInterviewParams,
  InterviewAnswers,
  FeatureVector,
} from './__types__/index.js'
