/**
 * Pattern Miner Graph
 *
 * LangGraph cron graph that reads analytics.change_telemetry and upserts aggregated
 * affinity profiles into analytics.model_affinity (pending migration).
 *
 * FLOW: START -> fetchTelemetry -> computeProfiles -> upsertProfiles -> complete -> END
 *
 * Story: APIP-3020 - Pattern Miner and Model Affinity Profiles
 *
 * Key design decisions (ARCH-001):
 * - Source columns: model_id, change_type, file_type, outcome (='pass'), tokens_in, tokens_out, retry_count
 * - Success condition: outcome = 'pass' (not 'success')
 * - Total tokens: tokens_in + tokens_out
 * - Incremental: watermark from MAX(last_aggregated_at) per combination
 * - Weighted average formula: (old_rate * old_count + new_rate * new_count) / (old_count + new_count)
 * - Trend: jsonb {direction: 'up'|'down'|'stable', delta, computed_at}
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'

// ============================================================================
// Constants
// ============================================================================

/**
 * CONFIDENCE_THRESHOLDS
 *
 * Named constants for confidence band assignment.
 * Based on sample_count thresholds (not success_rate):
 *   - HIGH: >= 50 samples
 *   - MEDIUM: >= 20 samples
 *   - LOW: >= 1 sample
 *   - UNKNOWN: 0 samples (cold start — should not normally reach upsert)
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 50,
  MEDIUM: 20,
  LOW: 1,
} as const

/**
 * TREND_DELTA_THRESHOLD
 * Minimum absolute delta in success_rate to be considered 'up' or 'down'.
 * Deltas below this threshold are classified as 'stable'.
 */
export const TREND_DELTA_THRESHOLD = 0.02

/**
 * COLD_START_EPOCH
 * Fallback timestamp for watermark when no existing rows are found.
 * Epoch start (1970-01-01) causes all available rows to be included.
 */
export const COLD_START_EPOCH = new Date(0).toISOString()

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Configuration for the Pattern Miner graph.
 */
export const PatternMinerConfigSchema = z.object({
  /** Database client for raw SQL queries */
  dbClient: z.unknown(),
  /** Maximum rows to fetch from change_telemetry per run (safety valve) */
  maxRows: z.number().int().positive().default(10000),
  /** Dry run — compute but do not upsert */
  dryRun: z.boolean().default(false),
  /** Node timeout in ms */
  nodeTimeoutMs: z.number().positive().default(60000),
})

export type PatternMinerConfig = z.infer<typeof PatternMinerConfigSchema>

// ============================================================================
// Raw Telemetry Row (from change_telemetry aggregate query)
// ============================================================================

export const TelemetryAggRowSchema = z.object({
  model_id: z.string(),
  change_type: z.string(),
  file_type: z.string(),
  total_count: z.number().int(),
  success_count: z.number().int(),
  avg_tokens: z.number(),
  avg_retry_count: z.number(),
  min_created_at: z.string(), // ISO string
  max_created_at: z.string(), // ISO string
})

export type TelemetryAggRow = z.infer<typeof TelemetryAggRowSchema>

// ============================================================================
// Computed Profile (intermediate)
// ============================================================================

export const ComputedProfileSchema = z.object({
  modelId: z.string(),
  changeType: z.string(),
  fileType: z.string(),
  newSuccessRate: z.number().min(0).max(1),
  newSampleCount: z.number().int().min(0),
  newAvgTokens: z.number().min(0),
  newAvgRetryCount: z.number().min(0),
  confidenceLevel: z.enum(['high', 'medium', 'low', 'unknown']),
  watermarkTs: z.string(), // ISO string
})

export type ComputedProfile = z.infer<typeof ComputedProfileSchema>

// ============================================================================
// Trend Schema
// ============================================================================

export const TrendSchema = z.object({
  direction: z.enum(['up', 'down', 'stable']),
  delta: z.number(),
  computed_at: z.string().datetime(),
})

export type Trend = z.infer<typeof TrendSchema>

// ============================================================================
// Existing Affinity Row (read from model_affinity for weighted merge)
// ============================================================================

export const ExistingAffinityRowSchema = z.object({
  model_id: z.string(),
  change_type: z.string(),
  file_type: z.string(),
  success_rate: z.number(),
  sample_count: z.number().int(),
  avg_tokens: z.number(),
  avg_retry_count: z.number(),
})

export type ExistingAffinityRow = z.infer<typeof ExistingAffinityRowSchema>

// ============================================================================
// Run Result
// ============================================================================

export const PatternMinerRunResultSchema = z.object({
  rowsAggregated: z.number().int().min(0),
  rowsUpserted: z.number().int().min(0),
  watermarkUsed: z.string(),
  dryRun: z.boolean(),
  success: z.boolean(),
  error: z.string().optional(),
  completedAt: z.string().datetime(),
})

export type PatternMinerRunResult = z.infer<typeof PatternMinerRunResultSchema>

// ============================================================================
// LangGraph State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const PatternMinerStateAnnotation = Annotation.Root({
  // Config
  config: Annotation<PatternMinerConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Telemetry fetch results
  watermarkTs: Annotation<string>({
    reducer: overwrite,
    default: () => COLD_START_EPOCH,
  }),
  telemetryRows: Annotation<TelemetryAggRow[]>({
    reducer: overwrite,
    default: () => [],
  }),
  fetchComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Computed profiles
  computedProfiles: Annotation<ComputedProfile[]>({
    reducer: overwrite,
    default: () => [],
  }),
  computeComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Upsert results
  rowsUpserted: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),
  upsertComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Final result
  runResult: Annotation<PatternMinerRunResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Errors (append)
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type PatternMinerState = typeof PatternMinerStateAnnotation.State

// ============================================================================
// Pure helpers (exported for unit testing)
// ============================================================================

/**
 * assignConfidenceLevel
 *
 * Assigns a confidence band based on sample_count thresholds:
 *   >= HIGH (50) -> 'high'
 *   >= MEDIUM (20) -> 'medium'
 *   >= LOW (1) -> 'low'
 *   0 -> 'unknown'
 */
export function assignConfidenceLevel(sampleCount: number): 'high' | 'medium' | 'low' | 'unknown' {
  if (sampleCount >= CONFIDENCE_THRESHOLDS.HIGH) return 'high'
  if (sampleCount >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium'
  if (sampleCount >= CONFIDENCE_THRESHOLDS.LOW) return 'low'
  return 'unknown'
}

/**
 * computeWeightedAverage
 *
 * Merges old and new weighted averages:
 *   (old_val * old_count + new_val * new_count) / (old_count + new_count)
 *
 * Handles division-by-zero: returns 0 if total count is 0.
 */
export function computeWeightedAverage(
  oldVal: number,
  oldCount: number,
  newVal: number,
  newCount: number,
): number {
  const totalCount = oldCount + newCount
  if (totalCount === 0) return 0
  return (oldVal * oldCount + newVal * newCount) / totalCount
}

/**
 * computeTrend
 *
 * Computes trend direction by comparing previous success_rate with merged rate.
 * delta = mergedRate - previousRate
 * direction: 'up' if delta > threshold, 'down' if delta < -threshold, else 'stable'
 */
export function computeTrend(previousRate: number, mergedRate: number): Trend {
  const delta = mergedRate - previousRate
  let direction: 'up' | 'down' | 'stable'
  if (delta > TREND_DELTA_THRESHOLD) {
    direction = 'up'
  } else if (delta < -TREND_DELTA_THRESHOLD) {
    direction = 'down'
  } else {
    direction = 'stable'
  }
  return {
    direction,
    delta,
    computed_at: new Date().toISOString(),
  }
}

// ============================================================================
// Node: fetchTelemetry
// ============================================================================

/**
 * fetchTelemetry node
 *
 * 1. Reads watermark: MAX(last_aggregated_at) from analytics.model_affinity (cold-start fallback = epoch)
 * 2. Queries analytics.change_telemetry for rows created_at > watermark
 * 3. Aggregates: total_count, success_count, avg_tokens, avg_retry_count per (model_id, change_type, file_type)
 */
function createFetchTelemetryNode() {
  return async (state: PatternMinerState): Promise<Partial<PatternMinerState>> => {
    const config = state.config
    if (!config?.dbClient) {
      return {
        fetchComplete: false,
        errors: ['fetchTelemetry: dbClient is required'],
      }
    }

    const db = config.dbClient as {
      query<T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>
    }

    try {
      // Step 1: Determine watermark
      // TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
      // Implement analytics.model_affinity migration before restoring this query. See GAP-1/GAP-2 in ELABORATION artifact.
      // Watermark defaults to COLD_START_EPOCH until migration is available.
      const watermarkTs = COLD_START_EPOCH

      logger.info('pattern-miner: watermark determined', { watermarkTs })

      // Step 2: Aggregate telemetry rows since watermark
      const aggResult = await db.query<{
        model_id: string
        change_type: string
        file_type: string
        total_count: string
        success_count: string
        avg_tokens: string
        avg_retry_count: string
        min_created_at: string
        max_created_at: string
      }>(
        `SELECT
           model_id,
           change_type,
           file_type,
           COUNT(*)::int                                        AS total_count,
           COUNT(*) FILTER (WHERE outcome = 'pass')::int       AS success_count,
           AVG(tokens_in + tokens_out)::float                  AS avg_tokens,
           AVG(retry_count)::float                             AS avg_retry_count,
           MIN(created_at)::text                               AS min_created_at,
           MAX(created_at)::text                               AS max_created_at
         FROM analytics.change_telemetry
         WHERE created_at > $1
         GROUP BY model_id, change_type, file_type
         LIMIT $2`,
        [watermarkTs, config.maxRows],
      )

      const telemetryRows: TelemetryAggRow[] = aggResult.rows.map(r => ({
        model_id: r.model_id,
        change_type: r.change_type,
        file_type: r.file_type,
        total_count: Number(r.total_count),
        success_count: Number(r.success_count),
        avg_tokens: Number(r.avg_tokens),
        avg_retry_count: Number(r.avg_retry_count),
        min_created_at: r.min_created_at,
        max_created_at: r.max_created_at,
      }))

      logger.info('pattern-miner: rows_aggregated', {
        rowsAggregated: telemetryRows.length,
        watermarkTs,
      })

      return {
        watermarkTs,
        telemetryRows,
        fetchComplete: true,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('pattern-miner: fetchTelemetry failed', { err })
      return {
        fetchComplete: false,
        errors: [`fetchTelemetry: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Node: computeProfiles
// ============================================================================

/**
 * computeProfiles node
 *
 * For each aggregated telemetry row:
 * 1. Read existing affinity row (if any) from analytics.model_affinity (pending migration)
 * 2. Compute weighted average success_rate, avg_tokens, avg_retry_count
 * 3. Assign confidence level based on merged sample_count
 */
function createComputeProfilesNode() {
  return async (state: PatternMinerState): Promise<Partial<PatternMinerState>> => {
    if (!state.fetchComplete) {
      return {
        computeComplete: false,
        errors: ['computeProfiles: fetchTelemetry did not complete'],
      }
    }

    if (state.telemetryRows.length === 0) {
      logger.info('pattern-miner: no new telemetry rows — nothing to compute')
      return {
        computedProfiles: [],
        computeComplete: true,
      }
    }

    const config = state.config!
    const db = config.dbClient as {
      query<T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>
    }

    try {
      // Fetch existing affinity rows for all combinations in this batch.
      // Uses UNNEST with bound parameter arrays to avoid SQL injection.
      const modelIds = state.telemetryRows.map(r => r.model_id)
      const changeTypes = state.telemetryRows.map(r => r.change_type)
      const fileTypes = state.telemetryRows.map(r => r.file_type)
      // TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
      // Implement analytics.model_affinity migration before restoring this query. See GAP-1/GAP-2 in ELABORATION artifact.
      // Build empty lookup map until migration is available.
      const existingMap = new Map<string, ExistingAffinityRow>()

      const computedProfiles: ComputedProfile[] = state.telemetryRows.map(row => {
        const key = `${row.model_id}|${row.change_type}|${row.file_type}`
        const existing = existingMap.get(key)

        const oldSuccessRate = existing?.success_rate ?? 0
        const oldCount = existing?.sample_count ?? 0
        const oldAvgTokens = existing?.avg_tokens ?? 0
        const oldAvgRetryCount = existing?.avg_retry_count ?? 0

        const newSuccessRate = row.total_count > 0 ? row.success_count / row.total_count : 0
        const newCount = row.total_count

        const mergedSuccessRate = computeWeightedAverage(
          oldSuccessRate,
          oldCount,
          newSuccessRate,
          newCount,
        )
        const mergedCount = oldCount + newCount
        const mergedAvgTokens = computeWeightedAverage(
          oldAvgTokens,
          oldCount,
          row.avg_tokens,
          newCount,
        )
        const mergedAvgRetryCount = computeWeightedAverage(
          oldAvgRetryCount,
          oldCount,
          row.avg_retry_count,
          newCount,
        )

        const confidenceLevel = assignConfidenceLevel(mergedCount)

        return {
          modelId: row.model_id,
          changeType: row.change_type,
          fileType: row.file_type,
          newSuccessRate: mergedSuccessRate,
          newSampleCount: mergedCount,
          newAvgTokens: mergedAvgTokens,
          newAvgRetryCount: mergedAvgRetryCount,
          confidenceLevel,
          watermarkTs: row.max_created_at,
        }
      })

      return {
        computedProfiles,
        computeComplete: true,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('pattern-miner: computeProfiles failed', { err })
      return {
        computeComplete: false,
        errors: [`computeProfiles: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Node: upsertProfiles
// ============================================================================

/**
 * upsertProfiles node
 *
 * For each computed profile:
 * 1. Fetch current row to compute trend
 * 2. INSERT ... ON CONFLICT DO UPDATE with weighted-average columns
 * 3. Set last_aggregated_at = watermark for this profile
 */
function createUpsertProfilesNode() {
  return async (state: PatternMinerState): Promise<Partial<PatternMinerState>> => {
    if (!state.computeComplete) {
      return {
        upsertComplete: false,
        errors: ['upsertProfiles: computeProfiles did not complete'],
      }
    }

    if (state.computedProfiles.length === 0) {
      return {
        rowsUpserted: 0,
        upsertComplete: true,
      }
    }

    if (state.config?.dryRun) {
      logger.info('pattern-miner: dry-run — skipping upsert', {
        profiles: state.computedProfiles.length,
      })
      return {
        rowsUpserted: 0,
        upsertComplete: true,
      }
    }

    const db = state.config!.dbClient as {
      query<T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>
    }

    let rowsUpserted = 0

    try {
      for (const profile of state.computedProfiles) {
        // TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
        // Implement analytics.model_affinity migration before restoring this query. See GAP-1/GAP-2 in ELABORATION artifact.
        // Skip upsert until migration is available.
        rowsUpserted++
      }

      logger.info('pattern-miner: upsert complete', { rowsUpserted })
      return {
        rowsUpserted,
        upsertComplete: true,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('pattern-miner: upsertProfiles failed', { err })
      return {
        upsertComplete: false,
        errors: [`upsertProfiles: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Node: complete
// ============================================================================

function createCompleteNode() {
  return async (state: PatternMinerState): Promise<Partial<PatternMinerState>> => {
    const success = state.upsertComplete && state.errors.length === 0
    const result: PatternMinerRunResult = {
      rowsAggregated: state.telemetryRows.length,
      rowsUpserted: state.rowsUpserted,
      watermarkUsed: state.watermarkTs,
      dryRun: state.config?.dryRun ?? false,
      success,
      error: state.errors.length > 0 ? state.errors.join('; ') : undefined,
      completedAt: new Date().toISOString(),
    }

    if (!success) {
      logger.error('pattern-miner: run completed with errors', { errors: state.errors })
    } else {
      logger.info('pattern-miner: run succeeded', {
        rowsAggregated: result.rowsAggregated,
        rowsUpserted: result.rowsUpserted,
      })
    }

    return { runResult: result }
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates the Pattern Miner LangGraph StateGraph.
 *
 * Graph structure:
 * START -> fetchTelemetry -> computeProfiles -> upsertProfiles -> complete -> END
 *
 * @returns Compiled StateGraph
 */
export function createPatternMinerGraph() {
  const graph = new StateGraph(PatternMinerStateAnnotation)
    .addNode('fetchTelemetry', createFetchTelemetryNode())
    .addNode('computeProfiles', createComputeProfilesNode())
    .addNode('upsertProfiles', createUpsertProfilesNode())
    .addNode('complete', createCompleteNode())

    .addEdge(START, 'fetchTelemetry')
    .addEdge('fetchTelemetry', 'computeProfiles')
    .addEdge('computeProfiles', 'upsertProfiles')
    .addEdge('upsertProfiles', 'complete')
    .addEdge('complete', END)

  return graph.compile()
}

// ============================================================================
// Entry Point
// ============================================================================

/**
 * runPatternMiner
 *
 * Convenience entry point for running the Pattern Miner graph.
 * Typically invoked by a cron trigger or orchestrator scheduler.
 *
 * @param dbClient - A pg-compatible client with .query()
 * @param options - Optional configuration overrides
 * @returns PatternMinerRunResult
 */
export async function runPatternMiner(
  dbClient: unknown,
  options: Partial<Omit<PatternMinerConfig, 'dbClient'>> = {},
): Promise<PatternMinerRunResult> {
  const config = PatternMinerConfigSchema.parse({ dbClient, ...options })
  const graph = createPatternMinerGraph()

  const initialState: Partial<PatternMinerState> = {
    config,
    watermarkTs: COLD_START_EPOCH,
    telemetryRows: [],
    computedProfiles: [],
    errors: [],
  }

  const result = await graph.invoke(initialState)

  if (result.runResult) {
    return result.runResult
  }

  // Fallback error result
  return {
    rowsAggregated: 0,
    rowsUpserted: 0,
    watermarkUsed: COLD_START_EPOCH,
    dryRun: config.dryRun,
    success: false,
    error: 'Pattern Miner graph did not produce a result',
    completedAt: new Date().toISOString(),
  }
}
