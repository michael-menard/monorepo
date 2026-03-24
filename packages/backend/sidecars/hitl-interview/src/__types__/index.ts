/**
 * Zod Schemas for HiTL Interview Sidecar
 * WINT-5010: Create HiTL Interview Sidecar
 *
 * AC-7: InterviewAnswersSchema — rationale, confidence, alternativesConsidered, riskAssessment
 * AC-8: FeatureVectorSchema — storyId, phase, decisionType, storyComplexityScore, agentPhase, decisionContext
 * AC-2: HitlInterviewParamsSchema — storyId, phase, decisionType
 */

import { z } from 'zod'

// ============================================================================
// TrainingDataTypeSchema (AC-5)
// Maps decision types to training data data_type values
// ============================================================================

export const TrainingDataTypeSchema = z.enum([
  'qa_gate_decision',
  'code_review_decision',
  'story_approval_decision',
])

export type TrainingDataType = z.infer<typeof TrainingDataTypeSchema>

// ============================================================================
// DecisionTypeSchema — input param values (AC-2)
// ============================================================================

export const DecisionTypeSchema = z.enum(['qa_gate', 'code_review', 'story_approval'])

export type DecisionType = z.infer<typeof DecisionTypeSchema>

// ============================================================================
// HitlInterviewParamsSchema — MCP tool input params (AC-2)
// ============================================================================

export const HitlInterviewParamsSchema = z.object({
  storyId: z.string().min(1, 'storyId is required'),
  phase: z.string().min(1, 'phase is required'),
  decisionType: DecisionTypeSchema,
})

export type HitlInterviewParams = z.infer<typeof HitlInterviewParamsSchema>

// ============================================================================
// InterviewAnswersSchema (AC-7)
// All fields required per AC-3
// ============================================================================

export const InterviewAnswersSchema = z.object({
  rationale: z.string().min(1, 'rationale is required'),
  confidence: z.number().min(0).max(1),
  alternativesConsidered: z.string().min(1, 'alternativesConsidered is required'),
  riskAssessment: z.string().min(1, 'riskAssessment is required'),
})

export type InterviewAnswers = z.infer<typeof InterviewAnswersSchema>

// ============================================================================
// FeatureVectorSchema (AC-8)
// ============================================================================

export const FeatureVectorSchema = z.object({
  storyId: z.string(),
  phase: z.string(),
  decisionType: TrainingDataTypeSchema,
  storyComplexityScore: z.number(),
  agentPhase: z.string(),
  decisionContext: z.string(),
})

export type FeatureVector = z.infer<typeof FeatureVectorSchema>

// ============================================================================
// Question set per decision type (AC-3)
// ============================================================================

export const INTERVIEW_QUESTIONS: Record<DecisionType, readonly string[]> = {
  qa_gate: [
    'What is your rationale for this QA gate decision?',
    'On a scale of 0-1, how confident are you in this decision?',
    'What alternatives did you consider before making this decision?',
    'What risks have you identified with this decision?',
  ],
  code_review: [
    'What is your rationale for this code review decision?',
    'On a scale of 0-1, how confident are you in this decision?',
    'What alternatives did you consider before making this decision?',
    'What risks have you identified with this decision?',
  ],
  story_approval: [
    'What is your rationale for this story approval decision?',
    'On a scale of 0-1, how confident are you in this decision?',
    'What alternatives did you consider before making this decision?',
    'What risks have you identified with this decision?',
  ],
} as const

// ============================================================================
// Mapping: decisionType → TrainingDataType (AC-5)
// ============================================================================

export const DECISION_TYPE_TO_TRAINING_DATA_TYPE: Record<DecisionType, TrainingDataType> = {
  qa_gate: 'qa_gate_decision',
  code_review: 'code_review_decision',
  story_approval: 'story_approval_decision',
} as const

// ============================================================================
// HTTP response shapes
// ============================================================================

export const HitlInterviewHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: z.object({
      id: z.string().uuid(),
      dataType: z.string(),
      storyId: z.string().nullable(),
    }),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type HitlInterviewHttpResponse = z.infer<typeof HitlInterviewHttpResponseSchema>
