/**
 * Bake-Off Engine Graph
 *
 * Composes a controlled two-arm model comparison (A/B bake-off) graph using LangGraph.
 * Runs on a cron schedule to evaluate active experiments, promote winners, and expire
 * stale experiments that have exceeded their observation window.
 *
 * Story APIP-3060: Bake-Off Engine for Model Experiments
 *
 * Dependency note: model_affinity (APIP-3020) and change_telemetry (APIP-3010) tables
 * may not be defined in this worktree. All reads/writes against those tables use raw SQL
 * strings passed to db.query(), following the pattern established in pattern-miner.ts.
 * DB is injected through config.configurable.db.
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { RunnableConfig } from '@langchain/core/runnables'
import { logger } from '@repo/logger'

// ============================================================================
// Named Constants (AC-1)
// ============================================================================

/** Minimum samples required in each arm before significance can be declared */
export const MIN_SAMPLE_PER_ARM = 50

/** Minimum absolute delta in acceptance rate to declare a winner */
export const MIN_ABSOLUTE_DELTA = 0.05

// ============================================================================
// DB interface (plain SQL, matches pattern-miner.ts)
// ============================================================================

type DbClient = {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>
}

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Configuration for the bake-off engine graph.
 */
export const BakeOffConfigSchema = z.object({
  /** Minimum samples required per arm before testing for significance */
  minSamplePerArm: z.number().int().positive().default(MIN_SAMPLE_PER_ARM),
  /** Minimum absolute delta in acceptance rate to declare a winner */
  minAbsoluteDelta: z.number().positive().default(MIN_ABSOLUTE_DELTA),
  /** Whether to run in dry-run mode (no writes) */
  dryRun: z.boolean().default(false),
})

export type BakeOffConfig = z.infer<typeof BakeOffConfigSchema>

/**
 * Per-arm aggregated statistics.
 */
export const ArmStatsSchema = z.object({
  model: z.string().min(1),
  totalSamples: z.number().int().min(0),
  acceptedSamples: z.number().int().min(0),
  acceptanceRate: z.number().min(0).max(1),
})

export type ArmStats = z.infer<typeof ArmStatsSchema>

/**
 * Significance evaluation result for one experiment.
 */
export const SignificanceResultSchema = z.object({
  experimentId: z.string().uuid(),
  significant: z.boolean(),
  winnerModel: z.string().optional(),
  controlStats: ArmStatsSchema,
  variantStats: ArmStatsSchema,
  reason: z.string(),
})

export type SignificanceResult = z.infer<typeof SignificanceResultSchema>

/**
 * Single experiment row returned from DB query.
 */
export const ActiveExperimentSchema = z.object({
  id: z.string().uuid(),
  changeType: z.string(),
  fileType: z.string(),
  controlModel: z.string(),
  challengerModel: z.string(),
  status: z.enum(['active', 'concluded', 'expired']),
  startedAt: z.date(),
  maxWindowDays: z.number().int().positive().nullable().optional(),
  maxWindowRows: z.number().int().positive().nullable().optional(),
})

export type ActiveExperiment = z.infer<typeof ActiveExperimentSchema>

/**
 * Summary of one bake-off run outcome.
 */
export const ExperimentOutcomeSchema = z.object({
  experimentId: z.string().uuid(),
  action: z.enum(['concluded', 'expired', 'no_op']),
  winnerModel: z.string().optional(),
  reason: z.string(),
})

export type ExperimentOutcome = z.infer<typeof ExperimentOutcomeSchema>

// ============================================================================
// LangGraph State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const BakeOffGraphStateAnnotation = Annotation.Root({
  // Run config (injected before START)
  bakeOffConfig: Annotation<BakeOffConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Fetched active experiments
  activeExperiments: Annotation<ActiveExperiment[]>({
    reducer: overwrite,
    default: () => [],
  }),

  // Significance evaluation per experiment
  significanceResults: Annotation<SignificanceResult[]>({
    reducer: overwrite,
    default: () => [],
  }),

  // Outcomes after promotion/expiry writes
  outcomes: Annotation<ExperimentOutcome[]>({
    reducer: overwrite,
    default: () => [],
  }),

  // Completion flag
  runComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Errors accumulated during run (append reducer)
  runErrors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type BakeOffGraphState = typeof BakeOffGraphStateAnnotation.State

// ============================================================================
// Pure helper: significance decision (ST-5, testable without DB)
// ============================================================================

/**
 * Determines whether arm statistics meet the significance threshold.
 *
 * Both arms must have at least MIN_SAMPLE_PER_ARM samples, and the absolute
 * difference in acceptance rates must exceed MIN_ABSOLUTE_DELTA.
 *
 * @param control  - Statistics for the control arm
 * @param variant  - Statistics for the variant arm
 * @param config   - Thresholds (defaults to named constants)
 * @returns Significance assessment with optional winner model
 */
export function isSignificant(
  control: ArmStats,
  variant: ArmStats,
  config: Pick<BakeOffConfig, 'minSamplePerArm' | 'minAbsoluteDelta'> = {
    minSamplePerArm: MIN_SAMPLE_PER_ARM,
    minAbsoluteDelta: MIN_ABSOLUTE_DELTA,
  },
): { significant: boolean; winnerModel?: string; reason: string } {
  const { minSamplePerArm, minAbsoluteDelta } = config

  if (control.totalSamples < minSamplePerArm) {
    return {
      significant: false,
      reason: `Control arm has insufficient samples: ${control.totalSamples} < ${minSamplePerArm}`,
    }
  }

  if (variant.totalSamples < minSamplePerArm) {
    return {
      significant: false,
      reason: `Variant arm has insufficient samples: ${variant.totalSamples} < ${minSamplePerArm}`,
    }
  }

  const delta = Math.abs(variant.acceptanceRate - control.acceptanceRate)
  if (delta < minAbsoluteDelta) {
    return {
      significant: false,
      reason: `Absolute delta ${delta.toFixed(4)} < threshold ${minAbsoluteDelta}`,
    }
  }

  const winnerModel =
    variant.acceptanceRate > control.acceptanceRate ? variant.model : control.model

  return {
    significant: true,
    winnerModel,
    reason: `Variant delta ${delta.toFixed(4)} >= ${minAbsoluteDelta}; winner: ${winnerModel}`,
  }
}

/**
 * Determines whether an experiment has exceeded its day-based observation window.
 */
export function isExpired(
  startedAt: Date,
  maxWindowDays: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!maxWindowDays) return false
  const windowMs = maxWindowDays * 24 * 60 * 60 * 1000
  return now.getTime() - startedAt.getTime() > windowMs
}

/**
 * Determines whether an experiment has exceeded its row-count-based window.
 */
export function isExpiredByRows(
  totalRows: number,
  maxWindowRows: number | null | undefined,
): boolean {
  if (!maxWindowRows) return false
  return totalRows >= maxWindowRows
}

// ============================================================================
// Node: load active experiments (ST-5)
// ============================================================================

/**
 * Queries wint.model_experiments for all active experiments.
 * DB injected via config.configurable.db (plain SQL, no drizzle-orm dependency).
 */
export function createLoadExperimentsNode() {
  return async (
    _state: BakeOffGraphState,
    config?: RunnableConfig,
  ): Promise<Partial<BakeOffGraphState>> => {
    const db = config?.configurable?.db as DbClient | undefined
    if (!db) {
      logger.error('No db provided in config.configurable.db', { node: 'load_experiments' })
      return { runErrors: ['load_experiments: db not injected'] }
    }

    try {
      const result = await db.query<{
        id: string
        changeType: string
        fileType: string
        controlModel: string
        challengerModel: string
        status: string
        startedAt: Date
        maxWindowDays: number | null
        maxWindowRows: number | null
      }>(
        `SELECT
           id,
           change_type       AS "changeType",
           file_type         AS "fileType",
           control_model     AS "controlModel",
           challenger_model  AS "challengerModel",
           status,
           started_at        AS "startedAt",
           max_window_days   AS "maxWindowDays",
           max_window_rows   AS "maxWindowRows"
         FROM wint.model_experiments
         WHERE status = 'active'
         ORDER BY started_at ASC`,
      )

      const parsed = result.rows.map(r => ActiveExperimentSchema.parse(r))
      logger.info('Loaded active experiments', { node: 'load_experiments', count: parsed.length })
      return { activeExperiments: parsed }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('Failed to load active experiments', { node: 'load_experiments', err })
      return { runErrors: [`load_experiments: ${msg}`] }
    }
  }
}

// ============================================================================
// Node: evaluate significance (ST-5)
// ============================================================================

/**
 * For each active experiment, aggregates change_telemetry rows by arm and
 * evaluates whether a significant winner exists.
 */
export function createEvaluateSignificanceNode() {
  return async (
    state: BakeOffGraphState,
    config?: RunnableConfig,
  ): Promise<Partial<BakeOffGraphState>> => {
    const db = config?.configurable?.db as DbClient | undefined
    if (!db) {
      logger.error('No db provided', { node: 'evaluate_significance' })
      return { runErrors: ['evaluate_significance: db not injected'] }
    }

    const bakeOffConfig = state.bakeOffConfig ?? BakeOffConfigSchema.parse({})
    const results: SignificanceResult[] = []

    for (const experiment of state.activeExperiments) {
      try {
        // Aggregate telemetry by arm (change_telemetry may not have a Drizzle ORM
        // table definition in this worktree — use raw SQL following pattern-miner pattern)
        const aggResult = await db.query<{
          model: string
          totalSamples: string
          acceptedSamples: string
        }>(
          `SELECT
             ct.model_used                         AS model,
             COUNT(*)::text                        AS "totalSamples",
             COUNT(*) FILTER (
               WHERE ct.outcome = 'accepted'
             )::text                               AS "acceptedSamples"
           FROM wint.change_telemetry ct
           WHERE ct.experiment_id = $1
             AND ct.model_used IN ($2, $3)
           GROUP BY ct.model_used`,
          [experiment.id, experiment.controlModel, experiment.challengerModel],
        )

        const toArmStats = (model: string): ArmStats => {
          const row = aggResult.rows.find(r => r.model === model)
          if (!row) {
            return ArmStatsSchema.parse({
              model,
              totalSamples: 0,
              acceptedSamples: 0,
              acceptanceRate: 0,
            })
          }
          const totalSamples = parseInt(row.totalSamples, 10)
          const acceptedSamples = parseInt(row.acceptedSamples, 10)
          const acceptanceRate = totalSamples > 0 ? acceptedSamples / totalSamples : 0
          return ArmStatsSchema.parse({ model, totalSamples, acceptedSamples, acceptanceRate })
        }

        const controlStats = toArmStats(experiment.controlModel)
        const challengerStats = toArmStats(experiment.challengerModel)

        const decision = isSignificant(controlStats, challengerStats, bakeOffConfig)

        results.push(
          SignificanceResultSchema.parse({
            experimentId: experiment.id,
            significant: decision.significant,
            winnerModel: decision.winnerModel,
            controlStats,
            variantStats: challengerStats,
            reason: decision.reason,
          }),
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error('Failed to evaluate significance', {
          node: 'evaluate_significance',
          experimentId: experiment.id,
          err,
        })
        results.push(
          SignificanceResultSchema.parse({
            experimentId: experiment.id,
            significant: false,
            controlStats: {
              model: experiment.controlModel,
              totalSamples: 0,
              acceptedSamples: 0,
              acceptanceRate: 0,
            },
            variantStats: {
              model: experiment.challengerModel,
              totalSamples: 0,
              acceptedSamples: 0,
              acceptanceRate: 0,
            },
            reason: `error: ${msg}`,
          }),
        )
      }
    }

    return { significanceResults: results }
  }
}

// ============================================================================
// Node: promote winner or expire (ST-6)
// ============================================================================

/**
 * For each evaluated experiment:
 * - If significant: upsert model_affinity and set status = 'concluded'
 * - If expired window and not significant: set status = 'expired'
 * - Otherwise: no-op
 */
export function createPromoteOrExpireNode() {
  return async (
    state: BakeOffGraphState,
    config?: RunnableConfig,
  ): Promise<Partial<BakeOffGraphState>> => {
    const db = config?.configurable?.db as DbClient | undefined
    if (!db) {
      logger.error('No db provided', { node: 'promote_or_expire' })
      return { runErrors: ['promote_or_expire: db not injected'] }
    }

    const dryRun = state.bakeOffConfig?.dryRun ?? false
    const outcomes: ExperimentOutcome[] = []
    const experimentMap = new Map(state.activeExperiments.map(e => [e.id, e]))

    for (const result of state.significanceResults) {
      const experiment = experimentMap.get(result.experimentId)
      if (!experiment) continue

      const totalRows =
        result.controlStats.totalSamples + result.variantStats.totalSamples
      const expiredByRows = isExpiredByRows(totalRows, experiment.maxWindowRows)
      const expiredByDays = isExpired(experiment.startedAt, experiment.maxWindowDays)
      const expired = expiredByDays || expiredByRows

      if (result.significant && result.winnerModel) {
        // Promote winner: upsert model_affinity, conclude experiment
        try {
          if (!dryRun) {
            await db.query(
              `INSERT INTO wint.model_affinity
                 (change_type, file_type, preferred_model, confidence, updated_at)
               VALUES ($1, $2, $3, 'high', NOW())
               ON CONFLICT (change_type, file_type)
               DO UPDATE SET
                 preferred_model = EXCLUDED.preferred_model,
                 confidence      = EXCLUDED.confidence,
                 updated_at      = NOW()`,
              [experiment.changeType, experiment.fileType, result.winnerModel],
            )

            await db.query(
              `UPDATE wint.model_experiments
               SET
                 status       = 'concluded',
                 winner       = $1,
                 concluded_at = NOW(),
                 updated_at   = NOW()
               WHERE id = $2`,
              [result.winnerModel, result.experimentId],
            )
          }

          logger.info('Experiment concluded with winner', {
            node: 'promote_or_expire',
            experimentId: result.experimentId,
            winnerModel: result.winnerModel,
            controlSuccessRate: result.controlStats.acceptanceRate,
            challengerSuccessRate: result.variantStats.acceptanceRate,
            dryRun,
          })

          outcomes.push(
            ExperimentOutcomeSchema.parse({
              experimentId: result.experimentId,
              action: 'concluded',
              winnerModel: result.winnerModel,
              reason: result.reason,
            }),
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          logger.error('Failed to promote winner', {
            node: 'promote_or_expire',
            experimentId: result.experimentId,
            err,
          })
          outcomes.push(
            ExperimentOutcomeSchema.parse({
              experimentId: result.experimentId,
              action: 'no_op',
              reason: `promotion failed: ${msg}`,
            }),
          )
        }
      } else if (expired) {
        // Expire stale experiment — do NOT modify model_affinity
        const expiredReason = expiredByRows
          ? `max_window_rows ${experiment.maxWindowRows} reached (total rows: ${totalRows})`
          : `max_window_days ${experiment.maxWindowDays} exceeded`
        try {
          if (!dryRun) {
            await db.query(
              `UPDATE wint.model_experiments
               SET
                 status       = 'expired',
                 concluded_at = NOW(),
                 updated_at   = NOW()
               WHERE id = $1`,
              [result.experimentId],
            )
          }

          logger.info('Experiment expired: window exceeded without significance', {
            node: 'promote_or_expire',
            experimentId: result.experimentId,
            maxWindowDays: experiment.maxWindowDays,
            maxWindowRows: experiment.maxWindowRows,
            totalRows,
            dryRun,
          })

          outcomes.push(
            ExperimentOutcomeSchema.parse({
              experimentId: result.experimentId,
              action: 'expired',
              reason: `${expiredReason}; ${result.reason}`,
            }),
          )
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          logger.error('Failed to expire experiment', {
            node: 'promote_or_expire',
            experimentId: result.experimentId,
            err,
          })
          outcomes.push(
            ExperimentOutcomeSchema.parse({
              experimentId: result.experimentId,
              action: 'no_op',
              reason: `expiry failed: ${msg}`,
            }),
          )
        }
      } else {
        // No action needed
        logger.info('No action: experiment not yet significant or expired', {
          node: 'promote_or_expire',
          experimentId: result.experimentId,
          active_experiments: 0,
        })

        outcomes.push(
          ExperimentOutcomeSchema.parse({
            experimentId: result.experimentId,
            action: 'no_op',
            reason: result.reason,
          }),
        )
      }
    }

    return { outcomes, runComplete: true }
  }
}

// ============================================================================
// Graph factory (ST-4)
// ============================================================================

/**
 * Creates and compiles the bake-off engine graph.
 *
 * Graph structure:
 * START -> load_experiments -> evaluate_significance -> promote_or_expire -> END
 *
 * @param config - Optional bake-off configuration overrides
 * @returns Compiled StateGraph
 */
export function createBakeOffGraph(config: Partial<BakeOffConfig> = {}) {
  const fullConfig = BakeOffConfigSchema.parse(config)

  const graph = new StateGraph(BakeOffGraphStateAnnotation)
    .addNode('load_experiments', createLoadExperimentsNode())
    .addNode('evaluate_significance', createEvaluateSignificanceNode())
    .addNode('promote_or_expire', createPromoteOrExpireNode())
    .addEdge(START, 'load_experiments')
    .addEdge('load_experiments', 'evaluate_significance')
    .addEdge('evaluate_significance', 'promote_or_expire')
    .addEdge('promote_or_expire', END)

  const compiled = graph.compile()

  // Attach resolved config as metadata for callers
  ;(compiled as unknown as Record<string, unknown>).__bakeOffConfig = fullConfig

  return compiled
}

// ============================================================================
// Entry point (ST-4)
// ============================================================================

/**
 * Runs the bake-off engine for all active experiments.
 *
 * The `db` dependency must be injected via `config.configurable.db`.
 * This follows the LangGraph pattern of injecting stateful dependencies
 * at graph execution time (same pattern as pattern-miner.ts).
 *
 * @param config - LangGraph RunnableConfig with db injected via configurable
 * @param bakeOffConfig - Optional bake-off threshold overrides
 * @returns Array of outcomes for all evaluated experiments
 */
export async function runBakeOff(
  config: RunnableConfig & { configurable: { db: DbClient } },
  bakeOffConfig: Partial<BakeOffConfig> = {},
): Promise<ExperimentOutcome[]> {
  const graph = createBakeOffGraph(bakeOffConfig)
  const fullConfig = BakeOffConfigSchema.parse(bakeOffConfig)

  const initialState: Partial<BakeOffGraphState> = {
    bakeOffConfig: fullConfig,
  }

  const result = await graph.invoke(initialState, config)

  logger.info('Bake-off engine run complete', {
    outcomes: result.outcomes.length,
    concluded: result.outcomes.filter((o: ExperimentOutcome) => o.action === 'concluded').length,
    expired: result.outcomes.filter((o: ExperimentOutcome) => o.action === 'expired').length,
    noOp: result.outcomes.filter((o: ExperimentOutcome) => o.action === 'no_op').length,
    errors: result.runErrors,
  })

  return result.outcomes
}
