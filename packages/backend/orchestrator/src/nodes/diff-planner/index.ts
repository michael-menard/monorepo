/**
 * Diff Planner Node
 *
 * LangGraph node that reads model affinity profiles from wint.model_affinity
 * and injects affinity-aware summaries into the decomposition prompt.
 * Pre-assigns escalation models for change types where the current model
 * has demonstrated weakness.
 *
 * Fallback behavior:
 *   - Cold-start (no affinity data): proceeds without enrichment
 *   - DB error: logs warning, proceeds without enrichment
 *   - Zod parse failure: logs warning, proceeds without enrichment
 *
 * Node is read-only with respect to wint.model_affinity (never writes).
 *
 * APIP-3030: Learning-Aware Diff Planner
 *
 * @see nodes/elaboration/delta-detect.ts for createToolNode pattern
 */

import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import { updateState } from '../../runner/state-helpers.js'
import type { GraphState } from '../../state/index.js'
import {
  DiffPlannerOutputSchema,
  createFallbackOutput,
} from '../../artifacts/diff-planner-output.js'
import type { PlaceholderChangeSpec } from '../../artifacts/diff-planner-output.js'
import { queryAffinityProfilesByModel } from './affinity-query.js'
import type { DbClient } from './affinity-query.js'
import { assembleAffinityContext } from './prompt-assembly.js'
import { DiffPlannerConfigSchema } from './__types__/index.js'
import type { DiffPlannerConfig } from './__types__/index.js'

// ============================================================================
// Extended Graph State
// ============================================================================

/**
 * Extended graph state with diff planner inputs and outputs.
 */
export interface GraphStateWithDiffPlanner extends GraphState {
  /** Model ID to use for affinity profile lookup */
  diffPlannerModelId?: string | null

  /**
   * Change specs to enrich with affinity data.
   * TODO (APIP-1020): Replace with strongly-typed ChangeSpec[] from APIP-1020.
   */
  diffPlannerChangeSpecs?: PlaceholderChangeSpec[] | null

  /** Optional DB client injection (for testing) */
  diffPlannerDbClient?: DbClient | null

  /** The produced DiffPlannerOutput */
  diffPlannerOutput?: import('../../artifacts/diff-planner-output.js').DiffPlannerOutput | null

  /** Whether diff planning succeeded */
  diffPlannerSuccess?: boolean
}

// ============================================================================
// Default DB Client
// ============================================================================

/**
 * Dynamically loads the DB pool from the environment.
 * At runtime, the pool is available via pg Pool from the Lambda environment.
 */
async function getDefaultDbClient(): Promise<DbClient | null> {
  try {
    const { Pool } = await import('pg')
    const pool = new Pool()
    return {
      query: (sql: string, params?: unknown[]) => pool.query(sql, params as unknown[]),
    }
  } catch {
    return null
  }
}

// ============================================================================
// Core Implementation
// ============================================================================

/**
 * Core diff planner implementation, shared between default and configured nodes.
 *
 * @param state - Graph state with diff planner inputs
 * @param config - Diff planner configuration
 * @returns Partial state update with diff planner output
 */
async function runDiffPlanner(
  state: GraphStateWithDiffPlanner,
  config: Partial<DiffPlannerConfig>,
): Promise<Partial<GraphStateWithDiffPlanner>> {
  const storyId = state.storyId ?? 'unknown'
  const modelId = state.diffPlannerModelId ?? null
  const changeSpecs = state.diffPlannerChangeSpecs ?? []

  // If no model ID, produce fallback output (no affinity to query)
  if (!modelId) {
    logger.warn('diff-planner', {
      event: 'no_model_id',
      story_id: storyId,
    })

    const output = createFallbackOutput(storyId, changeSpecs, 'No model ID provided')
    return updateState({
      diffPlannerOutput: output,
      diffPlannerSuccess: true,
    } as Partial<GraphStateWithDiffPlanner>)
  }

  // Resolve DB client
  const dbClient = state.diffPlannerDbClient ?? (await getDefaultDbClient())

  if (!dbClient) {
    logger.warn('diff-planner', {
      event: 'no_db_client',
      story_id: storyId,
      model_id: modelId,
    })

    const output = createFallbackOutput(storyId, changeSpecs, 'DB client unavailable')
    return updateState({
      diffPlannerOutput: output,
      diffPlannerSuccess: true,
    } as Partial<GraphStateWithDiffPlanner>)
  }

  // Query affinity profiles — returns [] on any error (never throws)
  const profiles = await queryAffinityProfilesByModel(dbClient, modelId)

  logger.info('diff-planner', {
    event: 'affinity_profiles_loaded',
    story_id: storyId,
    model_id: modelId,
    profile_count: profiles.length,
  })

  // Assemble affinity context
  const { affinityPromptFragment, enrichedSpecs, profileMetadata } = assembleAffinityContext(
    modelId,
    profiles,
    changeSpecs,
    config,
  )

  // Build and validate output
  const rawOutput = {
    schema: 1 as const,
    story_id: storyId,
    produced_at: new Date().toISOString(),
    change_specs: enrichedSpecs,
    affinity_prompt_fragment: affinityPromptFragment,
    profile_metadata: profileMetadata,
    success: true,
  }

  const output = DiffPlannerOutputSchema.parse(rawOutput)

  logger.info('diff-planner', {
    event: 'complete',
    story_id: storyId,
    model_id: modelId,
    profile_used: profileMetadata.profile_used,
    weak_injected: profileMetadata.weak_patterns_injected,
    strong_injected: profileMetadata.strong_patterns_injected,
    escalation_count: profileMetadata.escalation_count,
  })

  return updateState({
    diffPlannerOutput: output,
    diffPlannerSuccess: true,
  } as Partial<GraphStateWithDiffPlanner>)
}

// ============================================================================
// Node Export
// ============================================================================

/**
 * Default Diff Planner node with tool preset configuration.
 *
 * Uses default configuration values from DiffPlannerConfigSchema.
 * Falls back gracefully on cold-start or any DB/parse errors.
 *
 * @param state - Current graph state
 * @returns Partial state update with diff planner output
 */
export const diffPlannerNode = createToolNode(
  'diff_planner',
  async (state: GraphState): Promise<Partial<GraphStateWithDiffPlanner>> => {
    const stateWithPlanner = state as GraphStateWithDiffPlanner
    const config = DiffPlannerConfigSchema.parse({})
    return runDiffPlanner(stateWithPlanner, config)
  },
)

/**
 * Creates a Diff Planner node with custom configuration.
 *
 * @param configOverrides - Partial configuration to override defaults
 * @returns Configured node function
 */
export function createDiffPlannerNode(configOverrides: Partial<DiffPlannerConfig> = {}) {
  const config = DiffPlannerConfigSchema.parse(configOverrides)

  return createToolNode(
    'diff_planner',
    async (state: GraphState): Promise<Partial<GraphStateWithDiffPlanner>> => {
      const stateWithPlanner = state as GraphStateWithDiffPlanner
      return runDiffPlanner(stateWithPlanner, config)
    },
  )
}
