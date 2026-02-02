/**
 * Fanout PM Node
 *
 * Generates product management perspective gap analysis for story structure.
 * Analyzes scope ambiguities, requirement completeness, dependency concerns,
 * and priority alignment from a PM viewpoint.
 *
 * FLOW-024: LangGraph Story Node - Fanout PM
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { BaselineReality } from '../reality/index.js'
import type { StoryStructure, GraphStateWithStorySeed } from './seed.js'

/**
 * Schema for a scope gap - ambiguities or unclear boundaries in story scope.
 */
export const ScopeGapSchema = z.object({
  /** Unique ID for the gap (e.g., "SG-1", "SG-2") */
  id: z.string().min(1),
  /** Category of scope gap */
  category: z.enum(['boundary', 'definition', 'overlap', 'exclusion']),
  /** Description of the scope ambiguity */
  description: z.string().min(1),
  /** Severity level (1-5, 5 being most severe) */
  severity: z.number().int().min(1).max(5),
  /** Suggested clarification or resolution */
  suggestion: z.string().optional(),
  /** Related acceptance criteria IDs */
  relatedACs: z.array(z.string()).default([]),
})

export type ScopeGap = z.infer<typeof ScopeGapSchema>

/**
 * Schema for a requirement gap - missing or incomplete requirements.
 */
export const RequirementGapSchema = z.object({
  /** Unique ID for the gap (e.g., "RG-1", "RG-2") */
  id: z.string().min(1),
  /** Category of requirement gap */
  category: z.enum(['missing', 'incomplete', 'ambiguous', 'untestable', 'conflicting']),
  /** Description of the requirement issue */
  description: z.string().min(1),
  /** Severity level (1-5, 5 being most severe) */
  severity: z.number().int().min(1).max(5),
  /** Suggested addition or refinement */
  suggestion: z.string().optional(),
  /** Whether this is a functional requirement gap */
  isFunctional: z.boolean().default(true),
})

export type RequirementGap = z.infer<typeof RequirementGapSchema>

/**
 * Schema for a dependency gap - unidentified or unclear dependencies.
 */
export const DependencyGapSchema = z.object({
  /** Unique ID for the gap (e.g., "DG-1", "DG-2") */
  id: z.string().min(1),
  /** Category of dependency gap */
  category: z.enum(['missing', 'circular', 'blocking', 'external', 'version']),
  /** Description of the dependency concern */
  description: z.string().min(1),
  /** Severity level (1-5, 5 being most severe) */
  severity: z.number().int().min(1).max(5),
  /** The dependency in question (story ID, module, or external system) */
  dependency: z.string().optional(),
  /** Suggested resolution */
  suggestion: z.string().optional(),
})

export type DependencyGap = z.infer<typeof DependencyGapSchema>

/**
 * Schema for a priority gap - priority alignment or sequencing concerns.
 */
export const PriorityGapSchema = z.object({
  /** Unique ID for the gap (e.g., "PG-1", "PG-2") */
  id: z.string().min(1),
  /** Category of priority gap */
  category: z.enum(['misalignment', 'sequencing', 'resource', 'timeline', 'value']),
  /** Description of the priority concern */
  description: z.string().min(1),
  /** Severity level (1-5, 5 being most severe) */
  severity: z.number().int().min(1).max(5),
  /** Suggested priority adjustment */
  suggestion: z.string().optional(),
  /** Whether this affects sprint planning */
  affectsPlanning: z.boolean().default(false),
})

export type PriorityGap = z.infer<typeof PriorityGapSchema>

/**
 * Schema for PM gap structure - aggregates all PM perspective gaps.
 */
export const PMGapStructureSchema = z.object({
  /** Scope gaps - ambiguities in story boundaries */
  scopeGaps: z.array(ScopeGapSchema).default([]),
  /** Requirement gaps - missing or incomplete requirements */
  requirementGaps: z.array(RequirementGapSchema).default([]),
  /** Dependency gaps - unidentified dependencies */
  dependencyGaps: z.array(DependencyGapSchema).default([]),
  /** Priority gaps - priority alignment concerns */
  priorityGaps: z.array(PriorityGapSchema).default([]),
})

export type PMGapStructure = z.infer<typeof PMGapStructureSchema>

/**
 * Schema for fanout PM result.
 */
export const FanoutPMResultSchema = z.object({
  /** The story ID analyzed */
  storyId: z.string().min(1),
  /** The PM gap analysis result */
  gaps: PMGapStructureSchema,
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Total number of gaps found */
  totalGaps: z.number().int().min(0),
  /** Highest severity gap found (1-5, 0 if no gaps) */
  highestSeverity: z.number().int().min(0).max(5),
  /** Summary of PM perspective */
  summary: z.string().optional(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type FanoutPMResult = z.infer<typeof FanoutPMResultSchema>

/**
 * Schema for fanout PM configuration.
 */
export const FanoutPMConfigSchema = z.object({
  /** Minimum severity to report (1-5) */
  minSeverity: z.number().int().min(1).max(5).default(1),
  /** Whether to check scope gaps */
  checkScope: z.boolean().default(true),
  /** Whether to check requirement gaps */
  checkRequirements: z.boolean().default(true),
  /** Whether to check dependency gaps */
  checkDependencies: z.boolean().default(true),
  /** Whether to check priority gaps */
  checkPriority: z.boolean().default(true),
  /** Include suggestions for each gap */
  includeSuggestions: z.boolean().default(true),
})

export type FanoutPMConfig = z.infer<typeof FanoutPMConfigSchema>

/**
 * Analyzes story scope for ambiguities and unclear boundaries.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Array of scope gaps
 */
export function analyzeScopeGaps(storyStructure: StoryStructure): ScopeGap[] {
  const gaps: ScopeGap[] = []
  let gapId = 1

  // Check for vague title
  if (storyStructure.title.length < 10) {
    gaps.push({
      id: `SG-${gapId++}`,
      category: 'definition',
      description: 'Story title may be too brief to clearly define scope',
      severity: 2,
      suggestion: 'Consider expanding the title to better describe the feature scope',
      relatedACs: [],
    })
  }

  // Check for missing affected files (scope boundary unclear)
  if (storyStructure.affectedFiles.length === 0) {
    gaps.push({
      id: `SG-${gapId++}`,
      category: 'boundary',
      description: 'No affected files identified - scope boundaries may be unclear',
      severity: 3,
      suggestion: 'Identify specific files or modules that will be affected',
      relatedACs: [],
    })
  }

  // Check for overlap with in-progress work (from constraints)
  const coordinateConstraints = storyStructure.constraints.filter(c =>
    c.startsWith('Coordinate with in-progress:'),
  )
  if (coordinateConstraints.length > 0) {
    gaps.push({
      id: `SG-${gapId++}`,
      category: 'overlap',
      description: `Potential overlap with ${coordinateConstraints.length} in-progress work item(s)`,
      severity: 3,
      suggestion: 'Review coordination points to avoid scope overlap',
      relatedACs: [],
    })
  }

  // Check acceptance criteria for scope definition
  const vagueCriteria = storyStructure.acceptanceCriteria.filter(
    ac => ac.description.length < 20 || ac.description.includes('etc'),
  )
  if (vagueCriteria.length > 0) {
    gaps.push({
      id: `SG-${gapId++}`,
      category: 'definition',
      description: `${vagueCriteria.length} acceptance criteria may be too vague for clear scope`,
      severity: 2,
      suggestion: 'Refine acceptance criteria with specific, measurable outcomes',
      relatedACs: vagueCriteria.map(ac => ac.id),
    })
  }

  return gaps
}

/**
 * Analyzes story requirements for completeness.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Array of requirement gaps
 */
export function analyzeRequirementGaps(storyStructure: StoryStructure): RequirementGap[] {
  const gaps: RequirementGap[] = []
  let gapId = 1

  // Check for minimum acceptance criteria
  if (storyStructure.acceptanceCriteria.length < 2) {
    gaps.push({
      id: `RG-${gapId++}`,
      category: 'incomplete',
      description: 'Story has fewer than 2 acceptance criteria - requirements may be incomplete',
      severity: 4,
      suggestion: 'Add more acceptance criteria to fully specify expected behavior',
      isFunctional: true,
    })
  }

  // Check for testability (criteria should be verifiable)
  const untestedCriteria = storyStructure.acceptanceCriteria.filter(ac => {
    const desc = ac.description.toLowerCase()
    return (
      desc.includes('should') &&
      !desc.includes('verify') &&
      !desc.includes('test') &&
      !desc.includes('check')
    )
  })
  if (untestedCriteria.length > 0) {
    gaps.push({
      id: `RG-${gapId++}`,
      category: 'untestable',
      description: `${untestedCriteria.length} acceptance criteria may be difficult to verify`,
      severity: 2,
      suggestion: 'Rewrite criteria with clear verification steps',
      isFunctional: true,
    })
  }

  // Check for non-functional requirements (performance, security, etc.)
  const hasNFRs = storyStructure.acceptanceCriteria.some(ac => {
    const desc = ac.description.toLowerCase()
    return (
      desc.includes('performance') ||
      desc.includes('security') ||
      desc.includes('accessibility') ||
      desc.includes('scalab')
    )
  })
  if (!hasNFRs && storyStructure.estimatedComplexity !== 'small') {
    gaps.push({
      id: `RG-${gapId++}`,
      category: 'missing',
      description: 'No non-functional requirements identified for a medium/large story',
      severity: 3,
      suggestion: 'Consider adding acceptance criteria for performance, security, or accessibility',
      isFunctional: false,
    })
  }

  // Check for error handling requirements
  const hasErrorHandling = storyStructure.acceptanceCriteria.some(ac => {
    const desc = ac.description.toLowerCase()
    return desc.includes('error') || desc.includes('fail') || desc.includes('invalid')
  })
  if (!hasErrorHandling) {
    gaps.push({
      id: `RG-${gapId++}`,
      category: 'missing',
      description: 'No error handling or edge case requirements identified',
      severity: 2,
      suggestion: 'Add acceptance criteria for error scenarios and edge cases',
      isFunctional: true,
    })
  }

  return gaps
}

/**
 * Analyzes story dependencies for completeness and concerns.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - The baseline reality (may be null)
 * @returns Array of dependency gaps
 */
export function analyzeDependencyGaps(
  storyStructure: StoryStructure,
  baseline: BaselineReality | null | undefined,
): DependencyGap[] {
  const gaps: DependencyGap[] = []
  let gapId = 1

  // Check for explicit dependencies
  if (storyStructure.dependencies.length === 0) {
    // Only flag as issue if we have baseline suggesting potential dependencies
    if (baseline?.whatInProgress && baseline.whatInProgress.length > 0) {
      gaps.push({
        id: `DG-${gapId++}`,
        category: 'missing',
        description: 'No dependencies declared but baseline shows in-progress work',
        severity: 2,
        suggestion: 'Review in-progress items for potential dependencies',
      })
    }
  }

  // Check for blocking constraints that might indicate dependencies
  const blockingConstraints = storyStructure.constraints.filter(
    c => c.toLowerCase().includes('must not modify') || c.toLowerCase().includes('coordinate with'),
  )
  if (blockingConstraints.length > storyStructure.dependencies.length) {
    gaps.push({
      id: `DG-${gapId++}`,
      category: 'blocking',
      description: 'More constraints than declared dependencies - may have hidden dependencies',
      severity: 3,
      suggestion: 'Review constraints to identify implicit dependencies',
    })
  }

  // Check for external dependencies (based on domain)
  const externalDomains = ['api', 'integration', 'external', 'third-party']
  if (externalDomains.some(d => storyStructure.domain.toLowerCase().includes(d))) {
    const hasExternalDeps = storyStructure.dependencies.some(
      dep => dep.includes('external') || dep.includes('api') || dep.includes('service'),
    )
    if (!hasExternalDeps) {
      gaps.push({
        id: `DG-${gapId++}`,
        category: 'external',
        description: 'Domain suggests external integration but no external dependencies declared',
        severity: 3,
        suggestion: 'Identify and document any external service dependencies',
      })
    }
  }

  // Check affected files for potential internal dependencies
  if (storyStructure.affectedFiles.length > 5) {
    const hasInternalDeps = storyStructure.dependencies.some(
      dep => !dep.includes('external') && !dep.includes('api'),
    )
    if (!hasInternalDeps) {
      gaps.push({
        id: `DG-${gapId++}`,
        category: 'missing',
        description: 'Many files affected but no internal dependencies identified',
        severity: 2,
        suggestion: 'Review affected files for shared module dependencies',
      })
    }
  }

  return gaps
}

/**
 * Analyzes story priority and alignment concerns.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - The baseline reality (may be null)
 * @returns Array of priority gaps
 */
export function analyzePriorityGaps(
  storyStructure: StoryStructure,
  baseline: BaselineReality | null | undefined,
): PriorityGap[] {
  const gaps: PriorityGap[] = []
  let gapId = 1

  // Check complexity vs dependencies (high complexity with many deps may need sequencing)
  if (storyStructure.estimatedComplexity === 'large' && storyStructure.dependencies.length === 0) {
    gaps.push({
      id: `PG-${gapId++}`,
      category: 'sequencing',
      description: 'Large complexity story with no dependencies - verify sequencing is correct',
      severity: 2,
      suggestion: 'Confirm this story can be worked independently or identify blockers',
      affectsPlanning: true,
    })
  }

  // Check for coordination constraints that may affect planning
  const coordinationConstraints = storyStructure.constraints.filter(c =>
    c.toLowerCase().includes('coordinate'),
  )
  if (coordinationConstraints.length > 0) {
    gaps.push({
      id: `PG-${gapId++}`,
      category: 'resource',
      description: `${coordinationConstraints.length} coordination requirement(s) may affect resource planning`,
      severity: 2,
      suggestion: 'Plan coordination meetings or pairing sessions',
      affectsPlanning: true,
    })
  }

  // Check if baseline indicates timeline concerns
  if (baseline?.whatInProgress && baseline.whatInProgress.length > 2) {
    const domainMatch = baseline.whatInProgress.filter(item =>
      item.toLowerCase().includes(storyStructure.domain.toLowerCase()),
    )
    if (domainMatch.length > 0) {
      gaps.push({
        id: `PG-${gapId++}`,
        category: 'timeline',
        description: 'Multiple in-progress items in same domain may affect timeline',
        severity: 3,
        suggestion: 'Review domain capacity and adjust timeline expectations',
        affectsPlanning: true,
      })
    }
  }

  // Check for value alignment (based on tags)
  const valueTags = ['mvp', 'critical', 'blocking', 'customer-facing', 'revenue']
  const hasValueTag = storyStructure.tags.some(tag =>
    valueTags.some(vt => tag.toLowerCase().includes(vt)),
  )
  if (!hasValueTag && storyStructure.estimatedComplexity === 'large') {
    gaps.push({
      id: `PG-${gapId++}`,
      category: 'value',
      description: 'Large story without clear value indicator tags',
      severity: 2,
      suggestion: 'Add tags to indicate business value for prioritization',
      affectsPlanning: false,
    })
  }

  return gaps
}

/**
 * Generates PM gap analysis from story structure and baseline.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - The baseline reality (may be null)
 * @param config - Configuration options
 * @returns Fanout PM result with gap analysis
 */
export async function generatePMGapAnalysis(
  storyStructure: StoryStructure | null | undefined,
  baseline: BaselineReality | null | undefined,
  config: Partial<FanoutPMConfig> = {},
): Promise<FanoutPMResult> {
  const fullConfig = FanoutPMConfigSchema.parse(config)
  const warnings: string[] = []

  // Handle missing story structure
  if (!storyStructure) {
    return {
      storyId: 'unknown',
      gaps: {
        scopeGaps: [],
        requirementGaps: [],
        dependencyGaps: [],
        priorityGaps: [],
      },
      analyzed: false,
      totalGaps: 0,
      highestSeverity: 0,
      error: 'No story structure provided for analysis',
      warnings,
    }
  }

  try {
    // Collect gaps based on configuration
    const gaps: PMGapStructure = {
      scopeGaps: fullConfig.checkScope ? analyzeScopeGaps(storyStructure) : [],
      requirementGaps: fullConfig.checkRequirements ? analyzeRequirementGaps(storyStructure) : [],
      dependencyGaps: fullConfig.checkDependencies
        ? analyzeDependencyGaps(storyStructure, baseline)
        : [],
      priorityGaps: fullConfig.checkPriority ? analyzePriorityGaps(storyStructure, baseline) : [],
    }

    // Filter by minimum severity
    if (fullConfig.minSeverity > 1) {
      gaps.scopeGaps = gaps.scopeGaps.filter(g => g.severity >= fullConfig.minSeverity)
      gaps.requirementGaps = gaps.requirementGaps.filter(g => g.severity >= fullConfig.minSeverity)
      gaps.dependencyGaps = gaps.dependencyGaps.filter(g => g.severity >= fullConfig.minSeverity)
      gaps.priorityGaps = gaps.priorityGaps.filter(g => g.severity >= fullConfig.minSeverity)
    }

    // Remove suggestions if not configured
    if (!fullConfig.includeSuggestions) {
      gaps.scopeGaps = gaps.scopeGaps.map(g => ({ ...g, suggestion: undefined }))
      gaps.requirementGaps = gaps.requirementGaps.map(g => ({ ...g, suggestion: undefined }))
      gaps.dependencyGaps = gaps.dependencyGaps.map(g => ({ ...g, suggestion: undefined }))
      gaps.priorityGaps = gaps.priorityGaps.map(g => ({ ...g, suggestion: undefined }))
    }

    // Calculate totals
    const totalGaps =
      gaps.scopeGaps.length +
      gaps.requirementGaps.length +
      gaps.dependencyGaps.length +
      gaps.priorityGaps.length

    // Find highest severity
    const allSeverities = [
      ...gaps.scopeGaps.map(g => g.severity),
      ...gaps.requirementGaps.map(g => g.severity),
      ...gaps.dependencyGaps.map(g => g.severity),
      ...gaps.priorityGaps.map(g => g.severity),
    ]
    const highestSeverity = allSeverities.length > 0 ? Math.max(...allSeverities) : 0

    // Generate summary
    let summary: string
    if (totalGaps === 0) {
      summary = 'No PM perspective gaps identified. Story appears well-defined.'
    } else {
      const gapTypes: string[] = []
      if (gaps.scopeGaps.length > 0) gapTypes.push('scope')
      if (gaps.requirementGaps.length > 0) gapTypes.push('requirements')
      if (gaps.dependencyGaps.length > 0) gapTypes.push('dependencies')
      if (gaps.priorityGaps.length > 0) gapTypes.push('priority')
      summary = `Found ${totalGaps} gap(s) in: ${gapTypes.join(', ')}. Highest severity: ${highestSeverity}/5.`
    }

    // Add warnings for missing baseline
    if (!baseline) {
      warnings.push('No baseline available - dependency and priority analysis may be incomplete')
    }

    return {
      storyId: storyStructure.storyId,
      gaps,
      analyzed: true,
      totalGaps,
      highestSeverity,
      summary,
      warnings,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during PM analysis'
    return {
      storyId: storyStructure.storyId,
      gaps: {
        scopeGaps: [],
        requirementGaps: [],
        dependencyGaps: [],
        priorityGaps: [],
      },
      analyzed: false,
      totalGaps: 0,
      highestSeverity: 0,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Extended graph state with PM gap analysis.
 * Used by downstream nodes that consume the PM analysis.
 */
export interface GraphStateWithPMGaps extends GraphStateWithStorySeed {
  /** PM gap analysis result */
  pmGapAnalysis?: FanoutPMResult
  /** Whether PM analysis was completed */
  pmAnalyzed?: boolean
}

/**
 * Fanout PM node implementation.
 *
 * Generates PM perspective gap analysis based on story structure and baseline.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have storyStructure)
 * @returns Partial state update with PM gap analysis
 */
export const fanoutPMNode = createToolNode(
  'fanout_pm',
  async (state: GraphState): Promise<Partial<GraphStateWithPMGaps>> => {
    const stateWithSeed = state as GraphStateWithPMGaps

    const result = await generatePMGapAnalysis(
      stateWithSeed.storyStructure,
      stateWithSeed.baselineReality,
    )

    return updateState({
      pmGapAnalysis: result,
      pmAnalyzed: result.analyzed,
    } as Partial<GraphStateWithPMGaps>)
  },
)

/**
 * Creates a fanout PM node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createFanoutPMNode(config: Partial<FanoutPMConfig> = {}) {
  return createToolNode(
    'fanout_pm',
    async (state: GraphState): Promise<Partial<GraphStateWithPMGaps>> => {
      const stateWithSeed = state as GraphStateWithPMGaps

      const result = await generatePMGapAnalysis(
        stateWithSeed.storyStructure,
        stateWithSeed.baselineReality,
        config,
      )

      return updateState({
        pmGapAnalysis: result,
        pmAnalyzed: result.analyzed,
      } as Partial<GraphStateWithPMGaps>)
    },
  )
}
