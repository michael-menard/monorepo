/**
 * IntakePlanDraftSchema
 *
 * Canonical intermediate type between skill session output
 * (po-brainstorm-interview, po-existing-plan-interview) and
 * the NormalizedPlan used by the plan-refinement graph.
 *
 * Both adapter functions accept IntakePlanDraft as their typed input.
 * This resolves the untyped input contract gap (AC-7).
 *
 * @see APRS-5010 AC-7
 */

import { z } from 'zod'

// ============================================================================
// Intake Flow Schema (simplified skill output shape)
// ============================================================================

/**
 * A flow as captured during a PO interview session.
 * Simpler than FlowSchema — no source/confidence/status fields.
 * Those are added by the adapter during conversion.
 */
export const IntakeFlowSchema = z.object({
  /** Human-readable name for the flow */
  name: z.string().min(1),
  /** Primary actor performing this flow */
  actor: z.string().min(1),
  /** What triggers this flow */
  trigger: z.string().min(1),
  /** Ordered step descriptions */
  steps: z.array(z.string()).default([]),
  /** Expected outcome when flow completes successfully */
  successOutcome: z.string().default(''),
})

export type IntakeFlow = z.infer<typeof IntakeFlowSchema>

// ============================================================================
// IntakePlanDraft Schema
// ============================================================================

/**
 * Structured output from a PO interview skill session.
 * Captures all fields both brainstorm and existing-plan skills can populate.
 */
export const IntakePlanDraftSchema = z.object({
  /** Plan title */
  title: z.string().min(1),
  /** Short summary / feature summary */
  summary: z.string().default(''),
  /** Problem statement */
  problemStatement: z.string().default(''),
  /** Proposed solution */
  proposedSolution: z.string().default(''),
  /** Goals */
  goals: z.array(z.string()).default([]),
  /** Non-goals / out of scope */
  nonGoals: z.array(z.string()).default([]),
  /** Minimum viable path (captured for raw_content; not in NormalizedPlanSchema) */
  minimumPath: z.string().default(''),
  /** User flows extracted during interview */
  flows: z.array(IntakeFlowSchema).default([]),
  /** Acceptance criteria (captured for raw_content; not in NormalizedPlanSchema) */
  acceptanceCriteria: z.array(z.string()).default([]),
  /** Definition of done (captured for raw_content; not in NormalizedPlanSchema) */
  definitionOfDone: z.array(z.string()).default([]),
  /** Constraints (domain, architectural, security, etc.) */
  constraints: z.array(z.string()).default([]),
  /** Dependencies on other plans/systems */
  dependencies: z.array(z.string()).default([]),
  /** Open questions requiring stakeholder input */
  openQuestions: z.array(z.string()).default([]),
  /** Warnings and assumptions */
  warnings: z.array(z.string()).default([]),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** Which skill produced this draft */
  sourceSkill: z.enum(['po-brainstorm-interview', 'po-existing-plan-interview']),
  /** Recommendation from existing-plan interview (optional) */
  recommendation: z.enum(['refine-now', 'revise-first', 'blocked']).optional(),
  /** Deferred items (captured for raw_content; not in NormalizedPlanSchema) */
  deferredItems: z.array(z.string()).default([]),
  /** Scope description (captured for raw_content; not in NormalizedPlanSchema) */
  scope: z.string().default(''),
})

export type IntakePlanDraft = z.infer<typeof IntakePlanDraftSchema>
