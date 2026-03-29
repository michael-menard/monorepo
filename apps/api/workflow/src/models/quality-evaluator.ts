/**
 * quality-evaluator.ts
 *
 * Core quality evaluation logic for model output assessment.
 * Evaluates output quality across five dimensions and detects
 * contract mismatches (over/under-provisioning).
 *
 * MODL-0030: Quality Evaluator
 *
 * @module models/quality-evaluator
 */

import { logger } from '@repo/logger'
import type { TaskContract } from './__types__/task-contract.js'
import type { QualityDimensionScore, QualityEvaluation } from './__types__/quality-evaluation.js'
import { QualityEvaluationSchema } from './__types__/quality-evaluation.js'

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Quality score thresholds mapped to quality requirement levels.
 * A task achieves its quality requirement when its score meets or exceeds the threshold.
 */
export const QUALITY_THRESHOLDS = {
  adequate: 60,
  good: 75,
  high: 85,
  critical: 95,
} as const

/**
 * Expected quality score for each tier.
 * Used by evaluateCostEfficiency to determine if a lower-cost tier
 * would have met the quality requirement.
 */
export const TIER_QUALITY_EXPECTATIONS = {
  'tier-0': 95,
  'tier-1': 85,
  'tier-2': 75,
  'tier-3': 60,
} as const

/**
 * Default weights for each quality dimension (equal weight, sums to 1.0).
 */
export const DEFAULT_DIMENSION_WEIGHTS = {
  correctness: 0.2,
  completeness: 0.2,
  coherence: 0.2,
  compliance: 0.2,
  cost_efficiency: 0.2,
} as const

/**
 * Margin above quality threshold that triggers over-provisioning detection.
 * If achieved score exceeds threshold by this many points, the tier is over-provisioned.
 */
export const OVER_PROVISIONING_MARGIN = 20

// ============================================================================
// Dimension Evaluators
// ============================================================================

/**
 * Evaluate correctness: does the output fulfill the stated requirements?
 * Heuristic: checks for requirement-related keywords and output length.
 *
 * @param contract - Task contract with quality requirement
 * @param output - Model output string
 * @returns QualityDimensionScore for correctness
 */
export function evaluateCorrectness(contract: TaskContract, output: string): QualityDimensionScore {
  logger.info('quality_evaluator', {
    event: 'evaluate_dimension',
    dimension: 'correctness',
    task_type: contract.taskType,
  })

  if (!output || output.trim().length === 0) {
    return {
      dimension: 'correctness',
      score: 0,
      rationale: 'Empty output cannot fulfill any requirements',
      weight: DEFAULT_DIMENSION_WEIGHTS.correctness,
    }
  }

  const lowerOutput = output.toLowerCase()
  const lowerTaskType = contract.taskType.toLowerCase()

  // Extract keywords from task type (e.g., 'code_generation' -> ['code', 'generation'])
  const taskKeywords = lowerTaskType.split(/[_\s-]+/).filter(k => k.length > 2)

  let matchedKeywords = 0
  for (const keyword of taskKeywords) {
    if (lowerOutput.includes(keyword)) {
      matchedKeywords++
    }
  }

  const keywordRatio = taskKeywords.length > 0 ? matchedKeywords / taskKeywords.length : 0.5

  // Check for completeness markers in output
  const hasSubstantialContent = output.trim().length >= 50
  const hasStructuredContent = output.includes('\n') || output.includes('.') || output.includes(':')

  // Calculate score
  let score = keywordRatio * 60 // Up to 60 from keyword matching
  if (hasSubstantialContent) score += 25
  if (hasStructuredContent) score += 15

  const finalScore = Math.min(100, Math.round(score))

  const rationale =
    taskKeywords.length > 0
      ? `Matched ${matchedKeywords}/${taskKeywords.length} task keywords. ${
          hasSubstantialContent ? 'Substantial content present.' : 'Content may be too brief.'
        }`
      : `Output ${hasSubstantialContent ? 'has' : 'lacks'} substantial content ` +
        `for task type '${contract.taskType}'.`

  return {
    dimension: 'correctness',
    score: finalScore,
    rationale,
    weight: DEFAULT_DIMENSION_WEIGHTS.correctness,
  }
}

/**
 * Evaluate completeness: are all required elements present?
 * Heuristic: checks output length relative to task complexity and quality requirement.
 *
 * @param contract - Task contract with complexity and quality requirement
 * @param output - Model output string
 * @returns QualityDimensionScore for completeness
 */
export function evaluateCompleteness(
  contract: TaskContract,
  output: string,
): QualityDimensionScore {
  logger.info('quality_evaluator', {
    event: 'evaluate_dimension',
    dimension: 'completeness',
    task_type: contract.taskType,
  })

  if (!output || output.trim().length === 0) {
    return {
      dimension: 'completeness',
      score: 0,
      rationale: 'Empty output is not complete',
      weight: DEFAULT_DIMENSION_WEIGHTS.completeness,
    }
  }

  // Expected minimum lengths by complexity
  const expectedLengthByComplexity = {
    low: 100,
    medium: 300,
    high: 800,
  }

  const expectedLength = expectedLengthByComplexity[contract.complexity]
  const actualLength = output.trim().length
  const lengthRatio = Math.min(1, actualLength / expectedLength)

  // Check for structural completeness markers
  const hasSections = (output.match(/\n\n+/g) || []).length >= 2 // Multiple paragraphs
  // Lists present
  const hasLists = output.includes('- ') || output.includes('* ') || /\d+\.\s/.test(output)
  const hasConclusion =
    output.toLowerCase().includes('conclusion') ||
    output.toLowerCase().includes('summary') ||
    output.toLowerCase().includes('result') ||
    output.toLowerCase().includes('therefore') ||
    output.toLowerCase().includes('finally')

  let score = lengthRatio * 70 // Up to 70 from length
  if (hasSections) score += 15
  if (hasLists) score += 10
  if (hasConclusion) score += 5

  const finalScore = Math.min(100, Math.round(score))

  const rationale =
    `Output length: ${actualLength} chars ` +
    `(expected ~${expectedLength} for ${contract.complexity} complexity). ` +
    `${hasSections ? 'Multi-section structure.' : 'Single-section output.'} ` +
    `${hasLists ? 'Contains lists.' : 'No list structure.'}` +
    `${hasConclusion ? ' Has conclusion/summary.' : ''}`

  return {
    dimension: 'completeness',
    score: finalScore,
    rationale,
    weight: DEFAULT_DIMENSION_WEIGHTS.completeness,
  }
}

/**
 * Evaluate coherence: is the output logically structured?
 * Heuristic: checks for paragraph structure, transition words, and absence of contradictions.
 *
 * @param contract - Task contract
 * @param output - Model output string
 * @returns QualityDimensionScore for coherence
 */
export function evaluateCoherence(contract: TaskContract, output: string): QualityDimensionScore {
  logger.info('quality_evaluator', {
    event: 'evaluate_dimension',
    dimension: 'coherence',
    task_type: contract.taskType,
  })

  if (!output || output.trim().length === 0) {
    return {
      dimension: 'coherence',
      score: 0,
      rationale: 'Empty output has no coherence',
      weight: DEFAULT_DIMENSION_WEIGHTS.coherence,
    }
  }

  const lowerOutput = output.toLowerCase()

  // Check for transition words (logical flow indicators)
  const transitionWords = [
    'therefore',
    'however',
    'furthermore',
    'additionally',
    'consequently',
    'moreover',
    'thus',
    'hence',
    'first',
    'second',
    'third',
    'finally',
    'in conclusion',
    'as a result',
    'for example',
    'in addition',
    'on the other hand',
  ]

  const transitionCount = transitionWords.filter(word => lowerOutput.includes(word)).length
  const hasLogicalFlow = transitionCount >= 2

  // Check for contradictory phrases (incoherence indicators)
  const contradictoryPhrases = [
    'but also not',
    'at the same time never',
    'always never',
    'completely impossible but done',
    'both true and false',
  ]

  const hasContradictions = contradictoryPhrases.some(phrase => lowerOutput.includes(phrase))

  // Check paragraph structure
  const paragraphs = output.split(/\n\n+/).filter(p => p.trim().length > 0)
  const paragraphCount = paragraphs.length

  // Sentence length variance (too uniform = robotic, too varied = incoherent)
  const sentences = output.match(/[^.!?]+[.!?]+/g) || []
  let sentenceLengthScore = 50 // Default if not enough sentences
  if (sentences.length >= 3) {
    const lengths = sentences.map(s => s.trim().length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((a, b) => a + Math.pow(b - avgLength, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)
    // Good variance: stdDev between 10-50 chars
    sentenceLengthScore = stdDev >= 10 && stdDev <= 100 ? 70 : 40
  }

  let score = 0
  score += Math.min(30, transitionCount * 10) // Up to 30 for transitions
  score += paragraphCount >= 2 ? 20 : 0 // 20 for multi-paragraph
  score += hasLogicalFlow ? 15 : 0 // 15 for logical flow
  score += hasContradictions ? -20 : 10 // -20 penalty for contradictions, +10 bonus for none
  score += sentenceLengthScore * 0.25 // Up to 17.5 from sentence variety

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

  const rationale =
    `${paragraphCount} paragraph(s). ${transitionCount} transition word(s). ` +
    `${hasLogicalFlow ? 'Logical flow detected.' : 'Limited logical flow.'} ` +
    `${hasContradictions ? 'Contradictions detected.' : 'No contradictions detected.'}`

  return {
    dimension: 'coherence',
    score: finalScore,
    rationale,
    weight: DEFAULT_DIMENSION_WEIGHTS.coherence,
  }
}

/**
 * Evaluate compliance: does the output respect contract flags?
 * Checks security requirements, Ollama restrictions, and quality level indicators.
 *
 * @param contract - Task contract with securitySensitive and allowOllama flags
 * @param output - Model output string
 * @returns QualityDimensionScore for compliance
 */
export function evaluateCompliance(contract: TaskContract, output: string): QualityDimensionScore {
  logger.info('quality_evaluator', {
    event: 'evaluate_dimension',
    dimension: 'compliance',
    task_type: contract.taskType,
  })

  if (!output || output.trim().length === 0) {
    return {
      dimension: 'compliance',
      score: 0,
      rationale: 'Empty output fails compliance check',
      weight: DEFAULT_DIMENSION_WEIGHTS.compliance,
    }
  }

  const lowerOutput = output.toLowerCase()
  const complianceIssues: string[] = []
  let score = 100 // Start at 100, deduct for violations

  // Security compliance check
  if (contract.securitySensitive) {
    const securityIndicators = [
      'security',
      'secure',
      'validation',
      'sanitize',
      'authenticate',
      'authorize',
      'encrypt',
      'hash',
      'token',
      'credential',
      'permission',
      'access control',
    ]

    const securityMentions = securityIndicators.filter(ind => lowerOutput.includes(ind)).length
    if (securityMentions === 0) {
      score -= 30
      complianceIssues.push('Security-sensitive task but no security indicators in output')
    }
  }

  // Ollama compliance check (if Ollama is NOT allowed, output should not reference it)
  if (!contract.allowOllama) {
    const ollamaReferences = ['ollama', 'local model', 'local llm', 'offline model']
    const hasOllamaReference = ollamaReferences.some(ref => lowerOutput.includes(ref))
    if (hasOllamaReference) {
      score -= 20
      complianceIssues.push('Output references Ollama/local models but contract disallows them')
    }
  }

  // Quality requirement compliance
  const qualityThreshold = QUALITY_THRESHOLDS[contract.qualityRequirement]
  // Rough heuristic: length scales with quality
  const hasQualityIndicators = output.trim().length >= qualityThreshold / 2

  if (!hasQualityIndicators) {
    score -= 15
    complianceIssues.push(`Output may not meet ${contract.qualityRequirement} quality requirement`)
  }

  const finalScore = Math.max(0, Math.min(100, score))

  const rationale =
    complianceIssues.length === 0
      ? `Output complies with contract constraints ` +
        `(security: ${contract.securitySensitive}, allowOllama: ${contract.allowOllama})`
      : `Compliance issues: ${complianceIssues.join('; ')}`

  return {
    dimension: 'compliance',
    score: finalScore,
    rationale,
    weight: DEFAULT_DIMENSION_WEIGHTS.compliance,
  }
}

/**
 * Evaluate cost efficiency: was the selected tier appropriate for the quality achieved?
 * Checks if a lower-cost tier would have met the quality requirement threshold.
 *
 * @param contract - Task contract with quality requirement
 * @param output - Model output string
 * @param selectedTier - The tier that was used
 * @returns QualityDimensionScore for cost_efficiency
 */
export function evaluateCostEfficiency(
  contract: TaskContract,
  output: string,
  selectedTier: string,
): QualityDimensionScore {
  logger.info('quality_evaluator', {
    event: 'evaluate_dimension',
    dimension: 'cost_efficiency',
    task_type: contract.taskType,
    selected_tier: selectedTier,
  })

  const qualityThreshold = QUALITY_THRESHOLDS[contract.qualityRequirement]
  const tierExpectation =
    TIER_QUALITY_EXPECTATIONS[selectedTier as keyof typeof TIER_QUALITY_EXPECTATIONS]

  // If tier is not recognized, default to medium efficiency
  if (tierExpectation === undefined) {
    return {
      dimension: 'cost_efficiency',
      score: 50,
      rationale: `Unknown tier '${selectedTier}', cannot assess cost efficiency`,
      weight: DEFAULT_DIMENSION_WEIGHTS.cost_efficiency,
    }
  }

  // Tier number (lower = more expensive)
  const tierNumber = parseInt(selectedTier.replace('tier-', ''), 10)

  // Check if a lower-cost tier would have sufficed
  // Lower-cost tiers have higher tier numbers (tier-3 = cheapest)
  const lowestSufficientTierNumber = Object.entries(TIER_QUALITY_EXPECTATIONS)
    .filter(([, expectation]) => expectation >= qualityThreshold)
    .map(([tier]) => parseInt(tier.replace('tier-', ''), 10))
    // Highest tier number that still meets threshold = cheapest sufficient
    .sort((a, b) => b - a)[0]

  const isOptimalTier = tierNumber >= lowestSufficientTierNumber

  // Over-provisioned: used expensive tier when cheaper would suffice
  const overProvisionedBy =
    tierNumber < lowestSufficientTierNumber ? lowestSufficientTierNumber - tierNumber : 0

  let score: number
  let rationale: string

  if (isOptimalTier) {
    score = 90
    rationale =
      `Tier selection is cost-efficient. Selected ${selectedTier} meets the ` +
      `${contract.qualityRequirement} ` +
      `quality requirement (threshold: ${qualityThreshold}). ` +
      `Tier expectation: ${tierExpectation}.`
  } else {
    // Over-provisioned: used a more expensive tier than needed
    score = Math.max(30, 90 - overProvisionedBy * 20)
    rationale =
      `Over-provisioned: selected ${selectedTier} (expectation: ${tierExpectation}) but ` +
      `tier-${lowestSufficientTierNumber} would meet the ${contract.qualityRequirement} ` +
      `threshold (${qualityThreshold}). ${overProvisionedBy} tier(s) more expensive than needed.`
  }

  // Adjust for empty output (cost inefficiency if we paid for expensive model but got nothing)
  if (!output || output.trim().length === 0) {
    score = Math.max(0, score - 50)
    rationale = `Empty output: ${rationale}`
  }

  return {
    dimension: 'cost_efficiency',
    score: Math.round(score),
    rationale,
    weight: DEFAULT_DIMENSION_WEIGHTS.cost_efficiency,
  }
}

// ============================================================================
// Contract Mismatch Detection
// ============================================================================

/**
 * Detect contract mismatch (over/under-provisioning).
 *
 * - Over-provisioned: achieved quality exceeds requirement threshold by OVER_PROVISIONING_MARGIN+
 * - Under-provisioned: achieved quality falls below requirement threshold
 *
 * @param contract - Task contract with quality requirement
 * @param achievedScore - The overall quality score achieved
 * @param selectedTier - The tier that was selected
 * @returns Object with mismatch flag and recommendation
 */
export function detectContractMismatch(
  contract: TaskContract,
  achievedScore: number,
  selectedTier: string,
): { contractMismatch: boolean; recommendation?: string } {
  const threshold = QUALITY_THRESHOLDS[contract.qualityRequirement]
  const excessScore = achievedScore - threshold

  // Under-provisioning: score below threshold
  if (achievedScore < threshold) {
    logger.warn('contract_mismatch_detected', {
      event: 'contract_mismatch_detected',
      type: 'under_provisioning',
      required_quality: contract.qualityRequirement,
      threshold,
      achieved_score: achievedScore,
      selected_tier: selectedTier,
    })

    return {
      contractMismatch: true,
      recommendation:
        `Under-provisioned: achieved ${achievedScore} but ` +
        `${contract.qualityRequirement} requires ${threshold}. ` +
        `Consider using a higher-tier model for this task.`,
    }
  }

  // Over-provisioning: score exceeds threshold by margin
  if (excessScore >= OVER_PROVISIONING_MARGIN) {
    logger.warn('contract_mismatch_detected', {
      event: 'contract_mismatch_detected',
      type: 'over_provisioning',
      required_quality: contract.qualityRequirement,
      threshold,
      achieved_score: achievedScore,
      excess_score: excessScore,
      selected_tier: selectedTier,
    })

    // Find a lower tier that might suffice
    const currentTierNumber = parseInt(selectedTier.replace('tier-', ''), 10)
    const lowerTierNumber = Math.min(3, currentTierNumber + 1)
    const lowerTier = `tier-${lowerTierNumber}`
    const lowerTierExpectation =
      TIER_QUALITY_EXPECTATIONS[lowerTier as keyof typeof TIER_QUALITY_EXPECTATIONS]

    const canDowngrade = lowerTierExpectation >= threshold

    return {
      contractMismatch: true,
      recommendation:
        `Over-provisioned: achieved ${achievedScore} exceeds ` +
        `${contract.qualityRequirement} threshold ` +
        `(${threshold}) by ${excessScore} points. ` +
        (canDowngrade
          ? `Consider using ${lowerTier} ` +
            `(expected quality: ${lowerTierExpectation}) to reduce cost.`
          : `No suitable lower tier available for ${contract.qualityRequirement} requirement.`),
    }
  }

  // No mismatch
  return { contractMismatch: false }
}

// ============================================================================
// Main Evaluator
// ============================================================================

/**
 * Evaluate the quality of a model output against a task contract.
 *
 * Runs all five dimension evaluators and calculates the weighted average score.
 * Detects contract mismatches (over/under-provisioning).
 *
 * @param contract - Task contract defining requirements
 * @param tier - Selected tier string (e.g., 'tier-1')
 * @param output - Model output to evaluate
 * @returns QualityEvaluation with scores, dimensions, and mismatch detection
 *
 * @example
 * ```typescript
 * const contract = createTaskContract({ taskType: 'code_generation' })
 * const evaluation = evaluateQuality(contract, 'tier-1', 'function add(a, b) { return a + b }')
 * console.log(evaluation.qualityScore) // e.g., 78.5
 * console.log(evaluation.contractMismatch) // false
 * ```
 */
export function evaluateQuality(
  contract: TaskContract,
  tier: string,
  output: string,
): QualityEvaluation {
  logger.info('quality_evaluator', {
    event: 'evaluate_quality_start',
    task_type: contract.taskType,
    tier,
    output_length: output?.length ?? 0,
  })

  // Run all five dimension evaluators
  const dimensions: QualityDimensionScore[] = [
    evaluateCorrectness(contract, output),
    evaluateCompleteness(contract, output),
    evaluateCoherence(contract, output),
    evaluateCompliance(contract, output),
    evaluateCostEfficiency(contract, output, tier),
  ]

  // Calculate weighted average score
  const totalWeight = dimensions.reduce(
    (sum, d) => sum + (d.weight ?? DEFAULT_DIMENSION_WEIGHTS.correctness),
    0,
  )
  const weightedSum = dimensions.reduce(
    (sum, d) => sum + d.score * (d.weight ?? DEFAULT_DIMENSION_WEIGHTS.correctness),
    0,
  )
  const qualityScore = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0

  // Detect contract mismatch
  const { contractMismatch, recommendation } = detectContractMismatch(contract, qualityScore, tier)

  logger.info('quality_evaluator', {
    event: 'evaluate_quality_complete',
    task_type: contract.taskType,
    tier,
    quality_score: qualityScore,
    contract_mismatch: contractMismatch,
  })

  const evaluation = {
    taskContract: contract,
    selectedTier: tier as 'tier-0' | 'tier-1' | 'tier-2' | 'tier-3',
    modelUsed: '',
    qualityScore,
    qualityDimensions: dimensions,
    contractMismatch,
    recommendation,
    timestamp: new Date().toISOString(),
  }

  return QualityEvaluationSchema.parse(evaluation)
}
