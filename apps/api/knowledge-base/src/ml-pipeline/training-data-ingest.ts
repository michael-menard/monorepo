/**
 * Training Data Ingest MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Inserts a new row into workflow.training_data.
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { trainingData } from '../db/index.js'
import {
  TrainingDataIngestInputSchema,
  type TrainingDataIngestInput,
  type TrainingDataIngestOutput,
} from './__types__/index.js'
import { extractErrorMessage } from './error-handler.js'

/**
 * Ingest a training data record
 *
 * @param input - Training data parameters (dataType, features, labels, optional storyId)
 * @returns Inserted training data record or null if insertion failed
 */
export async function trainingDataIngest(
  input: TrainingDataIngestInput,
): Promise<TrainingDataIngestOutput> {
  const parsed = TrainingDataIngestInputSchema.parse(input)

  try {
    const [inserted] = await db
      .insert(trainingData)
      .values({
        dataType: parsed.dataType,
        features: parsed.features,
        labels: parsed.labels,
        storyId: parsed.storyId ?? null,
      })
      .returning()

    return {
      id: inserted.id,
      dataType: inserted.dataType,
      features: inserted.features,
      labels: inserted.labels,
      storyId: inserted.storyId ?? null,
      collectedAt: inserted.collectedAt,
      validated: inserted.validated,
      validatedAt: inserted.validatedAt ?? null,
      createdAt: inserted.createdAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to ingest training data of type '${parsed.dataType}':`,
      extractErrorMessage(error),
    )
    return null
  }
}
