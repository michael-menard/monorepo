/**
 * Story Synthesize Node
 *
 * Produces final story artifacts from all analyses (seed, gaps, attacks, readiness).
 * Consolidates inputs, generates enhanced ACs, non-goals, test hints, known unknowns,
 * and creates a commitment baseline snapshot.
 *
 * FLOW-030: LangGraph Story Node - Synthesize
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { BaselineReality } from '../reality/index.js'
import type { StoryStructure, GraphStateWithStorySeed } from './seed.js'
import type { HygieneResult } from './gap-hygiene.js'
import type { AttackAnalysis } from './attack.js'
import type { ReadinessResult } from './readiness-score.js'

/**
 * Schema for a final acceptance criterion enhanced with gap insights.
 */
export const FinalAcceptanceCriterionSchema = z.object({
  /** Unique ID (inherited from seed or generated) */
  id: z.string().min(1),
  /** Description of what must be true for acceptance */
  description: z.string().min(1),
  /** Whether this AC is derived from baseline constraints */
  fromBaseline: z.boolean().default(false),
  /** Reference to baseline item if derived from baseline */
  baselineRef: z.string().optional(),
  /** Whether this AC was enhanced with gap insights */
  enhancedFromGaps: z.boolean().default(false),
  /** IDs of gaps that influenced this AC */
  relatedGapIds: z.array(z.string()).default([]),
  /** Priority for implementation (1-3, 1 highest) */
  priority: z.number().int().min(1).max(3).default(2),
  /** Test approach hint if derived from QA gaps */
  testHint: z.string().optional(),
})

export type FinalAcceptanceCriterion = z.infer<typeof FinalAcceptanceCriterionSchema>

/**
 * Schema for an explicit non-goal (excluded scope).
 */
export const NonGoalSchema = z.object({
  /** Unique ID (e.g., "NG-1") */
  id: z.string().min(1),
  /** Description of what is explicitly excluded */
  description: z.string().min(1),
  /** Reason for exclusion */
  reason: z.string().min(1),
  /** Source of the non-goal (attack, gap, manual) */
  source: z.enum(['attack_analysis', 'gap_analysis', 'baseline', 'manual']),
  /** Related attack assumption or edge case ID if applicable */
  relatedId: z.string().optional(),
})

export type NonGoal = z.infer<typeof NonGoalSchema>

/**
 * Schema for a test hint derived from gap and attack analysis.
 */
export const TestHintSchema = z.object({
  /** Unique ID (e.g., "TH-1") */
  id: z.string().min(1),
  /** Description of the test scenario */
  description: z.string().min(1),
  /** Category of test (unit, integration, e2e, edge_case, performance) */
  category: z.enum(['unit', 'integration', 'e2e', 'edge_case', 'performance', 'security']),
  /** Priority (1-3, 1 highest) */
  priority: z.number().int().min(1).max(3),
  /** Related acceptance criterion ID if applicable */
  relatedAcId: z.string().optional(),
  /** Related gap or edge case ID if applicable */
  relatedGapId: z.string().optional(),
  /** Specific test approach or technique */
  approach: z.string().optional(),
})

export type TestHint = z.infer<typeof TestHintSchema>

/**
 * Schema for a known unknown (documented uncertainty).
 */
export const KnownUnknownSchema = z.object({
  /** Unique ID (e.g., "KU-1") */
  id: z.string().min(1),
  /** Description of the uncertainty */
  description: z.string().min(1),
  /** Source of the uncertainty */
  source: z.enum(['story_content', 'attack_analysis', 'readiness_analysis', 'gap_analysis']),
  /** Impact if not resolved before implementation */
  impact: z.enum(['blocking', 'high', 'medium', 'low']),
  /** Suggested resolution approach */
  resolution: z.string().optional(),
  /** Whether this was acknowledged by the team */
  acknowledged: z.boolean().default(false),
})

export type KnownUnknown = z.infer<typeof KnownUnknownSchema>

/**
 * Schema for a commitment baseline (snapshot at commitment time).
 */
export const CommitmentBaselineSchema = z.object({
  /** Timestamp when commitment was made */
  committedAt: z.string().datetime(),
  /** Readiness score at commitment */
  readinessScore: z.number().int().min(0).max(100),
  /** Whether story was ready when committed */
  wasReady: z.boolean(),
  /** Number of MVP-blocking gaps at commitment */
  blockingGapsCount: z.number().int().min(0),
  /** Number of known unknowns at commitment */
  knownUnknownsCount: z.number().int().min(0),
  /** Key constraints from baseline reality */
  baselineConstraints: z.array(z.string()).default([]),
  /** Files expected to be affected */
  expectedAffectedFiles: z.array(z.string()).default([]),
  /** Dependencies at commitment time */
  dependencies: z.array(z.string()).default([]),
  /** Team notes or commitments */
  commitmentNotes: z.string().optional(),
})

export type CommitmentBaseline = z.infer<typeof CommitmentBaselineSchema>

/**
 * Schema for the complete synthesized story structure.
 */
export const SynthesizedStorySchema = z.object({
  /** Story ID */
  storyId: z.string().regex(/^[a-z]+-\d+$/i),
  /** Story title */
  title: z.string().min(1),
  /** Story description */
  description: z.string().min(1),
  /** Primary domain/area */
  domain: z.string().min(1),
  /** Synthesis timestamp */
  synthesizedAt: z.string().datetime(),
  /** Final acceptance criteria (enhanced from seed + gaps) */
  acceptanceCriteria: z.array(FinalAcceptanceCriterionSchema),
  /** Explicit non-goals (excluded scope) */
  nonGoals: z.array(NonGoalSchema).default([]),
  /** Test hints derived from gaps and attacks */
  testHints: z.array(TestHintSchema).default([]),
  /** Documented known unknowns */
  knownUnknowns: z.array(KnownUnknownSchema).default([]),
  /** Constraints from baseline */
  constraints: z.array(z.string()).default([]),
  /** Expected affected files */
  affectedFiles: z.array(z.string()).default([]),
  /** Dependencies */
  dependencies: z.array(z.string()).default([]),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** Estimated complexity */
  estimatedComplexity: z.enum(['small', 'medium', 'large']).optional(),
  /** Commitment baseline snapshot */
  commitmentBaseline: CommitmentBaselineSchema.optional(),
  /** Overall readiness assessment */
  readinessScore: z.number().int().min(0).max(100),
  /** Whether story is ready for implementation */
  isReady: z.boolean(),
  /** Summary of synthesis findings */
  synthesisNotes: z.string().min(1),
})

export type SynthesizedStory = z.infer<typeof SynthesizedStorySchema>

/**
 * Configuration for synthesis.
 */
export const SynthesizeConfigSchema = z.object({
  /** Maximum non-goals to include */
  maxNonGoals: z.number().int().positive().default(10),
  /** Maximum test hints to include */
  maxTestHints: z.number().int().positive().default(15),
  /** Maximum known unknowns to include */
  maxKnownUnknowns: z.number().int().positive().default(10),
  /** Whether to generate commitment baseline */
  generateCommitmentBaseline: z.boolean().default(true),
  /** Whether to enhance ACs with gap insights */
  enhanceACs: z.boolean().default(true),
  /** Minimum gap score to derive test hints from */
  minGapScoreForTestHints: z.number().int().min(1).max(25).default(8),
})

export type SynthesizeConfig = z.infer<typeof SynthesizeConfigSchema>

/**
 * Schema for synthesis node result.
 */
export const SynthesizeResultSchema = z.object({
  /** The synthesized story */
  synthesizedStory: SynthesizedStorySchema.nullable(),
  /** Whether synthesis was successful */
  synthesized: z.boolean(),
  /** Error message if synthesis failed */
  error: z.string().optional(),
  /** Warnings encountered during synthesis */
  warnings: z.array(z.string()).default([]),
})

export type SynthesizeResult = z.infer<typeof SynthesizeResultSchema>

/**
 * Consolidates all inputs for synthesis.
 *
 * @param seed - The story seed structure
 * @param gaps - Gap hygiene result
 * @param attacks - Attack analysis result
 * @param readiness - Readiness score result
 * @returns Consolidated inputs object
 */
export function consolidateInputs(
  seed: StoryStructure | null | undefined,
  gaps: HygieneResult | null | undefined,
  attacks: AttackAnalysis | null | undefined,
  readiness: ReadinessResult | null | undefined,
): {
  hasAllInputs: boolean
  hasSeed: boolean
  hasGaps: boolean
  hasAttacks: boolean
  hasReadiness: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  const hasSeed = seed !== null && seed !== undefined
  const hasGaps = gaps !== null && gaps !== undefined
  const hasAttacks = attacks !== null && attacks !== undefined
  const hasReadiness = readiness !== null && readiness !== undefined

  if (!hasSeed) {
    warnings.push('No story seed available - synthesis will be incomplete')
  }
  if (!hasGaps) {
    warnings.push('No gap hygiene analysis available - AC enhancement limited')
  }
  if (!hasAttacks) {
    warnings.push('No attack analysis available - non-goals may be incomplete')
  }
  if (!hasReadiness) {
    warnings.push('No readiness analysis available - commitment baseline limited')
  }

  return {
    hasAllInputs: hasSeed && hasGaps && hasAttacks && hasReadiness,
    hasSeed,
    hasGaps,
    hasAttacks,
    hasReadiness,
    warnings,
  }
}

/**
 * Generates final acceptance criteria incorporating gap insights.
 *
 * @param seed - The story seed structure
 * @param gaps - Gap hygiene result
 * @param config - Synthesis configuration
 * @returns Array of enhanced acceptance criteria
 */
export function generateFinalACs(
  seed: StoryStructure,
  gaps: HygieneResult | null | undefined,
  config: SynthesizeConfig,
): FinalAcceptanceCriterion[] {
  const finalACs: FinalAcceptanceCriterion[] = []

  // Convert seed ACs to final ACs
  seed.acceptanceCriteria.forEach(ac => {
    const finalAC: FinalAcceptanceCriterion = {
      id: ac.id,
      description: ac.description,
      fromBaseline: ac.fromBaseline,
      baselineRef: ac.baselineRef,
      enhancedFromGaps: false,
      relatedGapIds: [],
      priority: 2,
    }

    // Find related gaps and enhance
    if (config.enhanceACs && gaps) {
      const relatedGaps = gaps.rankedGaps.filter(g => g.relatedACs.includes(ac.id) && !g.resolved)

      if (relatedGaps.length > 0) {
        finalAC.enhancedFromGaps = true
        finalAC.relatedGapIds = relatedGaps.map(g => g.id)

        // Increase priority if blocking gaps relate to this AC
        const hasBlockingGap = relatedGaps.some(g => g.category === 'mvp_blocking')
        if (hasBlockingGap) {
          finalAC.priority = 1
        }

        // Add test hint from QA gaps
        const qaGap = relatedGaps.find(g => g.source.startsWith('qa_'))
        if (qaGap?.suggestion) {
          finalAC.testHint = qaGap.suggestion
        }
      }
    }

    finalACs.push(finalAC)
  })

  // Add new ACs from blocking gaps that don't have AC associations
  if (gaps) {
    const orphanBlockingGaps = gaps.rankedGaps.filter(
      g => g.category === 'mvp_blocking' && g.relatedACs.length === 0 && !g.resolved,
    )

    let acNumber = finalACs.length + 1
    orphanBlockingGaps.slice(0, 3).forEach(gap => {
      finalACs.push({
        id: `AC-${acNumber++}`,
        description: `Address gap: ${gap.description}`,
        fromBaseline: false,
        enhancedFromGaps: true,
        relatedGapIds: [gap.id],
        priority: 1,
        testHint: gap.suggestion,
      })
    })
  }

  return finalACs
}

/**
 * Generates non-goals from attack analysis and gaps.
 *
 * @param seed - The story seed structure
 * @param attacks - Attack analysis result
 * @param gaps - Gap hygiene result
 * @param config - Synthesis configuration
 * @returns Array of non-goals
 */
export function generateNonGoals(
  seed: StoryStructure,
  attacks: AttackAnalysis | null | undefined,
  gaps: HygieneResult | null | undefined,
  config: SynthesizeConfig,
): NonGoal[] {
  const nonGoals: NonGoal[] = []
  let ngNumber = 1

  // Generate non-goals from invalid or partially valid assumptions
  if (attacks) {
    attacks.challengeResults
      .filter(cr => cr.validity === 'invalid' || cr.validity === 'partially_valid')
      .slice(0, Math.floor(config.maxNonGoals / 2))
      .forEach(cr => {
        nonGoals.push({
          id: `NG-${ngNumber++}`,
          description: `Scope excludes: ${cr.assumption.description}`,
          reason: cr.evidence,
          source: 'attack_analysis',
          relatedId: cr.assumption.id,
        })
      })

    // Add non-goals from high-impact edge cases with suggested mitigations
    attacks.edgeCases
      .filter(ec => ec.riskScore >= 15 && ec.mitigation)
      .slice(0, Math.floor(config.maxNonGoals / 4))
      .forEach(ec => {
        // Only add if not already covered by assumption-based non-goals
        const alreadyCovered = nonGoals.some(ng => ng.description.includes(ec.description))
        if (!alreadyCovered) {
          nonGoals.push({
            id: `NG-${ngNumber++}`,
            description: `Out of scope: Complete mitigation for "${ec.description}"`,
            reason: `High-risk edge case (score: ${ec.riskScore}) - will be addressed in follow-up story`,
            source: 'attack_analysis',
            relatedId: ec.id,
          })
        }
      })
  }

  // Generate non-goals from deferred gaps
  if (gaps) {
    gaps.rankedGaps
      .filter(g => g.category === 'deferred' || g.category === 'future')
      .slice(0, Math.floor(config.maxNonGoals / 4))
      .forEach(gap => {
        nonGoals.push({
          id: `NG-${ngNumber++}`,
          description: `Deferred: ${gap.description}`,
          reason: `Low priority gap (score: ${gap.score}) - deferred to future iteration`,
          source: 'gap_analysis',
          relatedId: gap.id,
        })
      })
  }

  return nonGoals.slice(0, config.maxNonGoals)
}

/**
 * Generates test hints from gap and attack analysis.
 *
 * @param gaps - Gap hygiene result
 * @param attacks - Attack analysis result
 * @param config - Synthesis configuration
 * @returns Array of test hints
 */
export function generateTestHints(
  gaps: HygieneResult | null | undefined,
  attacks: AttackAnalysis | null | undefined,
  config: SynthesizeConfig,
): TestHint[] {
  const testHints: TestHint[] = []
  let thNumber = 1

  // Generate test hints from QA gaps
  if (gaps) {
    gaps.rankedGaps
      .filter(
        g => g.source.startsWith('qa_') && g.score >= config.minGapScoreForTestHints && !g.resolved,
      )
      .slice(0, Math.floor(config.maxTestHints / 2))
      .forEach(gap => {
        const category = mapGapSourceToTestCategory(gap.source)
        testHints.push({
          id: `TH-${thNumber++}`,
          description: gap.description,
          category,
          priority: gap.category === 'mvp_blocking' ? 1 : gap.category === 'mvp_important' ? 2 : 3,
          relatedAcId: gap.relatedACs[0],
          relatedGapId: gap.id,
          approach: gap.suggestion,
        })
      })
  }

  // Generate test hints from attack edge cases
  if (attacks) {
    attacks.edgeCases
      .filter(ec => ec.riskScore >= config.minGapScoreForTestHints)
      .slice(0, Math.floor(config.maxTestHints / 2))
      .forEach(ec => {
        const category = mapEdgeCaseCategoryToTestCategory(ec.category)
        testHints.push({
          id: `TH-${thNumber++}`,
          description: `Edge case: ${ec.description}`,
          category,
          priority: ec.riskScore >= 15 ? 1 : ec.riskScore >= 9 ? 2 : 3,
          relatedGapId: ec.id,
          approach: ec.mitigation,
        })
      })
  }

  // Sort by priority and limit
  return testHints.sort((a, b) => a.priority - b.priority).slice(0, config.maxTestHints)
}

/**
 * Maps gap source to test category.
 */
function mapGapSourceToTestCategory(
  source: string,
): 'unit' | 'integration' | 'e2e' | 'edge_case' | 'performance' | 'security' {
  if (source === 'qa_testability') return 'unit'
  if (source === 'qa_edge_case') return 'edge_case'
  if (source === 'qa_coverage') return 'integration'
  if (source === 'qa_ac_clarity') return 'e2e'
  return 'integration'
}

/**
 * Maps edge case category to test category.
 */
function mapEdgeCaseCategoryToTestCategory(
  category: string,
): 'unit' | 'integration' | 'e2e' | 'edge_case' | 'performance' | 'security' {
  if (category === 'security') return 'security'
  if (category === 'performance') return 'performance'
  if (category === 'boundary' || category === 'data') return 'unit'
  if (category === 'integration' || category === 'environment') return 'integration'
  if (category === 'user_behavior') return 'e2e'
  return 'edge_case'
}

/**
 * Documents known unknowns from readiness and attack analysis.
 *
 * @param readiness - Readiness score result
 * @param attacks - Attack analysis result
 * @param gaps - Gap hygiene result
 * @param seed - Story seed for extracting uncertainties from content
 * @param config - Synthesis configuration
 * @returns Array of known unknowns
 */
export function documentKnownUnknowns(
  readiness: ReadinessResult | null | undefined,
  attacks: AttackAnalysis | null | undefined,
  gaps: HygieneResult | null | undefined,
  seed: StoryStructure | null | undefined,
  config: SynthesizeConfig,
): KnownUnknown[] {
  const knownUnknowns: KnownUnknown[] = []
  let kuNumber = 1

  // Identify unknowns from story content (TBD, unknown, etc.)
  if (seed) {
    const tbdPatterns = [/\btbd\b/i, /\bto be determined\b/i, /\bunknown\b/i, /\?{2,}/, /\btbc\b/i]

    // Check description
    for (const pattern of tbdPatterns) {
      if (pattern.test(seed.description)) {
        knownUnknowns.push({
          id: `KU-${kuNumber++}`,
          description: `Story description contains uncertainty marker: "${pattern.source}"`,
          source: 'story_content',
          impact: 'medium',
          acknowledged: false,
          resolution: 'Clarify with stakeholder before implementation',
        })
        break
      }
    }

    // Check ACs
    seed.acceptanceCriteria.forEach(ac => {
      for (const pattern of tbdPatterns) {
        if (pattern.test(ac.description)) {
          knownUnknowns.push({
            id: `KU-${kuNumber++}`,
            description: `AC ${ac.id} contains uncertainty: "${ac.description.substring(0, 50)}..."`,
            source: 'story_content',
            impact: 'high',
            acknowledged: false,
            resolution: 'Define specific acceptance criteria before implementation',
          })
          break
        }
      }
    })
  }

  // Add unknowns from attack analysis (uncertain validity)
  if (attacks) {
    attacks.challengeResults
      .filter(cr => cr.validity === 'uncertain')
      .slice(0, 3)
      .forEach(cr => {
        knownUnknowns.push({
          id: `KU-${kuNumber++}`,
          description: `Uncertain assumption: ${cr.assumption.description}`,
          source: 'attack_analysis',
          impact: 'medium',
          acknowledged: false,
          resolution: cr.remediation || 'Validate assumption with domain expert',
        })
      })
  }

  // Add unknowns from gaps that reference uncertainties
  if (gaps) {
    gaps.rankedGaps
      .filter(g => g.category === 'mvp_blocking' && !g.resolved && !g.acknowledged)
      .slice(0, 2)
      .forEach(gap => {
        // Only add if not already covered
        const alreadyCovered = knownUnknowns.some(ku => ku.description.includes(gap.description))
        if (!alreadyCovered) {
          knownUnknowns.push({
            id: `KU-${kuNumber++}`,
            description: `Unresolved blocking gap: ${gap.description}`,
            source: 'gap_analysis',
            impact: 'blocking',
            acknowledged: false,
            resolution: gap.suggestion || 'Address before implementation',
          })
        }
      })
  }

  // Add unknowns based on readiness analysis
  if (readiness && !readiness.ready) {
    const factors = readiness.factors
    if (factors.knownUnknownsCount > 0 && knownUnknowns.length === 0) {
      knownUnknowns.push({
        id: `KU-${kuNumber++}`,
        description: `Readiness analysis identified ${factors.knownUnknownsCount} uncertainty marker(s)`,
        source: 'readiness_analysis',
        impact: 'medium',
        acknowledged: false,
        resolution: 'Review story content for TBD/unknown markers',
      })
    }
  }

  return knownUnknowns.slice(0, config.maxKnownUnknowns)
}

/**
 * Creates a commitment baseline snapshot.
 *
 * @param readiness - Readiness score result
 * @param baseline - Baseline reality
 * @param seed - Story seed structure
 * @param gaps - Gap hygiene result
 * @param knownUnknowns - Documented known unknowns
 * @returns Commitment baseline or undefined
 */
export function createCommitmentBaseline(
  readiness: ReadinessResult | null | undefined,
  baseline: BaselineReality | null | undefined,
  seed: StoryStructure | null | undefined,
  gaps: HygieneResult | null | undefined,
  knownUnknowns: KnownUnknown[],
): CommitmentBaseline | undefined {
  // Must have readiness to create commitment baseline
  if (!readiness) {
    return undefined
  }

  const blockingGapsCount =
    gaps?.rankedGaps.filter(g => g.category === 'mvp_blocking' && !g.resolved).length ?? 0

  const baselineConstraints = baseline?.noRework ?? []

  const commitmentBaseline: CommitmentBaseline = {
    committedAt: new Date().toISOString(),
    readinessScore: readiness.score,
    wasReady: readiness.ready,
    blockingGapsCount,
    knownUnknownsCount: knownUnknowns.length,
    baselineConstraints,
    expectedAffectedFiles: seed?.affectedFiles ?? [],
    dependencies: seed?.dependencies ?? [],
    commitmentNotes: readiness.ready
      ? 'Story committed at readiness threshold'
      : `Story committed below threshold (score: ${readiness.score}/${readiness.threshold})`,
  }

  return commitmentBaseline
}

/**
 * Generates synthesis notes summarizing the process.
 *
 * @param seed - Story seed
 * @param finalACs - Final acceptance criteria
 * @param nonGoals - Non-goals
 * @param testHints - Test hints
 * @param knownUnknowns - Known unknowns
 * @param readiness - Readiness result
 * @returns Summary notes string
 */
function generateSynthesisNotes(
  seed: StoryStructure,
  finalACs: FinalAcceptanceCriterion[],
  nonGoals: NonGoal[],
  testHints: TestHint[],
  knownUnknowns: KnownUnknown[],
  readiness: ReadinessResult | null | undefined,
): string {
  const parts: string[] = []

  parts.push(`Synthesized story "${seed.title}" with ${finalACs.length} acceptance criteria.`)

  const enhancedACs = finalACs.filter(ac => ac.enhancedFromGaps).length
  if (enhancedACs > 0) {
    parts.push(`${enhancedACs} AC(s) enhanced with gap insights.`)
  }

  if (nonGoals.length > 0) {
    parts.push(`${nonGoals.length} non-goal(s) identified to clarify scope.`)
  }

  if (testHints.length > 0) {
    const highPriorityHints = testHints.filter(th => th.priority === 1).length
    parts.push(
      `${testHints.length} test hint(s) generated${highPriorityHints > 0 ? ` (${highPriorityHints} high priority)` : ''}.`,
    )
  }

  if (knownUnknowns.length > 0) {
    const blockingUnknowns = knownUnknowns.filter(ku => ku.impact === 'blocking').length
    parts.push(
      `${knownUnknowns.length} known unknown(s)${blockingUnknowns > 0 ? ` including ${blockingUnknowns} blocking` : ''}.`,
    )
  }

  if (readiness) {
    parts.push(`Readiness: ${readiness.score}/100 (${readiness.ready ? 'READY' : 'NOT READY'}).`)
  }

  return parts.join(' ')
}

/**
 * Main synthesis function that produces the final story artifacts.
 *
 * @param seed - Story seed structure
 * @param gaps - Gap hygiene result
 * @param attacks - Attack analysis result
 * @param readiness - Readiness score result
 * @param baseline - Baseline reality
 * @param config - Synthesis configuration
 * @returns Synthesis result
 */
export async function synthesizeStory(
  seed: StoryStructure | null | undefined,
  gaps: HygieneResult | null | undefined,
  attacks: AttackAnalysis | null | undefined,
  readiness: ReadinessResult | null | undefined,
  baseline: BaselineReality | null | undefined,
  config: Partial<SynthesizeConfig> = {},
): Promise<SynthesizeResult> {
  const fullConfig = SynthesizeConfigSchema.parse(config)
  const allWarnings: string[] = []

  try {
    // Require story seed
    if (!seed) {
      return {
        synthesizedStory: null,
        synthesized: false,
        error: 'Story seed is required for synthesis',
        warnings: allWarnings,
      }
    }

    // Consolidate inputs
    const inputs = consolidateInputs(seed, gaps, attacks, readiness)
    allWarnings.push(...inputs.warnings)

    // Generate final ACs
    const finalACs = generateFinalACs(seed, gaps, fullConfig)

    // Generate non-goals
    const nonGoals = generateNonGoals(seed, attacks, gaps, fullConfig)

    // Generate test hints
    const testHints = generateTestHints(gaps, attacks, fullConfig)

    // Document known unknowns
    const knownUnknowns = documentKnownUnknowns(readiness, attacks, gaps, seed, fullConfig)

    // Create commitment baseline if configured
    const commitmentBaseline = fullConfig.generateCommitmentBaseline
      ? createCommitmentBaseline(readiness, baseline, seed, gaps, knownUnknowns)
      : undefined

    // Generate synthesis notes
    const synthesisNotes = generateSynthesisNotes(
      seed,
      finalACs,
      nonGoals,
      testHints,
      knownUnknowns,
      readiness,
    )

    // Build synthesized story
    const synthesizedStory: SynthesizedStory = {
      storyId: seed.storyId,
      title: seed.title,
      description: seed.description,
      domain: seed.domain,
      synthesizedAt: new Date().toISOString(),
      acceptanceCriteria: finalACs,
      nonGoals,
      testHints,
      knownUnknowns,
      constraints: seed.constraints,
      affectedFiles: seed.affectedFiles,
      dependencies: seed.dependencies,
      tags: seed.tags,
      estimatedComplexity: seed.estimatedComplexity,
      commitmentBaseline,
      readinessScore: readiness?.score ?? 0,
      isReady: readiness?.ready ?? false,
      synthesisNotes,
    }

    // Validate against schema
    const validated = SynthesizedStorySchema.parse(synthesizedStory)

    return {
      synthesizedStory: validated,
      synthesized: true,
      warnings: allWarnings,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during synthesis'
    return {
      synthesizedStory: null,
      synthesized: false,
      error: errorMessage,
      warnings: allWarnings,
    }
  }
}

/**
 * Extended graph state with synthesized story.
 */
export interface GraphStateWithSynthesizedStory extends GraphStateWithStorySeed {
  /** Gap hygiene result (from FLOW-028) */
  gapHygieneResult?: HygieneResult | null
  /** Attack analysis result (from FLOW-027) */
  attackAnalysis?: AttackAnalysis | null
  /** Readiness score result (from FLOW-029) */
  readinessResult?: ReadinessResult | null
  /** The synthesized story */
  synthesizedStory?: SynthesizedStory | null
  /** Whether synthesis was successful */
  storySynthesized?: boolean
  /** Warnings from synthesis */
  synthesisWarnings?: string[]
}

/**
 * Story Synthesize node implementation.
 *
 * Produces final story artifacts from all analyses (seed, gaps, attacks, readiness).
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have story structure and analysis results)
 * @returns Partial state update with synthesized story
 */
export const storySynthesizeNode = createToolNode(
  'story_synthesize',
  async (state: GraphState): Promise<Partial<GraphStateWithSynthesizedStory>> => {
    const stateWithAnalyses = state as GraphStateWithSynthesizedStory

    // Require story structure
    if (!stateWithAnalyses.storyStructure) {
      return updateState({
        synthesizedStory: null,
        storySynthesized: false,
        synthesisWarnings: ['No story structure available - run seed node first'],
      } as Partial<GraphStateWithSynthesizedStory>)
    }

    const result = await synthesizeStory(
      stateWithAnalyses.storyStructure,
      stateWithAnalyses.gapHygieneResult,
      stateWithAnalyses.attackAnalysis,
      stateWithAnalyses.readinessResult,
      stateWithAnalyses.baselineReality,
    )

    if (!result.synthesized) {
      return updateState({
        synthesizedStory: null,
        storySynthesized: false,
        synthesisWarnings: result.warnings,
      } as Partial<GraphStateWithSynthesizedStory>)
    }

    return updateState({
      synthesizedStory: result.synthesizedStory,
      storySynthesized: true,
      synthesisWarnings: result.warnings,
    } as Partial<GraphStateWithSynthesizedStory>)
  },
)

/**
 * Creates a synthesize node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createSynthesizeNode(config: Partial<SynthesizeConfig> = {}) {
  return createToolNode(
    'story_synthesize',
    async (state: GraphState): Promise<Partial<GraphStateWithSynthesizedStory>> => {
      const stateWithAnalyses = state as GraphStateWithSynthesizedStory

      // Require story structure
      if (!stateWithAnalyses.storyStructure) {
        throw new Error('Story structure is required for synthesis')
      }

      const result = await synthesizeStory(
        stateWithAnalyses.storyStructure,
        stateWithAnalyses.gapHygieneResult,
        stateWithAnalyses.attackAnalysis,
        stateWithAnalyses.readinessResult,
        stateWithAnalyses.baselineReality,
        config,
      )

      if (!result.synthesized) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          synthesizedStory: null,
          storySynthesized: false,
          synthesisWarnings: result.warnings,
        } as Partial<GraphStateWithSynthesizedStory>)
      }

      return updateState({
        synthesizedStory: result.synthesizedStory,
        storySynthesized: true,
        synthesisWarnings: result.warnings,
      } as Partial<GraphStateWithSynthesizedStory>)
    },
  )
}
