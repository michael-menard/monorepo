/**
 * Check Dependencies Node — Plan Revalidation Graph
 *
 * Queries the dependency graph to check whether all plan dependencies are
 * satisfied. Emits blocking findings for missing deps and warning findings
 * for blocked deps.
 *
 * APRS-3010: Plan Revalidation Graph - Context Load and Drift Detection Nodes
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PlanRevalidationState, DriftFinding } from '../../state/plan-revalidation-state.js'
import { DriftFindingSchema } from '../../state/plan-revalidation-state.js'

// ============================================================================
// Adapter Types & Schemas
// ============================================================================

/**
 * Result of querying the dependency graph for a plan.
 */
export const DependencyQueryResultSchema = z.object({
  missingDeps: z.array(z.string()),
  blockedDeps: z.array(z.string()),
  fulfilledDeps: z.array(z.string()),
})

export type DependencyQueryResult = z.infer<typeof DependencyQueryResultSchema>

/**
 * Adapter that queries the dependency graph.
 * Default: returns all-empty arrays (no dep graph available).
 */
export type DependencyGraphQueryFn = (planSlug: string) => Promise<DependencyQueryResult>

const defaultDependencyQuery: DependencyGraphQueryFn = async () => ({
  missingDeps: [],
  blockedDeps: [],
  fulfilledDeps: [],
})

// ============================================================================
// Config Schema
// ============================================================================

export const CheckDependenciesNodeConfigSchema = z.object({
  /** Whether to treat blocked deps as blocking findings (vs warnings) */
  blockedDepsAreBlocking: z.boolean().default(false),
})

export type CheckDependenciesNodeConfig = z.infer<typeof CheckDependenciesNodeConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Queries the dependency graph for the given plan.
 *
 * @param planSlug - Plan to query deps for
 * @param adapter - Dependency graph query adapter
 * @returns DependencyQueryResult
 */
export async function queryDependencies(
  planSlug: string,
  adapter: DependencyGraphQueryFn = defaultDependencyQuery,
): Promise<DependencyQueryResult> {
  try {
    const result = await adapter(planSlug)
    return DependencyQueryResultSchema.parse(result)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.warn('check-dependencies: dependency query failed', { planSlug, error: msg })
    return defaultDependencyQuery(planSlug)
  }
}

/**
 * Converts dependency query results into drift findings.
 * - Missing deps → 'blocking' severity
 * - Blocked deps  → 'warning' severity
 *
 * @param result - Dependency query result
 * @param blockedDepsAreBlocking - Whether blocked deps should be 'blocking' (default false)
 * @returns Array of DriftFindings
 */
export function buildDependencyFindings(
  result: DependencyQueryResult,
  blockedDepsAreBlocking = false,
): DriftFinding[] {
  const findings: DriftFinding[] = []

  for (const dep of result.missingDeps) {
    findings.push(
      DriftFindingSchema.parse({
        nodeId: 'check-dependencies',
        category: 'dependency_missing',
        severity: 'blocking',
        summary: `Missing dependency: ${dep}`,
        detail: `Dependency '${dep}' is required but not found in the dependency graph`,
        confidence: 1.0,
      }),
    )
  }

  for (const dep of result.blockedDeps) {
    findings.push(
      DriftFindingSchema.parse({
        nodeId: 'check-dependencies',
        category: 'dependency_missing',
        severity: blockedDepsAreBlocking ? 'blocking' : 'warning',
        summary: `Blocked dependency: ${dep}`,
        detail: `Dependency '${dep}' exists but is currently blocked`,
        confidence: 1.0,
      }),
    )
  }

  return findings
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the check-dependencies node for the Plan Revalidation Graph.
 *
 * @param config - Optional config with adapter and threshold overrides
 * @returns LangGraph-compatible node function
 */
export function createCheckDependenciesNode(
  config: Partial<CheckDependenciesNodeConfig> & {
    dependencyGraphQuery?: DependencyGraphQueryFn
  } = {},
) {
  const fullConfig = CheckDependenciesNodeConfigSchema.parse(config)
  const dependencyGraphQuery: DependencyGraphQueryFn =
    config.dependencyGraphQuery ?? defaultDependencyQuery

  return async (state: PlanRevalidationState): Promise<Partial<PlanRevalidationState>> => {
    logger.info('check-dependencies: starting', { planSlug: state.planSlug })

    try {
      const queryResult = await queryDependencies(state.planSlug, dependencyGraphQuery)
      const findings = buildDependencyFindings(queryResult, fullConfig.blockedDepsAreBlocking)

      logger.info('check-dependencies: complete', {
        planSlug: state.planSlug,
        missingCount: queryResult.missingDeps.length,
        blockedCount: queryResult.blockedDeps.length,
        fulfilledCount: queryResult.fulfilledDeps.length,
        findingCount: findings.length,
      })

      return {
        driftFindings: findings,
        revalidationPhase: 'check_scope_drift',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('check-dependencies: unexpected error', { planSlug: state.planSlug, error: msg })
      return {
        revalidationPhase: 'error',
        errors: [`check-dependencies: ${msg}`],
      }
    }
  }
}
