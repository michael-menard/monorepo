/**
 * Save To DB Node
 *
 * Node that persists current workflow state to PostgreSQL database.
 * Called at phase boundaries to checkpoint progress.
 *
 * Dependencies are injected to keep orchestrator loosely coupled.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/graph-state.js'
import type { StoryState } from '../../state/enums/story-state.js'
import type { StoryRepository } from '../../db/story-repository.js'
import type { WorkflowRepository, TokenUsageInput } from '../../db/workflow-repository.js'
import type { Plan } from '../../artifacts/plan.js'
import type { Evidence } from '../../artifacts/evidence.js'
import type { QaVerify } from '../../artifacts/qa-verify.js'
import {
  createYamlArtifactBridge,
  inferFeatureFromStoryId,
  type ClaudeStoryYaml,
  type ClaudeElaborationYaml,
  type ClaudePlanYaml,
  type ClaudeVerificationYaml,
} from '../../persistence/index.js'

// ============================================================================
// Configuration Schema
// ============================================================================

export const SaveToDbConfigSchema = z.object({
  /** Story repository instance */
  storyRepo: z.unknown().optional(),
  /** Workflow repository instance */
  workflowRepo: z.unknown().optional(),
  /** Actor name for audit trail */
  actor: z.string().default('langgraph-orchestrator'),
  /** Whether to update story state */
  updateStoryState: z.boolean().default(true),
  /** Whether to save elaboration */
  saveElaboration: z.boolean().default(true),
  /** Whether to save plan */
  savePlan: z.boolean().default(true),
  /** Whether to save proof/evidence */
  saveProof: z.boolean().default(true),
  /** Whether to save verification */
  saveVerification: z.boolean().default(true),
  /** Enable YAML write-through (also write to YAML files) */
  enableYamlWriteThrough: z.boolean().default(false),
  /** Workspace root for YAML paths (required if enableYamlWriteThrough is true) */
  workspaceRoot: z.string().optional(),
  /** Feature directory name for YAML paths */
  feature: z.string().optional(),
  /** Story stage for YAML paths */
  stage: z.string().optional(),
})

export type SaveToDbConfig = z.infer<typeof SaveToDbConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const SaveToDbResultSchema = z.object({
  saved: z.boolean(),
  storyId: z.string(),
  savedStoryState: z.boolean(),
  savedElaboration: z.boolean(),
  savedPlan: z.boolean(),
  savedProof: z.boolean(),
  savedVerification: z.boolean(),
  savedTokenUsage: z.boolean(),
  error: z.string().nullable(),
})

export type SaveToDbResult = z.infer<typeof SaveToDbResultSchema>

// ============================================================================
// Extended Graph State
// ============================================================================

export interface GraphStateWithDbSave extends GraphState {
  /** Story state to persist */
  storyState?: StoryState
  /** Reason for state change (for audit trail) */
  stateChangeReason?: string
  /** Elaboration content to persist */
  elaborationToSave?: unknown
  /** Elaboration readiness score */
  elaborationReadinessScore?: number
  /** Elaboration gaps count */
  elaborationGapsCount?: number
  /** Plan to persist */
  planToSave?: Plan
  /** Proof/evidence to persist */
  proofToSave?: Evidence
  /** QA verification to persist */
  verificationToSave?: QaVerify
  /** Verification type */
  verificationType?: 'qa_verify' | 'review' | 'uat'
  /** Token usage to log */
  tokenUsageToLog?: TokenUsageInput & { phase: string }
  /** Whether DB save was successful */
  dbSaveSuccess?: boolean
  /** Error from DB save */
  dbSaveError?: string | null
}

// ============================================================================
// Node Implementation
// ============================================================================

/**
 * Write artifacts to YAML files (write-through)
 */
async function writeToYaml(
  storyId: string,
  state: Partial<GraphStateWithDbSave>,
  config: SaveToDbConfig,
): Promise<void> {
  if (!config.workspaceRoot) {
    throw new Error('workspaceRoot required for YAML write-through')
  }

  const feature = config.feature || inferFeatureFromStoryId(storyId)
  if (!feature) {
    throw new Error(`Cannot infer feature from story ID: ${storyId}`)
  }

  const stage = config.stage || 'in-progress'

  const bridge = createYamlArtifactBridge({
    workspaceRoot: config.workspaceRoot,
  })

  // Prepare data for YAML write
  const data: {
    story?: ClaudeStoryYaml
    elaboration?: ClaudeElaborationYaml
    plan?: ClaudePlanYaml
    verification?: ClaudeVerificationYaml
  } = {}

  // Convert elaboration if present
  if (config.saveElaboration && state.elaborationToSave) {
    data.elaboration = state.elaborationToSave as ClaudeElaborationYaml
  }

  // Convert plan if present
  if (config.savePlan && state.planToSave) {
    data.plan = {
      schema: 1,
      story_id: storyId,
      version: 1,
      approved: false,
      estimates: {
        files: state.planToSave.files_to_change?.length ?? 0,
        tokens: 0,
      },
      chunks: state.planToSave.steps?.map((step, idx) => ({
        id: step.id ?? idx + 1,
        description: step.description,
        files: step.files ?? [],
        slice: step.slice,
      })) ?? [],
      reuse: [],
    }
  }

  // Convert verification if present
  if (config.saveVerification && state.verificationToSave) {
    const qaVerify = state.verificationToSave
    // Get test counts from test_results if available
    const unitPass = qaVerify.test_results?.unit?.pass ?? 0
    const unitFail = qaVerify.test_results?.unit?.fail ?? 0

    data.verification = {
      schema: 1,
      story_id: storyId,
      updated: new Date().toISOString(),
      code_review: {
        verdict: qaVerify.verdict === 'PASS' ? 'pass' : 'fail',
        iterations: 1,
        final_issues: {
          errors: qaVerify.issues?.filter(i => i.severity === 'high').length ?? 0,
          warnings: qaVerify.issues?.filter(i => i.severity === 'medium').length ?? 0,
        },
      },
      tests: {
        unit: {
          pass: unitPass,
          fail: unitFail,
        },
        integration: {
          passed: qaVerify.test_results?.integration?.pass ?? 0,
          failed: qaVerify.test_results?.integration?.fail ?? 0,
        },
        e2e: {
          passed: qaVerify.test_results?.e2e?.pass ?? 0,
          failed: qaVerify.test_results?.e2e?.fail ?? 0,
        },
      },
      acs: qaVerify.acs_verified?.map(ac => ({
        id: ac.ac_id,
        verdict: ac.status === 'PASS' ? 'pass' : 'fail',
        evidence: ac.evidence_ref ?? '',
      })) ?? [],
      qa: {
        verdict: qaVerify.verdict === 'PASS' ? 'pass' : 'fail',
        verified_by: config.actor,
        verified_at: new Date().toISOString(),
        blocking_issues: qaVerify.issues?.filter(i => i.severity === 'critical' || i.severity === 'high').map(i => i.description) ?? [],
      },
    }
  }

  // Only write if there's something to write
  if (Object.keys(data).length > 0) {
    await bridge.saveToYaml(storyId, feature, stage, data)
  }
}

/**
 * Save current state to database
 */
export async function saveToDb(
  storyId: string,
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
  state: Partial<GraphStateWithDbSave>,
  config: Partial<SaveToDbConfig> = {},
): Promise<SaveToDbResult> {
  const fullConfig = SaveToDbConfigSchema.parse(config)
  const actor = fullConfig.actor

  const result: SaveToDbResult = {
    saved: false,
    storyId,
    savedStoryState: false,
    savedElaboration: false,
    savedPlan: false,
    savedProof: false,
    savedVerification: false,
    savedTokenUsage: false,
    error: null,
  }

  try {
    // If no repositories provided, skip
    if (!storyRepo && !workflowRepo) {
      logger.debug('No repositories provided, skipping DB save', { storyId })
      result.saved = true
      return result
    }

    // Update story state if provided and enabled
    if (storyRepo && fullConfig.updateStoryState && state.storyState) {
      await storyRepo.updateStoryState(storyId, state.storyState, actor, state.stateChangeReason)
      result.savedStoryState = true
    }

    // Save workflow artifacts if repository provided
    if (workflowRepo) {
      // Save elaboration
      if (fullConfig.saveElaboration && state.elaborationToSave !== undefined) {
        await workflowRepo.saveElaboration(
          storyId,
          state.elaborationToSave,
          state.elaborationReadinessScore ?? null,
          state.elaborationGapsCount ?? 0,
          actor,
        )
        result.savedElaboration = true
      }

      // Save plan
      if (fullConfig.savePlan && state.planToSave) {
        await workflowRepo.savePlan(storyId, state.planToSave, actor)
        result.savedPlan = true
      }

      // Save proof/evidence
      if (fullConfig.saveProof && state.proofToSave) {
        await workflowRepo.saveProof(storyId, state.proofToSave, actor)
        result.savedProof = true
      }

      // Save verification
      if (fullConfig.saveVerification && state.verificationToSave && state.verificationType) {
        const verdict = state.verificationToSave.verdict || 'PENDING'
        const issuesCount = state.verificationToSave.issues?.length ?? 0
        await workflowRepo.saveVerification(
          storyId,
          state.verificationType,
          state.verificationToSave,
          verdict as 'PASS' | 'FAIL' | 'CONCERNS' | 'PENDING',
          issuesCount,
          actor,
        )
        result.savedVerification = true
      }

      // Log token usage
      if (state.tokenUsageToLog) {
        await workflowRepo.logTokenUsage(storyId, state.tokenUsageToLog.phase, {
          inputTokens: state.tokenUsageToLog.inputTokens,
          outputTokens: state.tokenUsageToLog.outputTokens,
          model: state.tokenUsageToLog.model,
          agentName: state.tokenUsageToLog.agentName,
        })
        result.savedTokenUsage = true
      }
    }

    result.saved = true
    logger.info('Saved state to database', {
      storyId,
      savedStoryState: result.savedStoryState,
      savedElaboration: result.savedElaboration,
      savedPlan: result.savedPlan,
      savedProof: result.savedProof,
      savedVerification: result.savedVerification,
      savedTokenUsage: result.savedTokenUsage,
    })

    // YAML write-through if enabled
    if (fullConfig.enableYamlWriteThrough && fullConfig.workspaceRoot) {
      try {
        await writeToYaml(storyId, state, fullConfig)
        logger.info('YAML write-through completed', { storyId })
      } catch (yamlError) {
        // Log but don't fail the overall operation
        logger.warn('YAML write-through failed', {
          storyId,
          error: yamlError instanceof Error ? yamlError.message : 'Unknown error',
        })
      }
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error saving to DB'
    logger.error('Failed to save to database', {
      storyId,
      error: errorMessage,
    })

    result.error = errorMessage
    return result
  }
}

// ============================================================================
// LangGraph Node
// ============================================================================

/**
 * LangGraph node for saving state to database.
 * Requires repositories to be injected via config.
 */
export const saveToDbNode = createToolNode(
  'save-to-db',
  async (state: GraphState): Promise<Partial<GraphStateWithDbSave>> => {
    // Without injected dependencies, this node does nothing
    logger.debug('save-to-db node called without dependencies', {
      storyId: state.storyId,
    })

    return {
      dbSaveSuccess: false,
      dbSaveError: 'No database repositories configured',
    }
  },
)

/**
 * Factory for creating save-to-db node with injected dependencies.
 */
export function createSaveToDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
  config: Partial<SaveToDbConfig> = {},
) {
  return createToolNode(
    'save-to-db',
    async (state: GraphState): Promise<Partial<GraphStateWithDbSave>> => {
      const stateWithSave = state as GraphStateWithDbSave

      const result = await saveToDb(state.storyId, storyRepo, workflowRepo, stateWithSave, config)

      return {
        dbSaveSuccess: result.saved,
        dbSaveError: result.error,
      }
    },
  )
}

/**
 * Convenience function to save just story state
 */
export function createSaveStoryStateNode(
  storyRepo: StoryRepository,
  actor: string = 'langgraph-orchestrator',
) {
  return createToolNode(
    'save-story-state',
    async (state: GraphState): Promise<Partial<GraphStateWithDbSave>> => {
      const stateWithSave = state as GraphStateWithDbSave

      if (!stateWithSave.storyState) {
        return {
          dbSaveSuccess: true,
          dbSaveError: null,
        }
      }

      try {
        await storyRepo.updateStoryState(
          state.storyId,
          stateWithSave.storyState,
          actor,
          stateWithSave.stateChangeReason,
        )

        return {
          dbSaveSuccess: true,
          dbSaveError: null,
        }
      } catch (error) {
        return {
          dbSaveSuccess: false,
          dbSaveError: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    },
  )
}
