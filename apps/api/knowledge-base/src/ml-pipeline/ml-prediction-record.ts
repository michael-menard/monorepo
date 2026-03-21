/**
 * ML Prediction Record MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Appends a new prediction row to workflow.model_predictions (append-only).
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { modelPredictions } from '../db/index.js'
import {
  MlPredictionRecordInputSchema,
  type MlPredictionRecordInput,
  type MlPredictionRecordOutput,
} from './__types__/index.js'
import { extractErrorMessage } from './error-handler.js'

/**
 * Record a model prediction (append-only)
 *
 * @param input - Prediction parameters
 * @returns Inserted prediction record or null if insertion failed
 */
export async function mlPredictionRecord(
  input: MlPredictionRecordInput,
): Promise<MlPredictionRecordOutput> {
  const parsed = MlPredictionRecordInputSchema.parse(input)

  try {
    const [inserted] = await db
      .insert(modelPredictions)
      .values({
        modelId: parsed.modelId,
        predictionType: parsed.predictionType,
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        features: parsed.features,
        prediction: parsed.prediction,
        actualValue: parsed.actualValue ?? null,
        error: parsed.error ?? null,
      })
      .returning()

    return {
      id: inserted.id,
      modelId: inserted.modelId,
      predictionType: inserted.predictionType,
      entityType: inserted.entityType,
      entityId: inserted.entityId,
      features: inserted.features,
      prediction: inserted.prediction,
      actualValue: inserted.actualValue ?? null,
      error: inserted.error ?? null,
      predictedAt: inserted.predictedAt,
      createdAt: inserted.createdAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to record prediction for model '${parsed.modelId}', entity '${parsed.entityId}':`,
      extractErrorMessage(error),
    )
    return null
  }
}
