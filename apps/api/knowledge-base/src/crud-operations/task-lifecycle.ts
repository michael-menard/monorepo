/**
 * Task Lifecycle Operations (KBMEM-019, KBMEM-020)
 *
 * Implements task-to-story promotion and stale task cleanup.
 *
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { z } from 'zod'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, and, sql, lt, or, isNull } from 'drizzle-orm'
import type * as schema from '../db/schema.js'
import { tasks } from '../db/schema.js'

// ============================================================================
// Stale Task Thresholds (KBMEM-020)
// ============================================================================

/**
 * Thresholds for stale task detection.
 */
export const STALE_THRESHOLDS = {
  /** Open tasks older than this are considered stale */
  open_days: 30,
  /** Triaged tasks older than this are considered stale */
  triaged_days: 60,
  /** Blocked tasks older than this need attention */
  blocked_days: 14,
} as const

// ============================================================================
// Task Promotion Schema (KBMEM-019)
// ============================================================================

/**
 * Promotion criteria for task-to-story.
 *
 * Default criteria:
 * - Status must be 'triaged'
 * - Priority must be P0 or P1
 * - Estimated effort must be M or larger
 */
export const PROMOTION_CRITERIA = {
  allowed_statuses: ['triaged', 'in_progress'] as const,
  allowed_priorities: ['p0', 'p1'] as const,
  allowed_efforts: ['m', 'l', 'xl'] as const,
} as const

/**
 * Schema for kb_promote_task input.
 */
export const KbPromoteTaskInputSchema = z.object({
  /** Task ID to promote */
  task_id: z.string().uuid(),

  /** Story ID to link the promoted task to */
  promoted_to_story: z.string().min(1, 'Story ID cannot be empty'),

  /** Override promotion criteria (default: false) */
  force: z.boolean().optional().default(false),
})

export type KbPromoteTaskInput = z.infer<typeof KbPromoteTaskInputSchema>

/**
 * Result of task promotion.
 */
export interface PromoteTaskResult {
  success: boolean
  task_id: string
  promoted_to_story: string | null
  /** Whether criteria were overridden */
  forced: boolean
  /** Warnings about promotion */
  warnings: string[]
  message: string
}

/**
 * Schema for kb_list_promotable_tasks input.
 */
export const KbListPromotableTasksInputSchema = z.object({
  /** Limit results (default: 20) */
  limit: z.number().int().positive().max(100).optional().default(20),

  /** Include tasks not meeting full criteria (default: false) */
  include_partial_matches: z.boolean().optional().default(false),
})

export type KbListPromotableTasksInput = z.infer<typeof KbListPromotableTasksInputSchema>

/**
 * Promotable task info.
 */
export interface PromotableTask {
  id: string
  title: string
  description: string | null
  task_type: string
  priority: string | null
  estimated_effort: string | null
  status: string
  /** Whether task meets all promotion criteria */
  meets_all_criteria: boolean
  /** Which criteria are met */
  criteria_met: {
    status: boolean
    priority: boolean
    effort: boolean
  }
  source_story_id: string | null
  tags: string[] | null
}

/**
 * Result of listing promotable tasks.
 */
export interface ListPromotableTasksResult {
  success: boolean
  tasks: PromotableTask[]
  total: number
  message: string
}

// ============================================================================
// Stale Task Schema (KBMEM-020)
// ============================================================================

/**
 * Schema for kb_cleanup_stale_tasks input.
 */
export const KbCleanupStaleTasksInputSchema = z.object({
  /** Dry run - list but don't update (default: true for safety) */
  dry_run: z.boolean().optional().default(true),

  /** Auto-close low priority stale tasks (p3) (default: false) */
  auto_close_low_priority: z.boolean().optional().default(false),

  /** Custom threshold for open tasks (days) */
  open_threshold_days: z.number().int().positive().optional(),

  /** Custom threshold for triaged tasks (days) */
  triaged_threshold_days: z.number().int().positive().optional(),

  /** Custom threshold for blocked tasks (days) */
  blocked_threshold_days: z.number().int().positive().optional(),

  /** Limit results (default: 100) */
  limit: z.number().int().positive().max(500).optional().default(100),
})

export type KbCleanupStaleTasksInput = z.infer<typeof KbCleanupStaleTasksInputSchema>

/**
 * Stale task info.
 */
export interface StaleTask {
  id: string
  title: string
  status: string
  priority: string | null
  task_type: string
  created_at: string
  age_days: number
  /** Reason task is considered stale */
  stale_reason: string
  /** Action taken or recommended */
  action: 'closed' | 'needs_attention' | 'no_action'
}

/**
 * Result of stale task cleanup.
 */
export interface CleanupStaleTasksResult {
  success: boolean
  dry_run: boolean
  /** Total stale tasks found */
  total_stale: number
  /** Tasks auto-closed (if not dry run) */
  closed: number
  /** Tasks needing attention (high priority or blocked) */
  needs_attention: number
  /** Stale tasks detail */
  tasks: StaleTask[]
  /** Thresholds used */
  thresholds: {
    open_days: number
    triaged_days: number
    blocked_days: number
  }
  message: string
}

// ============================================================================
// Dependencies
// ============================================================================

export interface TaskLifecycleDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Task Promotion (KBMEM-019)
// ============================================================================

/**
 * Promote a task to a story.
 *
 * @param input - Promotion parameters
 * @param deps - Database dependency
 * @returns Promotion result
 */
export async function kb_promote_task(
  input: KbPromoteTaskInput,
  deps: TaskLifecycleDeps,
): Promise<PromoteTaskResult> {
  const validated = KbPromoteTaskInputSchema.parse(input)
  const { db } = deps

  // Fetch the task
  const taskResults = await db.select().from(tasks).where(eq(tasks.id, validated.task_id)).limit(1)

  const task = taskResults[0]

  if (!task) {
    return {
      success: false,
      task_id: validated.task_id,
      promoted_to_story: null,
      forced: validated.force,
      warnings: [],
      message: `Task not found: ${validated.task_id}`,
    }
  }

  // Check if already promoted
  if (task.promotedToStory) {
    return {
      success: false,
      task_id: validated.task_id,
      promoted_to_story: task.promotedToStory,
      forced: validated.force,
      warnings: [],
      message: `Task already promoted to story: ${task.promotedToStory}`,
    }
  }

  // Check promotion criteria
  const warnings: string[] = []

  const statusOk = PROMOTION_CRITERIA.allowed_statuses.includes(
    task.status as (typeof PROMOTION_CRITERIA.allowed_statuses)[number],
  )
  if (!statusOk) {
    warnings.push(
      `Status '${task.status}' is not in allowed list: ${PROMOTION_CRITERIA.allowed_statuses.join(', ')}`,
    )
  }

  const priorityOk =
    task.priority &&
    PROMOTION_CRITERIA.allowed_priorities.includes(
      task.priority as (typeof PROMOTION_CRITERIA.allowed_priorities)[number],
    )
  if (!priorityOk) {
    warnings.push(
      `Priority '${task.priority ?? 'none'}' is not in allowed list: ${PROMOTION_CRITERIA.allowed_priorities.join(', ')}`,
    )
  }

  const effortOk =
    task.estimatedEffort &&
    PROMOTION_CRITERIA.allowed_efforts.includes(
      task.estimatedEffort as (typeof PROMOTION_CRITERIA.allowed_efforts)[number],
    )
  if (!effortOk) {
    warnings.push(
      `Effort '${task.estimatedEffort ?? 'none'}' is not in allowed list: ${PROMOTION_CRITERIA.allowed_efforts.join(', ')}`,
    )
  }

  const meetsCriteria = statusOk && priorityOk && effortOk

  if (!meetsCriteria && !validated.force) {
    return {
      success: false,
      task_id: validated.task_id,
      promoted_to_story: null,
      forced: false,
      warnings,
      message: `Task does not meet promotion criteria. Use force=true to override.`,
    }
  }

  // Promote the task
  await db
    .update(tasks)
    .set({
      status: 'promoted',
      promotedToStory: validated.promoted_to_story,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, validated.task_id))

  return {
    success: true,
    task_id: validated.task_id,
    promoted_to_story: validated.promoted_to_story,
    forced: validated.force && !meetsCriteria,
    warnings,
    message: meetsCriteria
      ? `Task promoted to story ${validated.promoted_to_story}`
      : `Task promoted to story ${validated.promoted_to_story} (criteria overridden)`,
  }
}

/**
 * List tasks that are candidates for promotion.
 *
 * @param input - List parameters
 * @param deps - Database dependency
 * @returns Promotable tasks
 */
export async function kb_list_promotable_tasks(
  input: KbListPromotableTasksInput,
  deps: TaskLifecycleDeps,
): Promise<ListPromotableTasksResult> {
  const validated = KbListPromotableTasksInputSchema.parse(input)
  const { db } = deps

  // Build query - fetch tasks that might be promotable
  const query = db
    .select()
    .from(tasks)
    .where(
      and(
        // Not already promoted or done
        sql`${tasks.status} NOT IN ('promoted', 'done', 'wont_do')`,
        // Not blocked
        sql`${tasks.status} != 'blocked'`,
        // Has no existing promotion
        isNull(tasks.promotedToStory),
      ),
    )
    .limit(validated.limit * 2) // Fetch extra to filter

  const results = await query

  const promotableTasks: PromotableTask[] = []

  for (const task of results) {
    const statusOk = PROMOTION_CRITERIA.allowed_statuses.includes(
      task.status as (typeof PROMOTION_CRITERIA.allowed_statuses)[number],
    )
    const priorityOk =
      task.priority !== null &&
      PROMOTION_CRITERIA.allowed_priorities.includes(
        task.priority as (typeof PROMOTION_CRITERIA.allowed_priorities)[number],
      )
    const effortOk =
      task.estimatedEffort !== null &&
      PROMOTION_CRITERIA.allowed_efforts.includes(
        task.estimatedEffort as (typeof PROMOTION_CRITERIA.allowed_efforts)[number],
      )

    const meetsAllCriteria = statusOk && priorityOk && effortOk

    // Skip if not meeting criteria and we're not including partial matches
    if (!meetsAllCriteria && !validated.include_partial_matches) {
      continue
    }

    // Skip if doesn't meet any criteria (even for partial matches)
    if (!statusOk && !priorityOk && !effortOk) {
      continue
    }

    promotableTasks.push({
      id: task.id,
      title: task.title,
      description: task.description,
      task_type: task.taskType,
      priority: task.priority,
      estimated_effort: task.estimatedEffort,
      status: task.status,
      meets_all_criteria: meetsAllCriteria,
      criteria_met: {
        status: statusOk,
        priority: priorityOk,
        effort: effortOk,
      },
      source_story_id: task.sourceStoryId,
      tags: task.tags,
    })

    if (promotableTasks.length >= validated.limit) {
      break
    }
  }

  return {
    success: true,
    tasks: promotableTasks,
    total: promotableTasks.length,
    message: `Found ${promotableTasks.length} promotable tasks`,
  }
}

// ============================================================================
// Stale Task Cleanup (KBMEM-020)
// ============================================================================

/**
 * Find and optionally cleanup stale tasks.
 *
 * @param input - Cleanup parameters
 * @param deps - Database dependency
 * @returns Cleanup result
 */
export async function kb_cleanup_stale_tasks(
  input: KbCleanupStaleTasksInput,
  deps: TaskLifecycleDeps,
): Promise<CleanupStaleTasksResult> {
  const validated = KbCleanupStaleTasksInputSchema.parse(input)
  const { db } = deps

  const thresholds = {
    open_days: validated.open_threshold_days ?? STALE_THRESHOLDS.open_days,
    triaged_days: validated.triaged_threshold_days ?? STALE_THRESHOLDS.triaged_days,
    blocked_days: validated.blocked_threshold_days ?? STALE_THRESHOLDS.blocked_days,
  }

  const now = new Date()
  const openCutoff = new Date(now.getTime() - thresholds.open_days * 24 * 60 * 60 * 1000)
  const triagedCutoff = new Date(now.getTime() - thresholds.triaged_days * 24 * 60 * 60 * 1000)
  const blockedCutoff = new Date(now.getTime() - thresholds.blocked_days * 24 * 60 * 60 * 1000)

  // Find stale tasks
  const staleTasks = await db
    .select()
    .from(tasks)
    .where(
      or(
        // Open tasks older than threshold
        and(eq(tasks.status, 'open'), lt(tasks.createdAt, openCutoff)),
        // Triaged tasks older than threshold
        and(eq(tasks.status, 'triaged'), lt(tasks.createdAt, triagedCutoff)),
        // Blocked tasks older than threshold
        and(eq(tasks.status, 'blocked'), lt(tasks.createdAt, blockedCutoff)),
      ),
    )
    .limit(validated.limit)

  const staleTaskResults: StaleTask[] = []
  let closed = 0
  let needsAttention = 0

  for (const task of staleTasks) {
    const ageDays = Math.floor((now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24))

    let staleReason = ''
    if (task.status === 'open') {
      staleReason = `Open for ${ageDays} days (threshold: ${thresholds.open_days})`
    } else if (task.status === 'triaged') {
      staleReason = `Triaged for ${ageDays} days (threshold: ${thresholds.triaged_days})`
    } else if (task.status === 'blocked') {
      staleReason = `Blocked for ${ageDays} days (threshold: ${thresholds.blocked_days})`
    }

    // Determine action
    let action: 'closed' | 'needs_attention' | 'no_action' = 'no_action'

    // High priority or blocked tasks need attention
    const isHighPriority = task.priority === 'p0' || task.priority === 'p1'
    const isBlocked = task.status === 'blocked'

    if (isHighPriority || isBlocked) {
      action = 'needs_attention'
      needsAttention++
    } else if (task.priority === 'p3' && validated.auto_close_low_priority && !validated.dry_run) {
      // Auto-close low priority tasks
      await db
        .update(tasks)
        .set({
          status: 'wont_do',
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, task.id))

      action = 'closed'
      closed++
    } else if (task.priority === 'p3' && validated.auto_close_low_priority) {
      // Would close if not dry run
      action = 'closed'
      closed++
    }

    staleTaskResults.push({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      task_type: task.taskType,
      created_at: task.createdAt.toISOString(),
      age_days: ageDays,
      stale_reason: staleReason,
      action,
    })
  }

  return {
    success: true,
    dry_run: validated.dry_run,
    total_stale: staleTasks.length,
    closed,
    needs_attention: needsAttention,
    tasks: staleTaskResults,
    thresholds,
    message: validated.dry_run
      ? `Found ${staleTasks.length} stale tasks (dry run, no changes made)`
      : `Found ${staleTasks.length} stale tasks, ${closed} closed, ${needsAttention} need attention`,
  }
}
