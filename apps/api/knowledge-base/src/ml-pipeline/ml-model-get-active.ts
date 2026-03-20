/**
 * ML Model Get Active MCP Tool
 * WINT-0140: Create ML Pipeline MCP Tools
 *
 * Returns all active ML models, optionally filtered by model type.
 */

import { eq, and } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { mlModels } from '../db/index.js'
import {
  MlModelGetActiveInputSchema,
  type MlModelGetActiveInput,
  type MlModelGetActiveOutput,
} from './__types__/index.js'

/**
 * Get all active ML models, with optional type filter
 *
 * @param input - Optional modelType filter
 * @returns Array of active model records
 */
export async function mlModelGetActive(
  input: MlModelGetActiveInput,
): Promise<MlModelGetActiveOutput> {
  const parsed = MlModelGetActiveInputSchema.parse(input)

  try {
    const whereClause =
      parsed.modelType !== undefined
        ? and(eq(mlModels.isActive, true), eq(mlModels.modelType, parsed.modelType))
        : eq(mlModels.isActive, true)

    const rows = await db.select().from(mlModels).where(whereClause)

    return rows.map(row => ({
      id: row.id,
      modelName: row.modelName,
      modelType: row.modelType,
      version: row.version,
      hyperparameters: row.hyperparameters ?? null,
      trainingDataCount: row.trainingDataCount,
      trainedAt: row.trainedAt,
      trainedBy: row.trainedBy ?? null,
      isActive: row.isActive,
      activatedAt: row.activatedAt ?? null,
      deactivatedAt: row.deactivatedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to get active ML models:`,
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}
