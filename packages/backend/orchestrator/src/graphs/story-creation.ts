/**
 * Story Creation Graph
 *
 * Composes a complete story creation flow from reality intake through synthesis.
 * Orchestrates the full story creation workflow including parallel fanout analyses,
 * attack challenges, gap hygiene, HiTL decision points, and final synthesis.
 *
 * FLOW-042: LangGraph Graph - Story Creation Flow
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { GraphState } from '../state/index.js'
import type { BaselineReality, RetrievedContext } from '../nodes/reality/index.js'
import type { StoryStructure, StoryRequest } from '../nodes/story/seed.js'
import type { PMGapStructure } from '../nodes/story/fanout-pm.js'
import type { UXGapAnalysis } from '../nodes/story/fanout-ux.js'
import type { QAGapAnalysis } from '../nodes/story/fanout-qa.js'
import type { AttackAnalysis } from '../nodes/story/attack.js'
import type { HygieneResult } from '../nodes/story/gap-hygiene.js'
import type { ReadinessResult } from '../nodes/story/readiness-score.js'
import type { SynthesizedStory } from '../nodes/story/synthesize.js'
import type { CommitmentGateResult } from '../nodes/gates/commitment-gate.js'
import { createToolNode } from '../runner/node-factory.js'
import { updateState } from '../runner/state-helpers.js'
import type { StoryRepository } from '../db/story-repository.js'
import type { WorkflowRepository } from '../db/workflow-repository.js'
import { loadFromDb, type LoadFromDbConfig } from '../nodes/persistence/load-from-db.js'
import { saveToDb, type SaveToDbConfig } from '../nodes/persistence/save-to-db.js'
import {
  extractLearnings,
  persistLearnings,
  type PersistLearningsConfig,
} from '../nodes/completion/persist-learnings.js'

/**
 * HiTL (Human-in-the-Loop) decision options.
 */
export const HiTLDecisionSchema = z.enum([
  'approve', // Proceed to synthesis
  'revise', // Go back to seed for revisions
  'reject', // Cancel story creation
  'defer', // Hold for later review
])

export type HiTLDecision = z.infer<typeof HiTLDecisionSchema>

/**
 * Configuration for the story creation graph.
 */
export const StoryCreationConfigSchema = z.object({
  /** Readiness score threshold for auto-approval (skip HiTL if score >= this) */
  autoApprovalThreshold: z.number().int().min(0).max(100).default(95),
  /** Minimum readiness score to allow proceeding */
  minReadinessScore: z.number().int().min(0).max(100).default(70),
  /** Maximum attack iterations (bounded recursion) */
  maxAttackIterations: z.number().int().positive().default(3),
  /** Whether to require HiTL approval */
  requireHiTL: z.boolean().default(true),
  /** Timeout for each node in ms */
  nodeTimeoutMs: z.number().positive().default(30000),
  /** Whether to generate commitment baseline */
  generateCommitmentBaseline: z.boolean().default(true),
  /** Whether to run fanout nodes in parallel */
  parallelFanout: z.boolean().default(true),
  /** Whether to persist to database */
  persistToDb: z.boolean().default(false),
  /** Story repository for DB persistence (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository for DB persistence (optional, injected) */
  workflowRepo: z.unknown().optional(),
  /** KB dependencies for learning persistence (optional, injected) */
  kbDeps: z.unknown().optional(),
})

export type StoryCreationConfig = z.infer<typeof StoryCreationConfigSchema>

/**
 * Story creation workflow phase.
 */
export const WorkflowPhaseSchema = z.enum([
  'reality_intake', // load_baseline + retrieve_context
  'seeding', // story.seed
  'fanout', // story.fanout.* (PM, UX, QA in parallel)
  'attack', // story.attack (bounded)
  'hygiene', // gap_hygiene
  'scoring', // readiness_scoring
  'hitl', // Human-in-the-loop decision
  'synthesis', // story.synthesize
  'complete', // Workflow complete
  'rejected', // Story rejected at HiTL
  'error', // Error state
])

export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>

/**
 * Result schema for the story creation workflow.
 */
export const StoryCreationResultSchema = z.object({
  /** Story ID created */
  storyId: z.string().min(1),
  /** Final workflow phase */
  phase: WorkflowPhaseSchema,
  /** Whether workflow completed successfully */
  success: z.boolean(),
  /** The synthesized story (if successful) */
  synthesizedStory: z.unknown().nullable(),
  /** Readiness score achieved */
  readinessScore: z.number().int().min(0).max(100).nullable(),
  /** Whether HiTL was required */
  hitlRequired: z.boolean(),
  /** HiTL decision if applicable */
  hitlDecision: HiTLDecisionSchema.nullable(),
  /** Commitment gate result if applicable */
  commitmentGateResult: z.unknown().nullable(),
  /** Warnings accumulated during workflow */
  warnings: z.array(z.string()).default([]),
  /** Errors if workflow failed */
  errors: z.array(z.string()).default([]),
  /** Workflow duration in ms */
  durationMs: z.number().int().min(0),
  /** Timestamp when workflow completed */
  completedAt: z.string().datetime(),
})

export type StoryCreationResult = z.infer<typeof StoryCreationResultSchema>

/**
 * LangGraph state annotation for story creation.
 * Extends GraphState with story-creation-specific fields.
 */
// Simple overwrite reducer for most fields
const overwrite = <T>(_: T, b: T): T => b

export const StoryCreationStateAnnotation = Annotation.Root({
  // Base identifiers
  storyId: Annotation<string>(),
  epicPrefix: Annotation<string>(),

  // Workflow configuration
  config: Annotation<StoryCreationConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Current workflow phase
  currentPhase: Annotation<WorkflowPhase>({
    reducer: overwrite,
    default: () => 'reality_intake',
  }),

  // Attack iteration tracking
  attackIteration: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  // Workflow timing
  startedAt: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Story request input
  storyRequest: Annotation<StoryRequest | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Reality intake outputs
  baselineReality: Annotation<BaselineReality | null>({
    reducer: overwrite,
    default: () => null,
  }),
  baselineLoaded: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  retrievedContext: Annotation<RetrievedContext | null>({
    reducer: overwrite,
    default: () => null,
  }),
  contextRetrieved: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Seed output
  storyStructure: Annotation<StoryStructure | null>({
    reducer: overwrite,
    default: () => null,
  }),
  storySeeded: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Fanout outputs
  pmGapAnalysis: Annotation<{ gaps: PMGapStructure } | null>({
    reducer: overwrite,
    default: () => null,
  }),
  pmAnalysisComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  uxGapAnalysis: Annotation<UXGapAnalysis | null>({
    reducer: overwrite,
    default: () => null,
  }),
  uxAnalysisComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  qaGapAnalysis: Annotation<QAGapAnalysis | null>({
    reducer: overwrite,
    default: () => null,
  }),
  qaAnalysisComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Attack output
  attackAnalysis: Annotation<AttackAnalysis | null>({
    reducer: overwrite,
    default: () => null,
  }),
  attackComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Gap hygiene output
  gapHygieneResult: Annotation<HygieneResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  gapHygieneAnalyzed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Readiness scoring output
  readinessResult: Annotation<ReadinessResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  readinessAnalyzed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // HiTL decision
  hitlDecision: Annotation<HiTLDecision | null>({
    reducer: overwrite,
    default: () => null,
  }),
  hitlRequired: Annotation<boolean>({
    reducer: overwrite,
    default: () => true,
  }),
  hitlNote: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Commitment gate output
  commitmentGateResult: Annotation<CommitmentGateResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  commitmentValidated: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Synthesis output
  synthesizedStory: Annotation<SynthesizedStory | null>({
    reducer: overwrite,
    default: () => null,
  }),
  storySynthesized: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Workflow status
  workflowComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  workflowSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Accumulated warnings and errors (append reducer)
  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // DB persistence state
  dbLoadSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  dbSaveSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  learningsPersisted: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
})

/** TypeScript type for story creation graph state */
export type StoryCreationState = typeof StoryCreationStateAnnotation.State

/**
 * Extended graph state for story creation operations.
 * Used when story creation graph interacts with main workflow state.
 */
export interface GraphStateWithStoryCreation extends GraphState {
  /** Story creation configuration */
  storyCreationConfig?: StoryCreationConfig | null
  /** Story creation result */
  storyCreationResult?: StoryCreationResult | null
  /** Whether story creation has completed */
  storyCreationComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

/**
 * Initialize story creation workflow node.
 * Sets up configuration and validates input state.
 */
export function createInitializeNode(config: Partial<StoryCreationConfig> = {}) {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const fullConfig = StoryCreationConfigSchema.parse(config)
    const now = new Date().toISOString()

    // Validate we have a story ID
    if (!state.storyId) {
      return {
        currentPhase: 'error',
        errors: ['No story ID provided for story creation'],
      }
    }

    // Validate we have a story request
    if (!state.storyRequest) {
      return {
        currentPhase: 'error',
        errors: ['No story request provided for story creation'],
      }
    }

    return {
      config: fullConfig,
      currentPhase: 'reality_intake',
      startedAt: now,
      hitlRequired: fullConfig.requireHiTL,
      errors: [],
      warnings: [],
    }
  }
}

/**
 * Load baseline reality node wrapper.
 */
export function createLoadBaselineNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { loadMostRecentBaseline } = await import('../nodes/reality/load-baseline.js')

    const result = await loadMostRecentBaseline({
      projectRoot: process.env.PROJECT_ROOT || process.cwd(),
      requireBaseline: false,
    })

    if (!result.loaded) {
      return {
        baselineReality: null,
        baselineLoaded: false,
        warnings: result.error ? [result.error] : ['Baseline not loaded'],
      }
    }

    return {
      baselineReality: result.baseline,
      baselineLoaded: true,
    }
  }
}

/**
 * Retrieve context node wrapper.
 */
export function createRetrieveContextNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { retrieveContextForScope } = await import('../nodes/reality/retrieve-context.js')

    const storyRequest = state.storyRequest
    if (!storyRequest) {
      return {
        retrievedContext: null,
        contextRetrieved: false,
        warnings: ['No story request available for context retrieval'],
      }
    }

    // Build scope from story request
    const scope = {
      storyId: state.storyId || 'unknown',
      domain: storyRequest.domain,
      includePatterns: [] as Array<{ type: 'glob' | 'path' | 'keyword'; value: string }>,
      excludePatterns: [] as Array<{ type: 'glob' | 'path' | 'keyword'; value: string }>,
      keywords: [] as string[],
      maxDepth: 5,
    }

    const result = await retrieveContextForScope(state.baselineReality, scope)

    if (!result.retrieved) {
      return {
        retrievedContext: null,
        contextRetrieved: false,
        warnings: result.error ? [result.error] : ['Context not retrieved'],
      }
    }

    return {
      retrievedContext: result.context,
      contextRetrieved: true,
    }
  }
}

/**
 * Story seed node wrapper.
 */
export function createStorySeedNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateStorySeed } = await import('../nodes/story/seed.js')

    const storyRequest = state.storyRequest
    if (!storyRequest) {
      return {
        storyStructure: null,
        storySeeded: false,
        currentPhase: 'error',
        errors: ['No story request available for seeding'],
      }
    }

    const result = await generateStorySeed(
      state.baselineReality,
      state.retrievedContext,
      storyRequest,
    )

    if (!result.seeded) {
      return {
        storyStructure: null,
        storySeeded: false,
        currentPhase: 'error',
        errors: result.error ? [result.error] : ['Story seed generation failed'],
      }
    }

    return {
      storyStructure: result.storyStructure,
      storySeeded: true,
      currentPhase: 'fanout',
    }
  }
}

/**
 * Fanout PM node wrapper.
 */
export function createFanoutPMNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generatePMGapAnalysis } = await import('../nodes/story/fanout-pm.js')

    if (!state.storyStructure) {
      return {
        pmGapAnalysis: null,
        pmAnalysisComplete: false,
        warnings: ['No story structure available for PM analysis'],
      }
    }

    const result = await generatePMGapAnalysis(state.storyStructure, state.baselineReality)

    if (!result.analyzed) {
      return {
        pmGapAnalysis: null,
        pmAnalysisComplete: false,
        warnings: result.error ? [result.error] : ['PM gap analysis failed'],
      }
    }

    return {
      pmGapAnalysis: result.gaps ? { gaps: result.gaps } : null,
      pmAnalysisComplete: true,
    }
  }
}

/**
 * Fanout UX node wrapper.
 */
export function createFanoutUXNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateUXGapAnalysis } = await import('../nodes/story/fanout-ux.js')

    if (!state.storyStructure) {
      return {
        uxGapAnalysis: null,
        uxAnalysisComplete: false,
        warnings: ['No story structure available for UX analysis'],
      }
    }

    const result = await generateUXGapAnalysis(state.storyStructure, state.baselineReality)

    if (!result.analyzed) {
      return {
        uxGapAnalysis: null,
        uxAnalysisComplete: false,
        warnings: result.error ? [result.error] : ['UX gap analysis failed'],
      }
    }

    return {
      uxGapAnalysis: result.uxGapAnalysis,
      uxAnalysisComplete: true,
    }
  }
}

/**
 * Fanout QA node wrapper.
 */
export function createFanoutQANode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateQAGapAnalysis } = await import('../nodes/story/fanout-qa.js')

    if (!state.storyStructure) {
      return {
        qaGapAnalysis: null,
        qaAnalysisComplete: false,
        warnings: ['No story structure available for QA analysis'],
      }
    }

    const result = await generateQAGapAnalysis(state.storyStructure, state.baselineReality)

    if (!result.analyzed) {
      return {
        qaGapAnalysis: null,
        qaAnalysisComplete: false,
        warnings: result.error ? [result.error] : ['QA gap analysis failed'],
      }
    }

    return {
      qaGapAnalysis: result.qaGapAnalysis,
      qaAnalysisComplete: true,
    }
  }
}

/**
 * Merge fanout results node.
 * Combines results from parallel fanout analyses.
 */
export function createMergeFanoutNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const allComplete =
      state.pmAnalysisComplete && state.uxAnalysisComplete && state.qaAnalysisComplete

    if (!allComplete) {
      return {
        warnings: ['Not all fanout analyses completed'],
      }
    }

    return {
      currentPhase: 'attack',
    }
  }
}

/**
 * Attack node wrapper with bounded iterations.
 */
export function createAttackNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateAttackAnalysis } = await import('../nodes/story/attack.js')

    if (!state.storyStructure) {
      return {
        attackAnalysis: null,
        attackComplete: false,
        warnings: ['No story structure available for attack analysis'],
      }
    }

    const maxIterations = state.config?.maxAttackIterations || 3
    const currentIteration = state.attackIteration + 1

    // Check bounded iteration limit
    if (currentIteration > maxIterations) {
      return {
        attackComplete: true,
        currentPhase: 'hygiene',
        warnings: [`Attack analysis bounded at ${maxIterations} iterations`],
      }
    }

    const result = await generateAttackAnalysis(
      state.storyStructure,
      state.pmGapAnalysis?.gaps,
      state.uxGapAnalysis,
      state.qaGapAnalysis,
    )

    if (!result.analyzed) {
      return {
        attackAnalysis: null,
        attackComplete: false,
        attackIteration: currentIteration,
        warnings: result.error ? [result.error] : ['Attack analysis failed'],
      }
    }

    // Check if we need more iterations based on findings
    const needsMoreAttacks =
      result.attackAnalysis &&
      result.attackAnalysis.challengeResults.some(cr => cr.validity === 'uncertain') &&
      currentIteration < maxIterations

    return {
      attackAnalysis: result.attackAnalysis,
      attackComplete: !needsMoreAttacks,
      attackIteration: currentIteration,
      currentPhase: needsMoreAttacks ? 'attack' : 'hygiene',
    }
  }
}

/**
 * Gap hygiene node wrapper.
 */
export function createGapHygieneNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateHygieneAnalysis } = await import('../nodes/story/gap-hygiene.js')

    if (!state.storyStructure) {
      return {
        gapHygieneResult: null,
        gapHygieneAnalyzed: false,
        currentPhase: 'error',
        errors: ['No story structure available for gap hygiene'],
      }
    }

    const result = await generateHygieneAnalysis(
      state.storyStructure.storyId,
      state.pmGapAnalysis?.gaps,
      state.uxGapAnalysis,
      state.qaGapAnalysis,
      state.attackAnalysis,
      null, // previousHistory
    )

    if (!result.analyzed) {
      return {
        gapHygieneResult: null,
        gapHygieneAnalyzed: false,
        warnings: result.error ? [result.error] : ['Gap hygiene analysis failed'],
      }
    }

    return {
      gapHygieneResult: result.hygieneResult,
      gapHygieneAnalyzed: true,
      currentPhase: 'scoring',
    }
  }
}

/**
 * Readiness scoring node wrapper.
 */
export function createReadinessScoringNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { generateReadinessAnalysis } = await import('../nodes/story/readiness-score.js')

    if (!state.storyStructure) {
      return {
        readinessResult: null,
        readinessAnalyzed: false,
        currentPhase: 'error',
        errors: ['No story structure available for readiness scoring'],
      }
    }

    const result = await generateReadinessAnalysis(
      state.storyStructure,
      state.gapHygieneResult?.rankedGaps,
      state.baselineReality,
      state.retrievedContext,
    )

    if (!result.analyzed) {
      return {
        readinessResult: null,
        readinessAnalyzed: false,
        warnings: result.error ? [result.error] : ['Readiness analysis failed'],
      }
    }

    // Determine if HiTL is required based on score
    const autoApprovalThreshold = state.config?.autoApprovalThreshold || 95
    const score = result.readinessResult?.score || 0
    const skipHiTL = !state.config?.requireHiTL || score >= autoApprovalThreshold

    return {
      readinessResult: result.readinessResult,
      readinessAnalyzed: true,
      currentPhase: skipHiTL ? 'synthesis' : 'hitl',
      hitlRequired: !skipHiTL,
      hitlDecision: skipHiTL ? 'approve' : null,
    }
  }
}

/**
 * HiTL decision node.
 * In production, this would wait for human input.
 * For now, it auto-approves if score meets minimum threshold.
 */
export function createHiTLNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    // If decision already made (e.g., by external system), use it
    if (state.hitlDecision) {
      switch (state.hitlDecision) {
        case 'approve':
          return { currentPhase: 'synthesis' }
        case 'revise':
          return {
            currentPhase: 'seeding',
            storySeeded: false,
            pmAnalysisComplete: false,
            uxAnalysisComplete: false,
            qaAnalysisComplete: false,
            attackComplete: false,
            attackIteration: 0,
            gapHygieneAnalyzed: false,
            readinessAnalyzed: false,
          }
        case 'reject':
          return {
            currentPhase: 'rejected',
            workflowComplete: true,
            workflowSuccess: false,
          }
        case 'defer':
          return {
            currentPhase: 'hitl',
            warnings: ['Story deferred for later review'],
          }
      }
    }

    // Auto-decision based on readiness score
    const minScore = state.config?.minReadinessScore || 70
    const score = state.readinessResult?.score || 0

    if (score >= minScore) {
      return {
        hitlDecision: 'approve',
        currentPhase: 'synthesis',
        hitlNote: `Auto-approved: score ${score} >= minimum ${minScore}`,
      }
    }

    // Below minimum, require revision
    return {
      hitlDecision: 'revise',
      currentPhase: 'seeding',
      hitlNote: `Auto-revision: score ${score} < minimum ${minScore}`,
      storySeeded: false,
      pmAnalysisComplete: false,
      uxAnalysisComplete: false,
      qaAnalysisComplete: false,
      attackComplete: false,
      attackIteration: 0,
      gapHygieneAnalyzed: false,
      readinessAnalyzed: false,
    }
  }
}

/**
 * Synthesis node wrapper.
 */
export function createSynthesisNode() {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    const { synthesizeStory } = await import('../nodes/story/synthesize.js')

    if (!state.storyStructure) {
      return {
        synthesizedStory: null,
        storySynthesized: false,
        currentPhase: 'error',
        errors: ['No story structure available for synthesis'],
      }
    }

    const result = await synthesizeStory(
      state.storyStructure,
      state.gapHygieneResult,
      state.attackAnalysis,
      state.readinessResult,
      state.baselineReality,
      {
        generateCommitmentBaseline: state.config?.generateCommitmentBaseline ?? true,
      },
    )

    if (!result.synthesized) {
      return {
        synthesizedStory: null,
        storySynthesized: false,
        currentPhase: 'error',
        errors: result.error ? [result.error] : ['Story synthesis failed'],
      }
    }

    return {
      synthesizedStory: result.synthesizedStory,
      storySynthesized: true,
      currentPhase: 'complete',
      workflowComplete: true,
      workflowSuccess: true,
    }
  }
}

/**
 * Complete workflow node.
 * Produces the final result.
 */
export function createCompleteNode() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    return {
      workflowComplete: true,
    }
  }
}

/**
 * Load from DB node.
 * Loads existing story state from database if available.
 */
export function createLoadFromDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
) {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    // Skip if no repositories configured
    if (!storyRepo) {
      return {
        dbLoadSuccess: false,
        warnings: ['DB persistence not configured - skipping load'],
      }
    }

    try {
      const result = await loadFromDb(state.storyId, storyRepo, workflowRepo, {
        loadElaboration: true,
        loadPlan: false,
        loadProof: false,
      })

      if (!result.loaded) {
        // Story doesn't exist yet or error occurred - check for error
        if (result.error && !result.error.includes('Story not found')) {
          return {
            dbLoadSuccess: false,
            warnings: [`Failed to load from DB: ${result.error}`],
          }
        }
        return {
          dbLoadSuccess: false,
        }
      }

      return {
        dbLoadSuccess: true,
      }
    } catch (error) {
      return {
        dbLoadSuccess: false,
        warnings: [`Failed to load from DB: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }
}

/**
 * Save to DB node.
 * Saves synthesized story to database.
 */
export function createSaveToDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
) {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    // Skip if no repositories configured or no synthesized story
    if (!storyRepo || !state.synthesizedStory) {
      return {
        dbSaveSuccess: false,
      }
    }

    try {
      // Save story state transition to backlog after synthesis
      const saveResult = await saveToDb(state.storyId, storyRepo, workflowRepo, {
        storyState: 'backlog',
        stateChangeReason: 'Story created via story-creation graph',
      }, {
        actor: 'story-creation-graph',
        updateStoryState: true,
        saveElaboration: false,
        savePlan: false,
        saveProof: false,
        saveVerification: false,
      })

      // Check if save actually succeeded (saveToDb catches errors internally)
      if (!saveResult.saved || saveResult.error) {
        return {
          dbSaveSuccess: false,
          warnings: saveResult.error ? [`Failed to save to DB: ${saveResult.error}`] : [],
        }
      }

      return {
        dbSaveSuccess: true,
      }
    } catch (error) {
      return {
        dbSaveSuccess: false,
        warnings: [`Failed to save to DB: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }
}

/**
 * Persist learnings node.
 * Writes learnings to knowledge base after story completion.
 */
export function createPersistLearningsNode(kbDeps: unknown) {
  return async (state: StoryCreationState): Promise<Partial<StoryCreationState>> => {
    // Skip if no KB dependencies configured
    if (!kbDeps) {
      return {
        learningsPersisted: false,
      }
    }

    try {
      // Extract learnings from workflow state
      // Convert string errors to NodeError format for extractLearnings
      // Cast to GraphStateWithLearnings - extractLearnings only uses storyId, errors, storyDomain
      const now = new Date().toISOString()
      const learnings = extractLearnings({
        storyId: state.storyId,
        errors: state.errors.map(e => ({
          message: e,
          recoverable: false,
          nodeId: 'story-creation',
          timestamp: now,
        })),
        storyDomain: state.epicPrefix,
      } as Parameters<typeof extractLearnings>[0])

      if (learnings.length === 0) {
        return {
          learningsPersisted: true, // No learnings to persist is success
        }
      }

      // Type assertion for KB dependencies
      const deps = kbDeps as {
        db: unknown
        embeddingClient: unknown
        kbSearchFn: (input: unknown, deps: unknown) => Promise<unknown>
        kbAddFn: (input: unknown, deps: unknown) => Promise<unknown>
      }

      const result = await persistLearnings(
        learnings,
        deps.kbSearchFn as Parameters<typeof persistLearnings>[1],
        deps.kbAddFn as Parameters<typeof persistLearnings>[2],
        { db: deps.db, embeddingClient: deps.embeddingClient },
        0.85, // deduplication threshold
      )

      return {
        learningsPersisted: result.persisted,
      }
    } catch (error) {
      return {
        learningsPersisted: false,
        warnings: [`Failed to persist learnings: ${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }
}

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Determines the next node after initialization.
 */
function afterInitialize(state: StoryCreationState): string {
  if (state.currentPhase === 'error') {
    return 'complete'
  }
  return 'load_from_db'
}

/**
 * Determines the next node after seeding.
 */
function afterSeed(state: StoryCreationState): string {
  if (state.currentPhase === 'error') {
    return 'complete'
  }
  return 'fanout_pm' // Start fanout (in parallel if configured)
}

/**
 * Determines if attack needs more iterations.
 */
function afterAttack(state: StoryCreationState): string {
  if (!state.attackComplete && state.attackIteration < (state.config?.maxAttackIterations || 3)) {
    return 'attack' // Continue attacking
  }
  return 'gap_hygiene'
}

/**
 * Determines the next node after readiness scoring.
 */
function afterReadiness(state: StoryCreationState): string {
  if (state.hitlRequired && !state.hitlDecision) {
    return 'hitl'
  }
  return 'synthesis'
}

/**
 * Determines the next node after HiTL decision.
 */
function afterHiTL(state: StoryCreationState): 'synthesis' | 'seed' | 'complete' {
  switch (state.hitlDecision) {
    case 'approve':
      return 'synthesis'
    case 'revise':
      return 'seed'
    case 'reject':
    case 'defer':
    default:
      return 'complete'
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates a story creation graph with the specified configuration.
 *
 * Graph structure (with DB persistence):
 * START -> initialize -> load_from_db -> load_baseline -> retrieve_context -> seed
 *       -> fanout_pm/fanout_ux/fanout_qa (parallel) -> merge_fanout
 *       -> attack (bounded loop) -> gap_hygiene -> readiness_scoring
 *       -> [hitl] -> synthesis -> save_to_db -> persist_learnings -> complete -> END
 *
 * @param config - Configuration for story creation
 * @returns Compiled StateGraph for story creation
 */
export function createStoryCreationGraph(config: Partial<StoryCreationConfig> = {}) {
  const fullConfig = StoryCreationConfigSchema.parse(config)

  // Get typed repositories if provided
  const storyRepo = fullConfig.storyRepo as StoryRepository | null ?? null
  const workflowRepo = fullConfig.workflowRepo as WorkflowRepository | null ?? null

  const graph = new StateGraph(StoryCreationStateAnnotation)
    // Entry node: initialize workflow
    .addNode('initialize', createInitializeNode(fullConfig))

    // DB persistence: load existing state (optional)
    .addNode('load_from_db', createLoadFromDbNode(storyRepo, workflowRepo))

    // Reality intake nodes
    .addNode('load_baseline', createLoadBaselineNode())
    .addNode('retrieve_context', createRetrieveContextNode())

    // Seed node
    .addNode('seed', createStorySeedNode())

    // Fanout nodes (run in parallel conceptually)
    .addNode('fanout_pm', createFanoutPMNode())
    .addNode('fanout_ux', createFanoutUXNode())
    .addNode('fanout_qa', createFanoutQANode())
    .addNode('merge_fanout', createMergeFanoutNode())

    // Attack node (with bounded recursion)
    .addNode('attack', createAttackNode())

    // Gap hygiene node
    .addNode('gap_hygiene', createGapHygieneNode())

    // Readiness scoring node
    .addNode('readiness_scoring', createReadinessScoringNode())

    // HiTL decision node
    .addNode('hitl', createHiTLNode())

    // Synthesis node
    .addNode('synthesis', createSynthesisNode())

    // DB persistence: save synthesized story
    .addNode('save_to_db', createSaveToDbNode(storyRepo, workflowRepo))

    // KB persistence: persist learnings
    .addNode('persist_learnings', createPersistLearningsNode(fullConfig.kbDeps))

    // Complete node
    .addNode('complete', createCompleteNode())

    // Edges
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterInitialize, {
      load_from_db: 'load_from_db',
      complete: 'complete',
    })
    .addEdge('load_from_db', 'load_baseline')
    .addEdge('load_baseline', 'retrieve_context')
    .addEdge('retrieve_context', 'seed')
    .addConditionalEdges('seed', afterSeed, {
      fanout_pm: 'fanout_pm',
      complete: 'complete',
    })

    // Fanout edges - run sequentially for now (parallel requires Send API)
    .addEdge('fanout_pm', 'fanout_ux')
    .addEdge('fanout_ux', 'fanout_qa')
    .addEdge('fanout_qa', 'merge_fanout')
    .addEdge('merge_fanout', 'attack')

    // Attack with bounded recursion
    .addConditionalEdges('attack', afterAttack, {
      attack: 'attack',
      gap_hygiene: 'gap_hygiene',
    })

    .addEdge('gap_hygiene', 'readiness_scoring')
    .addConditionalEdges('readiness_scoring', afterReadiness, {
      hitl: 'hitl',
      synthesis: 'synthesis',
    })
    .addConditionalEdges('hitl', afterHiTL, {
      synthesis: 'synthesis',
      seed: 'seed',
      complete: 'complete',
    })
    // After synthesis, save to DB then persist learnings
    .addEdge('synthesis', 'save_to_db')
    .addEdge('save_to_db', 'persist_learnings')
    .addEdge('persist_learnings', 'complete')
    .addEdge('complete', END)

  return graph.compile()
}

/**
 * Convenience function to run story creation for a story request.
 *
 * @param request - Story request input
 * @param config - Optional configuration
 * @returns Story creation result
 */
export async function runStoryCreation(
  request: StoryRequest,
  baseline: BaselineReality | null = null,
  config: Partial<StoryCreationConfig> = {},
): Promise<StoryCreationResult> {
  const startTime = Date.now()
  const graph = createStoryCreationGraph(config)

  // Extract epic prefix and story ID from domain
  const epicPrefix = request.domain.toLowerCase().split('/')[0]
  const storyId = `${epicPrefix.toUpperCase()}-${Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')}`

  const initialState: Partial<StoryCreationState> = {
    storyId,
    epicPrefix,
    storyRequest: request,
    baselineReality: baseline,
    baselineLoaded: baseline !== null,
  }

  try {
    const result = await graph.invoke(initialState)
    const durationMs = Date.now() - startTime

    return StoryCreationResultSchema.parse({
      storyId: result.storyId,
      phase: result.currentPhase,
      success: result.workflowSuccess ?? false,
      synthesizedStory: result.synthesizedStory,
      readinessScore: result.readinessResult?.score ?? null,
      hitlRequired: result.hitlRequired ?? false,
      hitlDecision: result.hitlDecision,
      commitmentGateResult: result.commitmentGateResult,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
      durationMs,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during story creation'

    return {
      storyId,
      phase: 'error',
      success: false,
      synthesizedStory: null,
      readinessScore: null,
      hitlRequired: false,
      hitlDecision: null,
      commitmentGateResult: null,
      warnings: [],
      errors: [errorMessage],
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }
}

// ============================================================================
// Node Adapter for Main Workflow Integration
// ============================================================================

/**
 * Node adapter for using story creation within main workflow graphs.
 * Creates a tool node that runs the story creation graph and returns results
 * in workflow state format.
 */
export const storyCreationNode = createToolNode(
  'story_creation',
  async (state: GraphState): Promise<Partial<GraphStateWithStoryCreation>> => {
    const stateWithCreation = state as GraphStateWithStoryCreation

    // Build story request from state
    const storyRequest: StoryRequest = {
      title: `Story ${state.storyId || 'New'}`,
      domain: state.epicPrefix || 'unknown',
      description: '',
      tags: [],
    }

    // Run story creation
    const result = await runStoryCreation(
      storyRequest,
      null,
      stateWithCreation.storyCreationConfig || {},
    )

    return updateState({
      storyCreationResult: result,
      storyCreationComplete: result.success,
    } as Partial<GraphStateWithStoryCreation>)
  },
)

/**
 * Creates a story creation node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createStoryCreationNode(config: Partial<StoryCreationConfig> = {}) {
  return createToolNode(
    'story_creation',
    async (state: GraphState): Promise<Partial<GraphStateWithStoryCreation>> => {
      const storyRequest: StoryRequest = {
        title: `Story ${state.storyId || 'New'}`,
        domain: state.epicPrefix || 'unknown',
        description: '',
        tags: [],
      }

      const result = await runStoryCreation(storyRequest, null, config)

      return updateState({
        storyCreationResult: result,
        storyCreationComplete: result.success,
      } as Partial<GraphStateWithStoryCreation>)
    },
  )
}
