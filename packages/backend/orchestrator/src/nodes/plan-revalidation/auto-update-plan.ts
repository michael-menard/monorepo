/**
 * Auto Update Plan Node — Plan Revalidation Graph
 *
 * Writes updated summary and tags to workflow.plans via the kb_update_plan
 * adapter when the verdict is 'needs_revision'.
 *
 * In dry_run mode, populates proposed updates in state.warnings without
 * actually calling the adapter.
 *
 * Adapter contract (PlanUpdaterFn):
 *   - receives: planSlug, summary (string), tags (string[])
 *   - writes ONLY summary and tags to workflow.plans
 *   - no other plan fields are touched
 *
 * APRS-3020: AC-4, AC-5
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PlanRevalidationState, DriftFinding } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Adapter Types & Schemas
// ============================================================================

/**
 * Input to the plan updater adapter.
 * Only summary and tags are written — no other plan fields.
 */
export const PlanUpdatePayloadSchema = z.object({
  planSlug: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()),
})

export type PlanUpdatePayload = z.infer<typeof PlanUpdatePayloadSchema>

/**
 * Adapter that writes summary and tags to workflow.plans via kb_update_plan.
 * Default: no-op (no DB available in tests).
 */
export type PlanUpdaterFn = (payload: PlanUpdatePayload) => Promise<void>

const defaultPlanUpdater: PlanUpdaterFn = async () => {
  // no-op default
}

// ============================================================================
// Config Schema
// ============================================================================

export const AutoUpdatePlanNodeConfigSchema = z.object({
  /** When true, populate proposed updates in warnings without writing to DB */
  dry_run: z.boolean().default(false),
})

export type AutoUpdatePlanNodeConfig = z.infer<typeof AutoUpdatePlanNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Builds a revised summary string from drift findings.
 *
 * Incorporates finding summaries into a concise plan summary describing
 * the identified drift areas that need revision.
 *
 * @param planSlug - Plan being revalidated
 * @param findings - Drift findings that triggered needs_revision
 * @returns Revised summary string
 */
export function buildRevisedSummary(planSlug: string, findings: DriftFinding[]): string {
  const blockingFindings = findings.filter(
    f => f.severity === 'blocking' || f.severity === 'warning',
  )
  if (blockingFindings.length === 0) {
    return `Plan ${planSlug} requires minor revision based on revalidation findings.`
  }

  const categories = [...new Set(blockingFindings.map(f => f.category))]
  const categorySummary = categories.join(', ')

  return `Plan ${planSlug} requires revision: ${categorySummary} issues detected (${blockingFindings.length} finding${blockingFindings.length !== 1 ? 's' : ''}).`
}

/**
 * Derives updated tags from drift findings.
 *
 * Adds drift-related tags based on finding categories.
 *
 * @param existingTags - Current plan tags (extracted from rawPlan)
 * @param findings - Drift findings that triggered needs_revision
 * @returns Updated tag array
 */
export function buildRevisedTags(existingTags: string[], findings: DriftFinding[]): string[] {
  const driftTags = new Set<string>(existingTags)

  // Add 'needs-revision' tag
  driftTags.add('needs-revision')

  // Add category-specific tags for blocking/warning findings
  for (const finding of findings) {
    if (finding.severity === 'blocking' || finding.severity === 'warning') {
      const tag = `drift:${finding.category.replace(/_/g, '-')}`
      driftTags.add(tag)
    }
  }

  return Array.from(driftTags)
}

/**
 * Extracts existing tags from raw plan content.
 *
 * @param rawPlan - Raw plan content object
 * @returns Array of existing tag strings
 */
export function extractExistingTags(rawPlan: Record<string, unknown> | null): string[] {
  if (!rawPlan) return []
  if (Array.isArray(rawPlan['tags'])) {
    return (rawPlan['tags'] as unknown[]).map(t => String(t))
  }
  return []
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the auto-update-plan node for the Plan Revalidation Graph.
 *
 * Only acts when state.verdict === 'needs_revision'.
 * Writes summary and tags to the plan via the injected PlanUpdaterFn adapter.
 *
 * @param config - Config with dry_run flag and optional planUpdater adapter
 * @returns LangGraph-compatible node function
 */
export function createAutoUpdatePlanNode(
  config: Partial<AutoUpdatePlanNodeConfig> & {
    planUpdater?: PlanUpdaterFn
  } = {},
) {
  const fullConfig = AutoUpdatePlanNodeConfigSchema.parse(config)
  const planUpdater: PlanUpdaterFn = config.planUpdater ?? defaultPlanUpdater

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('auto-update-plan: starting', {
      planSlug: state.planSlug,
      verdict: state.verdict,
      dry_run: fullConfig.dry_run,
    })

    // Defensive guard: only act on needs_revision verdict
    if (state.verdict !== 'needs_revision') {
      logger.info('auto-update-plan: verdict is not needs_revision, skipping', {
        planSlug: state.planSlug,
        verdict: state.verdict,
      })
      return {
        warnings: [`auto-update-plan: skipped (verdict=${state.verdict}, expected needs_revision)`],
      }
    }

    try {
      const existingTags = extractExistingTags(state.rawPlan)
      const revisedSummary = buildRevisedSummary(state.planSlug, state.driftFindings)
      const revisedTags = buildRevisedTags(existingTags, state.driftFindings)

      const payload: PlanUpdatePayload = {
        planSlug: state.planSlug,
        summary: revisedSummary,
        tags: revisedTags,
      }

      if (fullConfig.dry_run) {
        const dryRunMessage = `auto-update-plan [DRY RUN]: would update plan ${state.planSlug} — summary="${revisedSummary}", tags=${JSON.stringify(revisedTags)}`
        logger.info('auto-update-plan: dry run mode, skipping DB write', {
          planSlug: state.planSlug,
          proposedSummary: revisedSummary,
          proposedTags: revisedTags,
        })
        return {
          warnings: [dryRunMessage],
        }
      }

      // Validate payload before sending
      PlanUpdatePayloadSchema.parse(payload)

      await planUpdater(payload)

      logger.info('auto-update-plan: plan updated successfully', {
        planSlug: state.planSlug,
        summary: revisedSummary,
        tags: revisedTags,
      })

      return {}
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('auto-update-plan: failed to update plan', {
        planSlug: state.planSlug,
        error: msg,
      })
      return {
        warnings: [`auto-update-plan: plan update failed — ${msg}`],
      }
    }
  }
}
