/**
 * Story Gap Hygiene Node
 *
 * Ranks gaps from all fanout analyses and maintains history without deletion.
 * Merges similar gaps, calculates scores, assigns categories, and produces
 * a unified ranked gap list for downstream consumption.
 *
 * FLOW-028: LangGraph Story Node - Gap Hygiene
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { GraphStateWithStorySeed } from './seed.js'
import type {
  PMGapStructure,
  ScopeGap,
  RequirementGap,
  DependencyGap,
  PriorityGap,
} from './fanout-pm.js'
import type {
  UXGapAnalysis,
  AccessibilityGap,
  UsabilityGap,
  DesignPatternGap,
  UserFlowGap,
} from './fanout-ux.js'
import type {
  QAGapAnalysis,
  TestabilityGap,
  EdgeCaseGap,
  AcClarityGap,
  CoverageGap,
} from './fanout-qa.js'
import type { AttackAnalysis, AttackEdgeCase } from './attack.js'

/**
 * Gap categories for prioritization.
 */
export const GapCategorySchema = z.enum([
  'mvp_blocking', // Must be resolved before MVP (score >= 20)
  'mvp_important', // Should be resolved for MVP (score >= 12)
  'future', // Can be deferred to future iterations (score >= 5)
  'deferred', // Low priority, track but defer (score < 5)
])

export type GapCategory = z.infer<typeof GapCategorySchema>

/**
 * Gap source types - where the gap originated from.
 */
export const GapSourceSchema = z.enum([
  'pm_scope',
  'pm_requirement',
  'pm_dependency',
  'pm_priority',
  'ux_accessibility',
  'ux_usability',
  'ux_design_pattern',
  'ux_user_flow',
  'qa_testability',
  'qa_edge_case',
  'qa_ac_clarity',
  'qa_coverage',
  'attack_edge_case',
  'attack_assumption',
])

export type GapSource = z.infer<typeof GapSourceSchema>

/**
 * History action types for tracking gap changes.
 */
export const HistoryActionSchema = z.enum([
  'created', // Gap was first identified
  'merged', // Gap was merged with similar gap
  'recategorized', // Gap category changed
  'rescored', // Gap score recalculated
  'acknowledged', // Gap was acknowledged by team
  'resolved', // Gap was resolved (but kept in history)
  'deferred', // Gap was explicitly deferred
])

export type HistoryAction = z.infer<typeof HistoryActionSchema>

/**
 * Single history entry for a gap.
 */
export const GapHistoryEntrySchema = z.object({
  /** Action taken on the gap */
  action: HistoryActionSchema,
  /** Timestamp of the action */
  timestamp: z.string().datetime(),
  /** Previous value if applicable */
  previousValue: z.string().optional(),
  /** New value if applicable */
  newValue: z.string().optional(),
  /** Optional notes about the action */
  notes: z.string().optional(),
})

export type GapHistoryEntry = z.infer<typeof GapHistoryEntrySchema>

/**
 * Gap history - array of all changes to a gap (never deleted).
 */
export const GapHistorySchema = z.array(GapHistoryEntrySchema)

export type GapHistory = z.infer<typeof GapHistorySchema>

/**
 * Severity normalization for different gap sources.
 * Maps various severity scales to 1-5.
 */
const SEVERITY_MAPPINGS: Record<string, number> = {
  // PM gaps use 1-5 directly
  // UX gaps
  critical: 5,
  major: 4,
  minor: 2,
  suggestion: 1,
  // QA gaps
  high: 4,
  medium: 3,
  low: 2,
  // Attack likelihood
  certain: 5,
  likely: 4,
  possible: 3,
  unlikely: 2,
  rare: 1,
  // Attack impact
  critical_impact: 5,
  high_impact: 4,
  medium_impact: 3,
  low_impact: 2,
  negligible: 1,
}

/**
 * Likelihood values for score calculation.
 */
const LIKELIHOOD_VALUES: Record<string, number> = {
  certain: 5,
  likely: 4,
  possible: 3,
  unlikely: 2,
  rare: 1,
  high: 4,
  medium: 3,
  low: 2,
}

/**
 * Impact values for score calculation.
 */
const IMPACT_VALUES: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  negligible: 1,
}

/**
 * Base gap structure for ranking.
 */
export const BaseRankedGapSchema = z.object({
  /** Unique ID for the ranked gap (e.g., "RG-001") */
  id: z.string().min(1),
  /** Original gap ID from source analysis */
  originalId: z.string().min(1),
  /** Source of the gap */
  source: GapSourceSchema,
  /** Description of the gap */
  description: z.string().min(1),
  /** Calculated score (1-25, severity * likelihood) */
  score: z.number().int().min(1).max(25),
  /** Normalized severity (1-5) */
  severity: z.number().int().min(1).max(5),
  /** Likelihood of occurrence (1-5) */
  likelihood: z.number().int().min(1).max(5),
  /** Assigned category based on score */
  category: GapCategorySchema,
  /** Suggested remediation or action */
  suggestion: z.string().optional(),
  /** Related acceptance criteria IDs */
  relatedACs: z.array(z.string()).default([]),
  /** IDs of gaps this was merged with (if any) */
  mergedFrom: z.array(z.string()).default([]),
  /** Full history of this gap (never deleted) */
  history: GapHistorySchema,
  /** Whether gap has been resolved */
  resolved: z.boolean().default(false),
  /** Whether gap has been acknowledged */
  acknowledged: z.boolean().default(false),
})

export type RankedGap = z.infer<typeof BaseRankedGapSchema>

/**
 * Deduplication statistics.
 */
export const DeduplicationStatsSchema = z.object({
  /** Total gaps before deduplication */
  totalBefore: z.number().int().min(0),
  /** Total gaps after deduplication */
  totalAfter: z.number().int().min(0),
  /** Number of gaps merged */
  merged: z.number().int().min(0),
  /** Merge groups (what was merged with what) */
  mergeGroups: z
    .array(
      z.object({
        /** ID of the primary gap */
        primaryId: z.string(),
        /** IDs of gaps merged into primary */
        mergedIds: z.array(z.string()),
      }),
    )
    .default([]),
})

export type DeduplicationStats = z.infer<typeof DeduplicationStatsSchema>

/**
 * Category counts for summary.
 */
export const CategoryCountsSchema = z.object({
  mvp_blocking: z.number().int().min(0),
  mvp_important: z.number().int().min(0),
  future: z.number().int().min(0),
  deferred: z.number().int().min(0),
})

export type CategoryCounts = z.infer<typeof CategoryCountsSchema>

/**
 * Complete hygiene analysis result.
 */
export const HygieneResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** All ranked gaps sorted by score (descending) */
  rankedGaps: z.array(BaseRankedGapSchema).default([]),
  /** Deduplication statistics */
  deduplicationStats: DeduplicationStatsSchema,
  /** Counts by category */
  categoryCounts: CategoryCountsSchema,
  /** Total number of gaps */
  totalGaps: z.number().int().min(0),
  /** Number of MVP-blocking gaps */
  mvpBlockingCount: z.number().int().min(0),
  /** Highest gap score */
  highestScore: z.number().int().min(0).max(25),
  /** Average gap score */
  averageScore: z.number().min(0).max(25),
  /** Summary narrative */
  summary: z.string().min(1),
  /** Key action items */
  actionItems: z.array(z.string()).default([]),
})

export type HygieneResult = z.infer<typeof HygieneResultSchema>

/**
 * Configuration for gap hygiene analysis.
 */
export const HygieneConfigSchema = z.object({
  /** Maximum gaps to include in result */
  maxGaps: z.number().int().positive().default(50),
  /** Minimum score threshold to include gap */
  minScore: z.number().int().min(1).max(25).default(1),
  /** Whether to enable deduplication */
  enableDeduplication: z.boolean().default(true),
  /** Similarity threshold for deduplication (0-1) */
  similarityThreshold: z.number().min(0).max(1).default(0.7),
  /** Whether to include resolved gaps */
  includeResolved: z.boolean().default(false),
  /** Category score thresholds */
  categoryThresholds: z
    .object({
      mvp_blocking: z.number().int().min(1).max(25).default(20),
      mvp_important: z.number().int().min(1).max(25).default(12),
      future: z.number().int().min(1).max(25).default(5),
    })
    .default({}),
})

export type HygieneConfig = z.infer<typeof HygieneConfigSchema>

/**
 * Result from gap hygiene node.
 */
export const GapHygieneResultSchema = z.object({
  /** The hygiene analysis result */
  hygieneResult: HygieneResultSchema.nullable(),
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type GapHygieneResult = z.infer<typeof GapHygieneResultSchema>

/**
 * Internal gap structure for processing.
 */
interface InternalGap {
  id: string
  source: GapSource
  description: string
  severity: number
  likelihood: number
  suggestion?: string
  relatedACs: string[]
}

/**
 * Normalizes severity from various scales to 1-5.
 *
 * @param severityValue - Raw severity value (string or number)
 * @returns Normalized severity 1-5
 */
function normalizeSeverity(severityValue: string | number): number {
  if (typeof severityValue === 'number') {
    return Math.max(1, Math.min(5, severityValue))
  }

  const lower = severityValue.toLowerCase()
  return SEVERITY_MAPPINGS[lower] ?? 3
}

/**
 * Calculates gap score from severity and likelihood.
 *
 * @param severity - Severity 1-5
 * @param likelihood - Likelihood 1-5
 * @returns Score 1-25
 */
export function calculateGapScore(severity: number, likelihood: number): number {
  return Math.max(1, Math.min(25, severity * likelihood))
}

/**
 * Categorizes a gap based on its score.
 *
 * @param score - Gap score 1-25
 * @param thresholds - Category thresholds
 * @returns Gap category
 */
export function categorizeGap(
  score: number,
  thresholds: { mvp_blocking: number; mvp_important: number; future: number } = {
    mvp_blocking: 20,
    mvp_important: 12,
    future: 5,
  },
): GapCategory {
  if (score >= thresholds.mvp_blocking) return 'mvp_blocking'
  if (score >= thresholds.mvp_important) return 'mvp_important'
  if (score >= thresholds.future) return 'future'
  return 'deferred'
}

/**
 * Records a history entry for a gap (never deletes previous history).
 *
 * @param gap - The gap to update
 * @param action - The action being taken
 * @param previousValue - Previous value if applicable
 * @param newValue - New value if applicable
 * @param notes - Optional notes
 * @returns Updated gap with new history entry
 */
export function recordHistory(
  gap: RankedGap,
  action: HistoryAction,
  previousValue?: string,
  newValue?: string,
  notes?: string,
): RankedGap {
  const historyEntry: GapHistoryEntry = {
    action,
    timestamp: new Date().toISOString(),
    previousValue,
    newValue,
    notes,
  }

  return {
    ...gap,
    history: [...gap.history, historyEntry],
  }
}

/**
 * Calculates Jaccard similarity between two strings.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score 0-1
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(
    str1
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2),
  )
  const words2 = new Set(
    str2
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2),
  )

  if (words1.size === 0 && words2.size === 0) return 1
  if (words1.size === 0 || words2.size === 0) return 0

  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])

  return intersection.size / union.size
}

/**
 * Converts PM gaps to internal gap format.
 */
function convertPMGaps(pmGaps: PMGapStructure): InternalGap[] {
  const gaps: InternalGap[] = []

  pmGaps.scopeGaps.forEach((gap: ScopeGap) => {
    gaps.push({
      id: gap.id,
      source: 'pm_scope',
      description: gap.description,
      severity: gap.severity,
      likelihood: 3, // Default medium likelihood for PM gaps
      suggestion: gap.suggestion,
      relatedACs: gap.relatedACs,
    })
  })

  pmGaps.requirementGaps.forEach((gap: RequirementGap) => {
    gaps.push({
      id: gap.id,
      source: 'pm_requirement',
      description: gap.description,
      severity: gap.severity,
      likelihood: gap.category === 'missing' ? 4 : 3,
      suggestion: gap.suggestion,
      relatedACs: [],
    })
  })

  pmGaps.dependencyGaps.forEach((gap: DependencyGap) => {
    gaps.push({
      id: gap.id,
      source: 'pm_dependency',
      description: gap.description,
      severity: gap.severity,
      likelihood: gap.category === 'blocking' ? 4 : 3,
      suggestion: gap.suggestion,
      relatedACs: [],
    })
  })

  pmGaps.priorityGaps.forEach((gap: PriorityGap) => {
    gaps.push({
      id: gap.id,
      source: 'pm_priority',
      description: gap.description,
      severity: gap.severity,
      likelihood: gap.affectsPlanning ? 4 : 2,
      suggestion: gap.suggestion,
      relatedACs: [],
    })
  })

  return gaps
}

/**
 * Converts UX gaps to internal gap format.
 */
function convertUXGaps(uxGaps: UXGapAnalysis): InternalGap[] {
  const gaps: InternalGap[] = []

  uxGaps.accessibilityGaps.forEach((gap: AccessibilityGap) => {
    gaps.push({
      id: gap.id,
      source: 'ux_accessibility',
      description: gap.description,
      severity: normalizeSeverity(gap.severity),
      likelihood: gap.wcagCriterion.level === 'A' ? 5 : gap.wcagCriterion.level === 'AA' ? 4 : 3,
      suggestion: gap.recommendation,
      relatedACs: gap.affectedACs,
    })
  })

  uxGaps.usabilityGaps.forEach((gap: UsabilityGap) => {
    gaps.push({
      id: gap.id,
      source: 'ux_usability',
      description: gap.description,
      severity: normalizeSeverity(gap.severity),
      likelihood: 3,
      suggestion: gap.recommendation,
      relatedACs: gap.affectedACs,
    })
  })

  uxGaps.designPatternGaps.forEach((gap: DesignPatternGap) => {
    gaps.push({
      id: gap.id,
      source: 'ux_design_pattern',
      description: gap.description,
      severity: normalizeSeverity(gap.severity),
      likelihood: 3,
      suggestion: gap.recommendation,
      relatedACs: gap.affectedACs,
    })
  })

  uxGaps.userFlowGaps.forEach((gap: UserFlowGap) => {
    gaps.push({
      id: gap.id,
      source: 'ux_user_flow',
      description: gap.description,
      severity: normalizeSeverity(gap.severity),
      likelihood: 3,
      suggestion: gap.recommendation,
      relatedACs: gap.affectedACs,
    })
  })

  return gaps
}

/**
 * Converts QA gaps to internal gap format.
 */
function convertQAGaps(qaGaps: QAGapAnalysis): InternalGap[] {
  const gaps: InternalGap[] = []

  qaGaps.testabilityGaps.forEach((gap: TestabilityGap) => {
    gaps.push({
      id: gap.id,
      source: 'qa_testability',
      description: gap.description,
      severity: LIKELIHOOD_VALUES[gap.severity] ?? 3,
      likelihood: gap.category === 'external' ? 4 : 3,
      suggestion: gap.suggestion,
      relatedACs: gap.relatedAcId ? [gap.relatedAcId] : [],
    })
  })

  qaGaps.edgeCaseGaps.forEach((gap: EdgeCaseGap) => {
    gaps.push({
      id: gap.id,
      source: 'qa_edge_case',
      description: gap.description,
      severity: LIKELIHOOD_VALUES[gap.severity] ?? 3,
      likelihood: gap.category === 'security' ? 4 : 3,
      suggestion: gap.example,
      relatedACs: gap.relatedAcId ? [gap.relatedAcId] : [],
    })
  })

  qaGaps.acClarityGaps.forEach((gap: AcClarityGap) => {
    gaps.push({
      id: gap.id,
      source: 'qa_ac_clarity',
      description: gap.description,
      severity: gap.category === 'untestable' ? 4 : 3,
      likelihood: 4, // Clarity issues almost certainly will cause problems
      suggestion: gap.suggestedRewrite,
      relatedACs: [gap.acId],
    })
  })

  qaGaps.coverageGaps.forEach((gap: CoverageGap) => {
    gaps.push({
      id: gap.id,
      source: 'qa_coverage',
      description: gap.description,
      severity: LIKELIHOOD_VALUES[gap.priority] ?? 3,
      likelihood: 4,
      suggestion: gap.testApproach,
      relatedACs: [],
    })
  })

  return gaps
}

/**
 * Converts attack findings to internal gap format.
 */
function convertAttackFindings(attackAnalysis: AttackAnalysis): InternalGap[] {
  const gaps: InternalGap[] = []

  attackAnalysis.edgeCases.forEach((ec: AttackEdgeCase) => {
    gaps.push({
      id: ec.id,
      source: 'attack_edge_case',
      description: ec.description,
      severity: IMPACT_VALUES[ec.impact] ?? 3,
      likelihood: LIKELIHOOD_VALUES[ec.likelihood] ?? 3,
      suggestion: ec.mitigation,
      relatedACs: ec.relatedAssumptionId ? [ec.relatedAssumptionId] : [],
    })
  })

  // Also include challenged assumptions that are invalid or partially valid
  attackAnalysis.challengeResults
    .filter(cr => cr.validity === 'invalid' || cr.validity === 'partially_valid')
    .forEach(cr => {
      gaps.push({
        id: `ATK-ASM-${cr.assumption.id}`,
        source: 'attack_assumption',
        description: `Challenged assumption: ${cr.assumption.description}`,
        severity: cr.validity === 'invalid' ? 4 : 3,
        likelihood: cr.validity === 'invalid' ? 4 : 3,
        suggestion: cr.remediation,
        relatedACs: [],
      })
    })

  return gaps
}

/**
 * Deduplicates gaps by merging similar ones.
 *
 * @param gaps - All internal gaps
 * @param threshold - Similarity threshold for merging
 * @returns Deduplicated gaps and statistics
 */
export function deduplicateGaps(
  pmGaps: PMGapStructure | null | undefined,
  uxGaps: UXGapAnalysis | null | undefined,
  qaGaps: QAGapAnalysis | null | undefined,
  attackFindings: AttackAnalysis | null | undefined,
  threshold: number = 0.7,
): { gaps: InternalGap[]; stats: DeduplicationStats } {
  // Convert all gaps to internal format
  const allGaps: InternalGap[] = []

  if (pmGaps) {
    allGaps.push(...convertPMGaps(pmGaps))
  }
  if (uxGaps) {
    allGaps.push(...convertUXGaps(uxGaps))
  }
  if (qaGaps) {
    allGaps.push(...convertQAGaps(qaGaps))
  }
  if (attackFindings) {
    allGaps.push(...convertAttackFindings(attackFindings))
  }

  const totalBefore = allGaps.length
  const mergedSet = new Set<number>()
  const mergeGroups: { primaryId: string; mergedIds: string[] }[] = []

  // Group similar gaps
  for (let i = 0; i < allGaps.length; i++) {
    if (mergedSet.has(i)) continue

    const mergedIds: string[] = []

    for (let j = i + 1; j < allGaps.length; j++) {
      if (mergedSet.has(j)) continue

      const similarity = calculateSimilarity(allGaps[i].description, allGaps[j].description)

      if (similarity >= threshold) {
        mergedSet.add(j)
        mergedIds.push(allGaps[j].id)

        // Merge properties - take highest severity/likelihood
        allGaps[i].severity = Math.max(allGaps[i].severity, allGaps[j].severity)
        allGaps[i].likelihood = Math.max(allGaps[i].likelihood, allGaps[j].likelihood)

        // Merge related ACs
        allGaps[i].relatedACs = [...new Set([...allGaps[i].relatedACs, ...allGaps[j].relatedACs])]

        // Combine suggestions if different
        if (allGaps[j].suggestion && allGaps[j].suggestion !== allGaps[i].suggestion) {
          allGaps[i].suggestion = allGaps[i].suggestion
            ? `${allGaps[i].suggestion}; ${allGaps[j].suggestion}`
            : allGaps[j].suggestion
        }
      }
    }

    if (mergedIds.length > 0) {
      mergeGroups.push({ primaryId: allGaps[i].id, mergedIds })
    }
  }

  // Filter out merged gaps
  const deduplicatedGaps = allGaps.filter((_, index) => !mergedSet.has(index))

  return {
    gaps: deduplicatedGaps,
    stats: {
      totalBefore,
      totalAfter: deduplicatedGaps.length,
      merged: mergedSet.size,
      mergeGroups,
    },
  }
}

/**
 * Ranks gaps by score in descending order.
 *
 * @param gaps - Internal gaps to rank
 * @param config - Configuration for ranking
 * @returns Array of ranked gaps
 */
export function rankGaps(gaps: InternalGap[], config: HygieneConfig): RankedGap[] {
  const now = new Date().toISOString()
  let gapNumber = 1

  const rankedGaps: RankedGap[] = gaps.map(gap => {
    const score = calculateGapScore(gap.severity, gap.likelihood)
    const category = categorizeGap(score, config.categoryThresholds)

    return {
      id: `RG-${String(gapNumber++).padStart(3, '0')}`,
      originalId: gap.id,
      source: gap.source,
      description: gap.description,
      score,
      severity: gap.severity,
      likelihood: gap.likelihood,
      category,
      suggestion: gap.suggestion,
      relatedACs: gap.relatedACs,
      mergedFrom: [],
      history: [
        {
          action: 'created' as const,
          timestamp: now,
          notes: `Created from ${gap.source} gap ${gap.id}`,
        },
      ],
      resolved: false,
      acknowledged: false,
    }
  })

  // Sort by score descending
  rankedGaps.sort((a, b) => b.score - a.score)

  // Apply score filter
  const filteredGaps = rankedGaps.filter(g => g.score >= config.minScore)

  // Apply limit
  return filteredGaps.slice(0, config.maxGaps)
}

/**
 * Generates summary narrative from hygiene results.
 *
 * @param rankedGaps - Ranked gaps
 * @param categoryCounts - Counts by category
 * @returns Summary string
 */
function generateSummary(rankedGaps: RankedGap[], categoryCounts: CategoryCounts): string {
  const total = rankedGaps.length

  if (total === 0) {
    return 'No gaps identified across all analyses. Story appears well-defined.'
  }

  const parts: string[] = []

  parts.push(`Identified ${total} gap(s) across all analyses.`)

  if (categoryCounts.mvp_blocking > 0) {
    parts.push(
      `CRITICAL: ${categoryCounts.mvp_blocking} gap(s) are MVP-blocking and require immediate attention.`,
    )
  }

  if (categoryCounts.mvp_important > 0) {
    parts.push(`${categoryCounts.mvp_important} gap(s) are important for MVP.`)
  }

  if (categoryCounts.future > 0) {
    parts.push(`${categoryCounts.future} gap(s) can be deferred to future iterations.`)
  }

  if (categoryCounts.deferred > 0) {
    parts.push(`${categoryCounts.deferred} gap(s) are low priority.`)
  }

  return parts.join(' ')
}

/**
 * Generates action items from MVP-blocking gaps.
 *
 * @param rankedGaps - Ranked gaps
 * @returns Array of action item strings
 */
function generateActionItems(rankedGaps: RankedGap[]): string[] {
  const actionItems: string[] = []

  // Get MVP-blocking gaps
  const blockingGaps = rankedGaps.filter(g => g.category === 'mvp_blocking')

  blockingGaps.forEach(gap => {
    const action = gap.suggestion
      ? `[${gap.source}] ${gap.description} - ${gap.suggestion}`
      : `[${gap.source}] ${gap.description}`
    actionItems.push(action)
  })

  // Add top 3 important gaps if not too many blocking gaps
  if (blockingGaps.length < 5) {
    const importantGaps = rankedGaps
      .filter(g => g.category === 'mvp_important')
      .slice(0, 5 - blockingGaps.length)

    importantGaps.forEach(gap => {
      const action = gap.suggestion
        ? `[${gap.source}] ${gap.description} - ${gap.suggestion}`
        : `[${gap.source}] ${gap.description}`
      actionItems.push(action)
    })
  }

  return actionItems.slice(0, 10)
}

/**
 * Generates comprehensive gap hygiene analysis.
 *
 * @param storyId - Story ID being analyzed
 * @param pmGaps - PM gap analysis (optional)
 * @param uxGaps - UX gap analysis (optional)
 * @param qaGaps - QA gap analysis (optional)
 * @param attackFindings - Attack analysis (optional)
 * @param previousHistory - Previous hygiene result for history preservation (optional)
 * @param config - Configuration options
 * @returns Hygiene result
 */
export async function generateHygieneAnalysis(
  storyId: string,
  pmGaps: PMGapStructure | null | undefined,
  uxGaps: UXGapAnalysis | null | undefined,
  qaGaps: QAGapAnalysis | null | undefined,
  attackFindings: AttackAnalysis | null | undefined,
  previousHistory: HygieneResult | null | undefined,
  config: Partial<HygieneConfig> = {},
): Promise<GapHygieneResult> {
  const fullConfig = HygieneConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    // Check if any gaps are available
    const hasGaps = pmGaps || uxGaps || qaGaps || attackFindings

    if (!hasGaps) {
      return {
        hygieneResult: null,
        analyzed: false,
        error: 'No gap analyses provided for hygiene processing',
        warnings,
      }
    }

    // Deduplicate gaps
    const { gaps: deduplicatedGaps, stats: deduplicationStats } = fullConfig.enableDeduplication
      ? deduplicateGaps(pmGaps, uxGaps, qaGaps, attackFindings, fullConfig.similarityThreshold)
      : {
          gaps: [
            ...(pmGaps ? convertPMGaps(pmGaps) : []),
            ...(uxGaps ? convertUXGaps(uxGaps) : []),
            ...(qaGaps ? convertQAGaps(qaGaps) : []),
            ...(attackFindings ? convertAttackFindings(attackFindings) : []),
          ],
          stats: {
            totalBefore: 0,
            totalAfter: 0,
            merged: 0,
            mergeGroups: [],
          },
        }

    if (deduplicationStats.merged > 0) {
      warnings.push(`Merged ${deduplicationStats.merged} similar gaps`)
    }

    // Rank gaps
    let rankedGaps = rankGaps(deduplicatedGaps, fullConfig)

    // Preserve history from previous analysis if available
    if (previousHistory) {
      rankedGaps = rankedGaps.map(gap => {
        const previousGap = previousHistory.rankedGaps.find(
          pg => pg.originalId === gap.originalId || pg.description === gap.description,
        )

        if (previousGap) {
          // Preserve history and status
          const updatedGap = {
            ...gap,
            history: [...previousGap.history, ...gap.history],
            resolved: previousGap.resolved,
            acknowledged: previousGap.acknowledged,
          }

          // Check if category changed
          if (previousGap.category !== gap.category) {
            return recordHistory(
              updatedGap,
              'recategorized',
              previousGap.category,
              gap.category,
              'Category changed during re-analysis',
            )
          }

          return updatedGap
        }

        return gap
      })

      // Filter resolved if configured
      if (!fullConfig.includeResolved) {
        rankedGaps = rankedGaps.filter(g => !g.resolved)
      }
    }

    // Calculate category counts
    const categoryCounts: CategoryCounts = {
      mvp_blocking: rankedGaps.filter(g => g.category === 'mvp_blocking').length,
      mvp_important: rankedGaps.filter(g => g.category === 'mvp_important').length,
      future: rankedGaps.filter(g => g.category === 'future').length,
      deferred: rankedGaps.filter(g => g.category === 'deferred').length,
    }

    // Calculate statistics
    const totalGaps = rankedGaps.length
    const mvpBlockingCount = categoryCounts.mvp_blocking
    const highestScore = totalGaps > 0 ? Math.max(...rankedGaps.map(g => g.score)) : 0
    const averageScore =
      totalGaps > 0 ? rankedGaps.reduce((sum, g) => sum + g.score, 0) / totalGaps : 0

    // Generate summary and action items
    const summary = generateSummary(rankedGaps, categoryCounts)
    const actionItems = generateActionItems(rankedGaps)

    const hygieneResult: HygieneResult = {
      storyId,
      analyzedAt: new Date().toISOString(),
      rankedGaps,
      deduplicationStats,
      categoryCounts,
      totalGaps,
      mvpBlockingCount,
      highestScore,
      averageScore: Math.round(averageScore * 100) / 100,
      summary,
      actionItems,
    }

    // Validate against schema
    const validated = HygieneResultSchema.parse(hygieneResult)

    return {
      hygieneResult: validated,
      analyzed: true,
      warnings,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during gap hygiene analysis'
    return {
      hygieneResult: null,
      analyzed: false,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Extended graph state with gap hygiene analysis.
 */
export interface GraphStateWithGapHygiene extends GraphStateWithStorySeed {
  /** PM gap analysis result */
  pmGapAnalysis?: { gaps: PMGapStructure }
  /** UX gap analysis result */
  uxGapAnalysis?: UXGapAnalysis | null
  /** QA gap analysis result */
  qaGapAnalysis?: QAGapAnalysis | null
  /** Attack analysis result */
  attackAnalysis?: AttackAnalysis | null
  /** Previous hygiene result for history preservation */
  previousHygieneResult?: HygieneResult | null
  /** Gap hygiene result */
  gapHygieneResult?: HygieneResult | null
  /** Whether gap hygiene was successful */
  gapHygieneAnalyzed?: boolean
  /** Warnings from gap hygiene analysis */
  gapHygieneWarnings?: string[]
}

/**
 * Story Gap Hygiene node implementation.
 *
 * Ranks gaps from all fanout analyses, deduplicates similar gaps,
 * assigns categories, and maintains history without deletion.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have gap analyses from fanout nodes)
 * @returns Partial state update with gap hygiene analysis
 */
export const storyGapHygieneNode = createToolNode(
  'story_gap_hygiene',
  async (state: GraphState): Promise<Partial<GraphStateWithGapHygiene>> => {
    const stateWithGaps = state as GraphStateWithGapHygiene

    // Require story structure for story ID
    if (!stateWithGaps.storyStructure) {
      return updateState({
        gapHygieneResult: null,
        gapHygieneAnalyzed: false,
        gapHygieneWarnings: ['No story structure available - run seed node first'],
      } as Partial<GraphStateWithGapHygiene>)
    }

    const result = await generateHygieneAnalysis(
      stateWithGaps.storyStructure.storyId,
      stateWithGaps.pmGapAnalysis?.gaps,
      stateWithGaps.uxGapAnalysis,
      stateWithGaps.qaGapAnalysis,
      stateWithGaps.attackAnalysis,
      stateWithGaps.previousHygieneResult,
    )

    if (!result.analyzed) {
      return updateState({
        gapHygieneResult: null,
        gapHygieneAnalyzed: false,
        gapHygieneWarnings: result.warnings,
      } as Partial<GraphStateWithGapHygiene>)
    }

    return updateState({
      gapHygieneResult: result.hygieneResult,
      gapHygieneAnalyzed: true,
      gapHygieneWarnings: result.warnings,
    } as Partial<GraphStateWithGapHygiene>)
  },
)

/**
 * Creates a gap hygiene node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createGapHygieneNode(config: Partial<HygieneConfig> = {}) {
  return createToolNode(
    'story_gap_hygiene',
    async (state: GraphState): Promise<Partial<GraphStateWithGapHygiene>> => {
      const stateWithGaps = state as GraphStateWithGapHygiene

      // Require story structure
      if (!stateWithGaps.storyStructure) {
        throw new Error('Story structure is required for gap hygiene analysis')
      }

      const result = await generateHygieneAnalysis(
        stateWithGaps.storyStructure.storyId,
        stateWithGaps.pmGapAnalysis?.gaps,
        stateWithGaps.uxGapAnalysis,
        stateWithGaps.qaGapAnalysis,
        stateWithGaps.attackAnalysis,
        stateWithGaps.previousHygieneResult,
        config,
      )

      if (!result.analyzed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          gapHygieneResult: null,
          gapHygieneAnalyzed: false,
          gapHygieneWarnings: result.warnings,
        } as Partial<GraphStateWithGapHygiene>)
      }

      return updateState({
        gapHygieneResult: result.hygieneResult,
        gapHygieneAnalyzed: true,
        gapHygieneWarnings: result.warnings,
      } as Partial<GraphStateWithGapHygiene>)
    },
  )
}
