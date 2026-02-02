/**
 * Elaboration Delta Review Node
 *
 * Performs focused reviews on changed sections identified by delta detection.
 * Reviews only modified ACs, constraints, test hints, and new items while
 * skipping unchanged sections for efficiency.
 *
 * FLOW-032: LangGraph Elaboration Node - Delta Review
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { SynthesizedStory } from '../story/synthesize.js'
import {
  type DeltaDetectionResult,
  type SectionChange,
  type SectionName,
  SectionNameSchema,
} from './delta-detect.js'

/**
 * Schema for review finding severity levels.
 */
export const ReviewSeveritySchema = z.enum(['critical', 'major', 'minor', 'info'])

export type ReviewSeverity = z.infer<typeof ReviewSeveritySchema>

/**
 * Schema for review finding categories.
 */
export const ReviewCategorySchema = z.enum([
  'clarity', // AC or description lacks clarity
  'completeness', // Missing information or coverage
  'consistency', // Conflicts with other sections
  'testability', // Difficult to verify or test
  'scope', // Scope creep or boundary issues
  'feasibility', // Technical or practical concerns
  'dependency', // Missing or conflicting dependencies
  'risk', // Unaddressed risks or edge cases
])

export type ReviewCategory = z.infer<typeof ReviewCategorySchema>

/**
 * Schema for an individual review finding.
 */
export const ReviewFindingSchema = z.object({
  /** Unique finding ID (e.g., "RF-1") */
  id: z.string().min(1),
  /** Section where the finding applies */
  section: SectionNameSchema,
  /** ID of the specific item reviewed (e.g., "AC-1", "TH-2") */
  itemId: z.string().min(1),
  /** Severity of the finding */
  severity: ReviewSeveritySchema,
  /** Category of the finding */
  category: ReviewCategorySchema,
  /** Description of the issue found */
  issue: z.string().min(1),
  /** Recommended action to address the finding */
  recommendation: z.string().min(1),
  /** Whether this is related to a delta change */
  deltaRelated: z.boolean().default(true),
  /** The type of change that triggered this review */
  changeType: z.enum(['added', 'modified', 'removed']).optional(),
  /** Additional context or evidence */
  context: z.string().optional(),
})

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>

/**
 * Schema for section review summary.
 */
export const SectionReviewSummarySchema = z.object({
  /** Section name */
  section: SectionNameSchema,
  /** Number of items reviewed in this section */
  itemsReviewed: z.number().int().min(0),
  /** Number of findings for this section */
  findingsCount: z.number().int().min(0),
  /** Whether the section passed review (no critical/major findings) */
  passed: z.boolean(),
  /** Summary note for this section */
  note: z.string().optional(),
})

export type SectionReviewSummary = z.infer<typeof SectionReviewSummarySchema>

/**
 * Schema for the complete delta review result.
 */
export const DeltaReviewResultSchema = z.object({
  /** Story ID being reviewed */
  storyId: z.string().regex(/^[a-z]+-\d+$/i),
  /** Timestamp of the review */
  reviewedAt: z.string().datetime(),
  /** All review findings */
  findings: z.array(ReviewFindingSchema),
  /** Sections that were reviewed */
  sectionsReviewed: z.array(SectionNameSchema),
  /** Sections that were skipped (no changes) */
  sectionsSkipped: z.array(SectionNameSchema),
  /** Summary by section */
  sectionSummaries: z.array(SectionReviewSummarySchema),
  /** Overall pass/fail status */
  passed: z.boolean(),
  /** Total findings by severity */
  findingsBySeverity: z.object({
    critical: z.number().int().min(0),
    major: z.number().int().min(0),
    minor: z.number().int().min(0),
    info: z.number().int().min(0),
  }),
  /** Summary narrative of the review */
  summary: z.string().min(1),
  /** Whether the review completed successfully */
  reviewed: z.boolean(),
  /** Error message if review failed */
  error: z.string().optional(),
})

export type DeltaReviewResult = z.infer<typeof DeltaReviewResultSchema>

/**
 * Configuration for delta review.
 */
export const DeltaReviewConfigSchema = z.object({
  /** Minimum severity to report (filters out lower severity findings) */
  minSeverity: ReviewSeveritySchema.default('info'),
  /** Whether to review added items */
  reviewAdded: z.boolean().default(true),
  /** Whether to review modified items */
  reviewModified: z.boolean().default(true),
  /** Whether to review removed items (for impact analysis) */
  reviewRemoved: z.boolean().default(true),
  /** Maximum findings per section */
  maxFindingsPerSection: z.number().int().positive().default(10),
  /** Whether to fail on critical findings */
  failOnCritical: z.boolean().default(true),
  /** Whether to fail on major findings */
  failOnMajor: z.boolean().default(false),
})

export type DeltaReviewConfig = z.infer<typeof DeltaReviewConfigSchema>

/**
 * Schema for delta review node result.
 */
export const DeltaReviewNodeResultSchema = z.object({
  /** The delta review result */
  deltaReviewResult: DeltaReviewResultSchema.nullable(),
  /** Whether review was successful */
  deltaReviewed: z.boolean(),
  /** Error message if review failed */
  error: z.string().optional(),
})

export type DeltaReviewNodeResult = z.infer<typeof DeltaReviewNodeResultSchema>

/**
 * Context for reviewing a section, including related story content.
 */
export interface SectionReviewContext {
  /** The synthesized story being reviewed */
  story: SynthesizedStory
  /** Related section changes from delta detection */
  changes: SectionChange[]
  /** The review configuration */
  config: DeltaReviewConfig
}

/**
 * Severity level weights for filtering and comparison.
 */
const SEVERITY_WEIGHTS: Record<ReviewSeverity, number> = {
  critical: 4,
  major: 3,
  minor: 2,
  info: 1,
}

/**
 * Checks if a severity meets the minimum threshold.
 *
 * @param severity - The severity to check
 * @param minSeverity - The minimum severity threshold
 * @returns True if severity meets or exceeds minimum
 */
function meetsSeverityThreshold(severity: ReviewSeverity, minSeverity: ReviewSeverity): boolean {
  return SEVERITY_WEIGHTS[severity] >= SEVERITY_WEIGHTS[minSeverity]
}

/**
 * Reviews acceptance criteria for common issues.
 *
 * @param sectionContent - The acceptance criteria array
 * @param context - Review context
 * @returns Array of findings for ACs
 */
function reviewAcceptanceCriteria(
  sectionContent: unknown[],
  context: SectionReviewContext,
): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  let findingNum = 1

  for (const change of context.changes) {
    if (change.changeType === 'unchanged') continue
    if (change.changeType === 'removed' && !context.config.reviewRemoved) continue
    if (change.changeType === 'added' && !context.config.reviewAdded) continue
    if (change.changeType === 'modified' && !context.config.reviewModified) continue

    const content = change.newContent || change.oldContent || ''

    // Check for vague language
    const vaguePatterns = [
      /\bshould\b/i,
      /\bmay\b/i,
      /\bmight\b/i,
      /\bcould\b/i,
      /\bpossibly\b/i,
      /\bappropriate\b/i,
      /\breasonable\b/i,
      /\bas needed\b/i,
    ]
    for (const pattern of vaguePatterns) {
      if (pattern.test(content)) {
        findings.push({
          id: `RF-${findingNum++}`,
          section: 'acceptanceCriteria',
          itemId: change.itemId,
          severity: 'minor',
          category: 'clarity',
          issue: `AC contains vague language: "${pattern.source}"`,
          recommendation: 'Replace vague terms with specific, measurable criteria',
          deltaRelated: true,
          changeType: change.changeType,
          context: content.substring(0, 100),
        })
        break
      }
    }

    // Check for TBD/placeholder content
    const tbdPatterns = [/\btbd\b/i, /\bto be determined\b/i, /\btbc\b/i, /\bplaceholder\b/i]
    for (const pattern of tbdPatterns) {
      if (pattern.test(content)) {
        findings.push({
          id: `RF-${findingNum++}`,
          section: 'acceptanceCriteria',
          itemId: change.itemId,
          severity: 'critical',
          category: 'completeness',
          issue: `AC contains unresolved placeholder: "${pattern.source}"`,
          recommendation: 'Define specific acceptance criteria before implementation',
          deltaRelated: true,
          changeType: change.changeType,
          context: content.substring(0, 100),
        })
        break
      }
    }

    // Check for overly long ACs (may need decomposition)
    if (content.length > 300) {
      findings.push({
        id: `RF-${findingNum++}`,
        section: 'acceptanceCriteria',
        itemId: change.itemId,
        severity: 'minor',
        category: 'clarity',
        issue: 'AC is overly long and may be difficult to verify',
        recommendation: 'Consider breaking down into smaller, focused criteria',
        deltaRelated: true,
        changeType: change.changeType,
      })
    }

    // Check for removed critical ACs
    if (change.changeType === 'removed') {
      findings.push({
        id: `RF-${findingNum++}`,
        section: 'acceptanceCriteria',
        itemId: change.itemId,
        severity: 'major',
        category: 'scope',
        issue: 'Acceptance criterion was removed - verify intentional scope reduction',
        recommendation: 'Confirm removal is intentional and document reason if scope is reduced',
        deltaRelated: true,
        changeType: 'removed',
        context: content.substring(0, 100),
      })
    }

    if (findings.length >= context.config.maxFindingsPerSection) break
  }

  return findings
}

/**
 * Reviews test hints for completeness and clarity.
 *
 * @param sectionContent - The test hints array
 * @param context - Review context
 * @returns Array of findings for test hints
 */
function reviewTestHints(
  sectionContent: unknown[],
  context: SectionReviewContext,
): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  let findingNum = 1

  for (const change of context.changes) {
    if (change.changeType === 'unchanged') continue
    if (change.changeType === 'removed' && !context.config.reviewRemoved) continue

    const content = change.newContent || change.oldContent || ''

    // Check for missing test approach
    if (change.changeType !== 'removed' && content.length < 50) {
      findings.push({
        id: `RF-${findingNum++}`,
        section: 'testHints',
        itemId: change.itemId,
        severity: 'minor',
        category: 'testability',
        issue: 'Test hint is brief and may lack sufficient detail for implementation',
        recommendation: 'Expand with specific test scenarios, inputs, and expected outcomes',
        deltaRelated: true,
        changeType: change.changeType,
        context: content,
      })
    }

    if (findings.length >= context.config.maxFindingsPerSection) break
  }

  return findings
}

/**
 * Reviews known unknowns for resolution status.
 *
 * @param sectionContent - The known unknowns array
 * @param context - Review context
 * @returns Array of findings for known unknowns
 */
function reviewKnownUnknowns(
  sectionContent: unknown[],
  context: SectionReviewContext,
): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  let findingNum = 1

  for (const change of context.changes) {
    if (change.changeType === 'unchanged') continue

    // New blocking unknowns are critical
    if (change.changeType === 'added') {
      // Check if it's a blocking unknown
      const item = sectionContent.find((i: unknown) => {
        return (
          typeof i === 'object' && i !== null && (i as Record<string, unknown>).id === change.itemId
        )
      }) as Record<string, unknown> | undefined

      if (item?.impact === 'blocking') {
        findings.push({
          id: `RF-${findingNum++}`,
          section: 'knownUnknowns',
          itemId: change.itemId,
          severity: 'critical',
          category: 'risk',
          issue: 'New blocking unknown added - requires resolution before implementation',
          recommendation: 'Address blocking unknown before committing to implementation',
          deltaRelated: true,
          changeType: 'added',
          context: change.newContent?.substring(0, 100),
        })
      }
    }

    if (findings.length >= context.config.maxFindingsPerSection) break
  }

  return findings
}

/**
 * Reviews constraints for consistency.
 *
 * @param sectionContent - The constraints array
 * @param context - Review context
 * @returns Array of findings for constraints
 */
function reviewConstraints(
  sectionContent: unknown[],
  context: SectionReviewContext,
): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  let findingNum = 1

  for (const change of context.changes) {
    if (change.changeType === 'unchanged') continue

    // Removed constraints need verification
    if (change.changeType === 'removed') {
      findings.push({
        id: `RF-${findingNum++}`,
        section: 'constraints',
        itemId: change.itemId,
        severity: 'major',
        category: 'consistency',
        issue: 'Constraint was removed - verify this does not violate baseline reality',
        recommendation: 'Confirm removal is compatible with system constraints and baseline',
        deltaRelated: true,
        changeType: 'removed',
        context: change.oldContent?.substring(0, 100),
      })
    }

    if (findings.length >= context.config.maxFindingsPerSection) break
  }

  return findings
}

/**
 * Reviews non-goals for clarity.
 *
 * @param sectionContent - The non-goals array
 * @param context - Review context
 * @returns Array of findings for non-goals
 */
function reviewNonGoals(sectionContent: unknown[], context: SectionReviewContext): ReviewFinding[] {
  const findings: ReviewFinding[] = []
  let findingNum = 1

  for (const change of context.changes) {
    if (change.changeType === 'unchanged') continue

    // Removed non-goals may indicate scope creep
    if (change.changeType === 'removed') {
      findings.push({
        id: `RF-${findingNum++}`,
        section: 'nonGoals',
        itemId: change.itemId,
        severity: 'minor',
        category: 'scope',
        issue: 'Non-goal was removed - verify this does not indicate scope creep',
        recommendation: 'Confirm scope remains well-defined after removing this exclusion',
        deltaRelated: true,
        changeType: 'removed',
        context: change.oldContent?.substring(0, 100),
      })
    }

    if (findings.length >= context.config.maxFindingsPerSection) break
  }

  return findings
}

/**
 * Reviews a single section and produces findings.
 *
 * @param section - The section name to review
 * @param sectionContent - The section content from the story
 * @param context - Review context including changes and config
 * @returns Array of review findings for this section
 */
export function reviewSection(
  section: SectionName,
  sectionContent: unknown[],
  context: SectionReviewContext,
): ReviewFinding[] {
  // Filter changes for this section
  const sectionChanges = context.changes.filter(c => c.section === section)

  if (sectionChanges.length === 0) {
    return []
  }

  const contextWithSectionChanges: SectionReviewContext = {
    ...context,
    changes: sectionChanges,
  }

  // Route to section-specific reviewer
  switch (section) {
    case 'acceptanceCriteria':
      return reviewAcceptanceCriteria(sectionContent, contextWithSectionChanges)
    case 'testHints':
      return reviewTestHints(sectionContent, contextWithSectionChanges)
    case 'knownUnknowns':
      return reviewKnownUnknowns(sectionContent, contextWithSectionChanges)
    case 'constraints':
      return reviewConstraints(sectionContent, contextWithSectionChanges)
    case 'nonGoals':
      return reviewNonGoals(sectionContent, contextWithSectionChanges)
    case 'affectedFiles':
    case 'dependencies':
      // These sections have minimal review rules
      return []
    default:
      return []
  }
}

/**
 * Aggregates findings from all section reviews.
 *
 * @param sectionFindings - Map of section to findings
 * @param config - Review configuration
 * @returns Aggregated and filtered findings
 */
export function aggregateFindings(
  sectionFindings: Map<SectionName, ReviewFinding[]>,
  config: DeltaReviewConfig,
): ReviewFinding[] {
  const allFindings: ReviewFinding[] = []

  for (const findings of sectionFindings.values()) {
    allFindings.push(...findings)
  }

  // Filter by minimum severity
  const filteredFindings = allFindings.filter(f =>
    meetsSeverityThreshold(f.severity, config.minSeverity),
  )

  // Re-number findings sequentially
  return filteredFindings.map((f, idx) => ({
    ...f,
    id: `RF-${idx + 1}`,
  }))
}

/**
 * Creates section summaries from findings.
 *
 * @param sectionsReviewed - Sections that were reviewed
 * @param findings - All findings
 * @param story - The story being reviewed
 * @returns Array of section summaries
 */
function createSectionSummaries(
  sectionsReviewed: SectionName[],
  findings: ReviewFinding[],
  story: SynthesizedStory,
): SectionReviewSummary[] {
  return sectionsReviewed.map(section => {
    const sectionFindings = findings.filter(f => f.section === section)
    const hasCritical = sectionFindings.some(f => f.severity === 'critical')
    const hasMajor = sectionFindings.some(f => f.severity === 'major')

    // Get item count from story
    const sectionContent = story[section] as unknown[] | undefined
    const itemsReviewed = sectionContent?.length ?? 0

    return {
      section,
      itemsReviewed,
      findingsCount: sectionFindings.length,
      passed: !hasCritical && !hasMajor,
      note:
        sectionFindings.length === 0
          ? 'No issues found'
          : `${sectionFindings.length} finding(s) identified`,
    }
  })
}

/**
 * Generates a summary narrative for the review.
 *
 * @param findings - All findings
 * @param sectionsReviewed - Sections that were reviewed
 * @param sectionsSkipped - Sections that were skipped
 * @param storyId - Story ID
 * @param passed - Overall pass status
 * @returns Summary narrative
 */
function generateSummary(
  findings: ReviewFinding[],
  sectionsReviewed: SectionName[],
  sectionsSkipped: SectionName[],
  storyId: string,
  passed: boolean,
): string {
  const parts: string[] = []

  parts.push(`Delta review for story ${storyId}:`)

  if (sectionsReviewed.length === 0) {
    return `${parts[0]} No changed sections to review.`
  }

  parts.push(`Reviewed ${sectionsReviewed.length} section(s)`)

  if (sectionsSkipped.length > 0) {
    parts.push(`skipped ${sectionsSkipped.length} unchanged section(s)`)
  }

  if (findings.length === 0) {
    parts.push('No issues found.')
    return parts.join(', ') + ' Review PASSED.'
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const majorCount = findings.filter(f => f.severity === 'major').length
  const minorCount = findings.filter(f => f.severity === 'minor').length

  const issueParts: string[] = []
  if (criticalCount > 0) issueParts.push(`${criticalCount} critical`)
  if (majorCount > 0) issueParts.push(`${majorCount} major`)
  if (minorCount > 0) issueParts.push(`${minorCount} minor`)

  parts.push(`Found ${findings.length} issue(s): ${issueParts.join(', ')}.`)
  parts.push(`Review ${passed ? 'PASSED' : 'FAILED'}.`)

  return parts.join('. ')
}

/**
 * Main delta review function that reviews changed sections.
 *
 * @param deltaResult - Delta detection result
 * @param story - The current synthesized story
 * @param config - Review configuration
 * @returns Delta review result
 */
export async function performDeltaReview(
  deltaResult: DeltaDetectionResult,
  story: SynthesizedStory,
  config: Partial<DeltaReviewConfig> = {},
): Promise<DeltaReviewResult> {
  const fullConfig = DeltaReviewConfigSchema.parse(config)

  try {
    // Determine which sections have changes
    const allSections: SectionName[] = [
      'acceptanceCriteria',
      'nonGoals',
      'testHints',
      'knownUnknowns',
      'constraints',
      'affectedFiles',
      'dependencies',
    ]

    const sectionsWithChanges = new Set(deltaResult.changes.map(c => c.section))
    const sectionsReviewed: SectionName[] = allSections.filter(s => sectionsWithChanges.has(s))
    const sectionsSkipped: SectionName[] = allSections.filter(s => !sectionsWithChanges.has(s))

    // Create review context
    const context: SectionReviewContext = {
      story,
      changes: deltaResult.changes,
      config: fullConfig,
    }

    // Review each changed section
    const sectionFindings = new Map<SectionName, ReviewFinding[]>()

    for (const section of sectionsReviewed) {
      const sectionContent = (story[section] as unknown[]) ?? []
      const findings = reviewSection(section, sectionContent, context)
      sectionFindings.set(section, findings)
    }

    // Aggregate and filter findings
    const allFindings = aggregateFindings(sectionFindings, fullConfig)

    // Calculate findings by severity
    const findingsBySeverity = {
      critical: allFindings.filter(f => f.severity === 'critical').length,
      major: allFindings.filter(f => f.severity === 'major').length,
      minor: allFindings.filter(f => f.severity === 'minor').length,
      info: allFindings.filter(f => f.severity === 'info').length,
    }

    // Determine pass/fail
    let passed = true
    if (fullConfig.failOnCritical && findingsBySeverity.critical > 0) {
      passed = false
    }
    if (fullConfig.failOnMajor && findingsBySeverity.major > 0) {
      passed = false
    }

    // Create section summaries
    const sectionSummaries = createSectionSummaries(sectionsReviewed, allFindings, story)

    // Generate summary
    const summary = generateSummary(
      allFindings,
      sectionsReviewed,
      sectionsSkipped,
      story.storyId,
      passed,
    )

    const result: DeltaReviewResult = {
      storyId: story.storyId,
      reviewedAt: new Date().toISOString(),
      findings: allFindings,
      sectionsReviewed,
      sectionsSkipped,
      sectionSummaries,
      passed,
      findingsBySeverity,
      summary,
      reviewed: true,
    }

    // Validate against schema
    return DeltaReviewResultSchema.parse(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during review'
    return {
      storyId: story.storyId,
      reviewedAt: new Date().toISOString(),
      findings: [],
      sectionsReviewed: [],
      sectionsSkipped: [],
      sectionSummaries: [],
      passed: false,
      findingsBySeverity: {
        critical: 0,
        major: 0,
        minor: 0,
        info: 0,
      },
      summary: `Delta review failed: ${errorMessage}`,
      reviewed: false,
      error: errorMessage,
    }
  }
}

/**
 * Extended graph state with delta review results.
 */
export interface GraphStateWithDeltaReview extends GraphState {
  /** Delta detection result (from FLOW-031) */
  deltaDetectionResult?: DeltaDetectionResult | null
  /** Current synthesized story */
  synthesizedStory?: SynthesizedStory | null
  /** Delta review result */
  deltaReviewResult?: DeltaReviewResult | null
  /** Whether delta review was successful */
  deltaReviewed?: boolean
}

/**
 * Delta Review node implementation.
 *
 * Performs focused reviews on changed sections identified by delta detection.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have delta detection result and synthesized story)
 * @returns Partial state update with delta review results
 */
export const deltaReviewNode = createToolNode(
  'delta_review',
  async (state: GraphState): Promise<Partial<GraphStateWithDeltaReview>> => {
    const stateWithDelta = state as GraphStateWithDeltaReview

    // Require delta detection result
    if (!stateWithDelta.deltaDetectionResult) {
      return updateState({
        deltaReviewResult: null,
        deltaReviewed: false,
      } as Partial<GraphStateWithDeltaReview>)
    }

    // Require synthesized story
    if (!stateWithDelta.synthesizedStory) {
      return updateState({
        deltaReviewResult: null,
        deltaReviewed: false,
      } as Partial<GraphStateWithDeltaReview>)
    }

    const result = await performDeltaReview(
      stateWithDelta.deltaDetectionResult,
      stateWithDelta.synthesizedStory,
    )

    if (!result.reviewed) {
      return updateState({
        deltaReviewResult: result,
        deltaReviewed: false,
      } as Partial<GraphStateWithDeltaReview>)
    }

    return updateState({
      deltaReviewResult: result,
      deltaReviewed: true,
    } as Partial<GraphStateWithDeltaReview>)
  },
)

/**
 * Creates a delta review node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createDeltaReviewNode(config: Partial<DeltaReviewConfig> = {}) {
  return createToolNode(
    'delta_review',
    async (state: GraphState): Promise<Partial<GraphStateWithDeltaReview>> => {
      const stateWithDelta = state as GraphStateWithDeltaReview

      // Require delta detection result
      if (!stateWithDelta.deltaDetectionResult) {
        throw new Error('Delta detection result is required for delta review')
      }

      // Require synthesized story
      if (!stateWithDelta.synthesizedStory) {
        throw new Error('Synthesized story is required for delta review')
      }

      const result = await performDeltaReview(
        stateWithDelta.deltaDetectionResult,
        stateWithDelta.synthesizedStory,
        config,
      )

      if (!result.reviewed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          deltaReviewResult: result,
          deltaReviewed: false,
        } as Partial<GraphStateWithDeltaReview>)
      }

      return updateState({
        deltaReviewResult: result,
        deltaReviewed: true,
      } as Partial<GraphStateWithDeltaReview>)
    },
  )
}
