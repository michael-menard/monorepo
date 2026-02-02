/**
 * Elaboration Graph
 *
 * Composes a complete elaboration flow for story refinement with delta detection,
 * review, and escape hatch evaluation. Orchestrates incremental story improvements
 * through iterative elaboration cycles.
 *
 * FLOW-043: LangGraph Graph - Elaboration Flow
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { GraphState } from '../state/index.js'
import type { SynthesizedStory } from '../nodes/story/synthesize.js'
import type { AttackAnalysis } from '../nodes/story/attack.js'
import type { ReadinessResult } from '../nodes/story/readiness-score.js'
import type { DeltaDetectionResult } from '../nodes/elaboration/delta-detect.js'
import type { DeltaReviewResult } from '../nodes/elaboration/delta-review.js'
import type { EscapeHatchResult } from '../nodes/elaboration/escape-hatch.js'
import { createToolNode } from '../runner/node-factory.js'
import { updateState } from '../runner/state-helpers.js'
import type { StoryRepository } from '../db/story-repository.js'
import type { WorkflowRepository } from '../db/workflow-repository.js'
import { loadFromDb } from '../nodes/persistence/load-from-db.js'
import { saveToDb } from '../nodes/persistence/save-to-db.js'

/**
 * Configuration for the elaboration graph.
 */
export const ElaborationConfigSchema = z.object({
  /** Delta detection configuration */
  deltaDetectionConfig: z
    .object({
      /** Minimum significance to include in results */
      minSignificance: z.number().int().min(1).max(10).default(1),
      /** Threshold for substantial changes (number of changes) */
      substantialChangeThreshold: z.number().int().positive().default(3),
      /** Whether to track field-level changes */
      trackFieldChanges: z.boolean().default(true),
    })
    .default({}),
  /** Delta review configuration */
  deltaReviewConfig: z
    .object({
      /** Whether to review added items */
      reviewAdded: z.boolean().default(true),
      /** Whether to review modified items */
      reviewModified: z.boolean().default(true),
      /** Whether to review removed items */
      reviewRemoved: z.boolean().default(true),
      /** Maximum findings per section */
      maxFindingsPerSection: z.number().int().positive().default(10),
      /** Whether to fail on critical findings */
      failOnCritical: z.boolean().default(true),
    })
    .default({}),
  /** Escape hatch configuration */
  escapeHatchConfig: z
    .object({
      /** Confidence threshold to trigger escape hatch */
      triggerThreshold: z.number().min(0).max(1).default(0.7),
      /** Minimum number of triggers to activate escape hatch */
      minTriggers: z.number().int().positive().default(1),
      /** Whether to evaluate attack impact */
      evaluateAttackImpact: z.boolean().default(true),
      /** Whether to evaluate cross-cutting changes */
      evaluateCrossCutting: z.boolean().default(true),
      /** Whether to evaluate scope expansion */
      evaluateScopeExpansion: z.boolean().default(true),
      /** Whether to evaluate consistency violations */
      evaluateConsistency: z.boolean().default(true),
    })
    .default({}),
  /** Timeout for each node in ms */
  nodeTimeoutMs: z.number().positive().default(30000),
  /** Whether to recalculate readiness after elaboration */
  recalculateReadiness: z.boolean().default(true),
  /** Whether to persist to database */
  persistToDb: z.boolean().default(false),
  /** Story repository for DB persistence (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository for DB persistence (optional, injected) */
  workflowRepo: z.unknown().optional(),
})

export type ElaborationConfig = z.infer<typeof ElaborationConfigSchema>

/**
 * Elaboration workflow phase.
 */
export const ElaborationPhaseSchema = z.enum([
  'load_previous', // Load previous story version
  'delta_detect', // Identify changes between versions
  'delta_review', // Review changed sections
  'escape_hatch', // Evaluate if full review needed
  'targeted_review', // Full review when escape hatch triggers
  'aggregate', // Combine all findings
  'update_readiness', // Recalculate readiness score
  'complete', // Workflow complete
  'error', // Error state
])

export type ElaborationPhase = z.infer<typeof ElaborationPhaseSchema>

/**
 * Schema for aggregated elaboration findings.
 */
export const AggregatedFindingsSchema = z.object({
  /** Story ID */
  storyId: z.string().min(1),
  /** Timestamp of aggregation */
  aggregatedAt: z.string().datetime(),
  /** Total findings count */
  totalFindings: z.number().int().min(0),
  /** Critical findings count */
  criticalCount: z.number().int().min(0),
  /** Major findings count */
  majorCount: z.number().int().min(0),
  /** Minor findings count */
  minorCount: z.number().int().min(0),
  /** Info findings count */
  infoCount: z.number().int().min(0),
  /** Whether escape hatch was triggered */
  escapeHatchTriggered: z.boolean(),
  /** Sections that need attention */
  sectionsNeedingAttention: z.array(z.string()).default([]),
  /** Stakeholders recommended for review */
  recommendedStakeholders: z.array(z.string()).default([]),
  /** Overall pass/fail status */
  passed: z.boolean(),
  /** Summary narrative */
  summary: z.string().min(1),
})

export type AggregatedFindings = z.infer<typeof AggregatedFindingsSchema>

/**
 * Result schema for the elaboration workflow.
 */
export const ElaborationResultSchema = z.object({
  /** Story ID elaborated */
  storyId: z.string().min(1),
  /** Final workflow phase */
  phase: ElaborationPhaseSchema,
  /** Whether workflow completed successfully */
  success: z.boolean(),
  /** Delta detection result */
  deltaDetectionResult: z.unknown().nullable(),
  /** Delta review result */
  deltaReviewResult: z.unknown().nullable(),
  /** Escape hatch result */
  escapeHatchResult: z.unknown().nullable(),
  /** Aggregated findings */
  aggregatedFindings: AggregatedFindingsSchema.nullable(),
  /** Updated readiness result (if recalculated) */
  updatedReadinessResult: z.unknown().nullable(),
  /** Previous readiness score */
  previousReadinessScore: z.number().int().min(0).max(100).nullable(),
  /** New readiness score (if recalculated) */
  newReadinessScore: z.number().int().min(0).max(100).nullable(),
  /** Warnings accumulated during workflow */
  warnings: z.array(z.string()).default([]),
  /** Errors if workflow failed */
  errors: z.array(z.string()).default([]),
  /** Workflow duration in ms */
  durationMs: z.number().int().min(0),
  /** Timestamp when workflow completed */
  completedAt: z.string().datetime(),
})

export type ElaborationResult = z.infer<typeof ElaborationResultSchema>

/**
 * LangGraph state annotation for elaboration.
 * Extends GraphState with elaboration-specific fields.
 */
// Simple overwrite reducer for most fields
const overwrite = <T>(_: T, b: T): T => b

export const ElaborationStateAnnotation = Annotation.Root({
  // Base identifiers
  storyId: Annotation<string>(),
  epicPrefix: Annotation<string>(),

  // Workflow configuration
  config: Annotation<ElaborationConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Current workflow phase
  currentPhase: Annotation<ElaborationPhase>({
    reducer: overwrite,
    default: () => 'load_previous',
  }),

  // Workflow timing
  startedAt: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Story versions
  currentStory: Annotation<SynthesizedStory | null>({
    reducer: overwrite,
    default: () => null,
  }),
  previousStory: Annotation<SynthesizedStory | null>({
    reducer: overwrite,
    default: () => null,
  }),
  previousStoryLoaded: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Previous iteration number
  previousIteration: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),
  currentIteration: Annotation<number>({
    reducer: overwrite,
    default: () => 1,
  }),

  // Attack analysis (for escape hatch evaluation)
  attackAnalysis: Annotation<AttackAnalysis | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Previous readiness for comparison
  previousReadinessResult: Annotation<ReadinessResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Delta detection output
  deltaDetectionResult: Annotation<DeltaDetectionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  deltaDetected: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Delta review output
  deltaReviewResult: Annotation<DeltaReviewResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  deltaReviewed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Escape hatch output
  escapeHatchResult: Annotation<EscapeHatchResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  escapeHatchEvaluated: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  escapeHatchTriggered: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Targeted review output (when escape hatch triggers)
  targetedReviewComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  targetedReviewFindings: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),

  // Aggregated findings
  aggregatedFindings: Annotation<AggregatedFindings | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Updated readiness
  updatedReadinessResult: Annotation<ReadinessResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  readinessUpdated: Annotation<boolean>({
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
})

/** TypeScript type for elaboration graph state */
export type ElaborationState = typeof ElaborationStateAnnotation.State

/**
 * Extended graph state for elaboration operations.
 * Used when elaboration graph interacts with main workflow state.
 */
export interface GraphStateWithElaboration extends GraphState {
  /** Elaboration configuration */
  elaborationConfig?: ElaborationConfig | null
  /** Elaboration result */
  elaborationResult?: ElaborationResult | null
  /** Whether elaboration has completed */
  elaborationComplete?: boolean
  /** Current synthesized story for elaboration */
  synthesizedStory?: SynthesizedStory | null
  /** Previous synthesized story for comparison */
  previousSynthesizedStory?: SynthesizedStory | null
}

// ============================================================================
// Node Implementations
// ============================================================================

/**
 * Initialize elaboration workflow node.
 * Sets up configuration and validates input state.
 */
export function createInitializeNode(config: Partial<ElaborationConfig> = {}) {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const fullConfig = ElaborationConfigSchema.parse(config)
    const now = new Date().toISOString()

    // Validate we have a story ID
    if (!state.storyId) {
      return {
        currentPhase: 'error',
        errors: ['No story ID provided for elaboration'],
      }
    }

    // Validate we have a current story
    if (!state.currentStory) {
      return {
        currentPhase: 'error',
        errors: ['No current story provided for elaboration'],
      }
    }

    return {
      config: fullConfig,
      currentPhase: 'load_previous',
      startedAt: now,
      errors: [],
      warnings: [],
    }
  }
}

/**
 * Load previous version node.
 * Loads the previous story version for comparison.
 */
export function createLoadPreviousVersionNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    // If no previous story provided, this is the first elaboration
    if (!state.previousStory) {
      return {
        previousStoryLoaded: true,
        previousIteration: 0,
        currentPhase: 'delta_detect',
        warnings: ['No previous story version provided - initial elaboration'],
      }
    }

    return {
      previousStoryLoaded: true,
      currentPhase: 'delta_detect',
    }
  }
}

/**
 * Delta detection node wrapper.
 * Identifies changes between story versions.
 */
export function createDeltaDetectNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const { detectDeltas } = await import('../nodes/elaboration/delta-detect.js')

    if (!state.currentStory) {
      return {
        deltaDetectionResult: null,
        deltaDetected: false,
        currentPhase: 'error',
        errors: ['No current story available for delta detection'],
      }
    }

    const config = state.config?.deltaDetectionConfig || {}

    const result = await detectDeltas(
      state.previousStory,
      state.currentStory,
      state.previousIteration,
      state.currentIteration,
      config,
    )

    if (!result.detected) {
      return {
        deltaDetectionResult: result,
        deltaDetected: false,
        currentPhase: 'aggregate',
        warnings: result.error ? [result.error] : ['Delta detection found no changes'],
      }
    }

    return {
      deltaDetectionResult: result,
      deltaDetected: true,
      currentPhase: 'delta_review',
    }
  }
}

/**
 * Delta review node wrapper.
 * Reviews changed sections.
 */
export function createDeltaReviewNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const { performDeltaReview } = await import('../nodes/elaboration/delta-review.js')

    if (!state.deltaDetectionResult) {
      return {
        deltaReviewResult: null,
        deltaReviewed: false,
        currentPhase: 'error',
        errors: ['No delta detection result available for review'],
      }
    }

    if (!state.currentStory) {
      return {
        deltaReviewResult: null,
        deltaReviewed: false,
        currentPhase: 'error',
        errors: ['No current story available for delta review'],
      }
    }

    const config = state.config?.deltaReviewConfig || {}

    const result = await performDeltaReview(state.deltaDetectionResult, state.currentStory, config)

    if (!result.reviewed) {
      return {
        deltaReviewResult: result,
        deltaReviewed: false,
        warnings: result.error ? [result.error] : ['Delta review failed'],
      }
    }

    return {
      deltaReviewResult: result,
      deltaReviewed: true,
      currentPhase: 'escape_hatch',
    }
  }
}

/**
 * Escape hatch evaluation node wrapper.
 * Determines if full review is needed.
 */
export function createEscapeHatchEvalNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const { evaluateEscapeHatch } = await import('../nodes/elaboration/escape-hatch.js')

    if (!state.currentStory) {
      return {
        escapeHatchResult: null,
        escapeHatchEvaluated: false,
        currentPhase: 'error',
        errors: ['No current story available for escape hatch evaluation'],
      }
    }

    const config = state.config?.escapeHatchConfig || {}

    // Get previous readiness score for comparison
    const previousReadinessScore = state.previousReadinessResult?.score ?? null

    const result = await evaluateEscapeHatch(
      state.deltaReviewResult,
      state.attackAnalysis,
      state.currentStory,
      null, // Current readiness will be recalculated later
      previousReadinessScore,
      config,
    )

    if (!result.evaluated) {
      return {
        escapeHatchResult: result,
        escapeHatchEvaluated: false,
        escapeHatchTriggered: false,
        warnings: result.error ? [result.error] : ['Escape hatch evaluation failed'],
        currentPhase: 'aggregate',
      }
    }

    return {
      escapeHatchResult: result,
      escapeHatchEvaluated: true,
      escapeHatchTriggered: result.triggered,
      currentPhase: result.triggered ? 'targeted_review' : 'aggregate',
    }
  }
}

/**
 * Targeted review node.
 * Performs full review when escape hatch triggers.
 */
export function createTargetedReviewNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    // In a full implementation, this would invoke the full review flow
    // For now, we'll capture the scope from the escape hatch result
    const escapeResult = state.escapeHatchResult

    if (!escapeResult?.reviewScope) {
      return {
        targetedReviewComplete: true,
        targetedReviewFindings: [],
        warnings: ['No review scope determined for targeted review'],
        currentPhase: 'aggregate',
      }
    }

    const findings: string[] = []

    // Generate findings based on review scope
    if (escapeResult.reviewScope.fullReview) {
      findings.push('Full story review required due to escape hatch triggers')
    }

    if (escapeResult.reviewScope.sections.length > 0) {
      findings.push(
        `Targeted review needed for sections: ${escapeResult.reviewScope.sections.join(', ')}`,
      )
    }

    if (escapeResult.stakeholdersToInvolve.length > 0) {
      findings.push(`Stakeholders to involve: ${escapeResult.stakeholdersToInvolve.join(', ')}`)
    }

    findings.push(`Review priority: ${escapeResult.reviewScope.priority}`)
    findings.push(`Review reason: ${escapeResult.reviewScope.reason}`)

    return {
      targetedReviewComplete: true,
      targetedReviewFindings: findings,
      currentPhase: 'aggregate',
    }
  }
}

/**
 * Aggregation node.
 * Combines all findings from delta review and targeted review.
 */
export function createAggregateNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const now = new Date().toISOString()

    // Collect findings from delta review
    const deltaFindings = state.deltaReviewResult?.findings ?? []
    const findingsBySeverity = state.deltaReviewResult?.findingsBySeverity ?? {
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
    }

    // Collect sections needing attention
    const sectionsNeedingAttention = new Set<string>()

    // From delta review
    if (state.deltaReviewResult) {
      for (const summary of state.deltaReviewResult.sectionSummaries) {
        if (!summary.passed) {
          sectionsNeedingAttention.add(summary.section)
        }
      }
    }

    // From escape hatch
    if (state.escapeHatchResult?.reviewScope?.sections) {
      for (const section of state.escapeHatchResult.reviewScope.sections) {
        sectionsNeedingAttention.add(section)
      }
    }

    // Determine overall pass status
    const passed =
      findingsBySeverity.critical === 0 &&
      (state.deltaReviewResult?.passed ?? true) &&
      !state.escapeHatchTriggered

    // Generate summary
    const summaryParts: string[] = []
    summaryParts.push(`Elaboration analysis for ${state.storyId}:`)

    if (state.deltaDetected) {
      const changeCount = state.deltaDetectionResult?.stats?.totalChanges ?? 0
      summaryParts.push(`Detected ${changeCount} change(s).`)
    } else {
      summaryParts.push('No significant changes detected.')
    }

    if (deltaFindings.length > 0) {
      summaryParts.push(`Found ${deltaFindings.length} finding(s).`)
    }

    if (state.escapeHatchTriggered) {
      summaryParts.push('Escape hatch triggered - targeted review performed.')
    }

    summaryParts.push(passed ? 'Elaboration PASSED.' : 'Elaboration FAILED.')

    const aggregated: AggregatedFindings = {
      storyId: state.storyId,
      aggregatedAt: now,
      totalFindings: deltaFindings.length,
      criticalCount: findingsBySeverity.critical,
      majorCount: findingsBySeverity.major,
      minorCount: findingsBySeverity.minor,
      infoCount: findingsBySeverity.info,
      escapeHatchTriggered: state.escapeHatchTriggered,
      sectionsNeedingAttention: Array.from(sectionsNeedingAttention),
      recommendedStakeholders: state.escapeHatchResult?.stakeholdersToInvolve ?? [],
      passed,
      summary: summaryParts.join(' '),
    }

    return {
      aggregatedFindings: aggregated,
      currentPhase: state.config?.recalculateReadiness ? 'update_readiness' : 'complete',
    }
  }
}

/**
 * Update readiness node.
 * Recalculates readiness score after elaboration.
 */
export function createUpdateReadinessNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    // Import the readiness generator
    const { generateReadinessAnalysis } = await import('../nodes/story/readiness-score.js')

    if (!state.currentStory) {
      return {
        updatedReadinessResult: null,
        readinessUpdated: false,
        warnings: ['No current story available for readiness update'],
        currentPhase: 'complete',
      }
    }

    // Build a minimal story structure for readiness analysis
    const storyStructure = {
      storyId: state.currentStory.storyId,
      title: state.currentStory.title,
      description: state.currentStory.description,
      domain: state.currentStory.domain,
      acceptanceCriteria: state.currentStory.acceptanceCriteria.map(ac => ({
        id: ac.id,
        description: ac.description,
        fromBaseline: false,
      })),
      constraints: state.currentStory.constraints || [],
      tags: [],
      affectedFiles: state.currentStory.affectedFiles || [],
      dependencies: state.currentStory.dependencies,
    }

    // Generate readiness analysis
    const result = await generateReadinessAnalysis(
      storyStructure,
      undefined, // rankedGaps - would need gap hygiene result
      undefined, // baseline
      undefined, // context
    )

    if (!result.analyzed || !result.readinessResult) {
      return {
        updatedReadinessResult: null,
        readinessUpdated: false,
        warnings: result.error ? [result.error] : ['Readiness update failed'],
        currentPhase: 'complete',
      }
    }

    return {
      updatedReadinessResult: result.readinessResult,
      readinessUpdated: true,
      currentPhase: 'complete',
    }
  }
}

/**
 * Complete workflow node.
 * Marks workflow as complete.
 */
export function createCompleteNode() {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    const success = state.aggregatedFindings?.passed ?? false

    return {
      workflowComplete: true,
      workflowSuccess: success,
    }
  }
}

/**
 * Load from DB node for elaboration.
 * Loads existing elaboration state from database if available.
 */
export function createElaborationLoadFromDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
) {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    // Skip if no repositories configured
    if (!storyRepo || !workflowRepo) {
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
        // Check for error (loadFromDb catches errors internally)
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

      // If we have a previous elaboration, use it
      if (result.elaboration) {
        return {
          dbLoadSuccess: true,
          previousIteration: 1, // Assume previous is iteration 1
          currentIteration: 2, // Current is iteration 2
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
 * Save to DB node for elaboration.
 * Saves elaboration results and updates story state.
 */
export function createElaborationSaveToDbNode(
  storyRepo: StoryRepository | null,
  workflowRepo: WorkflowRepository | null,
) {
  return async (state: ElaborationState): Promise<Partial<ElaborationState>> => {
    // Skip if no repositories configured
    if (!storyRepo || !workflowRepo) {
      return {
        dbSaveSuccess: false,
      }
    }

    try {
      const passed = state.aggregatedFindings?.passed ?? false
      const readinessScore = state.updatedReadinessResult?.score ?? null
      const gapsCount = state.aggregatedFindings?.totalFindings ?? 0

      // Save elaboration content
      if (state.deltaReviewResult || state.aggregatedFindings) {
        await workflowRepo.saveElaboration(
          state.storyId,
          {
            deltaDetection: state.deltaDetectionResult,
            deltaReview: state.deltaReviewResult,
            escapeHatch: state.escapeHatchResult,
            aggregatedFindings: state.aggregatedFindings,
          },
          readinessScore,
          gapsCount,
          'elaboration-graph',
        )
      }

      // Update story state based on elaboration result
      const newState = passed ? 'ready-to-work' : 'backlog'
      const reason = passed
        ? 'Passed elaboration'
        : `Elaboration found ${gapsCount} issue(s) requiring attention`

      await saveToDb(state.storyId, storyRepo, workflowRepo, {
        storyState: newState,
        stateChangeReason: reason,
      }, {
        actor: 'elaboration-graph',
        updateStoryState: true,
        saveElaboration: false, // Already saved above
        savePlan: false,
        saveProof: false,
        saveVerification: false,
      })

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

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Determines the next node after initialization.
 */
function afterInitialize(state: ElaborationState): string {
  if (state.currentPhase === 'error') {
    return 'complete'
  }
  return 'load_from_db'
}

/**
 * Determines the next node after delta detection.
 */
function afterDeltaDetect(state: ElaborationState): string {
  if (!state.deltaDetected) {
    return 'aggregate'
  }
  return 'delta_review'
}

/**
 * Determines the next node after escape hatch evaluation.
 */
function afterEscapeHatch(state: ElaborationState): 'targeted_review' | 'aggregate' {
  if (state.escapeHatchTriggered) {
    return 'targeted_review'
  }
  return 'aggregate'
}

/**
 * Determines the next node after aggregation.
 */
function afterAggregate(state: ElaborationState): 'update_readiness' | 'save_to_db' {
  if (state.config?.recalculateReadiness) {
    return 'update_readiness'
  }
  return 'save_to_db'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates an elaboration graph with the specified configuration.
 *
 * Graph structure (with DB persistence):
 * START -> initialize -> load_from_db -> load_previous_version -> delta_detect
 *       -> delta_review -> escape_hatch_eval
 *       -> [targeted_review (if triggered)] -> aggregate
 *       -> [update_readiness (if configured)] -> save_to_db -> complete -> END
 *
 * @param config - Configuration for elaboration
 * @returns Compiled StateGraph for elaboration
 */
export function createElaborationGraph(config: Partial<ElaborationConfig> = {}) {
  const fullConfig = ElaborationConfigSchema.parse(config)

  // Get typed repositories if provided
  const storyRepo = fullConfig.storyRepo as StoryRepository | null ?? null
  const workflowRepo = fullConfig.workflowRepo as WorkflowRepository | null ?? null

  const graph = new StateGraph(ElaborationStateAnnotation)
    // Entry node: initialize workflow
    .addNode('initialize', createInitializeNode(fullConfig))

    // DB persistence: load existing state (optional)
    .addNode('load_from_db', createElaborationLoadFromDbNode(storyRepo, workflowRepo))

    // Load previous version for comparison
    .addNode('load_previous_version', createLoadPreviousVersionNode())

    // Delta detection node
    .addNode('delta_detect', createDeltaDetectNode())

    // Delta review node
    .addNode('delta_review', createDeltaReviewNode())

    // Escape hatch evaluation node
    .addNode('escape_hatch_eval', createEscapeHatchEvalNode())

    // Targeted review node (when escape hatch triggers)
    .addNode('targeted_review', createTargetedReviewNode())

    // Aggregation node
    .addNode('aggregate_findings', createAggregateNode())

    // Update readiness node
    .addNode('update_readiness', createUpdateReadinessNode())

    // DB persistence: save elaboration results
    .addNode('save_to_db', createElaborationSaveToDbNode(storyRepo, workflowRepo))

    // Complete node
    .addNode('complete', createCompleteNode())

    // Edges
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterInitialize, {
      load_from_db: 'load_from_db',
      complete: 'complete',
    })
    .addEdge('load_from_db', 'load_previous_version')
    .addEdge('load_previous_version', 'delta_detect')
    .addConditionalEdges('delta_detect', afterDeltaDetect, {
      delta_review: 'delta_review',
      aggregate: 'aggregate_findings',
    })
    .addEdge('delta_review', 'escape_hatch_eval')
    .addConditionalEdges('escape_hatch_eval', afterEscapeHatch, {
      targeted_review: 'targeted_review',
      aggregate: 'aggregate_findings',
    })
    .addEdge('targeted_review', 'aggregate_findings')
    .addConditionalEdges('aggregate_findings', afterAggregate, {
      update_readiness: 'update_readiness',
      save_to_db: 'save_to_db',
    })
    .addEdge('update_readiness', 'save_to_db')
    .addEdge('save_to_db', 'complete')
    .addEdge('complete', END)

  return graph.compile()
}

/**
 * Convenience function to run elaboration for a story.
 *
 * @param currentStory - Current version of the story
 * @param previousStory - Previous version of the story (optional)
 * @param config - Optional configuration
 * @returns Elaboration result
 */
export async function runElaboration(
  currentStory: SynthesizedStory,
  previousStory: SynthesizedStory | null = null,
  config: Partial<ElaborationConfig> = {},
): Promise<ElaborationResult> {
  const startTime = Date.now()
  const graph = createElaborationGraph(config)

  // Extract epic prefix from story ID
  const epicPrefix = currentStory.storyId.toLowerCase().split('-')[0]

  const initialState: Partial<ElaborationState> = {
    storyId: currentStory.storyId,
    epicPrefix,
    currentStory,
    previousStory,
    previousStoryLoaded: previousStory !== null,
    previousIteration: previousStory ? 1 : 0, // Assume previous is iteration 1 if exists
    currentIteration: previousStory ? 2 : 1, // Current is iteration 2 if previous exists
  }

  try {
    const result = await graph.invoke(initialState)
    const durationMs = Date.now() - startTime

    return ElaborationResultSchema.parse({
      storyId: result.storyId,
      phase: result.currentPhase,
      success: result.workflowSuccess ?? false,
      deltaDetectionResult: result.deltaDetectionResult,
      deltaReviewResult: result.deltaReviewResult,
      escapeHatchResult: result.escapeHatchResult,
      aggregatedFindings: result.aggregatedFindings,
      updatedReadinessResult: result.updatedReadinessResult,
      previousReadinessScore: result.previousReadinessResult?.score ?? null,
      newReadinessScore: result.updatedReadinessResult?.score ?? null,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
      durationMs,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during elaboration'

    return {
      storyId: currentStory.storyId,
      phase: 'error',
      success: false,
      deltaDetectionResult: null,
      deltaReviewResult: null,
      escapeHatchResult: null,
      aggregatedFindings: null,
      updatedReadinessResult: null,
      previousReadinessScore: null,
      newReadinessScore: null,
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
 * Node adapter for using elaboration within main workflow graphs.
 * Creates a tool node that runs the elaboration graph and returns results
 * in workflow state format.
 */
export const elaborationNode = createToolNode(
  'elaboration',
  async (state: GraphState): Promise<Partial<GraphStateWithElaboration>> => {
    const stateWithElaboration = state as GraphStateWithElaboration

    // Get stories
    const currentStory = stateWithElaboration.synthesizedStory
    const previousStory = stateWithElaboration.previousSynthesizedStory

    if (!currentStory) {
      return updateState({
        elaborationResult: null,
        elaborationComplete: false,
      } as Partial<GraphStateWithElaboration>)
    }

    // Run elaboration
    const result = await runElaboration(
      currentStory,
      previousStory ?? null,
      stateWithElaboration.elaborationConfig || {},
    )

    return updateState({
      elaborationResult: result,
      elaborationComplete: result.success,
    } as Partial<GraphStateWithElaboration>)
  },
)

/**
 * Creates an elaboration node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createElaborationNode(config: Partial<ElaborationConfig> = {}) {
  return createToolNode(
    'elaboration',
    async (state: GraphState): Promise<Partial<GraphStateWithElaboration>> => {
      const stateWithElaboration = state as GraphStateWithElaboration

      const currentStory = stateWithElaboration.synthesizedStory
      const previousStory = stateWithElaboration.previousSynthesizedStory

      if (!currentStory) {
        return updateState({
          elaborationResult: null,
          elaborationComplete: false,
        } as Partial<GraphStateWithElaboration>)
      }

      const result = await runElaboration(currentStory, previousStory ?? null, config)

      return updateState({
        elaborationResult: result,
        elaborationComplete: result.success,
      } as Partial<GraphStateWithElaboration>)
    },
  )
}
