/**
 * normalize_plan Node
 *
 * Pure data-transformation node (no LLM, synchronous logic).
 * Parses rawPlan markdown content and extracts structured fields
 * into a NormalizedPlan object.
 *
 * Phase functions exported for unit testability (AC-7).
 * Injectable plan-loader adapter for loading plan from KB.
 *
 * APRS-2010: ST-2
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  NormalizedPlanSchema,
  type NormalizedPlan,
  type PlanRefinementState,
} from '../../state/plan-refinement-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

/**
 * Injectable plan-loader adapter.
 * Loads a raw plan from KB or other source by planSlug.
 * AC-6 pattern: injectable, defaults to no-op.
 */
export type PlanLoaderFn = (planSlug: string) => Promise<Record<string, unknown> | null>

/**
 * Default no-op plan loader (returns null, node uses state.rawPlan directly).
 */
const defaultPlanLoader: PlanLoaderFn = async (_planSlug: string) => null

// ============================================================================
// Config Schema
// ============================================================================

export const NormalizePlanConfigSchema = z.object({
  /** Injectable plan-loader adapter */
  planLoader: z.function().optional(),
})

export type NormalizePlanConfig = z.infer<typeof NormalizePlanConfigSchema>

// ============================================================================
// Phase Functions (exported for unit testability)
// ============================================================================

/**
 * Extract a markdown section value by heading name.
 * Supports ## Heading and # Heading formats.
 * Returns trimmed content between this heading and the next heading of the
 * SAME OR HIGHER level (lower or equal # count). Sub-headings within the
 * section are included.
 */
export function extractSection(markdown: string, sectionName: string): string {
  const lines = markdown.split('\n')
  let capturing = false
  let captureLevel = 0
  const captured: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const heading = headingMatch[2].trim()

      if (capturing) {
        // Stop only when we encounter a heading of the same or higher level
        if (level <= captureLevel) {
          break
        }
        // Sub-heading inside section — keep capturing
      } else if (heading.toLowerCase() === sectionName.toLowerCase()) {
        capturing = true
        captureLevel = level
        continue
      }
    }
    if (capturing) {
      captured.push(line)
    }
  }

  return captured.join('\n').trim()
}

/**
 * Extract a list from a section — returns array of non-empty lines
 * stripped of leading list markers (-, *, numbers).
 * Excludes lines that are sub-headings (### ...).
 */
export function extractList(markdown: string, sectionName: string): string[] {
  const section = extractSection(markdown, sectionName)
  if (!section) return []

  return section
    .split('\n')
    .filter(line => !line.match(/^#{1,6}\s/)) // skip sub-headings
    .map(line => line.replace(/^[-*\d.]+\s*/, '').trim())
    .filter(line => line.length > 0)
}

/**
 * Phase 1: Load plan from adapter if rawPlan not already in state.
 */
export async function loadPlan(
  state: PlanRefinementState,
  planLoader: PlanLoaderFn,
): Promise<Record<string, unknown> | null> {
  if (state.rawPlan) {
    return state.rawPlan
  }

  if (!state.planSlug) {
    return null
  }

  try {
    const loaded = await planLoader(state.planSlug)
    return loaded
  } catch (err) {
    logger.warn('normalize_plan: plan loader failed, continuing with null rawPlan', {
      err,
      planSlug: state.planSlug,
    })
    return null
  }
}

/**
 * Phase 2: Parse rawPlan into NormalizedPlan.
 * Handles markdown string content or raw object shapes.
 */
export function parseRawPlan(
  planSlug: string,
  rawPlan: Record<string, unknown> | null,
): NormalizedPlan {
  if (!rawPlan) {
    // Return minimal initialized plan with empty arrays
    return NormalizedPlanSchema.parse({
      planSlug,
      title: planSlug,
      summary: '',
      problemStatement: '',
      proposedSolution: '',
      goals: [],
      nonGoals: [],
      flows: [],
      openQuestions: [],
      warnings: ['rawPlan was null or missing'],
      constraints: [],
      dependencies: [],
    })
  }

  // Detect markdown content field
  const content =
    typeof rawPlan['content'] === 'string'
      ? rawPlan['content']
      : typeof rawPlan['rawContent'] === 'string'
        ? rawPlan['rawContent']
        : typeof rawPlan['body'] === 'string'
          ? rawPlan['body']
          : null

  // Extract title from rawPlan object fields or markdown h1
  let title = typeof rawPlan['title'] === 'string' ? rawPlan['title'] : ''
  if (!title && content) {
    const h1Match = content.match(/^#\s+(.+)$/m)
    if (h1Match) title = h1Match[1].trim()
  }
  if (!title) title = planSlug

  if (!content) {
    // rawPlan is an object but has no markdown content — extract what we can
    return NormalizedPlanSchema.parse({
      planSlug,
      title,
      summary: typeof rawPlan['summary'] === 'string' ? rawPlan['summary'] : '',
      problemStatement:
        typeof rawPlan['problem_statement'] === 'string' ? rawPlan['problem_statement'] : '',
      proposedSolution:
        typeof rawPlan['proposed_solution'] === 'string' ? rawPlan['proposed_solution'] : '',
      goals: Array.isArray(rawPlan['goals'])
        ? (rawPlan['goals'] as string[]).filter(g => typeof g === 'string')
        : [],
      nonGoals: Array.isArray(rawPlan['non_goals'])
        ? (rawPlan['non_goals'] as string[]).filter(g => typeof g === 'string')
        : [],
      flows: [],
      openQuestions: [],
      warnings: [],
      constraints: [],
      dependencies: [],
      status: typeof rawPlan['status'] === 'string' ? rawPlan['status'] : 'draft',
      priority: typeof rawPlan['priority'] === 'string' ? rawPlan['priority'] : 'medium',
      tags: Array.isArray(rawPlan['tags'])
        ? (rawPlan['tags'] as string[]).filter(t => typeof t === 'string')
        : [],
    })
  }

  // Parse markdown content
  const problemStatement = extractSection(content, 'Problem Statement')
  const proposedSolution = extractSection(content, 'Proposed Solution')
  const summary = extractSection(content, 'Summary') || extractSection(content, 'Overview')
  const goals = extractList(content, 'Goals')
  const nonGoalsResult = extractList(content, 'Non-Goals')
  const nonGoals = nonGoalsResult.length > 0 ? nonGoalsResult : extractList(content, 'Non Goals')
  const openQuestions = extractList(content, 'Open Questions')
  const constraints = extractList(content, 'Constraints')
  const dependencies = extractList(content, 'Dependencies')
  const tags = extractList(content, 'Tags')

  return NormalizedPlanSchema.parse({
    planSlug,
    title,
    summary,
    problemStatement,
    proposedSolution,
    goals,
    nonGoals,
    flows: [], // populated by extract_flows node
    openQuestions,
    warnings: [],
    constraints,
    dependencies,
    status: typeof rawPlan['status'] === 'string' ? rawPlan['status'] : 'draft',
    priority: typeof rawPlan['priority'] === 'string' ? rawPlan['priority'] : 'medium',
    tags,
  })
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the normalize_plan LangGraph node.
 *
 * AC-1: Returns NormalizedPlanSchema-conforming object with all required fields,
 *       openQuestions and warnings arrays initialized, flows array initialized.
 * AC-2 (DEC-2): Pure data-transformation — no LLM, synchronous logic.
 *
 * @param config - Optional config with injectable plan-loader adapter
 */
export function createNormalizePlanNode(config: { planLoader?: PlanLoaderFn } = {}) {
  const planLoader = config.planLoader ?? defaultPlanLoader

  return async (state: PlanRefinementState): Promise<Partial<PlanRefinementState>> => {
    try {
      logger.info('normalize_plan: starting', { planSlug: state.planSlug })

      // Phase 1: Load plan if needed
      const rawPlan = await loadPlan(state, planLoader)

      // Phase 2: Parse into normalized plan
      const normalizedPlan = parseRawPlan(state.planSlug, rawPlan)

      logger.info('normalize_plan: complete', {
        planSlug: state.planSlug,
        hasProposedSolution: !!normalizedPlan.proposedSolution,
        goalCount: normalizedPlan.goals.length,
      })

      return {
        rawPlan: rawPlan ?? state.rawPlan,
        normalizedPlan,
        refinementPhase: 'extract_flows',
        errors: [],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error('normalize_plan: unexpected error', { err, planSlug: state.planSlug })
      return {
        refinementPhase: 'error',
        errors: [`normalize_plan failed: ${message}`],
      }
    }
  }
}
