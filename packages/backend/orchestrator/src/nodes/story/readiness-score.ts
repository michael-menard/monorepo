/**
 * Story Readiness Score Node
 *
 * Calculates convergence score from blockers, unknowns, and context strength.
 * Produces a readiness assessment indicating whether a story is ready for
 * implementation.
 *
 * FLOW-029: LangGraph Story Node - Readiness Scoring
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { BaselineReality, RetrievedContext } from '../reality/index.js'
import type { StoryStructure, GraphStateWithStorySeed } from './seed.js'
import type { HygieneResult, RankedGap } from './gap-hygiene.js'

/**
 * Ready threshold - score must be >= this to be considered ready.
 */
export const READINESS_THRESHOLD = 85

/**
 * Scoring deduction constants.
 */
export const SCORING_DEDUCTIONS = {
  /** Points deducted per MVP-blocking gap */
  PER_MVP_BLOCKING_GAP: 20,
  /** Points deducted per MVP-important gap */
  PER_MVP_IMPORTANT_GAP: 5,
  /** Points deducted per known unknown */
  PER_KNOWN_UNKNOWN: 3,
} as const

/**
 * Scoring addition constants.
 */
export const SCORING_ADDITIONS = {
  /** Points added for strong context alignment */
  STRONG_CONTEXT: 5,
  /** Points added for baseline alignment */
  BASELINE_ALIGNMENT: 5,
} as const

/**
 * Schema for readiness factors used in scoring.
 */
export const ReadinessFactorsSchema = z.object({
  /** Number of MVP-blocking gaps */
  mvpBlockingCount: z.number().int().min(0),
  /** Number of MVP-important gaps */
  mvpImportantCount: z.number().int().min(0),
  /** Number of known unknowns identified */
  knownUnknownsCount: z.number().int().min(0),
  /** Whether context strength is considered strong */
  hasStrongContext: z.boolean(),
  /** Whether baseline is aligned */
  hasBaselineAlignment: z.boolean(),
  /** Total gaps analyzed */
  totalGapsAnalyzed: z.number().int().min(0),
  /** Coverage of acceptance criteria */
  acCoverage: z.number().min(0).max(1).optional(),
})

export type ReadinessFactors = z.infer<typeof ReadinessFactorsSchema>

/**
 * Schema for a single score adjustment (deduction or addition).
 */
export const ScoreAdjustmentSchema = z.object({
  /** Reason for the adjustment */
  reason: z.string().min(1),
  /** Points adjusted (negative for deductions, positive for additions) */
  points: z.number().int(),
  /** Category of adjustment */
  category: z.enum(['blocker', 'gap', 'unknown', 'context', 'baseline', 'other']),
})

export type ScoreAdjustment = z.infer<typeof ScoreAdjustmentSchema>

/**
 * Schema for score breakdown.
 */
export const ScoreBreakdownSchema = z.object({
  /** Starting base score (always 100) */
  baseScore: z.literal(100),
  /** Deductions applied to base score */
  deductions: z.array(ScoreAdjustmentSchema),
  /** Additions applied to score */
  additions: z.array(ScoreAdjustmentSchema),
  /** Total deductions sum */
  totalDeductions: z.number().int().min(0),
  /** Total additions sum */
  totalAdditions: z.number().int().min(0),
  /** Final calculated score */
  finalScore: z.number().int().min(0).max(100),
})

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>

/**
 * Recommendation severity levels.
 */
export const RecommendationSeveritySchema = z.enum(['critical', 'important', 'suggestion'])

export type RecommendationSeverity = z.infer<typeof RecommendationSeveritySchema>

/**
 * Schema for a recommendation to improve readiness.
 */
export const ReadinessRecommendationSchema = z.object({
  /** Unique ID for the recommendation */
  id: z.string().min(1),
  /** Severity of the recommendation */
  severity: RecommendationSeveritySchema,
  /** Description of what to do */
  description: z.string().min(1),
  /** Expected points gain if addressed */
  expectedPointsGain: z.number().int().positive(),
  /** Related gap IDs if applicable */
  relatedGapIds: z.array(z.string()).default([]),
})

export type ReadinessRecommendation = z.infer<typeof ReadinessRecommendationSchema>

/**
 * Schema for the complete readiness result.
 */
export const ReadinessResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Final readiness score (0-100) */
  score: z.number().int().min(0).max(100),
  /** Detailed score breakdown */
  breakdown: ScoreBreakdownSchema,
  /** Whether the story is ready for implementation */
  ready: z.boolean(),
  /** Readiness threshold used */
  threshold: z.number().int().min(0).max(100),
  /** Factors used in scoring */
  factors: ReadinessFactorsSchema,
  /** Recommendations to improve readiness */
  recommendations: z.array(ReadinessRecommendationSchema).default([]),
  /** Summary narrative */
  summary: z.string().min(1),
  /** Confidence level in the assessment */
  confidence: z.enum(['high', 'medium', 'low']),
})

export type ReadinessResult = z.infer<typeof ReadinessResultSchema>

/**
 * Schema for readiness analysis configuration.
 */
export const ReadinessConfigSchema = z.object({
  /** Readiness threshold (score must be >= this) */
  threshold: z.number().int().min(0).max(100).default(READINESS_THRESHOLD),
  /** Points deducted per MVP-blocking gap */
  mvpBlockingDeduction: z
    .number()
    .int()
    .positive()
    .default(SCORING_DEDUCTIONS.PER_MVP_BLOCKING_GAP),
  /** Points deducted per MVP-important gap */
  mvpImportantDeduction: z
    .number()
    .int()
    .positive()
    .default(SCORING_DEDUCTIONS.PER_MVP_IMPORTANT_GAP),
  /** Points deducted per known unknown */
  unknownDeduction: z.number().int().positive().default(SCORING_DEDUCTIONS.PER_KNOWN_UNKNOWN),
  /** Points added for strong context */
  contextBonus: z.number().int().positive().default(SCORING_ADDITIONS.STRONG_CONTEXT),
  /** Points added for baseline alignment */
  baselineBonus: z.number().int().positive().default(SCORING_ADDITIONS.BASELINE_ALIGNMENT),
  /** Maximum recommendations to include */
  maxRecommendations: z.number().int().positive().default(5),
})

export type ReadinessConfig = z.infer<typeof ReadinessConfigSchema>

/**
 * Schema for readiness node result.
 */
export const ReadinessScoreResultSchema = z.object({
  /** The readiness analysis result */
  readinessResult: ReadinessResultSchema.nullable(),
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type ReadinessScoreResult = z.infer<typeof ReadinessScoreResultSchema>

/**
 * Counts the number of MVP-blocking gaps.
 *
 * @param rankedGaps - Array of ranked gaps from hygiene analysis
 * @returns Count of MVP-blocking gaps
 */
export function countBlockingGaps(rankedGaps: RankedGap[] | undefined | null): number {
  if (!rankedGaps || rankedGaps.length === 0) {
    return 0
  }

  return rankedGaps.filter(gap => gap.category === 'mvp_blocking' && !gap.resolved).length
}

/**
 * Counts the number of MVP-important gaps.
 *
 * @param rankedGaps - Array of ranked gaps from hygiene analysis
 * @returns Count of MVP-important gaps
 */
export function countImportantGaps(rankedGaps: RankedGap[] | undefined | null): number {
  if (!rankedGaps || rankedGaps.length === 0) {
    return 0
  }

  return rankedGaps.filter(gap => gap.category === 'mvp_important' && !gap.resolved).length
}

/**
 * Identifies known unknowns from story structure.
 * Known unknowns are explicitly flagged uncertainties or TBDs in the story.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Array of identified known unknowns
 */
export function identifyKnownUnknowns(storyStructure: StoryStructure | undefined | null): string[] {
  if (!storyStructure) {
    return []
  }

  const unknowns: string[] = []
  const tbdPatterns = [/\btbd\b/i, /\bto be determined\b/i, /\bunknown\b/i, /\?{2,}/, /\btbc\b/i]

  // Check description
  for (const pattern of tbdPatterns) {
    if (pattern.test(storyStructure.description)) {
      unknowns.push(`Description contains uncertainty: "${pattern.source}"`)
      break
    }
  }

  // Check acceptance criteria
  for (const ac of storyStructure.acceptanceCriteria) {
    for (const pattern of tbdPatterns) {
      if (pattern.test(ac.description)) {
        unknowns.push(`AC ${ac.id} contains uncertainty: "${pattern.source}"`)
        break
      }
    }
  }

  // Check constraints
  for (const constraint of storyStructure.constraints) {
    for (const pattern of tbdPatterns) {
      if (pattern.test(constraint)) {
        unknowns.push(`Constraint contains uncertainty: "${constraint.substring(0, 50)}..."`)
        break
      }
    }
  }

  return unknowns
}

/**
 * Counts known unknowns from story structure.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Count of known unknowns
 */
export function countUnknowns(storyStructure: StoryStructure | undefined | null): number {
  return identifyKnownUnknowns(storyStructure).length
}

/**
 * Assesses context strength based on baseline and retrieved context.
 *
 * @param baseline - The baseline reality
 * @param context - The retrieved context
 * @returns Object with strength assessment
 */
export function assessContextStrength(
  baseline: BaselineReality | undefined | null,
  context: RetrievedContext | undefined | null,
): { hasStrongContext: boolean; hasBaselineAlignment: boolean; reasons: string[] } {
  const reasons: string[] = []
  let hasStrongContext = false
  let hasBaselineAlignment = false

  // Check context strength
  if (context) {
    const filesLoaded = context.filesLoaded || 0
    const totalFound = context.totalFilesFound || 0

    // Strong context: at least 3 relevant files loaded
    if (filesLoaded >= 3) {
      hasStrongContext = true
      reasons.push(`Strong context: ${filesLoaded} relevant files loaded`)
    }

    // Additional bonus for high coverage
    if (totalFound > 0 && filesLoaded / totalFound >= 0.5) {
      reasons.push(`Good file coverage: ${Math.round((filesLoaded / totalFound) * 100)}%`)
    }
  }

  // Check baseline alignment
  if (baseline) {
    hasBaselineAlignment = true
    reasons.push('Baseline reality loaded and available')

    // Check for relevant baseline items
    const hasRelevantItems =
      (baseline.whatExists && baseline.whatExists.length > 0) ||
      (baseline.whatInProgress && baseline.whatInProgress.length > 0)

    if (hasRelevantItems) {
      reasons.push('Baseline contains relevant domain information')
    }
  }

  return { hasStrongContext, hasBaselineAlignment, reasons }
}

/**
 * Calculates the readiness score from factors.
 *
 * @param factors - The readiness factors
 * @param config - Scoring configuration
 * @returns Score breakdown with final score
 */
export function calculateReadinessScore(
  factors: ReadinessFactors,
  config: ReadinessConfig,
): ScoreBreakdown {
  const deductions: ScoreAdjustment[] = []
  const additions: ScoreAdjustment[] = []

  // Calculate deductions for MVP-blocking gaps
  if (factors.mvpBlockingCount > 0) {
    deductions.push({
      reason: `${factors.mvpBlockingCount} MVP-blocking gap(s) identified`,
      points: -(factors.mvpBlockingCount * config.mvpBlockingDeduction),
      category: 'blocker',
    })
  }

  // Calculate deductions for MVP-important gaps
  if (factors.mvpImportantCount > 0) {
    deductions.push({
      reason: `${factors.mvpImportantCount} MVP-important gap(s) identified`,
      points: -(factors.mvpImportantCount * config.mvpImportantDeduction),
      category: 'gap',
    })
  }

  // Calculate deductions for known unknowns
  if (factors.knownUnknownsCount > 0) {
    deductions.push({
      reason: `${factors.knownUnknownsCount} known unknown(s) in story definition`,
      points: -(factors.knownUnknownsCount * config.unknownDeduction),
      category: 'unknown',
    })
  }

  // Calculate additions for strong context
  if (factors.hasStrongContext) {
    additions.push({
      reason: 'Strong context alignment with codebase',
      points: config.contextBonus,
      category: 'context',
    })
  }

  // Calculate additions for baseline alignment
  if (factors.hasBaselineAlignment) {
    additions.push({
      reason: 'Baseline reality grounding available',
      points: config.baselineBonus,
      category: 'baseline',
    })
  }

  // Calculate totals
  const totalDeductions = Math.abs(deductions.reduce((sum, d) => sum + d.points, 0))
  const totalAdditions = additions.reduce((sum, a) => sum + a.points, 0)

  // Calculate final score (clamped to 0-100)
  const rawScore = 100 - totalDeductions + totalAdditions
  const finalScore = Math.max(0, Math.min(100, rawScore))

  return {
    baseScore: 100,
    deductions,
    additions,
    totalDeductions,
    totalAdditions,
    finalScore,
  }
}

/**
 * Generates recommendations based on factors and breakdown.
 *
 * @param factors - The readiness factors
 * @param rankedGaps - The ranked gaps (for reference)
 * @param config - Configuration options
 * @returns Array of recommendations
 */
export function generateRecommendations(
  factors: ReadinessFactors,
  rankedGaps: RankedGap[] | undefined | null,
  config: ReadinessConfig,
): ReadinessRecommendation[] {
  const recommendations: ReadinessRecommendation[] = []
  let recNumber = 1

  // Critical: Address MVP-blocking gaps
  if (factors.mvpBlockingCount > 0) {
    const blockingGaps = rankedGaps?.filter(g => g.category === 'mvp_blocking' && !g.resolved) || []

    recommendations.push({
      id: `REC-${String(recNumber++).padStart(3, '0')}`,
      severity: 'critical',
      description: `Resolve ${factors.mvpBlockingCount} MVP-blocking gap(s) before implementation`,
      expectedPointsGain: factors.mvpBlockingCount * config.mvpBlockingDeduction,
      relatedGapIds: blockingGaps.map(g => g.id),
    })
  }

  // Important: Address known unknowns
  if (factors.knownUnknownsCount > 0) {
    recommendations.push({
      id: `REC-${String(recNumber++).padStart(3, '0')}`,
      severity: 'important',
      description: `Clarify ${factors.knownUnknownsCount} known unknown(s) in story definition`,
      expectedPointsGain: factors.knownUnknownsCount * config.unknownDeduction,
      relatedGapIds: [],
    })
  }

  // Important: Improve context if weak
  if (!factors.hasStrongContext) {
    recommendations.push({
      id: `REC-${String(recNumber++).padStart(3, '0')}`,
      severity: 'important',
      description: 'Retrieve more relevant codebase context for better grounding',
      expectedPointsGain: config.contextBonus,
      relatedGapIds: [],
    })
  }

  // Suggestion: Add baseline if missing
  if (!factors.hasBaselineAlignment) {
    recommendations.push({
      id: `REC-${String(recNumber++).padStart(3, '0')}`,
      severity: 'suggestion',
      description: 'Load baseline reality for better domain understanding',
      expectedPointsGain: config.baselineBonus,
      relatedGapIds: [],
    })
  }

  // Suggestion: Address MVP-important gaps
  if (factors.mvpImportantCount > 0) {
    const importantGaps =
      rankedGaps?.filter(g => g.category === 'mvp_important' && !g.resolved) || []

    recommendations.push({
      id: `REC-${String(recNumber++).padStart(3, '0')}`,
      severity: 'suggestion',
      description: `Consider addressing ${factors.mvpImportantCount} MVP-important gap(s) to improve quality`,
      expectedPointsGain: factors.mvpImportantCount * config.mvpImportantDeduction,
      relatedGapIds: importantGaps.slice(0, 5).map(g => g.id),
    })
  }

  // Sort by severity and limit
  const severityOrder: Record<RecommendationSeverity, number> = {
    critical: 0,
    important: 1,
    suggestion: 2,
  }

  return recommendations
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, config.maxRecommendations)
}

/**
 * Generates summary narrative for readiness assessment.
 *
 * @param score - The final readiness score
 * @param ready - Whether the story is ready
 * @param factors - The readiness factors
 * @returns Summary string
 */
export function generateSummary(score: number, ready: boolean, factors: ReadinessFactors): string {
  const parts: string[] = []

  parts.push(`Readiness score: ${score}/100.`)

  if (ready) {
    parts.push('Story is READY for implementation.')
  } else {
    parts.push('Story is NOT READY for implementation.')
  }

  if (factors.mvpBlockingCount > 0) {
    parts.push(`${factors.mvpBlockingCount} MVP-blocking gap(s) require immediate attention.`)
  }

  if (factors.knownUnknownsCount > 0) {
    parts.push(`${factors.knownUnknownsCount} known unknown(s) need clarification.`)
  }

  if (factors.hasStrongContext && factors.hasBaselineAlignment) {
    parts.push('Story is well-grounded in codebase reality.')
  } else if (!factors.hasStrongContext && !factors.hasBaselineAlignment) {
    parts.push('Story lacks grounding in codebase reality.')
  }

  return parts.join(' ')
}

/**
 * Determines confidence level based on data quality.
 *
 * @param factors - The readiness factors
 * @param hasHygieneResult - Whether hygiene analysis was performed
 * @returns Confidence level
 */
export function determineConfidence(
  factors: ReadinessFactors,
  hasHygieneResult: boolean,
): 'high' | 'medium' | 'low' {
  let confidenceScore = 0

  // Hygiene analysis performed
  if (hasHygieneResult && factors.totalGapsAnalyzed > 0) {
    confidenceScore += 2
  }

  // Strong context available
  if (factors.hasStrongContext) {
    confidenceScore += 1
  }

  // Baseline alignment
  if (factors.hasBaselineAlignment) {
    confidenceScore += 1
  }

  // Multiple gaps analyzed (thorough review)
  if (factors.totalGapsAnalyzed >= 5) {
    confidenceScore += 1
  }

  if (confidenceScore >= 4) return 'high'
  if (confidenceScore >= 2) return 'medium'
  return 'low'
}

/**
 * Generates comprehensive readiness analysis.
 *
 * @param storyStructure - The story structure to analyze
 * @param rankedGaps - Ranked gaps from hygiene analysis
 * @param baseline - The baseline reality
 * @param context - The retrieved context
 * @param config - Configuration options
 * @returns Readiness score result
 */
export async function generateReadinessAnalysis(
  storyStructure: StoryStructure | undefined | null,
  rankedGaps: RankedGap[] | undefined | null,
  baseline: BaselineReality | undefined | null,
  context: RetrievedContext | undefined | null,
  config: Partial<ReadinessConfig> = {},
): Promise<ReadinessScoreResult> {
  const fullConfig = ReadinessConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    // Require story structure
    if (!storyStructure) {
      return {
        readinessResult: null,
        analyzed: false,
        error: 'Story structure is required for readiness analysis',
        warnings,
      }
    }

    // Warn if no hygiene result
    if (!rankedGaps || rankedGaps.length === 0) {
      warnings.push('No gap hygiene analysis available - scoring may be incomplete')
    }

    // Count factors
    const mvpBlockingCount = countBlockingGaps(rankedGaps)
    const mvpImportantCount = countImportantGaps(rankedGaps)
    const knownUnknownsCount = countUnknowns(storyStructure)
    const contextStrength = assessContextStrength(baseline, context)

    const factors: ReadinessFactors = {
      mvpBlockingCount,
      mvpImportantCount,
      knownUnknownsCount,
      hasStrongContext: contextStrength.hasStrongContext,
      hasBaselineAlignment: contextStrength.hasBaselineAlignment,
      totalGapsAnalyzed: rankedGaps?.length || 0,
    }

    // Calculate score
    const breakdown = calculateReadinessScore(factors, fullConfig)
    const score = breakdown.finalScore
    const ready = score >= fullConfig.threshold

    // Generate recommendations
    const recommendations = generateRecommendations(factors, rankedGaps, fullConfig)

    // Generate summary
    const summary = generateSummary(score, ready, factors)

    // Determine confidence
    const confidence = determineConfidence(factors, rankedGaps !== null && rankedGaps !== undefined)

    const readinessResult: ReadinessResult = {
      storyId: storyStructure.storyId,
      analyzedAt: new Date().toISOString(),
      score,
      breakdown,
      ready,
      threshold: fullConfig.threshold,
      factors,
      recommendations,
      summary,
      confidence,
    }

    // Validate against schema
    const validated = ReadinessResultSchema.parse(readinessResult)

    return {
      readinessResult: validated,
      analyzed: true,
      warnings,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during readiness analysis'
    return {
      readinessResult: null,
      analyzed: false,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Extended graph state with readiness score analysis.
 */
export interface GraphStateWithReadiness extends GraphStateWithStorySeed {
  /** Gap hygiene result (from FLOW-028) */
  gapHygieneResult?: HygieneResult | null
  /** Readiness score result */
  readinessResult?: ReadinessResult | null
  /** Whether readiness was successfully analyzed */
  readinessAnalyzed?: boolean
  /** Warnings from readiness analysis */
  readinessWarnings?: string[]
}

/**
 * Story Readiness Score node implementation.
 *
 * Calculates convergence score from blockers, unknowns, and context strength.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have story structure, optionally gaps and context)
 * @returns Partial state update with readiness analysis
 */
export const storyReadinessScoreNode = createToolNode(
  'story_readiness_score',
  async (state: GraphState): Promise<Partial<GraphStateWithReadiness>> => {
    const stateWithContext = state as GraphStateWithReadiness

    // Require story structure
    if (!stateWithContext.storyStructure) {
      return updateState({
        readinessResult: null,
        readinessAnalyzed: false,
        readinessWarnings: ['No story structure available - run seed node first'],
      } as Partial<GraphStateWithReadiness>)
    }

    const result = await generateReadinessAnalysis(
      stateWithContext.storyStructure,
      stateWithContext.gapHygieneResult?.rankedGaps,
      stateWithContext.baselineReality,
      stateWithContext.retrievedContext,
    )

    if (!result.analyzed) {
      return updateState({
        readinessResult: null,
        readinessAnalyzed: false,
        readinessWarnings: result.warnings,
      } as Partial<GraphStateWithReadiness>)
    }

    return updateState({
      readinessResult: result.readinessResult,
      readinessAnalyzed: true,
      readinessWarnings: result.warnings,
    } as Partial<GraphStateWithReadiness>)
  },
)

/**
 * Creates a readiness score node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createReadinessScoreNode(config: Partial<ReadinessConfig> = {}) {
  return createToolNode(
    'story_readiness_score',
    async (state: GraphState): Promise<Partial<GraphStateWithReadiness>> => {
      const stateWithContext = state as GraphStateWithReadiness

      // Require story structure
      if (!stateWithContext.storyStructure) {
        throw new Error('Story structure is required for readiness analysis')
      }

      const result = await generateReadinessAnalysis(
        stateWithContext.storyStructure,
        stateWithContext.gapHygieneResult?.rankedGaps,
        stateWithContext.baselineReality,
        stateWithContext.retrievedContext,
        config,
      )

      if (!result.analyzed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          readinessResult: null,
          readinessAnalyzed: false,
          readinessWarnings: result.warnings,
        } as Partial<GraphStateWithReadiness>)
      }

      return updateState({
        readinessResult: result.readinessResult,
        readinessAnalyzed: true,
        readinessWarnings: result.warnings,
      } as Partial<GraphStateWithReadiness>)
    },
  )
}
