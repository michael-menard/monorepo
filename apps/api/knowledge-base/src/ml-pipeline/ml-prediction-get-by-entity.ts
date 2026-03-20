/**
 * ML Prediction Get By Entity MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Fetches predictions by entityType + entityId, ordered by predictedAt DESC.
 */

import { eq, and, desc } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { modelPredictions } from '../db/index.js'
import {
  MlPredictionGetByEntityInputSchema,
  type MlPredictionGetByEntityInput,
  type MlPredictionGetByEntityOutput,
} from './__types__/index.js'

/**
 * Get predictions for an entity (ordered by predictedAt DESC)
 *
 * @param input - entityType, entityId, optional predictionType filter, limit
 * @returns Array of prediction records
 */
export async function mlPredictionGetByEntity(
  input: MlPredictionGetByEntityInput,
): Promise<MlPredictionGetByEntityOutput> {
  const parsed = MlPredictionGetByEntityInputSchema.parse(input)

  try {
    const baseCondition = and(
      eq(modelPredictions.entityType, parsed.entityType),
      eq(modelPredictions.entityId, parsed.entityId),
    )

    const whereClause =
      parsed.predictionType !== undefined
        ? and(baseCondition, eq(modelPredictions.predictionType, parsed.predictionType))
        : baseCondition

    const rows = await db
      .select()
      .from(modelPredictions)
      .where(whereClause)
      .orderBy(desc(modelPredictions.predictedAt))
      .limit(parsed.limit)

    return rows.map(row => ({
      id: row.id,
      modelId: row.modelId,
      predictionType: row.predictionType,
      entityType: row.entityType,
      entityId: row.entityId,
      features: row.features,
      prediction: row.prediction,
      actualValue: row.actualValue ?? null,
      error: row.error ?? null,
      predictedAt: row.predictedAt,
      createdAt: row.createdAt,
    }))
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to get predictions for entity '${parsed.entityId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
