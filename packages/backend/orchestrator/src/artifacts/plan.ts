import { z } from 'zod'

/**
 * PLAN.yaml Schema
 *
 * Structured implementation plan that replaces IMPLEMENTATION-PLAN.md.
 * Written by plan leader, read by execute leader.
 */

export const PlanStepSchema = z.object({
  id: z.number().int().positive(),
  description: z.string(),
  files: z.array(z.string()),
  dependencies: z.array(z.number().int()).default([]),
  slice: z.enum(['backend', 'frontend', 'packages', 'infra', 'shared']).optional(),
})

export type PlanStep = z.infer<typeof PlanStepSchema>

export const FileChangeSchema = z.object({
  path: z.string(),
  action: z.enum(['create', 'modify', 'delete']),
  reason: z.string().optional(),
})

export type FileChange = z.infer<typeof FileChangeSchema>

export const CommandSchema = z.object({
  command: z.string(),
  when: z.string(),
  required: z.boolean().default(true),
})

export type Command = z.infer<typeof CommandSchema>

export const AcceptanceCriteriaMapSchema = z.object({
  ac_id: z.string(),
  planned_evidence: z.string(),
  evidence_type: z.enum(['test', 'http', 'manual', 'command', 'file']).default('test'),
})

export type AcceptanceCriteriaMap = z.infer<typeof AcceptanceCriteriaMapSchema>

export const PlanSchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),

  // Implementation steps in order
  steps: z.array(PlanStepSchema),

  // Files that will be created/modified/deleted
  files_to_change: z.array(FileChangeSchema),

  // Commands to run during/after implementation
  commands_to_run: z.array(CommandSchema),

  // Mapping of ACs to planned evidence
  acceptance_criteria_map: z.array(AcceptanceCriteriaMapSchema),

  // Architectural decisions made during planning
  architectural_decisions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        decision: z.string(),
        rationale: z.string().optional(),
        decided_by: z.enum(['user', 'agent', 'default']).default('agent'),
      }),
    )
    .default([]),

  // Estimated complexity
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),

  // Notes from planning
  notes: z.array(z.string()).default([]),
})

export type Plan = z.infer<typeof PlanSchema>

/**
 * Create an empty plan for a story
 */
export function createPlan(storyId: string): Plan {
  return {
    schema: 1,
    story_id: storyId,
    timestamp: new Date().toISOString(),
    steps: [],
    files_to_change: [],
    commands_to_run: [],
    acceptance_criteria_map: [],
    architectural_decisions: [],
    notes: [],
  }
}
