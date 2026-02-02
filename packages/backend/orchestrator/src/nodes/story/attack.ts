/**
 * Story Attack Node
 *
 * Challenges assumptions and surfaces edge cases in story structures.
 * Performs bounded adversarial analysis to identify weaknesses before development.
 * Uses the "red team" approach to stress-test story definitions.
 *
 * FLOW-027: LangGraph Story Node - Attack
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { KnowledgeContext } from '../reality/load-knowledge-context.js'
import type { GraphStateWithStorySeed, StoryStructure } from './seed.js'
import type { PMGapStructure } from './fanout-pm.js'
import type { UXGapAnalysis } from './fanout-ux.js'
import type { QAGapAnalysis } from './fanout-qa.js'

/**
 * Confidence levels for assumptions.
 */
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low', 'unknown'])

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

/**
 * Source types for where an assumption was derived from.
 */
export const AssumptionSourceSchema = z.enum([
  'story_title',
  'story_description',
  'acceptance_criteria',
  'constraints',
  'dependencies',
  'affected_files',
  'domain_knowledge',
  'gap_analysis',
  'lesson_learned', // From past story failures
])

export type AssumptionSource = z.infer<typeof AssumptionSourceSchema>

/**
 * Schema for an extracted assumption from the story structure.
 */
export const AssumptionSchema = z.object({
  /** Unique ID for the assumption (e.g., "ASM-1") */
  id: z.string().min(1),
  /** Description of the assumption being made */
  description: z.string().min(1),
  /** Where this assumption was derived from */
  source: AssumptionSourceSchema,
  /** Confidence level in the assumption */
  confidence: ConfidenceLevelSchema,
  /** Optional reference to source element (AC ID, constraint text, etc.) */
  sourceRef: z.string().optional(),
  /** Past failure from lessons learned (if source is lesson_learned) */
  pastFailure: z.string().optional(),
  /** Story ID where this pattern failed before */
  pastStoryId: z.string().optional(),
})

export type Assumption = z.infer<typeof AssumptionSchema>

/**
 * Validity assessment for a challenged assumption.
 */
export const ValidityAssessmentSchema = z.enum([
  'valid', // Assumption holds under challenge
  'partially_valid', // Assumption holds in some cases
  'invalid', // Assumption does not hold
  'uncertain', // Cannot determine validity
])

export type ValidityAssessment = z.infer<typeof ValidityAssessmentSchema>

/**
 * Schema for a challenge result after testing an assumption.
 */
export const ChallengeResultSchema = z.object({
  /** The assumption being challenged */
  assumption: AssumptionSchema,
  /** The specific challenge posed */
  challenge: z.string().min(1),
  /** Assessment of assumption validity after challenge */
  validity: ValidityAssessmentSchema,
  /** Evidence or reasoning supporting the assessment */
  evidence: z.string().min(1),
  /** Iteration number (for bounded exploration) */
  iteration: z.number().int().min(1),
  /** Suggested remediation if invalid or partially valid */
  remediation: z.string().optional(),
  /** Story ID if challenge derives from a past failure */
  fromLesson: z.string().optional(),
})

export type ChallengeResult = z.infer<typeof ChallengeResultSchema>

/**
 * Categories for edge cases identified by attack analysis.
 */
export const EdgeCaseCategorySchema = z.enum([
  'boundary', // Boundary value conditions
  'concurrency', // Concurrent access scenarios
  'failure', // Failure and error scenarios
  'security', // Security-related edge cases
  'performance', // Performance degradation scenarios
  'integration', // Integration point failures
  'data', // Data integrity and format issues
  'user_behavior', // Unexpected user interactions
  'environment', // Environment-specific conditions
  'timing', // Timing and race conditions
  'adr_violation', // Violation of architecture decisions
])

export type EdgeCaseCategory = z.infer<typeof EdgeCaseCategorySchema>

/**
 * Likelihood levels for edge cases.
 */
export const LikelihoodSchema = z.enum(['certain', 'likely', 'possible', 'unlikely', 'rare'])

export type Likelihood = z.infer<typeof LikelihoodSchema>

/**
 * Impact levels for edge cases.
 */
export const ImpactSchema = z.enum(['critical', 'high', 'medium', 'low', 'negligible'])

export type Impact = z.infer<typeof ImpactSchema>

/**
 * Schema for an edge case identified by attack analysis.
 */
export const AttackEdgeCaseSchema = z.object({
  /** Unique ID for the edge case (e.g., "EDGE-ATK-1") */
  id: z.string().min(1),
  /** Description of the edge case scenario */
  description: z.string().min(1),
  /** Category of edge case */
  category: EdgeCaseCategorySchema,
  /** Likelihood of occurrence */
  likelihood: LikelihoodSchema,
  /** Impact if the edge case occurs */
  impact: ImpactSchema,
  /** Calculated risk score (1-25, likelihood * impact) */
  riskScore: z.number().int().min(1).max(25),
  /** Related challenged assumption if applicable */
  relatedAssumptionId: z.string().optional(),
  /** Suggested mitigation */
  mitigation: z.string().optional(),
  /** ADR reference if this is an adr_violation category */
  adrReference: z.string().optional(),
})

export type AttackEdgeCase = z.infer<typeof AttackEdgeCaseSchema>

/**
 * Summary of attack analysis findings.
 */
export const AttackSummarySchema = z.object({
  /** Total assumptions extracted */
  totalAssumptions: z.number().int().min(0),
  /** Total challenges performed */
  totalChallenges: z.number().int().min(0),
  /** Assumptions found to be invalid or partially valid */
  weakAssumptions: z.number().int().min(0),
  /** Total edge cases identified */
  totalEdgeCases: z.number().int().min(0),
  /** High-risk edge cases (riskScore >= 15) */
  highRiskEdgeCases: z.number().int().min(0),
  /** Risks surfaced from past failures (lessons learned) */
  lessonBasedRisks: z.number().int().min(0).default(0),
  /** Risks from potential ADR violations */
  adrBasedRisks: z.number().int().min(0).default(0),
  /** Overall attack readiness (ready, needs_attention, critical) */
  attackReadiness: z.enum(['ready', 'needs_attention', 'critical']),
  /** Brief narrative summary */
  narrative: z.string().min(1),
})

export type AttackSummary = z.infer<typeof AttackSummarySchema>

/**
 * Schema for a lesson that was applied to attack analysis.
 */
export const LessonAppliedSchema = z.object({
  /** Story ID where this lesson was learned */
  storyId: z.string().min(1),
  /** The lesson description */
  lesson: z.string().min(1),
  /** Which attack finding was generated from this lesson */
  attackGenerated: z.string().min(1),
  /** Why this lesson is relevant to the current story */
  relevance: z.string().min(1),
})

export type LessonApplied = z.infer<typeof LessonAppliedSchema>

/**
 * Schema for an ADR that was checked during attack analysis.
 */
export const ADRCheckedSchema = z.object({
  /** ADR ID (e.g., "ADR-001") */
  adrId: z.string().min(1),
  /** The constraint from this ADR */
  constraint: z.string().min(1),
  /** Whether the story appears to comply with this ADR */
  storyCompliant: z.boolean(),
  /** Edge case ID if a violation risk was identified */
  violationRisk: z.string().optional(),
})

export type ADRChecked = z.infer<typeof ADRCheckedSchema>

/**
 * Schema for the complete attack analysis result.
 */
export const AttackAnalysisSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Whether knowledge context was loaded */
  knowledgeContextUsed: z.boolean().default(false),
  /** Extracted assumptions */
  assumptions: z.array(AssumptionSchema).default([]),
  /** Challenge results for assumptions */
  challengeResults: z.array(ChallengeResultSchema).default([]),
  /** Edge cases identified */
  edgeCases: z.array(AttackEdgeCaseSchema).default([]),
  /** Lessons that informed this attack analysis */
  lessonsApplied: z.array(LessonAppliedSchema).default([]),
  /** ADR constraints that were checked */
  adrsChecked: z.array(ADRCheckedSchema).default([]),
  /** Analysis summary */
  summary: AttackSummarySchema,
  /** Key vulnerabilities requiring attention */
  keyVulnerabilities: z.array(z.string()).default([]),
  /** Recommendations for hardening the story */
  recommendations: z.array(z.string()).default([]),
})

export type AttackAnalysis = z.infer<typeof AttackAnalysisSchema>

/**
 * Configuration schema for attack analysis with bounds.
 */
export const AttackConfigSchema = z.object({
  /** Maximum number of assumptions to challenge (default: 5) */
  maxAssumptionChallenges: z.number().int().positive().default(5),
  /** Maximum number of edge cases to identify (default: 10) */
  maxEdgeCases: z.number().int().positive().default(10),
  /** Maximum iterations per assumption challenge (default: 3) */
  maxIterationsPerAssumption: z.number().int().positive().default(3),
  /** Minimum confidence level to include assumptions (default: unknown - include all) */
  minConfidenceLevel: ConfidenceLevelSchema.default('unknown'),
  /** Whether to include gap analysis insights */
  includeGapInsights: z.boolean().default(true),
  /** Minimum risk score to report edge cases (default: 1) */
  minRiskScore: z.number().int().min(1).max(25).default(1),
})

export type AttackConfig = z.infer<typeof AttackConfigSchema>

/**
 * Schema for attack node result.
 */
export const AttackResultSchema = z.object({
  /** The attack analysis */
  attackAnalysis: AttackAnalysisSchema.nullable(),
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type AttackResult = z.infer<typeof AttackResultSchema>

/**
 * Keyword patterns that suggest different types of assumptions.
 */
const ASSUMPTION_PATTERNS = {
  always: ['always', 'all', 'every', 'must', 'will'],
  never: ['never', 'none', 'no', 'not', 'cannot'],
  performance: ['fast', 'quick', 'instant', 'real-time', 'responsive'],
  reliability: ['reliable', 'stable', 'consistent', 'guaranteed'],
  security: ['secure', 'safe', 'protected', 'authenticated'],
  scale: ['scalable', 'unlimited', 'any number', 'large'],
}

/**
 * Maps likelihood to numeric value for risk calculation.
 */
const LIKELIHOOD_VALUES: Record<Likelihood, number> = {
  certain: 5,
  likely: 4,
  possible: 3,
  unlikely: 2,
  rare: 1,
}

/**
 * Maps impact to numeric value for risk calculation.
 */
const IMPACT_VALUES: Record<Impact, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  negligible: 1,
}

/**
 * Extracts key assumptions from the story structure, gap analysis, and knowledge context.
 *
 * @param storyStructure - The story structure to analyze
 * @param pmGaps - PM gap analysis if available
 * @param uxGaps - UX gap analysis if available
 * @param qaGaps - QA gap analysis if available
 * @param knowledgeContext - Knowledge context with lessons learned and ADRs
 * @returns Array of extracted assumptions
 */
export function extractAssumptions(
  storyStructure: StoryStructure,
  pmGaps?: PMGapStructure | null,
  uxGaps?: UXGapAnalysis | null,
  qaGaps?: QAGapAnalysis | null,
  knowledgeContext?: KnowledgeContext | null,
): Assumption[] {
  const assumptions: Assumption[] = []
  let assumptionId = 1

  // Extract from title
  const titleAssumptions = extractTextAssumptions(
    storyStructure.title,
    'story_title',
    storyStructure.title,
  )
  titleAssumptions.forEach(a => {
    assumptions.push({ ...a, id: `ASM-${assumptionId++}` })
  })

  // Extract from description
  const descAssumptions = extractTextAssumptions(
    storyStructure.description,
    'story_description',
    storyStructure.description.substring(0, 100),
  )
  descAssumptions.forEach(a => {
    assumptions.push({ ...a, id: `ASM-${assumptionId++}` })
  })

  // Extract from acceptance criteria
  storyStructure.acceptanceCriteria.forEach(ac => {
    const acAssumptions = extractTextAssumptions(ac.description, 'acceptance_criteria', ac.id)
    acAssumptions.forEach(a => {
      assumptions.push({ ...a, id: `ASM-${assumptionId++}` })
    })
  })

  // Extract implicit assumptions from constraints
  storyStructure.constraints.forEach(constraint => {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      description: `Constraint will be respected: "${constraint}"`,
      source: 'constraints',
      confidence: 'medium',
      sourceRef: constraint,
    })
  })

  // Extract from dependencies (assumption that they'll be available)
  if (storyStructure.dependencies.length > 0) {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      description: `All ${storyStructure.dependencies.length} dependencies will be available and functional`,
      source: 'dependencies',
      confidence: 'medium',
      sourceRef: storyStructure.dependencies.join(', '),
    })
  }

  // Extract from affected files (assumption about scope)
  if (storyStructure.affectedFiles.length > 0) {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      description: `Changes will be contained to the ${storyStructure.affectedFiles.length} identified files`,
      source: 'affected_files',
      confidence: 'low',
      sourceRef: storyStructure.affectedFiles.slice(0, 3).join(', '),
    })
  }

  // Add domain-specific assumptions
  const domainAssumption = getDomainAssumption(storyStructure.domain)
  if (domainAssumption) {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      ...domainAssumption,
    })
  }

  // Add assumptions from gap analysis if available
  if (pmGaps && pmGaps.dependencyGaps.length === 0) {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      description: 'No hidden dependencies exist beyond those declared',
      source: 'gap_analysis',
      confidence: 'medium',
      sourceRef: 'PM gap analysis',
    })
  }

  if (qaGaps && qaGaps.testabilityScore >= 80) {
    assumptions.push({
      id: `ASM-${assumptionId++}`,
      description: 'Story is highly testable as indicated by QA analysis',
      source: 'gap_analysis',
      confidence: 'high',
      sourceRef: `QA score: ${qaGaps.testabilityScore}`,
    })
  }

  // Add assumptions from lessons learned (past failures as attack vectors)
  if (knowledgeContext?.lessonsLearned) {
    const lessons = knowledgeContext.lessonsLearned

    // Each past blocker becomes an assumption that this story won't repeat the pattern
    lessons.blockersToAvoid.forEach(blocker => {
      assumptions.push({
        id: `ASM-${assumptionId++}`,
        description: `Story avoids pattern that caused past blocker: "${blocker}"`,
        source: 'lesson_learned',
        confidence: 'low', // Low confidence = high priority to challenge
        sourceRef: 'Past blockers',
        pastFailure: blocker,
      })
    })

    // Each relevant lesson becomes an assumption
    lessons.relevantToScope.forEach(lesson => {
      if (lesson.category === 'blocker') {
        assumptions.push({
          id: `ASM-${assumptionId++}`,
          description: `Story avoids repeating: ${lesson.lesson}`,
          source: 'lesson_learned',
          confidence: 'low',
          sourceRef: lesson.appliesBecause,
          pastFailure: lesson.lesson,
          pastStoryId: lesson.storyId,
        })
      }
    })

    // Patterns to avoid become assumptions that we're not using them
    lessons.patternsToAvoid.forEach(pattern => {
      assumptions.push({
        id: `ASM-${assumptionId++}`,
        description: `Story does not use anti-pattern: "${pattern}"`,
        source: 'lesson_learned',
        confidence: 'medium',
        sourceRef: 'Patterns to avoid',
        pastFailure: pattern,
      })
    })
  }

  return assumptions
}

/**
 * Extracts assumptions from text using pattern matching.
 */
function extractTextAssumptions(
  text: string,
  source: AssumptionSource,
  sourceRef: string,
): Omit<Assumption, 'id'>[] {
  const assumptions: Omit<Assumption, 'id'>[] = []
  const lowerText = text.toLowerCase()

  // Check for "always" patterns
  if (ASSUMPTION_PATTERNS.always.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes universal applicability: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.always)}"`,
      source,
      confidence: 'low',
      sourceRef,
    })
  }

  // Check for "never" patterns
  if (ASSUMPTION_PATTERNS.never.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes absolute negation: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.never)}"`,
      source,
      confidence: 'low',
      sourceRef,
    })
  }

  // Check for performance assumptions
  if (ASSUMPTION_PATTERNS.performance.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes performance characteristic: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.performance)}"`,
      source,
      confidence: 'medium',
      sourceRef,
    })
  }

  // Check for reliability assumptions
  if (ASSUMPTION_PATTERNS.reliability.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes reliability: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.reliability)}"`,
      source,
      confidence: 'medium',
      sourceRef,
    })
  }

  // Check for security assumptions
  if (ASSUMPTION_PATTERNS.security.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes security property: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.security)}"`,
      source,
      confidence: 'medium',
      sourceRef,
    })
  }

  // Check for scale assumptions
  if (ASSUMPTION_PATTERNS.scale.some(p => lowerText.includes(p))) {
    assumptions.push({
      description: `Assumes scalability: "${extractRelevantPhrase(text, ASSUMPTION_PATTERNS.scale)}"`,
      source,
      confidence: 'low',
      sourceRef,
    })
  }

  return assumptions
}

/**
 * Extracts a relevant phrase around a pattern match.
 */
function extractRelevantPhrase(text: string, patterns: string[]): string {
  const lowerText = text.toLowerCase()
  for (const pattern of patterns) {
    const index = lowerText.indexOf(pattern)
    if (index !== -1) {
      const start = Math.max(0, index - 20)
      const end = Math.min(text.length, index + pattern.length + 30)
      let phrase = text.substring(start, end).trim()
      if (start > 0) phrase = '...' + phrase
      if (end < text.length) phrase = phrase + '...'
      return phrase
    }
  }
  return text.substring(0, 50)
}

/**
 * Gets domain-specific assumptions.
 */
function getDomainAssumption(domain: string): Omit<Assumption, 'id'> | null {
  const lowerDomain = domain.toLowerCase()

  if (lowerDomain.includes('api') || lowerDomain.includes('backend')) {
    return {
      description: 'API endpoints will maintain backward compatibility',
      source: 'domain_knowledge',
      confidence: 'medium',
      sourceRef: `Domain: ${domain}`,
    }
  }

  if (lowerDomain.includes('ui') || lowerDomain.includes('frontend')) {
    return {
      description: 'UI changes will not break existing user workflows',
      source: 'domain_knowledge',
      confidence: 'medium',
      sourceRef: `Domain: ${domain}`,
    }
  }

  if (lowerDomain.includes('orchestrator') || lowerDomain.includes('workflow')) {
    return {
      description: 'Workflow state will be preserved across node executions',
      source: 'domain_knowledge',
      confidence: 'medium',
      sourceRef: `Domain: ${domain}`,
    }
  }

  if (lowerDomain.includes('database') || lowerDomain.includes('data')) {
    return {
      description: 'Database schema changes will be backward compatible',
      source: 'domain_knowledge',
      confidence: 'medium',
      sourceRef: `Domain: ${domain}`,
    }
  }

  return null
}

/**
 * Challenges an assumption with adversarial thinking.
 *
 * @param assumption - The assumption to challenge
 * @param iteration - Current iteration number
 * @returns Challenge result
 */
export function challengeAssumption(assumption: Assumption, iteration: number): ChallengeResult {
  // Generate challenge based on assumption type and source
  const { challenge, validity, evidence, remediation } = generateChallenge(assumption)

  return {
    assumption,
    challenge,
    validity,
    evidence,
    iteration,
    remediation,
  }
}

/**
 * Generates a challenge for an assumption.
 */
function generateChallenge(assumption: Assumption): {
  challenge: string
  validity: ValidityAssessment
  evidence: string
  remediation?: string
} {
  const desc = assumption.description.toLowerCase()

  // Challenge universal claims
  if (desc.includes('always') || desc.includes('all') || desc.includes('every')) {
    return {
      challenge: 'What if the universal condition is not met in edge cases?',
      validity: 'partially_valid',
      evidence:
        'Universal claims often have exceptions. Consider boundary conditions, error states, and unusual inputs.',
      remediation:
        'Replace universal language with specific conditions and document known exceptions.',
    }
  }

  // Challenge absolute negations
  if (desc.includes('never') || desc.includes('none') || desc.includes('cannot')) {
    return {
      challenge: 'What scenario could violate this absolute negation?',
      validity: 'partially_valid',
      evidence:
        'Absolute negations can be violated by system failures, adversarial inputs, or unforeseen use cases.',
      remediation: 'Define what happens if the negation is violated and add defensive handling.',
    }
  }

  // Challenge performance assumptions
  if (
    desc.includes('fast') ||
    desc.includes('quick') ||
    desc.includes('instant') ||
    desc.includes('performance')
  ) {
    return {
      challenge: 'What happens under load or with degraded resources?',
      validity: 'partially_valid',
      evidence:
        'Performance characteristics change under stress. Define specific metrics and acceptable degradation.',
      remediation: 'Add measurable performance criteria (e.g., "responds in <200ms at p95").',
    }
  }

  // Challenge reliability assumptions
  if (
    desc.includes('reliable') ||
    desc.includes('stable') ||
    desc.includes('consistent') ||
    desc.includes('guaranteed')
  ) {
    return {
      challenge: 'What failure modes could compromise this reliability?',
      validity: 'partially_valid',
      evidence:
        'No system is perfectly reliable. Network issues, resource exhaustion, and bugs can cause failures.',
      remediation: 'Define retry strategies, fallbacks, and graceful degradation paths.',
    }
  }

  // Challenge security assumptions
  if (
    desc.includes('secure') ||
    desc.includes('safe') ||
    desc.includes('protected') ||
    desc.includes('security')
  ) {
    return {
      challenge: 'What attack vectors could bypass this security measure?',
      validity: 'uncertain',
      evidence:
        'Security assumptions require validation. Consider authentication bypass, injection, and authorization flaws.',
      remediation:
        'Document specific security controls and consider a security review or threat model.',
    }
  }

  // Challenge scalability assumptions
  if (
    desc.includes('scalable') ||
    desc.includes('unlimited') ||
    desc.includes('any number') ||
    desc.includes('scale')
  ) {
    return {
      challenge: 'What resource constraints could limit scalability?',
      validity: 'partially_valid',
      evidence:
        'All systems have limits. Memory, CPU, network bandwidth, and database connections can bottleneck.',
      remediation: 'Define expected scale limits and behavior when approaching them.',
    }
  }

  // Challenge dependency assumptions
  if (desc.includes('dependencies') || desc.includes('available') || desc.includes('functional')) {
    return {
      challenge: 'What if a dependency is unavailable or returns unexpected data?',
      validity: 'partially_valid',
      evidence:
        'Dependencies can fail, be slow, or return unexpected responses. Plan for dependency failures.',
      remediation: 'Add circuit breakers, timeouts, and fallback behaviors for dependencies.',
    }
  }

  // Challenge scope assumptions
  if (desc.includes('contained') || desc.includes('scoped') || desc.includes('affected')) {
    return {
      challenge: 'What unexpected areas might be affected by ripple effects?',
      validity: 'uncertain',
      evidence:
        'Code changes often have unintended consequences in shared modules, tests, or downstream consumers.',
      remediation: 'Expand impact analysis to include transitive dependencies and consumers.',
    }
  }

  // Default challenge for unmatched patterns
  return {
    challenge: 'Under what conditions might this assumption not hold?',
    validity: 'uncertain',
    evidence:
      'The assumption may hold under normal conditions but could fail in edge cases or under stress.',
    remediation: 'Consider adding explicit validation or documentation for this assumption.',
  }
}

/**
 * Identifies edge cases from the story structure, challenge results, and knowledge context.
 *
 * @param storyStructure - The story structure
 * @param challengeResults - Results from challenging assumptions
 * @param knowledgeContext - Knowledge context with lessons learned and ADRs
 * @returns Array of edge cases
 */
export function identifyEdgeCases(
  storyStructure: StoryStructure,
  challengeResults: ChallengeResult[],
  knowledgeContext?: KnowledgeContext | null,
): AttackEdgeCase[] {
  const edgeCases: AttackEdgeCase[] = []
  let edgeCaseId = 1

  const description = storyStructure.description.toLowerCase()

  // Identify edge cases from challenged assumptions
  challengeResults
    .filter(cr => cr.validity === 'invalid' || cr.validity === 'partially_valid')
    .forEach(cr => {
      const edgeCase = createEdgeCaseFromChallenge(cr, edgeCaseId++)
      if (edgeCase) {
        edgeCases.push(edgeCase)
      }
    })

  // Identify edge cases based on story content

  // Input handling edge cases
  if (/(input|form|data|user|parameter)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Malformed or malicious input data',
      category: 'security',
      likelihood: 'likely',
      impact: 'high',
      riskScore: calculateRiskScore('likely', 'high'),
      mitigation: 'Validate and sanitize all inputs; use parameterized queries',
    })
  }

  // Concurrent access edge cases
  if (/(update|edit|modify|concurrent|parallel)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Concurrent modifications causing data inconsistency',
      category: 'concurrency',
      likelihood: 'possible',
      impact: 'high',
      riskScore: calculateRiskScore('possible', 'high'),
      mitigation: 'Implement optimistic locking or transaction isolation',
    })
  }

  // Network/integration edge cases
  if (/(api|endpoint|fetch|request|external|service)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Network timeout or partial response during API call',
      category: 'integration',
      likelihood: 'likely',
      impact: 'medium',
      riskScore: calculateRiskScore('likely', 'medium'),
      mitigation: 'Implement timeouts, retries, and circuit breakers',
    })
  }

  // State management edge cases
  if (/(state|session|workflow|process)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'State corruption or loss during process interruption',
      category: 'failure',
      likelihood: 'possible',
      impact: 'high',
      riskScore: calculateRiskScore('possible', 'high'),
      mitigation: 'Implement checkpointing and recovery mechanisms',
    })
  }

  // Resource exhaustion edge cases
  if (/(load|process|handle|large|many|batch)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Resource exhaustion with large or numerous inputs',
      category: 'performance',
      likelihood: 'possible',
      impact: 'medium',
      riskScore: calculateRiskScore('possible', 'medium'),
      mitigation: 'Implement pagination, rate limiting, and resource quotas',
    })
  }

  // Authentication/authorization edge cases
  if (/(auth|login|permission|role|access|token)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Token expiry or session invalidation mid-operation',
      category: 'security',
      likelihood: 'likely',
      impact: 'medium',
      riskScore: calculateRiskScore('likely', 'medium'),
      mitigation: 'Handle auth errors gracefully with automatic refresh or re-auth prompt',
    })
  }

  // Data integrity edge cases
  if (/(save|store|persist|database|record)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Partial write or data corruption during save operation',
      category: 'data',
      likelihood: 'unlikely',
      impact: 'critical',
      riskScore: calculateRiskScore('unlikely', 'critical'),
      mitigation: 'Use transactions and implement data validation on read',
    })
  }

  // Timing edge cases
  if (/(async|await|timeout|delay|schedule|queue)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Race condition in async operation ordering',
      category: 'timing',
      likelihood: 'possible',
      impact: 'medium',
      riskScore: calculateRiskScore('possible', 'medium'),
      mitigation: 'Use proper synchronization primitives and deterministic ordering',
    })
  }

  // Environment-specific edge cases
  if (/(config|environment|env|setting|feature flag)/i.test(description)) {
    edgeCases.push({
      id: `EDGE-ATK-${edgeCaseId++}`,
      description: 'Configuration mismatch between environments',
      category: 'environment',
      likelihood: 'possible',
      impact: 'medium',
      riskScore: calculateRiskScore('possible', 'medium'),
      mitigation: 'Document required configuration and validate on startup',
    })
  }

  // ADR violation edge cases (from knowledge context)
  if (knowledgeContext?.architectureDecisions) {
    const adrs = knowledgeContext.architectureDecisions
    const constraints = adrs.constraints

    // Check ADR-001: API Path Schema
    if (constraints.apiPaths && /(api|endpoint|route|fetch)/i.test(description)) {
      edgeCases.push({
        id: `EDGE-ATK-${edgeCaseId++}`,
        description: 'API path mismatch between frontend and backend (violates ADR-001)',
        category: 'adr_violation',
        likelihood: 'possible',
        impact: 'high',
        riskScore: calculateRiskScore('possible', 'high'),
        adrReference: 'ADR-001',
        mitigation: `Ensure paths follow: ${constraints.apiPaths}`,
      })
    }

    // Check ADR-003: Storage/CDN
    if (constraints.storage && /(image|media|upload|file|cdn)/i.test(description)) {
      edgeCases.push({
        id: `EDGE-ATK-${edgeCaseId++}`,
        description: 'Media handling may not follow CDN architecture (violates ADR-003)',
        category: 'adr_violation',
        likelihood: 'possible',
        impact: 'medium',
        riskScore: calculateRiskScore('possible', 'medium'),
        adrReference: 'ADR-003',
        mitigation: `Follow storage pattern: ${constraints.storage}`,
      })
    }

    // Check ADR-004: Auth
    if (constraints.auth && /(auth|login|token|session|permission)/i.test(description)) {
      edgeCases.push({
        id: `EDGE-ATK-${edgeCaseId++}`,
        description:
          'Authentication approach may not follow established pattern (violates ADR-004)',
        category: 'adr_violation',
        likelihood: 'possible',
        impact: 'high',
        riskScore: calculateRiskScore('possible', 'high'),
        adrReference: 'ADR-004',
        mitigation: `Follow auth pattern: ${constraints.auth}`,
      })
    }

    // Check ADR-005: Testing
    if (constraints.testing && /(test|e2e|uat|playwright)/i.test(description)) {
      edgeCases.push({
        id: `EDGE-ATK-${edgeCaseId++}`,
        description:
          'Testing approach may use mocks where real services required (violates ADR-005)',
        category: 'adr_violation',
        likelihood: 'possible',
        impact: 'medium',
        riskScore: calculateRiskScore('possible', 'medium'),
        adrReference: 'ADR-005',
        mitigation: `Follow testing requirement: ${constraints.testing}`,
      })
    }
  }

  return edgeCases
}

/**
 * Creates an edge case from a challenge result.
 */
function createEdgeCaseFromChallenge(
  challengeResult: ChallengeResult,
  id: number,
): AttackEdgeCase | null {
  const assumption = challengeResult.assumption
  const desc = assumption.description.toLowerCase()

  // Determine category based on assumption
  let category: EdgeCaseCategory = 'failure'
  if (desc.includes('security') || desc.includes('auth')) category = 'security'
  else if (desc.includes('performance') || desc.includes('fast')) category = 'performance'
  else if (desc.includes('concurrent') || desc.includes('parallel')) category = 'concurrency'
  else if (desc.includes('data') || desc.includes('state')) category = 'data'
  else if (desc.includes('dependency') || desc.includes('api')) category = 'integration'

  // Determine likelihood based on validity
  const likelihood: Likelihood = challengeResult.validity === 'invalid' ? 'likely' : 'possible'

  // Determine impact based on source
  let impact: Impact = 'medium'
  if (assumption.source === 'acceptance_criteria') impact = 'high'
  if (desc.includes('security') || desc.includes('critical')) impact = 'critical'

  return {
    id: `EDGE-ATK-${id}`,
    description: `Violated assumption: ${assumption.description}`,
    category,
    likelihood,
    impact,
    riskScore: calculateRiskScore(likelihood, impact),
    relatedAssumptionId: assumption.id,
    mitigation: challengeResult.remediation,
  }
}

/**
 * Calculates risk score from likelihood and impact.
 *
 * @param likelihood - Likelihood of occurrence
 * @param impact - Impact if it occurs
 * @returns Risk score (1-25)
 */
export function rateRisk(likelihood: Likelihood, impact: Impact): number {
  return calculateRiskScore(likelihood, impact)
}

/**
 * Internal risk score calculation.
 */
function calculateRiskScore(likelihood: Likelihood, impact: Impact): number {
  return LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact]
}

/**
 * Generates comprehensive attack analysis.
 *
 * @param storyStructure - The story structure to analyze
 * @param pmGaps - PM gap analysis if available
 * @param uxGaps - UX gap analysis if available
 * @param qaGaps - QA gap analysis if available
 * @param config - Configuration options
 * @param knowledgeContext - Knowledge context with lessons learned and ADRs
 * @returns Attack result with analysis
 */
export async function generateAttackAnalysis(
  storyStructure: StoryStructure | null | undefined,
  pmGaps?: PMGapStructure | null,
  uxGaps?: UXGapAnalysis | null,
  qaGaps?: QAGapAnalysis | null,
  config: Partial<AttackConfig> = {},
  knowledgeContext?: KnowledgeContext | null,
): Promise<AttackResult> {
  const fullConfig = AttackConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    if (!storyStructure) {
      return {
        attackAnalysis: null,
        analyzed: false,
        error: 'No story structure provided for attack analysis',
        warnings,
      }
    }

    // Track if knowledge context was used
    const knowledgeContextUsed = knowledgeContext?.loaded === true

    // Extract assumptions (including from lessons learned)
    let assumptions = extractAssumptions(
      storyStructure,
      fullConfig.includeGapInsights ? pmGaps : null,
      fullConfig.includeGapInsights ? uxGaps : null,
      fullConfig.includeGapInsights ? qaGaps : null,
      knowledgeContext,
    )

    // Filter by confidence level
    if (fullConfig.minConfidenceLevel !== 'unknown') {
      const confidenceOrder: ConfidenceLevel[] = ['high', 'medium', 'low', 'unknown']
      const minIndex = confidenceOrder.indexOf(fullConfig.minConfidenceLevel)
      assumptions = assumptions.filter(a => {
        const aIndex = confidenceOrder.indexOf(a.confidence)
        return aIndex <= minIndex
      })
    }

    // Limit assumptions to challenge
    const assumptionsToChallenge = assumptions.slice(0, fullConfig.maxAssumptionChallenges)
    if (assumptions.length > fullConfig.maxAssumptionChallenges) {
      warnings.push(
        `Limited assumptions from ${assumptions.length} to ${fullConfig.maxAssumptionChallenges}`,
      )
    }

    // Challenge assumptions with bounded iterations
    const challengeResults: ChallengeResult[] = []
    for (const assumption of assumptionsToChallenge) {
      for (let iteration = 1; iteration <= fullConfig.maxIterationsPerAssumption; iteration++) {
        const result = challengeAssumption(assumption, iteration)
        challengeResults.push(result)

        // Stop iterating if assumption is clearly valid or invalid
        if (result.validity === 'valid' || result.validity === 'invalid') {
          break
        }
      }
    }

    // Identify edge cases (including ADR violations from knowledge context)
    let edgeCases = identifyEdgeCases(storyStructure, challengeResults, knowledgeContext)

    // Filter by risk score
    edgeCases = edgeCases.filter(ec => ec.riskScore >= fullConfig.minRiskScore)

    // Limit edge cases
    if (edgeCases.length > fullConfig.maxEdgeCases) {
      warnings.push(`Limited edge cases from ${edgeCases.length} to ${fullConfig.maxEdgeCases}`)
      // Sort by risk score (descending) before limiting
      edgeCases = edgeCases
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, fullConfig.maxEdgeCases)
    }

    // Calculate summary
    const weakAssumptions = challengeResults.filter(
      cr => cr.validity === 'invalid' || cr.validity === 'partially_valid',
    ).length
    const highRiskEdgeCases = edgeCases.filter(ec => ec.riskScore >= 15).length

    // Count lesson-based and ADR-based risks
    const lessonBasedChallenges = challengeResults.filter(
      cr => cr.assumption.source === 'lesson_learned' && cr.validity !== 'valid',
    ).length
    const adrBasedRisks = edgeCases.filter(ec => ec.category === 'adr_violation').length

    // Determine attack readiness
    let attackReadiness: 'ready' | 'needs_attention' | 'critical' = 'ready'
    if (highRiskEdgeCases > 0 || weakAssumptions > assumptions.length / 2) {
      attackReadiness = 'critical'
    } else if (edgeCases.length > 5 || weakAssumptions > 0 || lessonBasedChallenges > 0) {
      attackReadiness = 'needs_attention'
    }

    // Generate summary narrative
    const narrative = generateNarrative(
      storyStructure,
      assumptions.length,
      weakAssumptions,
      edgeCases.length,
      highRiskEdgeCases,
    )

    // Generate key vulnerabilities
    const keyVulnerabilities = generateKeyVulnerabilities(challengeResults, edgeCases)

    // Generate recommendations
    const recommendations = generateRecommendations(
      challengeResults,
      edgeCases,
      attackReadiness,
      knowledgeContext,
    )

    // Generate lessons applied
    const lessonsApplied: LessonApplied[] = []
    if (knowledgeContext?.lessonsLearned) {
      // Track which challenges came from lessons
      challengeResults
        .filter(cr => cr.assumption.source === 'lesson_learned' && cr.assumption.pastStoryId)
        .forEach(cr => {
          lessonsApplied.push({
            storyId: cr.assumption.pastStoryId!,
            lesson: cr.assumption.pastFailure || cr.assumption.description,
            attackGenerated: cr.assumption.id,
            relevance: cr.assumption.sourceRef || 'Matched story scope',
          })
        })
    }

    // Generate ADRs checked
    const adrsChecked: ADRChecked[] = []
    if (knowledgeContext?.architectureDecisions) {
      const adrs = knowledgeContext.architectureDecisions

      adrs.relevantAdrs.forEach(adr => {
        const violationEdgeCase = edgeCases.find(
          ec => ec.category === 'adr_violation' && ec.adrReference === adr.id,
        )

        adrsChecked.push({
          adrId: adr.id,
          constraint: adr.constraint,
          storyCompliant: !violationEdgeCase,
          violationRisk: violationEdgeCase?.id,
        })
      })
    }

    const attackAnalysis: AttackAnalysis = {
      storyId: storyStructure.storyId,
      analyzedAt: new Date().toISOString(),
      knowledgeContextUsed,
      assumptions,
      challengeResults,
      edgeCases,
      lessonsApplied,
      adrsChecked,
      summary: {
        totalAssumptions: assumptions.length,
        totalChallenges: challengeResults.length,
        weakAssumptions,
        totalEdgeCases: edgeCases.length,
        highRiskEdgeCases,
        lessonBasedRisks: lessonBasedChallenges,
        adrBasedRisks,
        attackReadiness,
        narrative,
      },
      keyVulnerabilities,
      recommendations,
    }

    // Validate against schema
    const validated = AttackAnalysisSchema.parse(attackAnalysis)

    return {
      attackAnalysis: validated,
      analyzed: true,
      warnings,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during attack analysis'
    return {
      attackAnalysis: null,
      analyzed: false,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Generates a narrative summary of the attack analysis.
 */
function generateNarrative(
  storyStructure: StoryStructure,
  totalAssumptions: number,
  weakAssumptions: number,
  totalEdgeCases: number,
  highRiskEdgeCases: number,
): string {
  const parts: string[] = []

  parts.push(`Attack analysis for "${storyStructure.title}"`)

  if (totalAssumptions === 0) {
    parts.push('found no explicit assumptions to challenge.')
  } else {
    parts.push(
      `identified ${totalAssumptions} assumptions, of which ${weakAssumptions} require attention.`,
    )
  }

  if (totalEdgeCases === 0) {
    parts.push('No significant edge cases were identified.')
  } else if (highRiskEdgeCases > 0) {
    parts.push(
      `Identified ${totalEdgeCases} edge cases including ${highRiskEdgeCases} high-risk scenarios requiring immediate attention.`,
    )
  } else {
    parts.push(`Identified ${totalEdgeCases} edge cases with manageable risk levels.`)
  }

  return parts.join(' ')
}

/**
 * Generates key vulnerabilities from analysis results.
 */
function generateKeyVulnerabilities(
  challengeResults: ChallengeResult[],
  edgeCases: AttackEdgeCase[],
): string[] {
  const vulnerabilities: string[] = []

  // Add vulnerabilities from invalid assumptions
  challengeResults
    .filter(cr => cr.validity === 'invalid')
    .slice(0, 3)
    .forEach(cr => {
      vulnerabilities.push(`Invalid assumption: ${cr.assumption.description}`)
    })

  // Add vulnerabilities from high-risk edge cases
  edgeCases
    .filter(ec => ec.riskScore >= 15)
    .slice(0, 3)
    .forEach(ec => {
      vulnerabilities.push(`High-risk edge case: ${ec.description}`)
    })

  // Add vulnerabilities from specific categories
  const securityEdgeCases = edgeCases.filter(ec => ec.category === 'security')
  if (securityEdgeCases.length > 0) {
    vulnerabilities.push(`${securityEdgeCases.length} security-related edge case(s) identified`)
  }

  return vulnerabilities.slice(0, 5)
}

/**
 * Generates recommendations based on analysis.
 */
function generateRecommendations(
  challengeResults: ChallengeResult[],
  edgeCases: AttackEdgeCase[],
  readiness: 'ready' | 'needs_attention' | 'critical',
  knowledgeContext?: KnowledgeContext | null,
): string[] {
  const recommendations: string[] = []

  // Readiness-based recommendations
  if (readiness === 'critical') {
    recommendations.push('CRITICAL: Address high-risk edge cases before development begins')
  } else if (readiness === 'needs_attention') {
    recommendations.push('Review identified assumptions and edge cases during story refinement')
  }

  // Add recommendations from challenge results
  const uniqueRemediations = new Set<string>()
  challengeResults
    .filter(
      cr => cr.remediation && (cr.validity === 'invalid' || cr.validity === 'partially_valid'),
    )
    .forEach(cr => {
      if (cr.remediation) uniqueRemediations.add(cr.remediation)
    })
  uniqueRemediations.forEach(r => recommendations.push(r))

  // Add recommendations from edge cases
  const uniqueMitigations = new Set<string>()
  edgeCases
    .filter(ec => ec.mitigation && ec.riskScore >= 9)
    .forEach(ec => {
      if (ec.mitigation) uniqueMitigations.add(ec.mitigation)
    })
  uniqueMitigations.forEach(m => recommendations.push(m))

  // General recommendations based on edge case categories
  const categories = new Set(edgeCases.map(ec => ec.category))
  if (categories.has('security')) {
    recommendations.push('Consider a security review or threat modeling session')
  }
  if (categories.has('concurrency')) {
    recommendations.push('Add acceptance criteria for concurrent access scenarios')
  }
  if (categories.has('performance')) {
    recommendations.push('Define specific performance requirements and test them')
  }

  // Add ADR violation recommendations
  if (categories.has('adr_violation')) {
    const adrViolations = edgeCases.filter(ec => ec.category === 'adr_violation')
    const adrIds = [...new Set(adrViolations.map(ec => ec.adrReference).filter(Boolean))]
    recommendations.push(`Review architecture decisions: ${adrIds.join(', ')}`)
  }

  // Add lesson-based recommendations (patterns to follow from past successes)
  if (knowledgeContext?.lessonsLearned) {
    const lessons = knowledgeContext.lessonsLearned

    // Add patterns to follow from successful stories
    lessons.patternsToFollow.slice(0, 2).forEach(pattern => {
      recommendations.push(`Follow established pattern: ${pattern}`)
    })
  }

  return recommendations.slice(0, 10)
}

/**
 * Extended graph state with attack analysis.
 */
export interface GraphStateWithAttackAnalysis extends GraphStateWithStorySeed {
  /** PM gap analysis result */
  pmGapAnalysis?: { gaps: PMGapStructure }
  /** UX gap analysis result */
  uxGapAnalysis?: UXGapAnalysis | null
  /** QA gap analysis result */
  qaGapAnalysis?: QAGapAnalysis | null
  /** Knowledge context with lessons learned and ADRs */
  knowledgeContext?: KnowledgeContext | null
  /** Attack analysis result */
  attackAnalysis?: AttackAnalysis | null
  /** Whether attack analysis was successful */
  attackAnalyzed?: boolean
  /** Warnings from attack analysis */
  attackWarnings?: string[]
}

/**
 * Story Attack node implementation.
 *
 * Challenges assumptions and surfaces edge cases in the story structure.
 * Uses bounded exploration to prevent unbounded analysis.
 * Integrates lessons learned and ADR constraints from knowledge context.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have storyStructure from seed node)
 * @returns Partial state update with attack analysis
 */
export const storyAttackNode = createToolNode(
  'story_attack',
  async (state: GraphState): Promise<Partial<GraphStateWithAttackAnalysis>> => {
    const stateWithStory = state as GraphStateWithAttackAnalysis

    // Require story structure from seed node
    if (!stateWithStory.storyStructure) {
      return updateState({
        attackAnalysis: null,
        attackAnalyzed: false,
        attackWarnings: ['No story structure available - run seed node first'],
      } as Partial<GraphStateWithAttackAnalysis>)
    }

    const result = await generateAttackAnalysis(
      stateWithStory.storyStructure,
      stateWithStory.pmGapAnalysis?.gaps,
      stateWithStory.uxGapAnalysis,
      stateWithStory.qaGapAnalysis,
      {}, // default config
      stateWithStory.knowledgeContext, // pass knowledge context
    )

    if (!result.analyzed) {
      return updateState({
        attackAnalysis: null,
        attackAnalyzed: false,
        attackWarnings: result.warnings,
      } as Partial<GraphStateWithAttackAnalysis>)
    }

    return updateState({
      attackAnalysis: result.attackAnalysis,
      attackAnalyzed: true,
      attackWarnings: result.warnings,
    } as Partial<GraphStateWithAttackAnalysis>)
  },
)

/**
 * Creates an attack node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createAttackNode(config: Partial<AttackConfig> = {}) {
  return createToolNode(
    'story_attack',
    async (state: GraphState): Promise<Partial<GraphStateWithAttackAnalysis>> => {
      const stateWithStory = state as GraphStateWithAttackAnalysis

      // Require story structure
      if (!stateWithStory.storyStructure) {
        throw new Error('Story structure is required for attack analysis')
      }

      const result = await generateAttackAnalysis(
        stateWithStory.storyStructure,
        stateWithStory.pmGapAnalysis?.gaps,
        stateWithStory.uxGapAnalysis,
        stateWithStory.qaGapAnalysis,
        config,
        stateWithStory.knowledgeContext, // pass knowledge context
      )

      if (!result.analyzed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          attackAnalysis: null,
          attackAnalyzed: false,
          attackWarnings: result.warnings,
        } as Partial<GraphStateWithAttackAnalysis>)
      }

      return updateState({
        attackAnalysis: result.attackAnalysis,
        attackAnalyzed: true,
        attackWarnings: result.warnings,
      } as Partial<GraphStateWithAttackAnalysis>)
    },
  )
}
