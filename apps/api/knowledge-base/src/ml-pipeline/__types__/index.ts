/**
 * Zod Input/Output Schemas for ML Pipeline MCP Tools
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Schemas for 7 tools across 4 ML pipeline tables:
 * - ml_models: register, get-active
 * - model_metrics: record
 * - model_predictions: record, get-by-entity
 * - training_data: ingest, mark-validated
 */

import { z } from 'zod'

// ============================================================================
// SHARED ENUMS
// ============================================================================

/**
 * ML Model Type Enum Schema
 * Matches PG enum values in workflow.ml_models
 */
export const MlModelTypeSchema = z.enum([
  'quality_predictor',
  'effort_estimator',
  'risk_classifier',
  'pattern_recommender',
])

export type MlModelType = z.infer<typeof MlModelTypeSchema>

// ============================================================================
// ML_MODEL_REGISTER SCHEMAS
// ============================================================================

export const MlModelRegisterInputSchema = z.object({
  modelName: z.string().min(1, 'modelName is required'),
  modelType: MlModelTypeSchema,
  version: z.string().min(1, 'version is required'),
  hyperparameters: z.record(z.unknown()).optional(),
  trainingDataCount: z.number().int().min(0),
  trainedBy: z.string().optional(),
  isActive: z.boolean().optional().default(false),
})

export type MlModelRegisterInput = z.infer<typeof MlModelRegisterInputSchema>

export const MlModelRecordSchema = z.object({
  id: z.string().uuid(),
  modelName: z.string(),
  modelType: z.string(),
  version: z.string(),
  hyperparameters: z.unknown().nullable(),
  trainingDataCount: z.number().int(),
  trainedAt: z.date(),
  trainedBy: z.string().nullable(),
  isActive: z.boolean(),
  activatedAt: z.date().nullable(),
  deactivatedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MlModelRecord = z.infer<typeof MlModelRecordSchema>

export const MlModelRegisterOutputSchema = MlModelRecordSchema.nullable()

export type MlModelRegisterOutput = z.infer<typeof MlModelRegisterOutputSchema>

// ============================================================================
// ML_MODEL_GET_ACTIVE SCHEMAS
// ============================================================================

export const MlModelGetActiveInputSchema = z.object({
  modelType: MlModelTypeSchema.optional(),
})

export type MlModelGetActiveInput = z.infer<typeof MlModelGetActiveInputSchema>

export const MlModelGetActiveOutputSchema = z.array(MlModelRecordSchema)

export type MlModelGetActiveOutput = z.infer<typeof MlModelGetActiveOutputSchema>

// ============================================================================
// ML_METRICS_RECORD SCHEMAS
// ============================================================================

export const MlMetricsRecordInputSchema = z.object({
  modelId: z.string().uuid('modelId must be a valid UUID'),
  metricType: z.string().min(1, 'metricType is required'),
  metricValue: z.number().int(),
  evaluationDataset: z.string().optional(),
  sampleSize: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export type MlMetricsRecordInput = z.infer<typeof MlMetricsRecordInputSchema>

export const MlMetricRecordSchema = z.object({
  id: z.string().uuid(),
  modelId: z.string().uuid(),
  metricType: z.string(),
  metricValue: z.number().int(),
  evaluationDataset: z.string().nullable(),
  sampleSize: z.number().int().nullable(),
  metadata: z.unknown().nullable(),
  evaluatedAt: z.date(),
  createdAt: z.date(),
})

export type MlMetricRecord = z.infer<typeof MlMetricRecordSchema>

export const MlMetricsRecordOutputSchema = MlMetricRecordSchema.nullable()

export type MlMetricsRecordOutput = z.infer<typeof MlMetricsRecordOutputSchema>

// ============================================================================
// ML_PREDICTION_RECORD SCHEMAS
// ============================================================================

export const MlPredictionRecordInputSchema = z.object({
  modelId: z.string().uuid('modelId must be a valid UUID'),
  predictionType: z.string().min(1, 'predictionType is required'),
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  features: z.record(z.unknown()),
  prediction: z.record(z.unknown()),
  actualValue: z.record(z.unknown()).optional(),
  error: z.number().int().optional(),
})

export type MlPredictionRecordInput = z.infer<typeof MlPredictionRecordInputSchema>

export const MlPredictionRowSchema = z.object({
  id: z.string().uuid(),
  modelId: z.string().uuid(),
  predictionType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  features: z.unknown(),
  prediction: z.unknown(),
  actualValue: z.unknown().nullable(),
  error: z.number().int().nullable(),
  predictedAt: z.date(),
  createdAt: z.date(),
})

export type MlPredictionRow = z.infer<typeof MlPredictionRowSchema>

export const MlPredictionRecordOutputSchema = MlPredictionRowSchema.nullable()

export type MlPredictionRecordOutput = z.infer<typeof MlPredictionRecordOutputSchema>

// ============================================================================
// ML_PREDICTION_GET_BY_ENTITY SCHEMAS
// ============================================================================

export const MlPredictionGetByEntityInputSchema = z.object({
  entityType: z.string().min(1, 'entityType is required'),
  entityId: z.string().min(1, 'entityId is required'),
  predictionType: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(10),
})

export type MlPredictionGetByEntityInput = z.infer<typeof MlPredictionGetByEntityInputSchema>

export const MlPredictionGetByEntityOutputSchema = z.array(MlPredictionRowSchema)

export type MlPredictionGetByEntityOutput = z.infer<typeof MlPredictionGetByEntityOutputSchema>

// ============================================================================
// TRAINING_DATA_INGEST SCHEMAS
// ============================================================================

export const TrainingDataIngestInputSchema = z.object({
  dataType: z.string().min(1, 'dataType is required'),
  features: z.record(z.unknown()),
  labels: z.record(z.unknown()),
  storyId: z.string().optional(),
})

export type TrainingDataIngestInput = z.infer<typeof TrainingDataIngestInputSchema>

export const TrainingDataRowSchema = z.object({
  id: z.string().uuid(),
  dataType: z.string(),
  features: z.unknown(),
  labels: z.unknown(),
  storyId: z.string().nullable(),
  collectedAt: z.date(),
  validated: z.boolean(),
  validatedAt: z.date().nullable(),
  createdAt: z.date(),
})

export type TrainingDataRow = z.infer<typeof TrainingDataRowSchema>

export const TrainingDataIngestOutputSchema = TrainingDataRowSchema.nullable()

export type TrainingDataIngestOutput = z.infer<typeof TrainingDataIngestOutputSchema>

// ============================================================================
// TRAINING_DATA_MARK_VALIDATED SCHEMAS
// ============================================================================

export const TrainingDataMarkValidatedInputSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
})

export type TrainingDataMarkValidatedInput = z.infer<typeof TrainingDataMarkValidatedInputSchema>

export const TrainingDataMarkValidatedOutputSchema = TrainingDataRowSchema.nullable()

export type TrainingDataMarkValidatedOutput = z.infer<typeof TrainingDataMarkValidatedOutputSchema>
