/**
 * Log Revision Node — Plan Revalidation Graph
 *
 * Writes a revision record to workflow.plan_revision_history after
 * auto-update-plan succeeds. Uses MAX(revision_number)+1 pattern via
 * injectable RevisionLoggerFn adapter.
 *
 * Adapter contract (RevisionLoggerFn):
 *   - receives: planSlug, planId (UUID or null), change_reason, changedBy, summary
 *   - writes ONE row to workflow.plan_revision_history
 *   - revision_number is managed by the adapter (MAX+1 query)
 *   - if planId is null, gracefully skips with a warning
 *
 * APRS-3020: AC-6
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PlanRevalidationState } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Adapter Types & Schemas
// ============================================================================

/**
 * Input to the revision logger adapter.
 */
export const RevisionLogEntrySchema = z.object({
  planSlug: z.string().min(1),
  /** UUID of the plan in workflow.plans — null if not resolved */
  planId: z.string().uuid().nullable(),
  /** Fixed string for automated minor drift updates */
  changeReason: z.literal('minor_drift_auto_update'),
  /** Identifies this automated process */
  changedBy: z.string().min(1),
  /** Short description of what changed */
  summary: z.string().min(1),
})

export type RevisionLogEntry = z.infer<typeof RevisionLogEntrySchema>

/**
 * Adapter that writes a revision entry to workflow.plan_revision_history.
 * Default: no-op (no DB available in tests).
 */
export type RevisionLoggerFn = (entry: RevisionLogEntry) => Promise<void>

const defaultRevisionLogger: RevisionLoggerFn = async () => {
  // no-op default
}

/**
 * Adapter that resolves a planSlug to a plan UUID.
 * Returns null if the plan cannot be resolved (graceful skip).
 */
export type PlanIdResolverFn = (planSlug: string) => Promise<string | null>

const defaultPlanIdResolver: PlanIdResolverFn = async () => null

// ============================================================================
// Config Schema
// ============================================================================

export const LogRevisionNodeConfigSchema = z.object({
  /**
   * Identifier written to plan_revision_history.changedBy.
   * Identifies this as an automated revision.
   */
  changedBy: z.string().min(1).default('plan-revalidation-graph'),
})

export type LogRevisionNodeConfig = z.infer<typeof LogRevisionNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Builds a revision log entry from the current state.
 *
 * @param planSlug - Plan being revised
 * @param planId - Resolved plan UUID (or null)
 * @param changedBy - Identifier for the automated agent
 * @param driftSummary - Summary of what drift was detected
 * @returns Validated RevisionLogEntry
 */
export function buildRevisionEntry(
  planSlug: string,
  planId: string | null,
  changedBy: string,
  driftSummary: string,
): RevisionLogEntry {
  return RevisionLogEntrySchema.parse({
    planSlug,
    planId,
    changeReason: 'minor_drift_auto_update',
    changedBy,
    summary: driftSummary,
  })
}

/**
 * Builds a human-readable drift summary for the revision record.
 *
 * @param state - Current revalidation state
 * @returns Summary string
 */
export function buildDriftSummaryForRevision(state: PlanRevalidationState): string {
  const blockingCount = state.driftFindings.filter(f => f.severity === 'blocking').length
  const warningCount = state.driftFindings.filter(f => f.severity === 'warning').length
  const categories = [...new Set(state.driftFindings.map(f => f.category))]

  const parts: string[] = []
  if (blockingCount > 0)
    parts.push(`${blockingCount} blocking finding${blockingCount !== 1 ? 's' : ''}`)
  if (warningCount > 0) parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`)

  const categorySummary = categories.length > 0 ? ` in: ${categories.join(', ')}` : ''

  return `Auto-updated plan after minor drift detection: ${parts.join(', ')}${categorySummary}`
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the log-revision node for the Plan Revalidation Graph.
 *
 * Only runs after auto-update-plan succeeds (graph wiring ensures this).
 * Resolves planSlug → UUID via PlanIdResolverFn, then writes revision record.
 * If planId cannot be resolved, emits a warning and skips the write gracefully.
 *
 * @param config - Config with changedBy and optional adapter overrides
 * @returns LangGraph-compatible node function
 */
export function createLogRevisionNode(
  config: Partial<LogRevisionNodeConfig> & {
    revisionLogger?: RevisionLoggerFn
    planIdResolver?: PlanIdResolverFn
  } = {},
) {
  const fullConfig = LogRevisionNodeConfigSchema.parse(config)
  const revisionLogger: RevisionLoggerFn = config.revisionLogger ?? defaultRevisionLogger
  const planIdResolver: PlanIdResolverFn = config.planIdResolver ?? defaultPlanIdResolver

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('log-revision: starting', {
      planSlug: state.planSlug,
      verdict: state.verdict,
    })

    try {
      // Resolve plan UUID
      const planId = await planIdResolver(state.planSlug)

      if (planId === null) {
        const warning = `log-revision: could not resolve plan UUID for slug=${state.planSlug}, skipping revision log`
        logger.warn('log-revision: plan UUID not resolved, skipping', {
          planSlug: state.planSlug,
        })
        return {
          warnings: [warning],
        }
      }

      // Build revision summary
      const driftSummary = buildDriftSummaryForRevision(state)

      // Build and validate the revision entry
      const entry = buildRevisionEntry(state.planSlug, planId, fullConfig.changedBy, driftSummary)

      await revisionLogger(entry)

      logger.info('log-revision: revision logged successfully', {
        planSlug: state.planSlug,
        planId,
        changeReason: entry.changeReason,
        changedBy: entry.changedBy,
      })

      return {}
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('log-revision: failed to log revision', {
        planSlug: state.planSlug,
        error: msg,
      })
      return {
        warnings: [`log-revision: revision log failed — ${msg}`],
      }
    }
  }
}
