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
 * PLAN.yaml Schema V2 — subtask-iteration mode
 *
 * Generated when story contains a ## Subtasks section.
 * Each step maps 1:1 to a story subtask (ST-1, ST-2, etc.)
 * and carries enough context for a small-context agent invocation.
 */
export const PlanStepSchemaV2 = z.object({
  id: z.number().int().positive(),
  subtask_id: z.string(), // maps to story subtask identifier (e.g. "ST-1")
  description: z.string(),
  files: z.array(z.string()),
  files_to_read: z.array(z.string()).default([]), // canonical references + prior outputs
  dependencies: z.array(z.number().int()).default([]),
  slice: z.enum(['backend', 'frontend', 'packages', 'infra', 'shared']).optional(),
  verification: z.string(), // command to run after this step completes
  acs_covered: z.array(z.string()).default([]), // AC IDs addressed by this step
})

export type PlanStepV2 = z.infer<typeof PlanStepSchemaV2>

export const PlanSchemaV2 = z.object({
  schema: z.literal(2),
  story_id: z.string(),
  timestamp: z.string().datetime(),
  subtask_source: z.literal('story'), // steps are derived from story subtasks

  // Implementation steps in order — each maps 1:1 to a story subtask
  steps: z.array(PlanStepSchemaV2),

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

export type PlanV2 = z.infer<typeof PlanSchemaV2>

/**
 * Union type covering both schema versions.
 * Use this when parsing a PLAN.yaml of unknown schema version.
 */
export const AnyPlanSchema = z.discriminatedUnion('schema', [PlanSchema, PlanSchemaV2])

export type AnyPlan = z.infer<typeof AnyPlanSchema>

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
