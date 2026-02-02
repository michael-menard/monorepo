/**
 * Load From DB Node
 *
 * Node that loads story and workflow state from PostgreSQL database.
 * Called at the start of workflow execution to resume from persisted state.
 *
 * Dependencies are injected to keep orchestrator loosely coupled.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/graph-state.js'
import type { StoryState } from '../../state/enums/story-state.js'
import type { StoryRepository } from '../../db/story-repository.js'
import type { WorkflowRepository } from '../../db/workflow-repository.js'
import type { StoryArtifact } from '../../artifacts/story.js'
import type { Plan } from '../../artifacts/plan.js'
import type { Evidence } from '../../artifacts/evidence.js'
import {
  createYamlArtifactBridge,
  inferFeatureFromStoryId,
  type ClaudeStoryYaml,
  type ClaudePlanYaml,
} from '../../persistence/index.js'

// ============================================================================
// Configuration Schema
// ============================================================================

export const LoadFromDbConfigSchema = z.object({
  /** Story repository instance */
  storyRepo: z.unknown().optional(),
  /** Workflow repository instance */
  workflowRepo: z.unknown().optional(),
  /** Whether to load elaboration */
  loadElaboration: z.boolean().default(true),
  /** Whether to load plan */
  loadPlan: z.boolean().default(true),
  /** Whether to load proof/evidence */
  loadProof: z.boolean().default(true),
  /** Enable YAML fallback if DB load fails */
  enableYamlFallback: z.boolean().default(false),
  /** Workspace root for YAML paths (required if enableYamlFallback is true) */
  workspaceRoot: z.string().optional(),
  /** Feature directory name for YAML paths */
  feature: z.string().optional(),
  /** Story stage for YAML paths */
  stage: z.string().optional(),
})

export type LoadFromDbConfig = z.infer<typeof LoadFromDbConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const LoadFromDbResultSchema = z.object({
  loaded: z.boolean(),
  storyId: z.string(),
  story: z.unknown().nullable(),
  storyState: z.string().nullable(),
  blockedBy: z.string().nullable(),
  elaboration: z.unknown().nullable(),
  plan: z.unknown().nullable(),
  proof: z.unknown().nullable(),
  error: z.string().nullable(),
  /** Source of the data: 'db', 'yaml', or 'none' */
  source: z.enum(['db', 'yaml', 'none']).optional(),
})

export type LoadFromDbResult = z.infer<typeof LoadFromDbResultSchema>

// ============================================================================
// Extended Graph State
// ============================================================================

export interface GraphStateWithDbLoad extends GraphState {
  /** Loaded story artifact */
  loadedStory?: StoryArtifact | null
  /** Whether DB load was successful */
  dbLoadSuccess?: boolean
  /** Error from DB load */
  dbLoadError?: string | null
  /** Loaded elaboration content */
  loadedElaboration?: unknown | null
  /** Loaded plan content */
  loadedPlan?: Plan | null
  /** Loaded proof/evidence content */
  loadedProof?: Evidence | null
}

// ============================================================================
// Node Implementation
// ============================================================================

/**
 * Load story from YAML files as fallback
 */
async function loadFromYaml(
  storyId: string,
  config: LoadFromDbConfig,
): Promise<LoadFromDbResult> {
  if (!config.workspaceRoot) {
    return {
      loaded: false,
      storyId,
      story: null,
      storyState: null,
      blockedBy: null,
      elaboration: null,
      plan: null,
      proof: null,
      error: 'workspaceRoot required for YAML fallback',
      source: 'none',
    }
  }

  const bridge = createYamlArtifactBridge({
    workspaceRoot: config.workspaceRoot,
  })

  const feature = config.feature || inferFeatureFromStoryId(storyId)
  if (!feature) {
    return {
      loaded: false,
      storyId,
      story: null,
      storyState: null,
      blockedBy: null,
      elaboration: null,
      plan: null,
      proof: null,
      error: `Cannot infer feature from story ID: ${storyId}`,
      source: 'none',
    }
  }

  const result = await bridge.loadFromYaml(storyId, feature, config.stage)

  if (!result.loaded) {
    return {
      loaded: false,
      storyId,
      story: null,
      storyState: null,
      blockedBy: null,
      elaboration: null,
      plan: null,
      proof: null,
      error: result.error,
      source: 'none',
    }
  }

  logger.info('Loaded state from YAML files', {
    storyId,
    storyState: result.story?.state,
    blockedBy: result.story?.blocked_by,
    hasElaboration: result.elaboration !== null,
    hasPlan: result.plan !== null,
    hasVerification: result.verification !== null,
  })

  return {
    loaded: true,
    storyId,
    story: result.story,
    storyState: result.story?.state ?? null,
    blockedBy: result.story?.blocked_by ?? null,
    elaboration: config.loadElaboration ? result.elaboration : null,
    plan: config.loadPlan ? result.plan : null,
    proof: config.loadProof ? result.verification : null,
    error: null,
    source: 'yaml',
  }
}

/**
 * Load state from database for a story
 */
export async function loadFromDb(
  storyId: string,
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
  config: Partial<LoadFromDbConfig> = {},
): Promise<LoadFromDbResult> {
  const fullConfig = LoadFromDbConfigSchema.parse(config)

  try {
    // If no repositories provided, try YAML fallback if enabled
    if (!storyRepo) {
      logger.debug('No story repository provided, skipping DB load', { storyId })

      if (fullConfig.enableYamlFallback) {
        logger.debug('Attempting YAML fallback', { storyId })
        return loadFromYaml(storyId, fullConfig)
      }

      return {
        loaded: false,
        storyId,
        story: null,
        storyState: null,
        blockedBy: null,
        elaboration: null,
        plan: null,
        proof: null,
        error: null,
        source: 'none',
      }
    }

    // Load story
    const story = await storyRepo.getStory(storyId)
    if (!story) {
      logger.info('Story not found in database', { storyId })

      // Try YAML fallback if enabled
      if (fullConfig.enableYamlFallback) {
        logger.debug('Attempting YAML fallback after DB miss', { storyId })
        return loadFromYaml(storyId, fullConfig)
      }

      return {
        loaded: false,
        storyId,
        story: null,
        storyState: null,
        blockedBy: null,
        elaboration: null,
        plan: null,
        proof: null,
        error: `Story not found: ${storyId}`,
        source: 'none',
      }
    }

    // Load workflow artifacts if repository provided
    let elaboration: unknown | null = null
    let plan: unknown | null = null
    let proof: unknown | null = null

    if (workflowRepo) {
      if (fullConfig.loadElaboration) {
        const elabRecord = await workflowRepo.getLatestElaboration(storyId)
        elaboration = elabRecord?.content ?? null
      }

      if (fullConfig.loadPlan) {
        const planRecord = await workflowRepo.getLatestPlan(storyId)
        plan = planRecord?.content ?? null
      }

      if (fullConfig.loadProof) {
        const proofRecord = await workflowRepo.getLatestProof(storyId)
        proof = proofRecord?.content ?? null
      }
    }

    logger.info('Loaded state from database', {
      storyId,
      storyState: story.state,
      blockedBy: story.blocked_by,
      hasElaboration: elaboration !== null,
      hasPlan: plan !== null,
      hasProof: proof !== null,
    })

    return {
      loaded: true,
      storyId,
      story,
      storyState: story.state,
      blockedBy: story.blocked_by,
      elaboration,
      plan,
      proof,
      error: null,
      source: 'db',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error loading from DB'
    logger.error('Failed to load from database', {
      storyId,
      error: errorMessage,
    })

    // Try YAML fallback if enabled
    if (fullConfig.enableYamlFallback) {
      logger.debug('Attempting YAML fallback after DB error', { storyId, error: errorMessage })
      return loadFromYaml(storyId, fullConfig)
    }

    return {
      loaded: false,
      storyId,
      story: null,
      storyState: null,
      blockedBy: null,
      elaboration: null,
      plan: null,
      proof: null,
      error: errorMessage,
      source: 'none',
    }
  }
}

// ============================================================================
// LangGraph Node
// ============================================================================

/**
 * LangGraph node for loading state from database.
 * Requires repositories to be injected via config.
 */
export const loadFromDbNode = createToolNode(
  'load-from-db',
  async (state: GraphState): Promise<Partial<GraphStateWithDbLoad>> => {
    // Without injected dependencies, this node does nothing
    logger.debug('load-from-db node called without dependencies', {
      storyId: state.storyId,
    })

    return {
      dbLoadSuccess: false,
      dbLoadError: 'No database repositories configured',
    }
  },
)

/**
 * Factory for creating load-from-db node with injected dependencies.
 */
export function createLoadFromDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
  config: Partial<LoadFromDbConfig> = {},
) {
  return createToolNode(
    'load-from-db',
    async (state: GraphState): Promise<Partial<GraphStateWithDbLoad>> => {
      const result = await loadFromDb(state.storyId, storyRepo, workflowRepo, config)

      if (!result.loaded) {
        return {
          dbLoadSuccess: false,
          dbLoadError: result.error,
        }
      }

      return {
        loadedStory: result.story as StoryArtifact | null,
        storyState: result.storyState as StoryState | undefined,
        blockedBy: result.blockedBy,
        loadedElaboration: result.elaboration,
        loadedPlan: result.plan as Plan | null,
        loadedProof: result.proof as Evidence | null,
        dbLoadSuccess: true,
        dbLoadError: null,
      }
    },
  )
}
