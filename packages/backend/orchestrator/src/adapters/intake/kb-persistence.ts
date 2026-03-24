/**
 * KB Persistence Layer
 *
 * Converts NormalizedPlan to KbUpsertPlanInput and provides
 * the persistence function for writing draft plans to KB.
 *
 * Two functions:
 * - normalizedPlanToKbInput: pure mapper (testable without KB mocks)
 * - persistDraftPlan: side-effectful KB writer (delegates to MCP tool)
 *
 * @see APRS-5010 AC-3, AC-5, AC-6, AC-8
 */

import { z } from 'zod'
import type { NormalizedPlan } from '../../state/plan-refinement-state.js'
import { mapPriority } from './utils.js'

// ============================================================================
// KB Upsert Plan Input Schema (local copy for validation)
// ============================================================================

/**
 * Mirrors KbUpsertPlanInputSchema from plan-operations.ts.
 * Local copy avoids cross-app import (orchestrator -> knowledge-base API).
 */
export const KbPlanInputSchema = z.object({
  plan_slug: z.string().min(1),
  title: z.string().min(1),
  raw_content: z.string().min(1).max(200_000),
  summary: z.string().optional(),
  plan_type: z.string().optional(),
  status: z
    .enum([
      'draft',
      'accepted',
      'stories-created',
      'in-progress',
      'implemented',
      'superseded',
      'archived',
      'blocked',
    ])
    .optional()
    .default('draft'),
  story_prefix: z.string().optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4', 'P5']).optional().default('P3'),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  source_file: z.string().optional(),
  parent_plan_slug: z.string().optional(),
  sections: z.array(z.record(z.unknown())).optional(),
  format_version: z.string().optional(),
})

export type KbPlanInput = z.infer<typeof KbPlanInputSchema>

// ============================================================================
// Injectable MCP Tool Type
// ============================================================================

/**
 * Injectable function type for KB plan upsert.
 * In production, this delegates to the kb_upsert_plan MCP tool.
 * In tests, this can be mocked.
 */
export type KbUpsertPlanFn = (input: KbPlanInput) => Promise<{ plan_slug: string } | null>

// ============================================================================
// Pure Mapper
// ============================================================================

/**
 * Convert a NormalizedPlan to a KbUpsertPlanInput.
 *
 * Maps camelCase to snake_case, converts priority string to P1-P5,
 * and generates raw_content markdown from the plan fields.
 *
 * @param plan - Validated NormalizedPlan
 * @param options - Optional overrides (storyPrefix, planType, sourceFile)
 * @returns Validated KbPlanInput ready for kb_upsert_plan
 * @throws {ZodError} if output fails validation
 */
export function normalizedPlanToKbInput(
  plan: NormalizedPlan,
  options?: {
    storyPrefix?: string
    planType?: string
    sourceFile?: string
    parentPlanSlug?: string
  },
): KbPlanInput {
  const rawContent = generateMarkdown(plan)

  return KbPlanInputSchema.parse({
    plan_slug: plan.planSlug,
    title: plan.title,
    raw_content: rawContent,
    summary: plan.summary || undefined,
    plan_type: options?.planType ?? 'feature',
    status: 'draft' as const,
    story_prefix: options?.storyPrefix,
    priority: mapPriority(plan.priority),
    tags: plan.tags.length > 0 ? plan.tags : undefined,
    dependencies: plan.dependencies.length > 0 ? plan.dependencies : undefined,
    source_file: options?.sourceFile,
    parent_plan_slug: options?.parentPlanSlug,
  })
}

// ============================================================================
// Side-Effectful Persistence
// ============================================================================

/**
 * Persist a NormalizedPlan as a draft in the KB.
 *
 * Converts to KbPlanInput, then calls the injectable kb_upsert_plan function.
 * Returns the plan_slug on success, null on failure.
 *
 * AC-8: lifecycle_status='draft' is the refinement queue entry mechanism.
 * BullMQ dispatch is explicitly out of scope.
 *
 * @param plan - Validated NormalizedPlan
 * @param kbUpsertPlan - Injectable MCP tool function
 * @param options - Optional overrides for KB persistence
 * @returns plan_slug on success, null on failure
 */
export async function persistDraftPlan(
  plan: NormalizedPlan,
  kbUpsertPlan: KbUpsertPlanFn,
  options?: {
    storyPrefix?: string
    planType?: string
    sourceFile?: string
    parentPlanSlug?: string
  },
): Promise<string | null> {
  const kbInput = normalizedPlanToKbInput(plan, options)

  const result = await kbUpsertPlan(kbInput)

  if (!result) {
    return null
  }

  return result.plan_slug
}

// ============================================================================
// Markdown Generation
// ============================================================================

/**
 * Generate a markdown representation of a NormalizedPlan.
 * Used as raw_content for KB persistence.
 *
 * Security note: Content is stored as markdown in KB raw_content.
 * No HTML escaping is performed — consumers rendering as HTML must
 * sanitize the output. This is consistent with all other KB raw_content.
 */
function generateMarkdown(plan: NormalizedPlan): string {
  const sections: string[] = []

  sections.push(`# ${plan.title}`)

  if (plan.summary) {
    sections.push(`\n${plan.summary}`)
  }

  if (plan.problemStatement) {
    sections.push(`\n## Problem Statement\n\n${plan.problemStatement}`)
  }

  if (plan.proposedSolution) {
    sections.push(`\n## Proposed Solution\n\n${plan.proposedSolution}`)
  }

  if (plan.goals.length > 0) {
    sections.push(`\n## Goals\n\n${plan.goals.map(g => `- ${g}`).join('\n')}`)
  }

  if (plan.nonGoals.length > 0) {
    sections.push(`\n## Non-Goals\n\n${plan.nonGoals.map(g => `- ${g}`).join('\n')}`)
  }

  if (plan.flows.length > 0) {
    const flowsMarkdown = plan.flows
      .map(flow => {
        const stepsStr = flow.steps.map(s => `   ${s.index}. ${s.description}`).join('\n')
        return [
          `### ${flow.name}`,
          '',
          `- **Actor**: ${flow.actor}`,
          `- **Trigger**: ${flow.trigger}`,
          `- **Steps**:`,
          stepsStr,
          `- **Success Outcome**: ${flow.successOutcome}`,
        ].join('\n')
      })
      .join('\n\n')
    sections.push(`\n## User Flows\n\n${flowsMarkdown}`)
  }

  if (plan.constraints.length > 0) {
    sections.push(`\n## Constraints\n\n${plan.constraints.map(c => `- ${c}`).join('\n')}`)
  }

  if (plan.dependencies.length > 0) {
    sections.push(`\n## Dependencies\n\n${plan.dependencies.map(d => `- ${d}`).join('\n')}`)
  }

  if (plan.openQuestions.length > 0) {
    sections.push(`\n## Open Questions\n\n${plan.openQuestions.map(q => `- ${q}`).join('\n')}`)
  }

  if (plan.warnings.length > 0) {
    sections.push(`\n## Warnings\n\n${plan.warnings.map(w => `- ${w}`).join('\n')}`)
  }

  return sections.join('\n')
}
