/**
 * Training Data Collect MCP Tool
 * WINT-5040: Collect ML Training Data
 *
 * Queries across workflow.* telemetry tables and produces structured,
 * validated datasets for downstream ML model training.
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { sql, eq, gte, and, isNotNull } from 'drizzle-orm'
import {
  agentInvocations,
  agentOutcomes,
  storyOutcomes,
  hitlDecisions,
  trainingData,
} from '../db/index.js'
import {
  TrainingDataCollectInputSchema,
  type TrainingDataCollectInput,
  type TrainingDataCollectOutput,
  type RoutingDatasetRow,
  type QualityDatasetRow,
  type PreferenceDatasetRow,
  type DatasetStats,
  type DatasetValidation,
} from './__types__/index.js'
import { extractErrorMessage } from './error-handler.js'

/**
 * Collect and validate ML training datasets from workflow telemetry tables.
 *
 * @param input - Dataset type, minimum rows, optional since filter
 * @returns Dataset rows with validation and stats, cold-start response, or null on error
 */
export async function trainingDataCollect(
  input: TrainingDataCollectInput,
): Promise<TrainingDataCollectOutput | null> {
  const parsed = TrainingDataCollectInputSchema.parse(input)

  try {
    switch (parsed.datasetType) {
      case 'routing':
        return await collectRoutingDataset(parsed.minRows, parsed.since)
      case 'quality':
        return await collectQualityDataset(parsed.minRows, parsed.since)
      case 'preference':
        return await collectPreferenceDataset(parsed.minRows, parsed.since)
    }
  } catch (error) {
    logger.warn(
      `[mcp-tools] Failed to collect '${parsed.datasetType}' training dataset:`,
      extractErrorMessage(error),
    )
    return null
  }
}

async function collectRoutingDataset(
  minRows: number,
  since?: string,
): Promise<TrainingDataCollectOutput> {
  const conditions = [isNotNull(agentInvocations.storyId)]
  if (since) {
    conditions.push(gte(agentInvocations.startedAt, new Date(since)))
  }

  const rows = await db
    .select({
      agentName: agentInvocations.agentName,
      phase: agentInvocations.phase,
      inputTokens: agentInvocations.inputTokens,
      outputTokens: agentInvocations.outputTokens,
      durationMs: agentInvocations.durationMs,
      status: agentInvocations.status,
      finalVerdict: storyOutcomes.finalVerdict,
      qualityScore: storyOutcomes.qualityScore,
      storyId: agentInvocations.storyId,
    })
    .from(agentInvocations)
    .innerJoin(
      sql`(SELECT DISTINCT ON (story_id) story_id, final_verdict, quality_score FROM workflow.story_outcomes ORDER BY story_id, created_at DESC) AS so`,
      sql`so.story_id = ${agentInvocations.storyId}`,
    )
    .where(and(...conditions))

  if (rows.length < minRows) {
    return {
      coldStart: true as const,
      available: rows.length,
      required: minRows,
      recommendation: `Routing dataset has ${rows.length} rows, needs ${minRows}. Run more stories through the pipeline to accumulate data.`,
    }
  }

  const datasetRows: RoutingDatasetRow[] = rows.map(r => ({
    features: {
      agentName: r.agentName,
      phase: r.phase,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      durationMs: r.durationMs,
      status: r.status,
    },
    labels: {
      finalVerdict: r.finalVerdict as string,
      qualityScore: r.qualityScore as number,
    },
  }))

  const stats = computeStats(datasetRows, 'routing')
  const validation = validateDataset(datasetRows, stats, minRows)

  return { rows: datasetRows, validation, stats }
}

async function collectQualityDataset(
  minRows: number,
  since?: string,
): Promise<TrainingDataCollectOutput> {
  const conditions = [isNotNull(agentInvocations.storyId)]
  if (since) {
    conditions.push(gte(agentInvocations.startedAt, new Date(since)))
  }

  const rows = await db
    .select({
      testsWritten: agentOutcomes.testsWritten,
      testsPassed: agentOutcomes.testsPassed,
      testsFailed: agentOutcomes.testsFailed,
      lintErrors: agentOutcomes.lintErrors,
      typeErrors: agentOutcomes.typeErrors,
      codeQuality: agentOutcomes.codeQuality,
      testCoverage: agentOutcomes.testCoverage,
      finalVerdict: storyOutcomes.finalVerdict,
      qualityScore: storyOutcomes.qualityScore,
      reviewIterations: storyOutcomes.reviewIterations,
      qaIterations: storyOutcomes.qaIterations,
      storyId: agentInvocations.storyId,
    })
    .from(agentOutcomes)
    .innerJoin(agentInvocations, eq(agentOutcomes.invocationId, agentInvocations.id))
    .innerJoin(
      sql`(SELECT DISTINCT ON (story_id) story_id, final_verdict, quality_score, review_iterations, qa_iterations FROM workflow.story_outcomes ORDER BY story_id, created_at DESC) AS so`,
      sql`so.story_id = ${agentInvocations.storyId}`,
    )
    .where(and(...conditions))

  if (rows.length < minRows) {
    return {
      coldStart: true as const,
      available: rows.length,
      required: minRows,
      recommendation: `Quality dataset has ${rows.length} rows, needs ${minRows}. Complete more stories with code review and QA to accumulate data.`,
    }
  }

  const datasetRows: QualityDatasetRow[] = rows.map(r => ({
    features: {
      testsWritten: r.testsWritten,
      testsPassed: r.testsPassed,
      testsFailed: r.testsFailed,
      lintErrors: r.lintErrors,
      typeErrors: r.typeErrors,
      codeQuality: r.codeQuality,
      testCoverage: r.testCoverage,
    },
    labels: {
      finalVerdict: r.finalVerdict as string,
      qualityScore: r.qualityScore as number,
      reviewIterations: r.reviewIterations as number,
      qaIterations: r.qaIterations as number,
    },
  }))

  const stats = computeStats(datasetRows, 'quality')
  const validation = validateDataset(datasetRows, stats, minRows)

  return { rows: datasetRows, validation, stats }
}

async function collectPreferenceDataset(
  minRows: number,
  _since?: string,
): Promise<TrainingDataCollectOutput> {
  const rows = await db
    .select({
      decisionType: hitlDecisions.decisionType,
      storyId: hitlDecisions.storyId,
      operatorId: hitlDecisions.operatorId,
      tdFeatures: trainingData.features,
      tdLabels: trainingData.labels,
    })
    .from(hitlDecisions)
    .innerJoin(trainingData, eq(hitlDecisions.storyId, trainingData.storyId))
    .where(isNotNull(trainingData.storyId))

  if (rows.length < minRows) {
    return {
      coldStart: true as const,
      available: rows.length,
      required: minRows,
      recommendation: `Preference dataset has ${rows.length} rows, needs ${minRows}. Run HiTL interviews via the interview sidecar (WINT-5010) to accumulate data.`,
    }
  }

  const datasetRows: PreferenceDatasetRow[] = rows.map(r => {
    const labels = r.tdLabels as Record<string, unknown>
    return {
      features: {
        decisionType: r.decisionType,
        storyId: r.storyId,
        operatorId: r.operatorId,
      },
      labels: {
        rationale: String(labels.rationale ?? ''),
        confidence: Number(labels.confidence ?? 0),
        alternativesConsidered: String(labels.alternativesConsidered ?? ''),
        riskAssessment: String(labels.riskAssessment ?? ''),
      },
    }
  })

  const stats = computeStats(datasetRows, 'preference')
  const validation = validateDataset(datasetRows, stats, minRows)

  return { rows: datasetRows, validation, stats }
}

function computeStats(
  rows: (RoutingDatasetRow | QualityDatasetRow | PreferenceDatasetRow)[],
  datasetType: string,
): DatasetStats {
  const totalRows = rows.length
  if (totalRows === 0) {
    return { totalRows: 0, validRows: 0, featureCompleteness: 0, labelDistribution: {} }
  }

  let nullFeatureCount = 0
  let totalFeatureFields = 0
  const labelCounts: Record<string, number> = {}

  for (const row of rows) {
    const features = row.features as Record<string, unknown>
    const labels = row.labels as Record<string, unknown>

    for (const val of Object.values(features)) {
      totalFeatureFields++
      if (val === null || val === undefined) nullFeatureCount++
    }

    const labelKey =
      datasetType === 'preference'
        ? String((labels as Record<string, unknown>).rationale ?? '').slice(0, 50)
        : String((labels as Record<string, unknown>).finalVerdict ?? 'unknown')

    labelCounts[labelKey] = (labelCounts[labelKey] ?? 0) + 1
  }

  const featureCompleteness = totalFeatureFields > 0 ? 1 - nullFeatureCount / totalFeatureFields : 0

  const validRows = rows.filter(r => {
    const features = r.features as Record<string, unknown>
    return !Object.values(features).some(v => v === null || v === undefined)
  }).length

  return { totalRows, validRows, featureCompleteness, labelDistribution: labelCounts }
}

function validateDataset(
  rows: (RoutingDatasetRow | QualityDatasetRow | PreferenceDatasetRow)[],
  stats: DatasetStats,
  minRows: number,
): DatasetValidation {
  if (rows.length < minRows) {
    return { valid: false, reason: `Row count ${rows.length} below minimum ${minRows}` }
  }

  if (stats.featureCompleteness < 0.8) {
    return {
      valid: false,
      reason: `Feature completeness ${(stats.featureCompleteness * 100).toFixed(1)}% below 80% threshold`,
    }
  }

  const distinctLabels = Object.keys(stats.labelDistribution).length
  if (distinctLabels < 2) {
    return {
      valid: false,
      reason: `Label distribution has only ${distinctLabels} distinct value(s), need at least 2`,
    }
  }

  return { valid: true }
}
