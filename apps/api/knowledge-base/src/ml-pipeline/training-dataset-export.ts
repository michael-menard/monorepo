/**
 * Training Dataset Export MCP Tool
 * WINT-5040: Collect ML Training Data
 *
 * Exports collected datasets in JSONL or CSV format with quality filtering
 * and dataset statistics.
 */

import { logger } from '@repo/logger'
import {
  TrainingDatasetExportInputSchema,
  type TrainingDatasetExportInput,
  type TrainingDatasetExportOutput,
} from './__types__/index.js'
import { trainingDataCollect } from './training-data-collect.js'
import { extractErrorMessage } from './error-handler.js'

/**
 * Export a training dataset in JSONL or CSV format.
 *
 * @param input - Dataset type, format, completeness threshold
 * @returns Formatted rows with stats, cold-start response, validation failure, or null on error
 */
export async function trainingDatasetExport(
  input: TrainingDatasetExportInput,
): Promise<TrainingDatasetExportOutput | null> {
  const parsed = TrainingDatasetExportInputSchema.parse(input)

  try {
    const collected = await trainingDataCollect({
      datasetType: parsed.datasetType,
      minRows: parsed.minRows,
      since: parsed.since,
    })

    if (!collected) {
      return null
    }

    if ('coldStart' in collected) {
      return collected
    }

    if (!collected.validation.valid) {
      return { valid: false as const, reason: collected.validation.reason ?? 'Validation failed' }
    }

    if (collected.stats.featureCompleteness < parsed.minCompleteness) {
      return {
        valid: false as const,
        reason: `Feature completeness ${(collected.stats.featureCompleteness * 100).toFixed(1)}% below export threshold ${(parsed.minCompleteness * 100).toFixed(1)}%`,
      }
    }

    const formattedRows =
      parsed.format === 'jsonl'
        ? collected.rows.map(row => JSON.stringify(row))
        : formatAsCsv(collected.rows)

    logger.info(
      `[mcp-tools] Exported ${parsed.datasetType} dataset: ${formattedRows.length} rows, ` +
        `completeness=${(collected.stats.featureCompleteness * 100).toFixed(1)}%, ` +
        `format=${parsed.format}`,
    )

    return { rows: formattedRows, stats: collected.stats }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to export '${parsed.datasetType}' dataset:`,
      extractErrorMessage(error),
    )
    return null
  }
}

function formatAsCsv(
  rows: Array<{ features: Record<string, unknown>; labels: Record<string, unknown> }>,
): string[] {
  if (rows.length === 0) return []

  const firstRow = rows[0]
  const featureKeys = Object.keys(firstRow.features)
  const labelKeys = Object.keys(firstRow.labels)
  const allKeys = [...featureKeys.map(k => `feature_${k}`), ...labelKeys.map(k => `label_${k}`)]

  const header = allKeys.join(',')
  const dataRows = rows.map(row => {
    const vals = [
      ...featureKeys.map(k => csvEscape(row.features[k])),
      ...labelKeys.map(k => csvEscape(row.labels[k])),
    ]
    return vals.join(',')
  })

  return [header, ...dataRows]
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
