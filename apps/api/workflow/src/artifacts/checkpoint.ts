import { z } from 'zod'

/**
 * CHECKPOINT.yaml Schema
 *
 * Tracks the current phase of story implementation for deterministic resume.
 * Written by each phase leader, read by orchestrator to determine where to resume.
 */

export const PhaseSchema = z.enum([
  'setup',
  'plan',
  'execute',
  'proof',
  'review',
  'fix',
  'qa-setup',
  'qa-verify',
  'qa-complete',
  'qa-completion', // Legacy variant found in existing checkpoints
  'uat-complete', // Legacy variant found in existing checkpoints
  'done',
])

export type Phase = z.infer<typeof PhaseSchema>

export const CheckpointSchema = z
  .object({
    schema: z.literal(1),
    story_id: z.string(),
    feature_dir: z.string(),
    timestamp: z.string().datetime(),

    // Current phase for resume
    current_phase: PhaseSchema,

    // Last successfully completed phase
    last_successful_phase: PhaseSchema.nullable(),

    // Review/fix iteration counter (0 = not started, 1-N = in loop)
    iteration: z.number().int().min(0).default(0),

    // Max iterations before force-continue or block
    max_iterations: z.number().int().min(1).default(3),

    // Gate tracking
    gate: z
      .object({
        decision: z.enum(['PASS', 'BLOCKED', 'OVERRIDE']).nullable(),
        evaluated_at: z.string().datetime().nullable(),
        override_reason: z.string().nullable(),
        readiness_score: z.number().int().min(0).max(100).nullable(),
      })
      .optional(),

    // Resume hints for the next phase
    resume_hints: z
      .object({
        skip_phases: z.array(PhaseSchema).default([]),
        partial_state: z.record(z.unknown()).default({}),
      })
      .optional(),

    // Blocked state
    blocked: z.boolean().default(false),
    blocked_reason: z.string().nullable().optional(),

    // Forced continue tracking
    forced: z.boolean().default(false),
    warnings: z.array(z.string()).default([]),

    // Completion tracking
    completed_at: z.string().datetime().nullable().optional(),

    // Optional fields found in existing checkpoint files (backward compatibility)
    // E2E gate can be string (legacy) or object (structured)
    e2e_gate: z.union([z.string(), z.object({ status: z.string() }).passthrough()]).optional(),

    // QA verdict from manual testing phase
    qa_verdict: z.enum(['PASS', 'FAIL', 'DEFERRED']).optional(),

    // Gen mode flag (found in some checkpoints)
    gen_mode: z.boolean().optional(),

    // Worktree ID associated with this story's implementation (UUID from worktree_register)
    worktree_id: z.string().uuid().optional(),
  })
  .passthrough() // Preserve unknown fields for full backward compatibility

export type Checkpoint = z.infer<typeof CheckpointSchema>

/**
 * Create a new checkpoint for a story
 */
export function createCheckpoint(
  storyId: string,
  featureDir: string,
  initialPhase: Phase = 'setup',
): Checkpoint {
  return {
    schema: 1,
    story_id: storyId,
    feature_dir: featureDir,
    timestamp: new Date().toISOString(),
    current_phase: initialPhase,
    last_successful_phase: null,
    iteration: 0,
    max_iterations: 3,
    blocked: false,
    forced: false,
    warnings: [],
  }
}

/**
 * Update checkpoint after a phase completes successfully
 */
export function advanceCheckpoint(
  checkpoint: Checkpoint,
  completedPhase: Phase,
  nextPhase: Phase,
): Checkpoint {
  return {
    ...checkpoint,
    timestamp: new Date().toISOString(),
    current_phase: nextPhase,
    last_successful_phase: completedPhase,
  }
}
