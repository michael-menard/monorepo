/**
 * ML Model Register MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Inserts a new model record into workflow.ml_models.
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { mlModels } from '../db/index.js'
import {
  MlModelRegisterInputSchema,
  type MlModelRegisterInput,
  type MlModelRegisterOutput,
} from './__types__/index.js'
import { extractErrorMessage } from './error-handler.js'

/**
 * Register a new ML model in the database
 *
 * @param input - Model registration parameters
 * @returns Created model record or null if registration failed
 */
export async function mlModelRegister(input: MlModelRegisterInput): Promise<MlModelRegisterOutput> {
  const parsed = MlModelRegisterInputSchema.parse(input)

  try {
    const [inserted] = await db
      .insert(mlModels)
      .values({
        modelName: parsed.modelName,
        modelType: parsed.modelType,
        version: parsed.version,
        hyperparameters: parsed.hyperparameters ?? null,
        trainingDataCount: parsed.trainingDataCount,
        trainedBy: parsed.trainedBy ?? null,
        isActive: parsed.isActive ?? false,
      })
      .returning()

    return {
      id: inserted.id,
      modelName: inserted.modelName,
      modelType: inserted.modelType,
      version: inserted.version,
      hyperparameters: inserted.hyperparameters ?? null,
      trainingDataCount: inserted.trainingDataCount,
      trainedAt: inserted.trainedAt,
      trainedBy: inserted.trainedBy ?? null,
      isActive: inserted.isActive,
      activatedAt: inserted.activatedAt ?? null,
      deactivatedAt: inserted.deactivatedAt ?? null,
      createdAt: inserted.createdAt,
      updatedAt: inserted.updatedAt,
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to register ML model '${parsed.modelName}':`,
      extractErrorMessage(error),
    )
    return null
  }
}
