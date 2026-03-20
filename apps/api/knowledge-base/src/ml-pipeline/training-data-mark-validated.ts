/**
 * Training Data Mark Validated MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Sets validated=true and validated_at=NOW() for a training_data row by id.
 */

import { eq } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { trainingData } from '../db/index.js'
import {
  TrainingDataMarkValidatedInputSchema,
  type TrainingDataMarkValidatedInput,
  type TrainingDataMarkValidatedOutput,
} from './__types__/index.js'

/**
 * Mark a training data record as validated
 *
 * @param input - id (UUID) of the training data record
 * @returns Updated record or null if not found / update failed
 */
export async function trainingDataMarkValidated(
  input: TrainingDataMarkValidatedInput,
): Promise<TrainingDataMarkValidatedOutput> {
  const parsed = TrainingDataMarkValidatedInputSchema.parse(input)

  try {
    const [updated] = await db
      .update(trainingData)
      .set({
        validated: true,
        validatedAt: new Date(),
      })
      .where(eq(trainingData.id, parsed.id))
      .returning()

    if (!updated) {
      logger.warn(`[mcp-tools] Training data record '${parsed.id}' not found for validation`)
      return null
    }

    return {
      id: updated.id,
      dataType: updated.dataType,
      features: updated.features,
      labels: updated.labels,
      storyId: updated.storyId ?? null,
      collectedAt: updated.collectedAt,
      validated: updated.validated,
      validatedAt: updated.validatedAt ?? null,
      createdAt: updated.createdAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to mark training data '${parsed.id}' as validated:`,
      error instanceof Error ? error.message : String(error),
    )
    return null
  }
}
