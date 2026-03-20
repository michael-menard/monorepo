/**
 * ML Metrics Record MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Appends a new metric row to workflow.model_metrics (append-only).
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { modelMetrics } from '../db/index.js'
import {
  MlMetricsRecordInputSchema,
  type MlMetricsRecordInput,
  type MlMetricsRecordOutput,
} from './__types__/index.js'

/**
 * Record a model metric (append-only)
 *
 * @param input - Metric parameters including modelId, metricType, metricValue
 * @returns Inserted metric record or null if insertion failed
 */
export async function mlMetricsRecord(input: MlMetricsRecordInput): Promise<MlMetricsRecordOutput> {
  const parsed = MlMetricsRecordInputSchema.parse(input)

  try {
    const [inserted] = await db
      .insert(modelMetrics)
      .values({
        modelId: parsed.modelId,
        metricType: parsed.metricType,
        metricValue: parsed.metricValue,
        evaluationDataset: parsed.evaluationDataset ?? null,
        sampleSize: parsed.sampleSize ?? null,
        metadata: parsed.metadata ?? null,
      })
      .returning()

    return {
      id: inserted.id,
      modelId: inserted.modelId,
      metricType: inserted.metricType,
      metricValue: inserted.metricValue,
      evaluationDataset: inserted.evaluationDataset ?? null,
      sampleSize: inserted.sampleSize ?? null,
      metadata: inserted.metadata ?? null,
      evaluatedAt: inserted.evaluatedAt,
      createdAt: inserted.createdAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to record metric '${parsed.metricType}' for model '${parsed.modelId}':`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
