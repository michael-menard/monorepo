/**
 * Plan Revalidation Graph
 *
 * Composes all 8 plan revalidation nodes into a LangGraph StateGraph:
 *   load_context, check_already_implemented, check_approach_valid,
 *   check_dependencies, check_scope_drift (from APRS-3010) +
 *   classify_drift, auto_update_plan, log_revision (from APRS-3020)
 *
 * Graph structure (AC-7, AC-8):
 *   START → load_context → check_already_implemented → check_approach_valid
 *         → check_dependencies → check_scope_drift → classify_drift
 *         → (afterClassifyDrift):
 *             proceed    → END
 *             needs_revision → auto_update_plan → log_revision → END
 *             already_done   → END
 *             blocked        → END
 *             error          → END
 *
 * APRS-3020: AC-7, AC-8
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import {
  PlanRevalidationStateAnnotation,
  type PlanRevalidationState,
} from '../state/plan-revalidation-state.js'
import { createLoadContextNode } from '../nodes/plan-revalidation/load-context.js'
import type { KBPlanAdapterFn, KBStoryAdapterFn } from '../nodes/plan-revalidation/load-context.js'
import { createCheckAlreadyImplementedNode } from '../nodes/plan-revalidation/check-already-implemented.js'
import type { ArtifactLookupFn } from '../nodes/plan-revalidation/check-already-implemented.js'
import { createCheckApproachValidNode } from '../nodes/plan-revalidation/check-approach-valid.js'
import type { LlmApproachValidatorFn } from '../nodes/plan-revalidation/check-approach-valid.js'
import { createCheckDependenciesNode } from '../nodes/plan-revalidation/check-dependencies.js'
import type { DependencyGraphQueryFn } from '../nodes/plan-revalidation/check-dependencies.js'
import { createCheckScopeDriftNode } from '../nodes/plan-revalidation/check-scope-drift.js'
import type { LlmScopeDriftDetectorFn } from '../nodes/plan-revalidation/check-scope-drift.js'
import { createClassifyDriftNode } from '../nodes/plan-revalidation/classify-drift.js'
import { createAutoUpdatePlanNode } from '../nodes/plan-revalidation/auto-update-plan.js'
import type { PlanUpdaterFn } from '../nodes/plan-revalidation/auto-update-plan.js'
import { createLogRevisionNode } from '../nodes/plan-revalidation/log-revision.js'
import type { RevisionLoggerFn, PlanIdResolverFn } from '../nodes/plan-revalidation/log-revision.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PlanRevalidationGraphConfigSchema = z.object({
  /** Injectable KB plan adapter for load_context */
  kbPlanAdapter: z.function().args(z.string()).returns(z.promise(z.unknown())).optional(),
  /** Injectable KB story adapter for load_context */
  kbStoryAdapter: z.function().args(z.string()).returns(z.promise(z.unknown())).optional(),
  /** Injectable artifact lookup adapter for check_already_implemented */
  artifactLookup: z.function().args(z.string()).returns(z.promise(z.unknown())).optional(),
  /** Injectable approach validator adapter for check_approach_valid */
  llmApproachValidator: z.function().args(z.unknown()).returns(z.promise(z.unknown())).optional(),
  /** Injectable dependency checker adapter for check_dependencies */
  dependencyGraphQuery: z.function().args(z.unknown()).returns(z.promise(z.unknown())).optional(),
  /** Injectable LLM adapter for check_scope_drift (optional) */
  llmScopeDriftDetector: z.function().args(z.unknown()).returns(z.promise(z.unknown())).optional(),
  /** Injectable plan updater adapter for auto_update_plan */
  planUpdater: z.function().args(z.unknown()).returns(z.promise(z.void())).optional(),
  /** Injectable revision logger adapter for log_revision */
  revisionLogger: z.function().args(z.unknown()).returns(z.promise(z.void())).optional(),
  /** Injectable plan ID resolver for log_revision */
  planIdResolver: z.function().args(z.string()).returns(z.promise(z.unknown())).optional(),
  /** Dry run mode: auto_update_plan proposes changes without writing */
  dry_run: z.boolean().default(false),
  /** changedBy identifier for plan_revision_history */
  changedBy: z.string().min(1).default('plan-revalidation-graph'),
})

export type PlanRevalidationGraphConfig = z.infer<typeof PlanRevalidationGraphConfigSchema>

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after classify_drift based on the verdict:
 *   - needs_revision → auto_update_plan (then log_revision → END)
 *   - proceed / already_done / blocked / error → END
 */
export function afterClassifyDrift(state: PlanRevalidationState): 'auto_update_plan' | '__end__' {
  if (state.verdict === 'needs_revision') {
    return 'auto_update_plan'
  }
  // proceed, already_done, blocked, error, null → END
  return '__end__'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the plan-revalidation graph.
 *
 * Graph structure:
 *   START → load_context → check_already_implemented → check_approach_valid
 *         → check_dependencies → check_scope_drift → classify_drift
 *         → (afterClassifyDrift):
 *             needs_revision → auto_update_plan → log_revision → END
 *             other          → END
 *
 * @param config - Optional configuration with injectable adapters
 * @returns Compiled StateGraph
 */
export function createPlanRevalidationGraph(
  config: {
    kbPlanAdapter?: KBPlanAdapterFn
    kbStoryAdapter?: KBStoryAdapterFn
    artifactLookup?: ArtifactLookupFn
    llmApproachValidator?: LlmApproachValidatorFn
    dependencyGraphQuery?: DependencyGraphQueryFn
    llmScopeDriftDetector?: LlmScopeDriftDetectorFn
    planUpdater?: PlanUpdaterFn
    revisionLogger?: RevisionLoggerFn
    planIdResolver?: PlanIdResolverFn
    dry_run?: boolean
    changedBy?: string
  } = {},
) {
  const graph = new StateGraph(PlanRevalidationStateAnnotation)
    .addNode(
      'load_context',
      createLoadContextNode({
        kbPlanAdapter: config.kbPlanAdapter,
        kbStoryAdapter: config.kbStoryAdapter,
      }),
    )
    .addNode(
      'check_already_implemented',
      createCheckAlreadyImplementedNode({ artifactLookup: config.artifactLookup }),
    )
    .addNode(
      'check_approach_valid',
      createCheckApproachValidNode({ llmAdapter: config.llmApproachValidator }),
    )
    .addNode(
      'check_dependencies',
      createCheckDependenciesNode({ dependencyGraphQuery: config.dependencyGraphQuery }),
    )
    .addNode(
      'check_scope_drift',
      createCheckScopeDriftNode({ llmAdapter: config.llmScopeDriftDetector }),
    )
    .addNode('classify_drift', createClassifyDriftNode())
    .addNode(
      'auto_update_plan',
      createAutoUpdatePlanNode({
        planUpdater: config.planUpdater,
        dry_run: config.dry_run ?? false,
      }),
    )
    .addNode(
      'log_revision',
      createLogRevisionNode({
        revisionLogger: config.revisionLogger,
        planIdResolver: config.planIdResolver,
        changedBy: config.changedBy ?? 'plan-revalidation-graph',
      }),
    )

    .addEdge(START, 'load_context')
    .addEdge('load_context', 'check_already_implemented')
    .addEdge('check_already_implemented', 'check_approach_valid')
    .addEdge('check_approach_valid', 'check_dependencies')
    .addEdge('check_dependencies', 'check_scope_drift')
    .addEdge('check_scope_drift', 'classify_drift')
    .addConditionalEdges('classify_drift', afterClassifyDrift, {
      auto_update_plan: 'auto_update_plan',
      __end__: END,
    })
    .addEdge('auto_update_plan', 'log_revision')
    .addEdge('log_revision', END)

  return graph.compile()
}
