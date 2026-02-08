/**
 * Task Triage Operations (KBMEM-018)
 *
 * Implements task triage with auto-priority heuristics based on
 * task_type, source_phase, and age.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import type * as schema from '../db/schema.js'
import { tasks } from '../db/schema.js'

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Priority heuristics based on task type and source phase.
 *
 * These weights are added together to determine suggested priority.
 */
export const PRIORITY_WEIGHTS = {
  // Task type weights (higher = more important)
  task_type: {
    bug: 20, // Bugs are high priority
    follow_up: 10, // Follow-ups from other stories
    tech_debt: 5, // Tech debt is important but not urgent
    improvement: 3, // Improvements are nice-to-have
    feature_idea: 1, // Feature ideas are lowest priority
  },

  // Source phase weights (later phases = more urgent, issues found in production)
  source_phase: {
    impl: 5, // Issues found during implementation
    review: 10, // Issues found during code review
    qa: 15, // Issues found during QA - high priority
  },

  // Age weights (older = more urgent)
  age_days: {
    threshold_14: 5, // +5 for tasks > 14 days old
    threshold_30: 10, // +10 for tasks > 30 days old
    threshold_60: 15, // +15 for tasks > 60 days old
  },
} as const

/**
 * Priority thresholds for auto-assignment.
 */
export const PRIORITY_THRESHOLDS = {
  p0: 35, // Score >= 35 -> P0 (Critical)
  p1: 25, // Score >= 25 -> P1 (High)
  p2: 15, // Score >= 15 -> P2 (Medium)
  // Otherwise -> P3 (Low)
} as const

/**
 * Schema for kb_triage_tasks input.
 */
export const KbTriageTasksInputSchema = z.object({
  /** Only triage tasks with specific status (default: 'open') */
  status: z
    .enum(['open', 'triaged', 'in_progress', 'blocked', 'done', 'wont_do', 'promoted'])
    .optional()
    .default('open'),

  /** Only triage tasks of specific type */
  task_type: z.enum(['follow_up', 'improvement', 'bug', 'tech_debt', 'feature_idea']).optional(),

  /** Only triage tasks from specific source story */
  source_story_id: z.string().optional(),

  /** Dry run - calculate priorities but don't update (default: false) */
  dry_run: z.boolean().optional().default(false),

  /** Maximum tasks to triage (default: 50) */
  limit: z.number().int().positive().max(200).optional().default(50),
})

export type KbTriageTasksInput = z.infer<typeof KbTriageTasksInputSchema>

/**
 * Triage result for a single task.
 */
export const TriagedTaskSchema = z.object({
  /** Task ID */
  id: z.string().uuid(),
  /** Task title */
  title: z.string(),
  /** Task type */
  task_type: z.string(),
  /** Source phase */
  source_phase: z.string().nullable(),
  /** Calculated priority score */
  score: z.number(),
  /** Current priority */
  current_priority: z.string().nullable(),
  /** Suggested priority based on heuristics */
  suggested_priority: z.enum(['p0', 'p1', 'p2', 'p3']),
  /** Whether priority changed */
  priority_changed: z.boolean(),
  /** Age in days */
  age_days: z.number(),
  /** Score breakdown */
  score_breakdown: z.object({
    task_type_weight: z.number(),
    source_phase_weight: z.number(),
    age_weight: z.number(),
  }),
})

export type TriagedTask = z.infer<typeof TriagedTaskSchema>

/**
 * Result of task triage operation.
 */
export interface TriageTasksResult {
  success: boolean
  /** Number of tasks analyzed */
  analyzed: number
  /** Number of tasks with priority changed */
  updated: number
  /** Number of tasks unchanged */
  unchanged: number
  /** Whether this was a dry run */
  dry_run: boolean
  /** Triaged tasks with details */
  tasks: TriagedTask[]
  /** Summary by suggested priority */
  summary: {
    p0: number
    p1: number
    p2: number
    p3: number
  }
  message: string
}

// ============================================================================
// Dependencies
// ============================================================================

export interface TaskTriageDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Triage Functions
// ============================================================================

/**
 * Calculate priority score for a task.
 *
 * @param task - Task to calculate score for
 * @returns Score breakdown
 */
export function calculatePriorityScore(task: {
  task_type: string
  source_phase: string | null
  created_at: Date
}): {
  score: number
  task_type_weight: number
  source_phase_weight: number
  age_weight: number
  age_days: number
} {
  // Task type weight
  const taskTypeWeight =
    PRIORITY_WEIGHTS.task_type[task.task_type as keyof typeof PRIORITY_WEIGHTS.task_type] ?? 0

  // Source phase weight
  const sourcePhaseWeight = task.source_phase
    ? (PRIORITY_WEIGHTS.source_phase[
        task.source_phase as keyof typeof PRIORITY_WEIGHTS.source_phase
      ] ?? 0)
    : 0

  // Age weight
  const now = new Date()
  const ageDays = Math.floor((now.getTime() - task.created_at.getTime()) / (1000 * 60 * 60 * 24))

  let ageWeight = 0
  if (ageDays >= 60) {
    ageWeight = PRIORITY_WEIGHTS.age_days.threshold_60
  } else if (ageDays >= 30) {
    ageWeight = PRIORITY_WEIGHTS.age_days.threshold_30
  } else if (ageDays >= 14) {
    ageWeight = PRIORITY_WEIGHTS.age_days.threshold_14
  }

  return {
    score: taskTypeWeight + sourcePhaseWeight + ageWeight,
    task_type_weight: taskTypeWeight,
    source_phase_weight: sourcePhaseWeight,
    age_weight: ageWeight,
    age_days: ageDays,
  }
}

/**
 * Convert score to priority.
 *
 * @param score - Priority score
 * @returns Priority value
 */
export function scoreToPriority(score: number): 'p0' | 'p1' | 'p2' | 'p3' {
  if (score >= PRIORITY_THRESHOLDS.p0) return 'p0'
  if (score >= PRIORITY_THRESHOLDS.p1) return 'p1'
  if (score >= PRIORITY_THRESHOLDS.p2) return 'p2'
  return 'p3'
}

/**
 * Triage tasks with auto-priority heuristics.
 *
 * @param input - Triage parameters
 * @param deps - Database dependency
 * @returns Triage results
 */
export async function kb_triage_tasks(
  input: KbTriageTasksInput,
  deps: TaskTriageDeps,
): Promise<TriageTasksResult> {
  const validated = KbTriageTasksInputSchema.parse(input)
  const { db } = deps

  // Build query conditions
  const conditions: ReturnType<typeof eq>[] = []

  conditions.push(eq(tasks.status, validated.status))

  if (validated.task_type) {
    conditions.push(eq(tasks.taskType, validated.task_type))
  }

  if (validated.source_story_id) {
    conditions.push(eq(tasks.sourceStoryId, validated.source_story_id))
  }

  // Fetch tasks to triage
  const tasksToTriage = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      taskType: tasks.taskType,
      sourcePhase: tasks.sourcePhase,
      priority: tasks.priority,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(and(...conditions))
    .limit(validated.limit)

  const triagedTasks: TriagedTask[] = []
  let updated = 0
  let unchanged = 0
  const summary = { p0: 0, p1: 0, p2: 0, p3: 0 }

  for (const task of tasksToTriage) {
    const scoreResult = calculatePriorityScore({
      task_type: task.taskType,
      source_phase: task.sourcePhase,
      created_at: task.createdAt,
    })

    const suggestedPriority = scoreToPriority(scoreResult.score)
    const priorityChanged = task.priority !== suggestedPriority

    // Update priority if changed and not dry run
    if (priorityChanged && !validated.dry_run) {
      await db
        .update(tasks)
        .set({
          priority: suggestedPriority,
          status: 'triaged',
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))
      updated++
    } else if (!priorityChanged) {
      unchanged++
    } else {
      // Dry run with change - counts as would-be-updated
      updated++
    }

    summary[suggestedPriority]++

    triagedTasks.push({
      id: task.id,
      title: task.title,
      task_type: task.taskType,
      source_phase: task.sourcePhase,
      score: scoreResult.score,
      current_priority: task.priority,
      suggested_priority: suggestedPriority,
      priority_changed: priorityChanged,
      age_days: scoreResult.age_days,
      score_breakdown: {
        task_type_weight: scoreResult.task_type_weight,
        source_phase_weight: scoreResult.source_phase_weight,
        age_weight: scoreResult.age_weight,
      },
    })
  }

  return {
    success: true,
    analyzed: tasksToTriage.length,
    updated,
    unchanged,
    dry_run: validated.dry_run,
    tasks: triagedTasks,
    summary,
    message: validated.dry_run
      ? `Analyzed ${tasksToTriage.length} tasks (dry run, no changes made)`
      : `Triaged ${tasksToTriage.length} tasks, ${updated} updated, ${unchanged} unchanged`,
  }
}
