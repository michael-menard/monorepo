/**
 * Story Fanout UX Node
 *
 * Generates UX/design perspective gap analysis for a story.
 * Analyzes the story from a user experience perspective, identifying:
 * - Accessibility concerns (WCAG compliance)
 * - Usability pattern issues
 * - Design inconsistencies
 * - User flow gaps
 *
 * FLOW-025: LangGraph Story Node - Fanout UX
 */

import { z } from 'zod'
import type { BaselineReality } from '../reality/index.js'
import { createToolNode } from '../../runner/node-factory.js'
import { updateState } from '../../runner/state-helpers.js'
import type { GraphState } from '../../state/index.js'
import type { GraphStateWithStorySeed, StoryStructure } from './seed.js'

/**
 * WCAG conformance levels for accessibility gaps.
 */
export const WCAGLevelSchema = z.enum(['A', 'AA', 'AAA'])

export type WCAGLevel = z.infer<typeof WCAGLevelSchema>

/**
 * WCAG success criteria reference.
 */
export const WCAGCriterionSchema = z.object({
  /** Success criterion ID (e.g., "1.1.1", "2.4.6") */
  id: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Human-readable name (e.g., "Non-text Content", "Headings and Labels") */
  name: z.string().min(1),
  /** Conformance level */
  level: WCAGLevelSchema,
})

export type WCAGCriterion = z.infer<typeof WCAGCriterionSchema>

/**
 * Gap severity levels.
 */
export const GapSeveritySchema = z.enum(['critical', 'major', 'minor', 'suggestion'])

export type GapSeverity = z.infer<typeof GapSeveritySchema>

/**
 * Base gap structure shared by all gap types.
 */
export const BaseGapSchema = z.object({
  /** Unique ID for the gap (e.g., "UX-GAP-1") */
  id: z.string().min(1),
  /** Description of the gap */
  description: z.string().min(1),
  /** Severity of the gap */
  severity: GapSeveritySchema,
  /** Recommended remediation */
  recommendation: z.string().min(1),
  /** Whether this gap was derived from baseline reality */
  fromBaseline: z.boolean().default(false),
  /** Reference to baseline item if derived */
  baselineRef: z.string().optional(),
  /** Affected acceptance criteria IDs */
  affectedACs: z.array(z.string()).default([]),
})

export type BaseGap = z.infer<typeof BaseGapSchema>

/**
 * Accessibility gap - WCAG compliance issues.
 */
export const AccessibilityGapSchema = BaseGapSchema.extend({
  /** Type discriminator */
  type: z.literal('accessibility'),
  /** WCAG criterion being violated or at risk */
  wcagCriterion: WCAGCriterionSchema,
  /** Impact on users */
  userImpact: z.string().min(1),
})

export type AccessibilityGap = z.infer<typeof AccessibilityGapSchema>

/**
 * Usability gap - interaction and learnability issues.
 */
export const UsabilityGapSchema = BaseGapSchema.extend({
  /** Type discriminator */
  type: z.literal('usability'),
  /** Usability heuristic being violated (e.g., "Visibility of system status") */
  heuristic: z.string().min(1),
  /** User task affected */
  affectedTask: z.string().min(1),
})

export type UsabilityGap = z.infer<typeof UsabilityGapSchema>

/**
 * Design pattern gap - inconsistencies with design system or patterns.
 */
export const DesignPatternGapSchema = BaseGapSchema.extend({
  /** Type discriminator */
  type: z.literal('design_pattern'),
  /** Pattern name that should be followed */
  expectedPattern: z.string().min(1),
  /** Component or area affected */
  affectedComponent: z.string().min(1),
  /** Reference to design system guideline if applicable */
  designSystemRef: z.string().optional(),
})

export type DesignPatternGap = z.infer<typeof DesignPatternGapSchema>

/**
 * User flow gap - issues with navigation, state, or task completion.
 */
export const UserFlowGapSchema = BaseGapSchema.extend({
  /** Type discriminator */
  type: z.literal('user_flow'),
  /** The flow or journey affected */
  affectedFlow: z.string().min(1),
  /** Missing or problematic step in the flow */
  flowIssue: z.string().min(1),
  /** Expected user goal */
  userGoal: z.string().min(1),
})

export type UserFlowGap = z.infer<typeof UserFlowGapSchema>

/**
 * Union schema for all gap types.
 */
export const UXGapSchema = z.discriminatedUnion('type', [
  AccessibilityGapSchema,
  UsabilityGapSchema,
  DesignPatternGapSchema,
  UserFlowGapSchema,
])

export type UXGap = z.infer<typeof UXGapSchema>

/**
 * Complete UX gap analysis result.
 */
export const UXGapAnalysisSchema = z.object({
  /** Story ID this analysis is for */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Accessibility gaps */
  accessibilityGaps: z.array(AccessibilityGapSchema).default([]),
  /** Usability gaps */
  usabilityGaps: z.array(UsabilityGapSchema).default([]),
  /** Design pattern gaps */
  designPatternGaps: z.array(DesignPatternGapSchema).default([]),
  /** User flow gaps */
  userFlowGaps: z.array(UserFlowGapSchema).default([]),
  /** Summary of total gaps by severity */
  summary: z.object({
    critical: z.number().int().min(0),
    major: z.number().int().min(0),
    minor: z.number().int().min(0),
    suggestion: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  /** Overall UX readiness assessment */
  uxReadiness: z.enum(['ready', 'needs_review', 'blocked']),
})

export type UXGapAnalysis = z.infer<typeof UXGapAnalysisSchema>

/**
 * Configuration for UX gap analysis.
 */
export const FanoutUXConfigSchema = z.object({
  /** Minimum WCAG level to check (A, AA, or AAA) */
  wcagLevel: WCAGLevelSchema.default('AA'),
  /** Whether to include design pattern analysis */
  checkDesignPatterns: z.boolean().default(true),
  /** Whether to include user flow analysis */
  checkUserFlows: z.boolean().default(true),
  /** Severity threshold for blocking (gaps at or above this block) */
  blockingSeverity: GapSeveritySchema.default('critical'),
  /** Maximum number of gaps to return per category */
  maxGapsPerCategory: z.number().int().positive().default(10),
})

export type FanoutUXConfig = z.infer<typeof FanoutUXConfigSchema>

/**
 * Result from the fanout UX node.
 */
export const FanoutUXResultSchema = z.object({
  /** The UX gap analysis */
  uxGapAnalysis: UXGapAnalysisSchema.nullable(),
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type FanoutUXResult = z.infer<typeof FanoutUXResultSchema>

/**
 * Common WCAG criteria for quick reference.
 */
export const COMMON_WCAG_CRITERIA: Record<string, WCAGCriterion> = {
  // Level A
  NON_TEXT_CONTENT: { id: '1.1.1', name: 'Non-text Content', level: 'A' },
  KEYBOARD: { id: '2.1.1', name: 'Keyboard', level: 'A' },
  NO_KEYBOARD_TRAP: { id: '2.1.2', name: 'No Keyboard Trap', level: 'A' },
  FOCUS_ORDER: { id: '2.4.3', name: 'Focus Order', level: 'A' },
  LINK_PURPOSE: { id: '2.4.4', name: 'Link Purpose (In Context)', level: 'A' },
  NAME_ROLE_VALUE: { id: '4.1.2', name: 'Name, Role, Value', level: 'A' },
  // Level AA
  CONTRAST_MINIMUM: { id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA' },
  RESIZE_TEXT: { id: '1.4.4', name: 'Resize Text', level: 'AA' },
  HEADINGS_LABELS: { id: '2.4.6', name: 'Headings and Labels', level: 'AA' },
  FOCUS_VISIBLE: { id: '2.4.7', name: 'Focus Visible', level: 'AA' },
  LANGUAGE_OF_PAGE: { id: '3.1.1', name: 'Language of Page', level: 'A' },
  CONSISTENT_NAVIGATION: { id: '3.2.3', name: 'Consistent Navigation', level: 'AA' },
  ERROR_IDENTIFICATION: { id: '3.3.1', name: 'Error Identification', level: 'A' },
  ERROR_SUGGESTION: { id: '3.3.3', name: 'Error Suggestion', level: 'AA' },
  // Level AAA
  SIGN_LANGUAGE: { id: '1.2.6', name: 'Sign Language (Prerecorded)', level: 'AAA' },
  CONTRAST_ENHANCED: { id: '1.4.6', name: 'Contrast (Enhanced)', level: 'AAA' },
}

/**
 * Common usability heuristics (Nielsen's 10).
 */
export const USABILITY_HEURISTICS = [
  'Visibility of system status',
  'Match between system and real world',
  'User control and freedom',
  'Consistency and standards',
  'Error prevention',
  'Recognition rather than recall',
  'Flexibility and efficiency of use',
  'Aesthetic and minimalist design',
  'Help users recognize, diagnose, and recover from errors',
  'Help and documentation',
] as const

/**
 * Generates a unique gap ID.
 *
 * @param type - Gap type prefix (e.g., "A11Y", "USAB", "DPAT", "FLOW")
 * @param number - Sequential number
 * @returns Formatted gap ID (e.g., "A11Y-GAP-001")
 */
export function generateGapId(type: 'A11Y' | 'USAB' | 'DPAT' | 'FLOW', number: number): string {
  const paddedNumber = number.toString().padStart(3, '0')
  return `${type}-GAP-${paddedNumber}`
}

/**
 * Calculates the summary counts from all gaps.
 *
 * @param gaps - Array of all UX gaps
 * @returns Summary object with counts by severity
 */
export function calculateGapSummary(gaps: UXGap[]): UXGapAnalysis['summary'] {
  const counts = {
    critical: 0,
    major: 0,
    minor: 0,
    suggestion: 0,
    total: gaps.length,
  }

  for (const gap of gaps) {
    counts[gap.severity]++
  }

  return counts
}

/**
 * Determines UX readiness based on gap analysis.
 *
 * @param summary - Gap summary counts
 * @param blockingSeverity - Minimum severity that blocks
 * @returns UX readiness assessment
 */
export function determineUXReadiness(
  summary: UXGapAnalysis['summary'],
  blockingSeverity: GapSeverity,
): UXGapAnalysis['uxReadiness'] {
  // If any critical gaps, blocked
  if (summary.critical > 0) {
    return 'blocked'
  }

  // Check if blocking severity threshold is met
  switch (blockingSeverity) {
    case 'critical':
      // Already handled above
      break
    case 'major':
      if (summary.major > 0) return 'blocked'
      break
    case 'minor':
      if (summary.major > 0 || summary.minor > 0) return 'blocked'
      break
    case 'suggestion':
      if (summary.total > 0) return 'blocked'
      break
  }

  // If any major gaps, needs review
  if (summary.major > 0) {
    return 'needs_review'
  }

  // If minor gaps or suggestions, still ready but with notes
  if (summary.minor > 0 || summary.suggestion > 0) {
    return 'needs_review'
  }

  return 'ready'
}

/**
 * Analyzes story structure for accessibility gaps.
 *
 * @param story - The story structure
 * @param baseline - Optional baseline reality for context
 * @param config - Analysis configuration
 * @returns Array of accessibility gaps
 */
export function analyzeAccessibilityGaps(
  story: StoryStructure,
  baseline: BaselineReality | null | undefined,
  config: FanoutUXConfig,
): AccessibilityGap[] {
  const gaps: AccessibilityGap[] = []
  let gapNumber = 1

  // Check title and description for accessibility keywords
  const storyText = `${story.title} ${story.description}`.toLowerCase()

  // Interactive elements without keyboard mention
  if (
    storyText.includes('button') ||
    storyText.includes('modal') ||
    storyText.includes('dialog') ||
    storyText.includes('dropdown')
  ) {
    if (!storyText.includes('keyboard') && !storyText.includes('focus')) {
      gaps.push({
        id: generateGapId('A11Y', gapNumber++),
        type: 'accessibility',
        description:
          'Story involves interactive elements but does not mention keyboard accessibility',
        severity: 'major',
        recommendation:
          'Add acceptance criteria for keyboard navigation and focus management for interactive elements',
        wcagCriterion: COMMON_WCAG_CRITERIA.KEYBOARD,
        userImpact:
          'Users who navigate via keyboard will be unable to interact with these elements',
        fromBaseline: false,
        affectedACs: story.acceptanceCriteria.map(ac => ac.id),
      })
    }
  }

  // Image/visual content without alt text mention
  if (storyText.includes('image') || storyText.includes('icon') || storyText.includes('graphic')) {
    if (!storyText.includes('alt') && !storyText.includes('alternative')) {
      gaps.push({
        id: generateGapId('A11Y', gapNumber++),
        type: 'accessibility',
        description: 'Story involves visual content but does not mention alternative text',
        severity: 'critical',
        recommendation: 'Add requirement for alt text on all non-decorative images and icons',
        wcagCriterion: COMMON_WCAG_CRITERIA.NON_TEXT_CONTENT,
        userImpact:
          'Screen reader users will have no information about the content of these images',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Form elements without error handling mention
  if (storyText.includes('form') || storyText.includes('input') || storyText.includes('field')) {
    if (!storyText.includes('error') && !storyText.includes('validation')) {
      gaps.push({
        id: generateGapId('A11Y', gapNumber++),
        type: 'accessibility',
        description: 'Story involves form elements but does not address error handling',
        severity: 'major',
        recommendation:
          'Add acceptance criteria for accessible error identification and suggestions',
        wcagCriterion: COMMON_WCAG_CRITERIA.ERROR_IDENTIFICATION,
        userImpact: 'Users may not understand what went wrong or how to fix form errors',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Check baseline for accessibility constraints
  if (baseline?.noRework) {
    for (const item of baseline.noRework) {
      if (item.toLowerCase().includes('accessibility') || item.toLowerCase().includes('a11y')) {
        gaps.push({
          id: generateGapId('A11Y', gapNumber++),
          type: 'accessibility',
          description: `Baseline contains accessibility constraint that must be preserved: ${item}`,
          severity: 'minor',
          recommendation: 'Ensure changes do not regress existing accessibility features',
          wcagCriterion: COMMON_WCAG_CRITERIA.NAME_ROLE_VALUE,
          userImpact: 'Regression could break existing assistive technology compatibility',
          fromBaseline: true,
          baselineRef: item,
          affectedACs: [],
        })
      }
    }
  }

  return gaps.slice(0, config.maxGapsPerCategory)
}

/**
 * Analyzes story structure for usability gaps.
 *
 * @param story - The story structure
 * @param baseline - Optional baseline reality for context
 * @param config - Analysis configuration
 * @returns Array of usability gaps
 */
export function analyzeUsabilityGaps(
  story: StoryStructure,
  baseline: BaselineReality | null | undefined,
  config: FanoutUXConfig,
): UsabilityGap[] {
  const gaps: UsabilityGap[] = []
  let gapNumber = 1

  const storyText = `${story.title} ${story.description}`.toLowerCase()

  // State changes without feedback
  if (
    storyText.includes('save') ||
    storyText.includes('submit') ||
    storyText.includes('update') ||
    storyText.includes('create')
  ) {
    if (
      !storyText.includes('feedback') &&
      !storyText.includes('confirm') &&
      !storyText.includes('notification')
    ) {
      gaps.push({
        id: generateGapId('USAB', gapNumber++),
        type: 'usability',
        description: 'Story involves state changes but lacks feedback mechanism specification',
        severity: 'major',
        recommendation: 'Add acceptance criteria for user feedback on successful/failed operations',
        heuristic: 'Visibility of system status',
        affectedTask: 'State-changing operations',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Destructive actions without confirmation
  if (storyText.includes('delete') || storyText.includes('remove') || storyText.includes('clear')) {
    if (!storyText.includes('confirm') && !storyText.includes('undo')) {
      gaps.push({
        id: generateGapId('USAB', gapNumber++),
        type: 'usability',
        description: 'Story involves destructive actions without confirmation or undo mechanism',
        severity: 'critical',
        recommendation: 'Add confirmation dialog or undo capability for destructive actions',
        heuristic: 'Error prevention',
        affectedTask: 'Data deletion or modification',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Complex workflow without help
  if (story.estimatedComplexity === 'large' || story.acceptanceCriteria.length > 5) {
    if (!storyText.includes('help') && !storyText.includes('guide') && !storyText.includes('tip')) {
      gaps.push({
        id: generateGapId('USAB', gapNumber++),
        type: 'usability',
        description: 'Complex feature without help or guidance specification',
        severity: 'minor',
        recommendation: 'Consider adding contextual help or onboarding for complex features',
        heuristic: 'Help and documentation',
        affectedTask: 'Learning and using complex features',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  return gaps.slice(0, config.maxGapsPerCategory)
}

/**
 * Analyzes story structure for design pattern gaps.
 *
 * @param story - The story structure
 * @param baseline - Optional baseline reality for context
 * @param config - Analysis configuration
 * @returns Array of design pattern gaps
 */
export function analyzeDesignPatternGaps(
  story: StoryStructure,
  baseline: BaselineReality | null | undefined,
  config: FanoutUXConfig,
): DesignPatternGap[] {
  if (!config.checkDesignPatterns) {
    return []
  }

  const gaps: DesignPatternGap[] = []
  let gapNumber = 1

  const storyText = `${story.title} ${story.description}`.toLowerCase()

  // Table without pagination/sorting consideration
  if (storyText.includes('table') || storyText.includes('list') || storyText.includes('grid')) {
    if (
      !storyText.includes('pagination') &&
      !storyText.includes('sort') &&
      !storyText.includes('filter')
    ) {
      gaps.push({
        id: generateGapId('DPAT', gapNumber++),
        type: 'design_pattern',
        description: 'Data display component without pagination, sorting, or filtering',
        severity: 'minor',
        recommendation:
          'Consider standard data table patterns with pagination, sorting, and filtering',
        expectedPattern: 'Data Table with Controls',
        affectedComponent: 'Data display component',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Modal without close mechanism
  if (storyText.includes('modal') || storyText.includes('dialog') || storyText.includes('popup')) {
    if (
      !storyText.includes('close') &&
      !storyText.includes('dismiss') &&
      !storyText.includes('escape')
    ) {
      gaps.push({
        id: generateGapId('DPAT', gapNumber++),
        type: 'design_pattern',
        description: 'Modal/dialog without explicit close mechanism specification',
        severity: 'major',
        recommendation: 'Specify close button, escape key, and click-outside behavior for modals',
        expectedPattern: 'Modal Dialog Pattern',
        affectedComponent: 'Modal/Dialog component',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Check baseline for design system references
  if (baseline?.noRework) {
    for (const item of baseline.noRework) {
      if (
        item.toLowerCase().includes('design system') ||
        item.toLowerCase().includes('component library')
      ) {
        gaps.push({
          id: generateGapId('DPAT', gapNumber++),
          type: 'design_pattern',
          description: `Must align with existing design system: ${item}`,
          severity: 'suggestion',
          recommendation: 'Verify new components align with existing design system patterns',
          expectedPattern: 'Design System Consistency',
          affectedComponent: 'All new UI components',
          designSystemRef: item,
          fromBaseline: true,
          baselineRef: item,
          affectedACs: [],
        })
      }
    }
  }

  return gaps.slice(0, config.maxGapsPerCategory)
}

/**
 * Analyzes story structure for user flow gaps.
 *
 * @param story - The story structure
 * @param baseline - Optional baseline reality for context
 * @param config - Analysis configuration
 * @returns Array of user flow gaps
 */
export function analyzeUserFlowGaps(
  story: StoryStructure,
  baseline: BaselineReality | null | undefined,
  config: FanoutUXConfig,
): UserFlowGap[] {
  if (!config.checkUserFlows) {
    return []
  }

  const gaps: UserFlowGap[] = []
  let gapNumber = 1

  const storyText = `${story.title} ${story.description}`.toLowerCase()

  // Multi-step process without progress indication
  if (
    storyText.includes('wizard') ||
    storyText.includes('step') ||
    storyText.includes('workflow') ||
    storyText.includes('process')
  ) {
    if (!storyText.includes('progress') && !storyText.includes('indicator')) {
      gaps.push({
        id: generateGapId('FLOW', gapNumber++),
        type: 'user_flow',
        description: 'Multi-step process without progress indication',
        severity: 'major',
        recommendation: 'Add progress indicator showing current step and total steps',
        affectedFlow: 'Multi-step workflow',
        flowIssue: 'No visibility into progress or remaining steps',
        userGoal: 'Complete multi-step process with confidence',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Navigation changes without breadcrumb/back consideration
  if (
    storyText.includes('navigate') ||
    storyText.includes('page') ||
    storyText.includes('screen')
  ) {
    if (
      !storyText.includes('back') &&
      !storyText.includes('breadcrumb') &&
      !storyText.includes('navigation')
    ) {
      gaps.push({
        id: generateGapId('FLOW', gapNumber++),
        type: 'user_flow',
        description: 'Navigation without clear wayfinding or return path',
        severity: 'minor',
        recommendation: 'Ensure users can orient themselves and return to previous context',
        affectedFlow: 'Page navigation',
        flowIssue: 'No clear path back to previous context',
        userGoal: 'Navigate confidently without losing context',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  // Authentication/gated content
  if (
    storyText.includes('login') ||
    storyText.includes('auth') ||
    storyText.includes('permission')
  ) {
    if (!storyText.includes('redirect') && !storyText.includes('return')) {
      gaps.push({
        id: generateGapId('FLOW', gapNumber++),
        type: 'user_flow',
        description: 'Authentication flow without return-to-original-page handling',
        severity: 'major',
        recommendation: 'Add deep-link preservation through authentication flow',
        affectedFlow: 'Authentication',
        flowIssue: 'Users may lose their place after logging in',
        userGoal: 'Log in and continue where they left off',
        fromBaseline: false,
        affectedACs: [],
      })
    }
  }

  return gaps.slice(0, config.maxGapsPerCategory)
}

/**
 * Generates comprehensive UX gap analysis for a story.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - Optional baseline reality for context
 * @param config - Configuration options
 * @returns Fanout UX result with gap analysis
 */
export async function generateUXGapAnalysis(
  storyStructure: StoryStructure | null | undefined,
  baseline: BaselineReality | null | undefined,
  config: Partial<FanoutUXConfig> = {},
): Promise<FanoutUXResult> {
  const fullConfig = FanoutUXConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    if (!storyStructure) {
      return {
        uxGapAnalysis: null,
        analyzed: false,
        error: 'No story structure provided for UX analysis',
        warnings,
      }
    }

    if (!baseline) {
      warnings.push('No baseline reality available - some context-dependent gaps may be missed')
    }

    // Run all gap analyses
    const accessibilityGaps = analyzeAccessibilityGaps(storyStructure, baseline, fullConfig)
    const usabilityGaps = analyzeUsabilityGaps(storyStructure, baseline, fullConfig)
    const designPatternGaps = analyzeDesignPatternGaps(storyStructure, baseline, fullConfig)
    const userFlowGaps = analyzeUserFlowGaps(storyStructure, baseline, fullConfig)

    // Combine all gaps for summary calculation
    const allGaps: UXGap[] = [
      ...accessibilityGaps,
      ...usabilityGaps,
      ...designPatternGaps,
      ...userFlowGaps,
    ]

    // Calculate summary
    const summary = calculateGapSummary(allGaps)

    // Determine readiness
    const uxReadiness = determineUXReadiness(summary, fullConfig.blockingSeverity)

    const analysis: UXGapAnalysis = {
      storyId: storyStructure.storyId,
      analyzedAt: new Date().toISOString(),
      accessibilityGaps,
      usabilityGaps,
      designPatternGaps,
      userFlowGaps,
      summary,
      uxReadiness,
    }

    // Validate against schema
    const validated = UXGapAnalysisSchema.parse(analysis)

    return {
      uxGapAnalysis: validated,
      analyzed: true,
      warnings,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during UX analysis'
    return {
      uxGapAnalysis: null,
      analyzed: false,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Extended graph state with UX gap analysis.
 */
export interface GraphStateWithUXAnalysis extends GraphStateWithStorySeed {
  /** The UX gap analysis result */
  uxGapAnalysis?: UXGapAnalysis | null
  /** Whether UX analysis was successful */
  uxAnalyzed?: boolean
  /** Warnings from UX analysis */
  uxWarnings?: string[]
}

/**
 * Story Fanout UX node implementation.
 *
 * Analyzes the story structure from a UX/design perspective, identifying
 * accessibility, usability, design pattern, and user flow gaps.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * @param state - Current graph state (must have storyStructure from seed node)
 * @returns Partial state update with UX gap analysis
 */
export const storyFanoutUXNode = createToolNode(
  'story_fanout_ux',
  async (state: GraphState): Promise<Partial<GraphStateWithUXAnalysis>> => {
    const stateWithStory = state as GraphStateWithUXAnalysis

    // Require story structure
    if (!stateWithStory.storyStructure) {
      return updateState({
        uxGapAnalysis: null,
        uxAnalyzed: false,
        uxWarnings: ['No story structure available for UX analysis'],
      } as Partial<GraphStateWithUXAnalysis>)
    }

    const result = await generateUXGapAnalysis(
      stateWithStory.storyStructure,
      stateWithStory.baselineReality,
    )

    if (!result.analyzed) {
      return updateState({
        uxGapAnalysis: null,
        uxAnalyzed: false,
        uxWarnings: result.warnings,
      } as Partial<GraphStateWithUXAnalysis>)
    }

    return updateState({
      uxGapAnalysis: result.uxGapAnalysis,
      uxAnalyzed: true,
      uxWarnings: result.warnings,
    } as Partial<GraphStateWithUXAnalysis>)
  },
)

/**
 * Creates a story fanout UX node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createStoryFanoutUXNode(config: Partial<FanoutUXConfig> = {}) {
  return createToolNode(
    'story_fanout_ux',
    async (state: GraphState): Promise<Partial<GraphStateWithUXAnalysis>> => {
      const stateWithStory = state as GraphStateWithUXAnalysis

      if (!stateWithStory.storyStructure) {
        throw new Error('Story structure is required for UX analysis')
      }

      const result = await generateUXGapAnalysis(
        stateWithStory.storyStructure,
        stateWithStory.baselineReality,
        config,
      )

      if (!result.analyzed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          uxGapAnalysis: null,
          uxAnalyzed: false,
          uxWarnings: result.warnings,
        } as Partial<GraphStateWithUXAnalysis>)
      }

      return updateState({
        uxGapAnalysis: result.uxGapAnalysis,
        uxAnalyzed: true,
        uxWarnings: result.warnings,
      } as Partial<GraphStateWithUXAnalysis>)
    },
  )
}
