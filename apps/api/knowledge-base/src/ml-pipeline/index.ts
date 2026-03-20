/**
 * ML Pipeline MCP Tools
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * 7 tools for 4 ML pipeline tables:
 * - ml_models: mlModelRegister, mlModelGetActive
 * - model_metrics: mlMetricsRecord
 * - model_predictions: mlPredictionRecord, mlPredictionGetByEntity
 * - training_data: trainingDataIngest, trainingDataMarkValidated
 */

export { mlModelRegister } from './ml-model-register.js'
export { mlModelGetActive } from './ml-model-get-active.js'
export { mlMetricsRecord } from './ml-metrics-record.js'
export { mlPredictionRecord } from './ml-prediction-record.js'
export { mlPredictionGetByEntity } from './ml-prediction-get-by-entity.js'
export { trainingDataIngest } from './training-data-ingest.js'
export { trainingDataMarkValidated } from './training-data-mark-validated.js'

// Re-export Zod schemas
export {
  MlModelTypeSchema,
  MlModelRegisterInputSchema,
  MlModelGetActiveInputSchema,
  MlMetricsRecordInputSchema,
  MlPredictionRecordInputSchema,
  MlPredictionGetByEntityInputSchema,
  TrainingDataIngestInputSchema,
  TrainingDataMarkValidatedInputSchema,
} from './__types__/index.js'

// Re-export types
export type {
  MlModelType,
  MlModelRegisterInput,
  MlModelRegisterOutput,
  MlModelGetActiveInput,
  MlModelGetActiveOutput,
  MlModelRecord,
  MlMetricsRecordInput,
  MlMetricsRecordOutput,
  MlMetricRecord,
  MlPredictionRecordInput,
  MlPredictionRecordOutput,
  MlPredictionGetByEntityInput,
  MlPredictionGetByEntityOutput,
  MlPredictionRow,
  TrainingDataIngestInput,
  TrainingDataIngestOutput,
  TrainingDataMarkValidatedInput,
  TrainingDataMarkValidatedOutput,
  TrainingDataRow,
} from './__types__/index.js'
