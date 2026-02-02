/**
 * Elaboration Escape Hatch Node
 *
 * Triggers targeted full re-review when delta review is insufficient.
 * Evaluates multiple triggers including attack impact, cross-cutting changes,
 * scope expansion, and consistency violations to determine if a comprehensive
 * re-review is needed.
 *
 * FLOW-033: LangGraph Elaboration Node - Escape Hatch
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { SynthesizedStory } from '../story/synthesize.js'
import type { AttackAnalysis } from '../story/attack.js'
import type { ReadinessResult } from '../story/readiness-score.js'
import type { DeltaReviewResult } from './delta-review.js'
import type { SectionName } from './delta-detect.js'

/**
 * Schema for escape hatch trigger types.
 * These represent conditions that may require a full re-review.
 */
export const EscapeHatchTriggerSchema = z.enum([
  'attack_impact', // Attacks affect unchanged sections
  'cross_cutting', // Changes impact multiple sections
  'scope_expansion', // Scope has grown beyond original bounds
  'consistency_violation', // Inconsistencies detected between sections
])

export type EscapeHatchTrigger = z.infer<typeof EscapeHatchTriggerSchema>

/**
 * Schema for a single trigger evaluation result.
 */
export const TriggerEvaluationSchema = z.object({
  /** Type of trigger being evaluated */
  trigger: EscapeHatchTriggerSchema,
  /** Whether this trigger was detected */
  detected: z.boolean(),
  /** Confidence level (0-1) in the detection */
  confidence: z.number().min(0).max(1),
  /** Evidence supporting the detection */
  evidence: z.array(z.string()).default([]),
  /** Specific items or sections affected */
  affectedItems: z.array(z.string()).default([]),
})

export type TriggerEvaluation = z.infer<typeof TriggerEvaluationSchema>

/**
 * Schema for stakeholder types that may need to re-review.
 */
export const StakeholderSchema = z.enum([
  'attacker', // Red team / security review
  'architect', // Technical architecture review
  'pm', // Product management review
  'uiux', // UX design review
  'qa', // Quality assurance review
])

export type Stakeholder = z.infer<typeof StakeholderSchema>

/**
 * Schema for review scope specification.
 */
export const ReviewScopeSchema = z.object({
  /** Sections that need re-review */
  sections: z.array(z.string()).default([]),
  /** Specific items within sections that need attention */
  items: z.array(z.string()).default([]),
  /** Whether a full story review is required */
  fullReview: z.boolean().default(false),
  /** Priority of the review (1-3, 1 highest) */
  priority: z.number().int().min(1).max(3).default(2),
  /** Reason for the scope determination */
  reason: z.string().min(1),
})

export type ReviewScope = z.infer<typeof ReviewScopeSchema>

/**
 * Schema for the escape hatch result.
 */
export const EscapeHatchResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().regex(/^[a-z]+-\d+$/i),
  /** Timestamp of evaluation */
  evaluatedAt: z.string().datetime(),
  /** Whether escape hatch was triggered */
  triggered: z.boolean(),
  /** List of triggers that were activated */
  triggersActivated: z.array(EscapeHatchTriggerSchema).default([]),
  /** Individual trigger evaluations */
  evaluations: z.array(TriggerEvaluationSchema).default([]),
  /** Scope of required re-review */
  reviewScope: ReviewScopeSchema.nullable(),
  /** Stakeholders who need to re-review */
  stakeholdersToInvolve: z.array(StakeholderSchema).default([]),
  /** Overall confidence in the decision */
  confidence: z.number().min(0).max(1),
  /** Summary narrative */
  summary: z.string().min(1),
  /** Whether evaluation completed successfully */
  evaluated: z.boolean(),
  /** Error message if evaluation failed */
  error: z.string().optional(),
})

export type EscapeHatchResult = z.infer<typeof EscapeHatchResultSchema>

/**
 * Configuration for escape hatch evaluation.
 */
export const EscapeHatchConfigSchema = z.object({
  /** Confidence threshold to trigger escape hatch (0-1) */
  triggerThreshold: z.number().min(0).max(1).default(0.7),
  /** Minimum number of triggers to activate escape hatch */
  minTriggers: z.number().int().positive().default(1),
  /** Whether to include attack impact evaluation */
  evaluateAttackImpact: z.boolean().default(true),
  /** Whether to include cross-cutting evaluation */
  evaluateCrossCutting: z.boolean().default(true),
  /** Whether to include scope expansion evaluation */
  evaluateScopeExpansion: z.boolean().default(true),
  /** Whether to include consistency violation evaluation */
  evaluateConsistency: z.boolean().default(true),
  /** Readiness score drop threshold to trigger scope expansion */
  readinessDropThreshold: z.number().int().default(10),
  /** Number of sections changed to trigger cross-cutting */
  crossCuttingSectionThreshold: z.number().int().default(3),
})

export type EscapeHatchConfig = z.infer<typeof EscapeHatchConfigSchema>

/**
 * Schema for escape hatch node result.
 */
export const EscapeHatchNodeResultSchema = z.object({
  /** The escape hatch result */
  escapeHatchResult: EscapeHatchResultSchema.nullable(),
  /** Whether evaluation was successful */
  escapeHatchEvaluated: z.boolean(),
  /** Error message if evaluation failed */
  error: z.string().optional(),
})

export type EscapeHatchNodeResult = z.infer<typeof EscapeHatchNodeResultSchema>

/**
 * Evaluates whether attack findings impact unchanged sections.
 *
 * This checks if attacks or edge cases discovered during attack analysis
 * affect areas that were not modified in the delta review, suggesting
 * the delta review alone is insufficient.
 *
 * @param attackFindings - Attack analysis results
 * @param deltaResult - Delta review results
 * @returns Trigger evaluation for attack impact
 */
export function evaluateAttackImpact(
  attackFindings: AttackAnalysis | null | undefined,
  deltaResult: DeltaReviewResult | null | undefined,
): TriggerEvaluation {
  const evaluation: TriggerEvaluation = {
    trigger: 'attack_impact',
    detected: false,
    confidence: 0,
    evidence: [],
    affectedItems: [],
  }

  // Cannot evaluate without attack findings
  if (!attackFindings) {
    evaluation.evidence.push('No attack analysis available')
    return evaluation
  }

  // Get sections that were reviewed in delta
  const reviewedSections = new Set(deltaResult?.sectionsReviewed ?? [])

  // Check if high-risk edge cases affect unreviewed areas
  const highRiskEdgeCases = attackFindings.edgeCases.filter(ec => ec.riskScore >= 15)
  const impactedCategories = new Set(highRiskEdgeCases.map(ec => ec.category))

  // Map edge case categories to story sections
  const categoryToSectionMap: Record<string, string[]> = {
    security: ['acceptanceCriteria', 'constraints'],
    data: ['acceptanceCriteria', 'testHints'],
    integration: ['dependencies', 'affectedFiles'],
    performance: ['acceptanceCriteria', 'testHints'],
    concurrency: ['acceptanceCriteria', 'testHints'],
    boundary: ['acceptanceCriteria', 'knownUnknowns'],
    failure: ['testHints', 'knownUnknowns'],
    user_behavior: ['acceptanceCriteria', 'nonGoals'],
    environment: ['constraints', 'dependencies'],
    timing: ['testHints', 'knownUnknowns'],
  }

  const potentiallyAffectedSections = new Set<SectionName>()
  for (const category of impactedCategories) {
    const sections = categoryToSectionMap[category] ?? []
    sections.forEach(s => potentiallyAffectedSections.add(s as SectionName))
  }

  // Find sections affected by attacks but not reviewed
  const unreviewedAffectedSections = Array.from(potentiallyAffectedSections).filter(
    s => !reviewedSections.has(s),
  )

  if (unreviewedAffectedSections.length > 0) {
    evaluation.detected = true
    evaluation.confidence = Math.min(0.9, 0.3 + highRiskEdgeCases.length * 0.2)
    evaluation.evidence.push(
      `${highRiskEdgeCases.length} high-risk edge case(s) affect unreviewed sections`,
    )
    evaluation.affectedItems = unreviewedAffectedSections
  }

  // Check for weak assumptions affecting core areas
  const weakAssumptions = attackFindings.challengeResults.filter(
    cr => cr.validity === 'invalid' || cr.validity === 'partially_valid',
  )

  if (weakAssumptions.length >= 3) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.6)
    evaluation.evidence.push(
      `${weakAssumptions.length} weak assumption(s) identified requiring broader review`,
    )
    weakAssumptions.slice(0, 5).forEach(wa => {
      evaluation.affectedItems.push(wa.assumption.id)
    })
  }

  // Check attack readiness
  if (attackFindings.summary.attackReadiness === 'critical') {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.8)
    evaluation.evidence.push('Attack analysis indicates critical readiness - full review needed')
  }

  return evaluation
}

/**
 * Evaluates whether changes have cross-cutting impacts.
 *
 * Cross-cutting changes affect multiple sections and may have
 * ripple effects that a delta review of individual sections won't catch.
 *
 * @param deltaResult - Delta review results
 * @param story - The synthesized story
 * @param config - Configuration options
 * @returns Trigger evaluation for cross-cutting changes
 */
export function evaluateCrossCuttingChanges(
  deltaResult: DeltaReviewResult | null | undefined,
  story: SynthesizedStory | null | undefined,
  config: EscapeHatchConfig,
): TriggerEvaluation {
  const evaluation: TriggerEvaluation = {
    trigger: 'cross_cutting',
    detected: false,
    confidence: 0,
    evidence: [],
    affectedItems: [],
  }

  // Cannot evaluate without delta result
  if (!deltaResult) {
    evaluation.evidence.push('No delta review result available')
    return evaluation
  }

  const sectionsReviewed = deltaResult.sectionsReviewed
  const findings = deltaResult.findings

  // Check if changes span multiple sections
  if (sectionsReviewed.length >= config.crossCuttingSectionThreshold) {
    evaluation.detected = true
    evaluation.confidence = Math.min(0.9, 0.4 + sectionsReviewed.length * 0.1)
    evaluation.evidence.push(
      `Changes span ${sectionsReviewed.length} sections (threshold: ${config.crossCuttingSectionThreshold})`,
    )
    evaluation.affectedItems = [...sectionsReviewed]
  }

  // Check for findings that indicate cross-section dependencies
  const consistencyFindings = findings.filter(f => f.category === 'consistency')
  const dependencyFindings = findings.filter(f => f.category === 'dependency')

  if (consistencyFindings.length > 0 || dependencyFindings.length > 0) {
    const totalCrossFindings = consistencyFindings.length + dependencyFindings.length
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.5 + totalCrossFindings * 0.15)
    evaluation.evidence.push(
      `${totalCrossFindings} cross-section finding(s) (consistency/dependency issues)`,
    )
    consistencyFindings.forEach(f => evaluation.affectedItems.push(f.itemId))
    dependencyFindings.forEach(f => evaluation.affectedItems.push(f.itemId))
  }

  // Check if AC changes affect test hints
  if (story) {
    const acFindings = findings.filter(f => f.section === 'acceptanceCriteria')
    const testHintsCount = story.testHints.length

    if (acFindings.length > 0 && testHintsCount > 0) {
      // ACs changed but test hints might need update
      const highPriorityAcChanges = acFindings.filter(
        f => f.severity === 'critical' || f.severity === 'major',
      )
      if (highPriorityAcChanges.length > 0) {
        evaluation.detected = true
        evaluation.confidence = Math.max(evaluation.confidence, 0.6)
        evaluation.evidence.push(
          `${highPriorityAcChanges.length} high-priority AC finding(s) may affect ${testHintsCount} test hint(s)`,
        )
      }
    }
  }

  return evaluation
}

/**
 * Evaluates whether the story scope has expanded.
 *
 * Scope expansion occurs when changes increase the complexity or breadth
 * of the story beyond what was originally planned, potentially requiring
 * stakeholders to re-evaluate the story.
 *
 * @param deltaResult - Delta review results
 * @param readinessScore - Current readiness score result
 * @param previousReadinessScore - Previous readiness score (if available)
 * @param config - Configuration options
 * @returns Trigger evaluation for scope expansion
 */
export function evaluateScopeExpansion(
  deltaResult: DeltaReviewResult | null | undefined,
  readinessScore: ReadinessResult | null | undefined,
  previousReadinessScore: number | null | undefined,
  config: EscapeHatchConfig,
): TriggerEvaluation {
  const evaluation: TriggerEvaluation = {
    trigger: 'scope_expansion',
    detected: false,
    confidence: 0,
    evidence: [],
    affectedItems: [],
  }

  // Cannot evaluate without delta result
  if (!deltaResult) {
    evaluation.evidence.push('No delta review result available')
    return evaluation
  }

  const findings = deltaResult.findings

  // Check for scope-related findings
  const scopeFindings = findings.filter(f => f.category === 'scope')
  if (scopeFindings.length > 0) {
    evaluation.detected = true
    evaluation.confidence = Math.min(0.9, 0.4 + scopeFindings.length * 0.2)
    evaluation.evidence.push(`${scopeFindings.length} scope-related finding(s) detected`)
    scopeFindings.forEach(f => evaluation.affectedItems.push(f.itemId))
  }

  // Check for significant readiness score drop
  if (readinessScore && previousReadinessScore !== null && previousReadinessScore !== undefined) {
    const scoreDrop = previousReadinessScore - readinessScore.score
    if (scoreDrop >= config.readinessDropThreshold) {
      evaluation.detected = true
      evaluation.confidence = Math.max(evaluation.confidence, 0.7)
      evaluation.evidence.push(
        `Readiness score dropped by ${scoreDrop} points (${previousReadinessScore} -> ${readinessScore.score})`,
      )
    }
  }

  // Check if story is no longer ready
  if (readinessScore && !readinessScore.ready) {
    const blockingCount = readinessScore.factors.mvpBlockingCount
    if (blockingCount > 0) {
      evaluation.detected = true
      evaluation.confidence = Math.max(evaluation.confidence, 0.6)
      evaluation.evidence.push(
        `Story has ${blockingCount} MVP-blocking gap(s) preventing readiness`,
      )
      readinessScore.recommendations
        .filter(r => r.severity === 'critical')
        .forEach(r => evaluation.affectedItems.push(r.id))
    }
  }

  // Check for removed non-goals (indicates scope creep)
  const removedNonGoals = findings.filter(
    f => f.section === 'nonGoals' && f.changeType === 'removed',
  )
  if (removedNonGoals.length > 0) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.5)
    evaluation.evidence.push(
      `${removedNonGoals.length} non-goal(s) removed - potential scope expansion`,
    )
    removedNonGoals.forEach(f => evaluation.affectedItems.push(f.itemId))
  }

  // Check for added ACs without corresponding test hints
  const addedAcFindings = findings.filter(
    f => f.section === 'acceptanceCriteria' && f.changeType === 'added',
  )
  if (addedAcFindings.length > 2) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.4)
    evaluation.evidence.push(`${addedAcFindings.length} new AC(s) added - review scope expansion`)
  }

  return evaluation
}

/**
 * Evaluates whether there are consistency violations between sections.
 *
 * @param deltaResult - Delta review results
 * @param story - The synthesized story
 * @returns Trigger evaluation for consistency violations
 */
export function evaluateConsistencyViolations(
  deltaResult: DeltaReviewResult | null | undefined,
  story: SynthesizedStory | null | undefined,
): TriggerEvaluation {
  const evaluation: TriggerEvaluation = {
    trigger: 'consistency_violation',
    detected: false,
    confidence: 0,
    evidence: [],
    affectedItems: [],
  }

  // Cannot evaluate without both delta result and story
  if (!deltaResult || !story) {
    evaluation.evidence.push('Insufficient data for consistency evaluation')
    return evaluation
  }

  const findings = deltaResult.findings

  // Check for explicit consistency findings
  const consistencyFindings = findings.filter(f => f.category === 'consistency')
  if (consistencyFindings.length > 0) {
    evaluation.detected = true
    evaluation.confidence = Math.min(0.9, 0.5 + consistencyFindings.length * 0.2)
    evaluation.evidence.push(`${consistencyFindings.length} explicit consistency finding(s)`)
    consistencyFindings.forEach(f => evaluation.affectedItems.push(f.itemId))
  }

  // Check for constraint violations (removed constraints)
  const removedConstraints = findings.filter(
    f => f.section === 'constraints' && f.changeType === 'removed',
  )
  if (removedConstraints.length > 0) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.7)
    evaluation.evidence.push(
      `${removedConstraints.length} constraint(s) removed - may violate baseline consistency`,
    )
    removedConstraints.forEach(f => evaluation.affectedItems.push(f.itemId))
  }

  // Check AC-test hint alignment
  const acCount = story.acceptanceCriteria.length
  const testHintCount = story.testHints.length

  // If significantly more ACs than test hints, flag consistency concern
  if (acCount > testHintCount * 2 && acCount > 5) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.4)
    evaluation.evidence.push(
      `AC to test hint ratio imbalanced: ${acCount} ACs vs ${testHintCount} test hints`,
    )
  }

  // Check for known unknowns with blocking impact
  const blockingUnknowns = story.knownUnknowns.filter(ku => ku.impact === 'blocking')
  if (blockingUnknowns.length > 0 && story.isReady) {
    evaluation.detected = true
    evaluation.confidence = Math.max(evaluation.confidence, 0.6)
    evaluation.evidence.push(
      `Story marked ready but has ${blockingUnknowns.length} blocking unknown(s) - inconsistent state`,
    )
    blockingUnknowns.forEach(ku => evaluation.affectedItems.push(ku.id))
  }

  // Check for dependency-constraint mismatches
  if (story.dependencies.length > 0 && story.constraints.length === 0) {
    // Dependencies exist but no constraints - might be missing dependency constraints
    const dependencyFindings = findings.filter(f => f.section === 'dependencies')
    if (dependencyFindings.length > 0) {
      evaluation.detected = true
      evaluation.confidence = Math.max(evaluation.confidence, 0.3)
      evaluation.evidence.push(
        `${story.dependencies.length} dependency(ies) present but no constraints - review alignment`,
      )
    }
  }

  return evaluation
}

/**
 * Determines which stakeholders should be involved in re-review.
 *
 * @param evaluations - Array of trigger evaluations
 * @param deltaResult - Delta review results
 * @param attackFindings - Attack analysis results
 * @returns Array of stakeholders to involve
 */
export function determineStakeholders(
  evaluations: TriggerEvaluation[],
  deltaResult: DeltaReviewResult | null | undefined,
  attackFindings: AttackAnalysis | null | undefined,
): Stakeholder[] {
  const stakeholders = new Set<Stakeholder>()

  // Get detected evaluations
  const detectedEvaluations = evaluations.filter(e => e.detected)

  for (const evaluation of detectedEvaluations) {
    switch (evaluation.trigger) {
      case 'attack_impact':
        stakeholders.add('attacker')
        // Security-related attack impacts should also involve architect
        if (attackFindings?.edgeCases.some(ec => ec.category === 'security')) {
          stakeholders.add('architect')
        }
        break

      case 'cross_cutting':
        stakeholders.add('architect')
        // If cross-cutting involves UI/UX sections, involve UIUX
        if (
          evaluation.affectedItems.some(
            item =>
              item.includes('acceptanceCriteria') ||
              item.includes('nonGoals') ||
              item.toLowerCase().includes('ui') ||
              item.toLowerCase().includes('ux'),
          )
        ) {
          stakeholders.add('uiux')
        }
        break

      case 'scope_expansion':
        stakeholders.add('pm')
        // If readiness is affected, also involve QA
        if (evaluation.evidence.some(e => e.includes('readiness') || e.includes('blocking'))) {
          stakeholders.add('qa')
        }
        break

      case 'consistency_violation':
        stakeholders.add('qa')
        // Constraint violations should involve architect
        if (evaluation.evidence.some(e => e.includes('constraint'))) {
          stakeholders.add('architect')
        }
        break
    }
  }

  // Always include QA if there are critical/major findings
  if (deltaResult) {
    const hasCriticalFindings =
      deltaResult.findingsBySeverity.critical > 0 || deltaResult.findingsBySeverity.major > 0
    if (hasCriticalFindings) {
      stakeholders.add('qa')
    }
  }

  return Array.from(stakeholders)
}

/**
 * Determines the review scope based on evaluations.
 *
 * @param evaluations - Array of trigger evaluations
 * @returns Review scope specification
 */
export function determineReviewScope(evaluations: TriggerEvaluation[]): ReviewScope {
  const detectedEvaluations = evaluations.filter(e => e.detected)

  // If no triggers detected, no review needed
  if (detectedEvaluations.length === 0) {
    return {
      sections: [],
      items: [],
      fullReview: false,
      priority: 3,
      reason: 'No escape hatch triggers detected - delta review is sufficient',
    }
  }

  // Collect all affected sections and items
  const affectedSections = new Set<string>()
  const affectedItems = new Set<string>()
  let maxConfidence = 0

  for (const evaluation of detectedEvaluations) {
    maxConfidence = Math.max(maxConfidence, evaluation.confidence)
    evaluation.affectedItems.forEach(item => {
      affectedItems.add(item)
      // Extract section from item if it looks like a section name
      const sectionNames = [
        'acceptanceCriteria',
        'nonGoals',
        'testHints',
        'knownUnknowns',
        'constraints',
        'affectedFiles',
        'dependencies',
      ]
      const matchedSection = sectionNames.find(
        s => item.toLowerCase().includes(s.toLowerCase()) || item === s,
      )
      if (matchedSection) {
        affectedSections.add(matchedSection)
      }
    })
  }

  // Determine if full review is needed
  const triggerTypes = new Set(detectedEvaluations.map(e => e.trigger))
  const fullReview =
    triggerTypes.size >= 3 || // Multiple trigger types
    maxConfidence >= 0.85 || // Very high confidence
    affectedSections.size >= 5 || // Most sections affected
    (triggerTypes.has('attack_impact') && triggerTypes.has('consistency_violation')) // Critical combination

  // Determine priority
  let priority = 2
  if (maxConfidence >= 0.8 || triggerTypes.has('attack_impact')) {
    priority = 1
  } else if (maxConfidence < 0.5 && detectedEvaluations.length === 1) {
    priority = 3
  }

  // Build reason
  const triggerNames = Array.from(triggerTypes).join(', ')
  const reason = fullReview
    ? `Full review required: ${triggerNames} trigger(s) with ${Math.round(maxConfidence * 100)}% confidence`
    : `Targeted review needed for ${affectedSections.size} section(s): ${triggerNames}`

  return {
    sections: Array.from(affectedSections),
    items: Array.from(affectedItems),
    fullReview,
    priority,
    reason,
  }
}

/**
 * Main escape hatch evaluation function.
 *
 * Evaluates all triggers and determines whether to trigger the escape hatch
 * for a full re-review.
 *
 * @param deltaReviewResult - Delta review results
 * @param attackFindings - Attack analysis results (optional)
 * @param story - The synthesized story
 * @param readinessScore - Current readiness score (optional)
 * @param previousReadinessScore - Previous readiness score (optional)
 * @param config - Configuration options
 * @returns Escape hatch result
 */
export async function evaluateEscapeHatch(
  deltaReviewResult: DeltaReviewResult | null | undefined,
  attackFindings: AttackAnalysis | null | undefined,
  story: SynthesizedStory | null | undefined,
  readinessScore: ReadinessResult | null | undefined,
  previousReadinessScore?: number | null,
  config: Partial<EscapeHatchConfig> = {},
): Promise<EscapeHatchResult> {
  const fullConfig = EscapeHatchConfigSchema.parse(config)

  try {
    // Require story for evaluation
    if (!story) {
      return {
        storyId: 'unknown',
        evaluatedAt: new Date().toISOString(),
        triggered: false,
        triggersActivated: [],
        evaluations: [],
        reviewScope: null,
        stakeholdersToInvolve: [],
        confidence: 0,
        summary: 'Escape hatch evaluation failed: No story provided',
        evaluated: false,
        error: 'Story is required for escape hatch evaluation',
      }
    }

    const evaluations: TriggerEvaluation[] = []

    // Evaluate each trigger based on configuration
    if (fullConfig.evaluateAttackImpact) {
      evaluations.push(evaluateAttackImpact(attackFindings, deltaReviewResult))
    }

    if (fullConfig.evaluateCrossCutting) {
      evaluations.push(evaluateCrossCuttingChanges(deltaReviewResult, story, fullConfig))
    }

    if (fullConfig.evaluateScopeExpansion) {
      evaluations.push(
        evaluateScopeExpansion(
          deltaReviewResult,
          readinessScore,
          previousReadinessScore,
          fullConfig,
        ),
      )
    }

    if (fullConfig.evaluateConsistency) {
      evaluations.push(evaluateConsistencyViolations(deltaReviewResult, story))
    }

    // Determine which triggers are activated
    const activatedTriggers = evaluations
      .filter(e => e.detected && e.confidence >= fullConfig.triggerThreshold)
      .map(e => e.trigger)

    // Check if escape hatch should be triggered
    const triggered = activatedTriggers.length >= fullConfig.minTriggers

    // Calculate overall confidence
    const detectedEvaluations = evaluations.filter(e => e.detected)
    const overallConfidence =
      detectedEvaluations.length > 0
        ? detectedEvaluations.reduce((sum, e) => sum + e.confidence, 0) / detectedEvaluations.length
        : 0

    // Determine stakeholders and review scope
    const stakeholdersToInvolve = triggered
      ? determineStakeholders(evaluations, deltaReviewResult, attackFindings)
      : []

    const reviewScope = triggered ? determineReviewScope(evaluations) : null

    // Generate summary
    const summary = generateSummary(
      triggered,
      activatedTriggers,
      evaluations,
      stakeholdersToInvolve,
      reviewScope,
      story.storyId,
    )

    const result: EscapeHatchResult = {
      storyId: story.storyId,
      evaluatedAt: new Date().toISOString(),
      triggered,
      triggersActivated: activatedTriggers,
      evaluations,
      reviewScope,
      stakeholdersToInvolve,
      confidence: overallConfidence,
      summary,
      evaluated: true,
    }

    // Validate against schema
    return EscapeHatchResultSchema.parse(result)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during escape hatch evaluation'
    return {
      storyId: story?.storyId ?? 'unknown',
      evaluatedAt: new Date().toISOString(),
      triggered: false,
      triggersActivated: [],
      evaluations: [],
      reviewScope: null,
      stakeholdersToInvolve: [],
      confidence: 0,
      summary: `Escape hatch evaluation failed: ${errorMessage}`,
      evaluated: false,
      error: errorMessage,
    }
  }
}

/**
 * Generates a summary narrative for the escape hatch result.
 */
function generateSummary(
  triggered: boolean,
  activatedTriggers: EscapeHatchTrigger[],
  evaluations: TriggerEvaluation[],
  stakeholders: Stakeholder[],
  reviewScope: ReviewScope | null,
  storyId: string,
): string {
  const parts: string[] = []

  parts.push(`Escape hatch evaluation for ${storyId}:`)

  if (!triggered) {
    const detectedCount = evaluations.filter(e => e.detected).length
    if (detectedCount === 0) {
      parts.push('No triggers detected - delta review is sufficient.')
    } else {
      parts.push(
        `${detectedCount} trigger(s) detected but below threshold - delta review is sufficient.`,
      )
    }
    return parts.join(' ')
  }

  // Escape hatch was triggered
  parts.push(`TRIGGERED with ${activatedTriggers.length} active trigger(s):`)
  parts.push(activatedTriggers.join(', ') + '.')

  if (stakeholders.length > 0) {
    parts.push(`Stakeholders to involve: ${stakeholders.join(', ')}.`)
  }

  if (reviewScope) {
    if (reviewScope.fullReview) {
      parts.push(`Full story re-review required (priority ${reviewScope.priority}).`)
    } else {
      parts.push(
        `Targeted review of ${reviewScope.sections.length} section(s) required (priority ${reviewScope.priority}).`,
      )
    }
  }

  return parts.join(' ')
}

/**
 * Extended graph state with escape hatch results.
 */
export interface GraphStateWithEscapeHatch extends GraphState {
  /** Delta review result (from FLOW-032) */
  deltaReviewResult?: DeltaReviewResult | null
  /** Attack analysis result (from FLOW-027) */
  attackAnalysis?: AttackAnalysis | null
  /** Synthesized story (from FLOW-030) */
  synthesizedStory?: SynthesizedStory | null
  /** Readiness score result (from FLOW-029) */
  readinessResult?: ReadinessResult | null
  /** Previous readiness score for comparison */
  previousReadinessScore?: number | null
  /** Escape hatch result */
  escapeHatchResult?: EscapeHatchResult | null
  /** Whether escape hatch was evaluated */
  escapeHatchEvaluated?: boolean
}

/**
 * Escape Hatch node implementation.
 *
 * Evaluates multiple triggers to determine if a full re-review is needed
 * instead of relying solely on delta review. Uses the tool preset
 * (lower retries, shorter timeout) since this is primarily computation.
 *
 * @param state - Current graph state
 * @returns Partial state update with escape hatch results
 */
export const escapeHatchNode = createToolNode(
  'escape_hatch',
  async (state: GraphState): Promise<Partial<GraphStateWithEscapeHatch>> => {
    const stateWithDelta = state as GraphStateWithEscapeHatch

    // Require synthesized story
    if (!stateWithDelta.synthesizedStory) {
      return updateState({
        escapeHatchResult: null,
        escapeHatchEvaluated: false,
      } as Partial<GraphStateWithEscapeHatch>)
    }

    const result = await evaluateEscapeHatch(
      stateWithDelta.deltaReviewResult,
      stateWithDelta.attackAnalysis,
      stateWithDelta.synthesizedStory,
      stateWithDelta.readinessResult,
      stateWithDelta.previousReadinessScore,
    )

    if (!result.evaluated) {
      return updateState({
        escapeHatchResult: result,
        escapeHatchEvaluated: false,
      } as Partial<GraphStateWithEscapeHatch>)
    }

    return updateState({
      escapeHatchResult: result,
      escapeHatchEvaluated: true,
    } as Partial<GraphStateWithEscapeHatch>)
  },
)

/**
 * Creates an escape hatch node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createEscapeHatchNode(config: Partial<EscapeHatchConfig> = {}) {
  return createToolNode(
    'escape_hatch',
    async (state: GraphState): Promise<Partial<GraphStateWithEscapeHatch>> => {
      const stateWithDelta = state as GraphStateWithEscapeHatch

      // Require synthesized story
      if (!stateWithDelta.synthesizedStory) {
        throw new Error('Synthesized story is required for escape hatch evaluation')
      }

      const result = await evaluateEscapeHatch(
        stateWithDelta.deltaReviewResult,
        stateWithDelta.attackAnalysis,
        stateWithDelta.synthesizedStory,
        stateWithDelta.readinessResult,
        stateWithDelta.previousReadinessScore,
        config,
      )

      if (!result.evaluated) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          escapeHatchResult: result,
          escapeHatchEvaluated: false,
        } as Partial<GraphStateWithEscapeHatch>)
      }

      return updateState({
        escapeHatchResult: result,
        escapeHatchEvaluated: true,
      } as Partial<GraphStateWithEscapeHatch>)
    },
  )
}
