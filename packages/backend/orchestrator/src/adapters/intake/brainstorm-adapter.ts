/**
 * Brainstorm-to-Plan Adapter
 *
 * Pure function that converts IntakePlanDraft (from po-brainstorm-interview)
 * to NormalizedPlan with field mapping, flow conversion to FlowSchema format,
 * and defaults for empty fields.
 *
 * @see APRS-5010 AC-1, AC-4, AC-6
 */

import {
  NormalizedPlanSchema,
  FlowSchema,
  type NormalizedPlan,
} from '../../state/plan-refinement-state.js'
import type { IntakePlanDraft } from './intake-plan-draft.js'
import { slugify } from './utils.js'

/**
 * Convert an IntakePlanDraft from po-brainstorm-interview to a NormalizedPlan.
 *
 * - Maps all fields from intake schema to normalized schema
 * - Converts IntakeFlow[] to Flow[] (adding source, confidence, status)
 * - Tags the plan with 'source:brainstorm' for provenance (OPP-2)
 * - Generates a planSlug from the title
 *
 * @throws {ZodError} if the resulting plan fails NormalizedPlanSchema validation
 */
export function brainstormToNormalizedPlan(
  draft: IntakePlanDraft,
  planSlug?: string,
): NormalizedPlan {
  const slug = planSlug ?? slugify(draft.title)

  const flows = draft.flows.map((flow, idx) =>
    FlowSchema.parse({
      id: `flow-${idx + 1}`,
      name: flow.name,
      actor: flow.actor,
      trigger: flow.trigger,
      steps: flow.steps.map((desc, stepIdx) => ({
        index: stepIdx + 1,
        description: desc,
      })),
      successOutcome: flow.successOutcome || 'Flow completes successfully',
      source: 'user' as const,
      confidence: 1.0,
      status: 'unconfirmed' as const,
    }),
  )

  const tags = [...draft.tags, 'source:brainstorm']

  return NormalizedPlanSchema.parse({
    planSlug: slug,
    title: draft.title,
    summary: draft.summary,
    problemStatement: draft.problemStatement,
    proposedSolution: draft.proposedSolution,
    goals: draft.goals,
    nonGoals: draft.nonGoals,
    flows,
    openQuestions: draft.openQuestions,
    warnings: draft.warnings,
    constraints: draft.constraints,
    dependencies: draft.dependencies,
    status: 'draft',
    priority: 'medium',
    tags,
  })
}
