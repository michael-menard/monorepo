/**
 * Task CRUD Operations (Bucket C - Task Backlog)
 *
 * Operations for managing tasks discovered during story implementation.
 * Tasks can be follow-ups, bugs, improvements, tech debt, or feature ideas.
 *
 * @see KBMEM-005 for implementation requirements
 * @see plans/future/kb-memory-architecture/PLAN.md
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { eq, desc, and, sql, lt } from 'drizzle-orm'
import { z } from 'zod'
import { tasks } from '../db/schema.js'
import type * as schema from '../db/schema.js'
import {
  TaskTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  TaskEffortSchema,
} from '../__types__/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Schema for kb_add_task input.
 */
export const KbAddTaskInputSchema = z.object({
  /** Task title (required) */
  title: z.string().min(1, 'Title cannot be empty').max(500, 'Title cannot exceed 500 characters'),

  /** Detailed description (optional) */
  description: z
    .string()
    .max(10000, 'Description cannot exceed 10000 characters')
    .optional()
    .nullable(),

  /** Story where this task was discovered */
  source_story_id: z.string().optional().nullable(),

  /** Workflow phase when discovered (impl, review, qa) */
  source_phase: z.string().optional().nullable(),

  /** Agent that created this task */
  source_agent: z.string().optional().nullable(),

  /** Type of task (required) */
  task_type: TaskTypeSchema,

  /** Priority level (optional, set during triage) */
  priority: TaskPrioritySchema.optional().nullable(),

  /** Tags for categorization */
  tags: z.array(z.string()).optional().nullable(),

  /** Effort estimate */
  estimated_effort: TaskEffortSchema.optional().nullable(),
})

export type KbAddTaskInput = z.infer<typeof KbAddTaskInputSchema>

/**
 * Schema for kb_get_task input.
 */
export const KbGetTaskInputSchema = z.object({
  /** UUID of the task to retrieve */
  id: z.string().uuid('Invalid UUID format'),
})

export type KbGetTaskInput = z.infer<typeof KbGetTaskInputSchema>

/**
 * Schema for kb_update_task input.
 */
export const KbUpdateTaskInputSchema = z
  .object({
    /** UUID of the task to update */
    id: z.string().uuid('Invalid UUID format'),

    /** New title */
    title: z.string().min(1).max(500).optional(),

    /** New description (null clears, undefined leaves unchanged) */
    description: z.string().max(10000).optional().nullable(),

    /** New priority */
    priority: TaskPrioritySchema.optional().nullable(),

    /** New status */
    status: TaskStatusSchema.optional(),

    /** Task this one is blocked by */
    blocked_by: z.string().uuid().optional().nullable(),

    /** Related KB entry IDs */
    related_kb_entries: z.array(z.string().uuid()).optional().nullable(),

    /** Story ID if promoted */
    promoted_to_story: z.string().optional().nullable(),

    /** New tags (null clears, undefined leaves unchanged) */
    tags: z.array(z.string()).optional().nullable(),

    /** New effort estimate */
    estimated_effort: TaskEffortSchema.optional().nullable(),
  })
  .refine(
    data =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.priority !== undefined ||
      data.status !== undefined ||
      data.blocked_by !== undefined ||
      data.related_kb_entries !== undefined ||
      data.promoted_to_story !== undefined ||
      data.tags !== undefined ||
      data.estimated_effort !== undefined,
    {
      message: 'At least one field must be provided for update',
    },
  )

export type KbUpdateTaskInput = z.infer<typeof KbUpdateTaskInputSchema>

/**
 * Schema for kb_list_tasks input.
 */
export const KbListTasksInputSchema = z
  .object({
    /** Filter by status */
    status: TaskStatusSchema.optional(),

    /** Filter by task type */
    task_type: TaskTypeSchema.optional(),

    /** Filter by priority */
    priority: TaskPrioritySchema.optional(),

    /** Filter by source story */
    source_story_id: z.string().optional(),

    /** Filter by tags (ANY match) */
    tags: z.array(z.string()).optional(),

    /** Filter stale tasks (open for more than N days) */
    stale_days: z.number().int().positive().optional(),

    /** Include only blocked tasks */
    blocked_only: z.boolean().optional(),

    /** Maximum number of results (1-100, default 20) */
    limit: z.number().int().positive().max(100).default(20),

    /** Offset for pagination */
    offset: z.number().int().min(0).default(0),
  })
  .optional()

export type KbListTasksInput = z.infer<typeof KbListTasksInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface TaskOperationsDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Operations
// ============================================================================

/**
 * Add a new task to the backlog.
 *
 * @param input - Task data
 * @param deps - Database dependency
 * @returns UUID of created task
 */
export async function kb_add_task(
  input: KbAddTaskInput,
  deps: TaskOperationsDeps,
): Promise<string> {
  const validatedInput = KbAddTaskInputSchema.parse(input)
  const { db } = deps

  const now = new Date()

  const result = await db
    .insert(tasks)
    .values({
      title: validatedInput.title,
      description: validatedInput.description ?? null,
      sourceStoryId: validatedInput.source_story_id ?? null,
      sourcePhase: validatedInput.source_phase ?? null,
      sourceAgent: validatedInput.source_agent ?? null,
      taskType: validatedInput.task_type,
      priority: validatedInput.priority ?? null,
      status: 'open',
      tags: validatedInput.tags ?? null,
      estimatedEffort: validatedInput.estimated_effort ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: tasks.id })

  const id = result[0].id

  logger.info('Task created', {
    id,
    taskType: validatedInput.task_type,
    sourceStoryId: validatedInput.source_story_id,
  })

  return id
}

/**
 * Get a task by ID.
 *
 * @param input - Task ID
 * @param deps - Database dependency
 * @returns Task or null if not found
 */
export async function kb_get_task(
  input: KbGetTaskInput,
  deps: TaskOperationsDeps,
): Promise<schema.Task | null> {
  const validatedInput = KbGetTaskInputSchema.parse(input)
  const { db } = deps

  const result = await db.select().from(tasks).where(eq(tasks.id, validatedInput.id)).limit(1)

  return result[0] ?? null
}

/**
 * Update an existing task.
 *
 * @param input - Task ID and fields to update
 * @param deps - Database dependency
 * @returns Updated task
 * @throws Error if task not found
 */
export async function kb_update_task(
  input: KbUpdateTaskInput,
  deps: TaskOperationsDeps,
): Promise<schema.Task> {
  const validatedInput = KbUpdateTaskInputSchema.parse(input)
  const { db } = deps

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (validatedInput.title !== undefined) {
    updateData.title = validatedInput.title
  }
  if (validatedInput.description !== undefined) {
    updateData.description = validatedInput.description
  }
  if (validatedInput.priority !== undefined) {
    updateData.priority = validatedInput.priority
  }
  if (validatedInput.status !== undefined) {
    updateData.status = validatedInput.status
    // Set completedAt when status changes to done or wont_do
    if (validatedInput.status === 'done' || validatedInput.status === 'wont_do') {
      updateData.completedAt = new Date()
    }
  }
  if (validatedInput.blocked_by !== undefined) {
    updateData.blockedBy = validatedInput.blocked_by
  }
  if (validatedInput.related_kb_entries !== undefined) {
    updateData.relatedKbEntries = validatedInput.related_kb_entries
  }
  if (validatedInput.promoted_to_story !== undefined) {
    updateData.promotedToStory = validatedInput.promoted_to_story
    // Also update status to 'promoted' if promoting
    if (validatedInput.promoted_to_story) {
      updateData.status = 'promoted'
    }
  }
  if (validatedInput.tags !== undefined) {
    updateData.tags = validatedInput.tags
  }
  if (validatedInput.estimated_effort !== undefined) {
    updateData.estimatedEffort = validatedInput.estimated_effort
  }

  const result = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, validatedInput.id))
    .returning()

  if (result.length === 0) {
    throw new Error(`Task not found: ${validatedInput.id}`)
  }

  logger.info('Task updated', {
    id: validatedInput.id,
    fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt'),
  })

  return result[0]
}

/**
 * List tasks with optional filters.
 *
 * @param input - Filter options
 * @param deps - Database dependency
 * @returns Array of tasks
 */
export async function kb_list_tasks(
  input: KbListTasksInput,
  deps: TaskOperationsDeps,
): Promise<{ tasks: schema.Task[]; total: number }> {
  const parsed = KbListTasksInputSchema.parse(input)
  // Handle undefined case (when optional schema receives undefined/null)
  const validatedInput = parsed ?? {
    limit: 20,
    offset: 0,
  }
  const { db } = deps

  const conditions: ReturnType<typeof eq>[] = []

  if (validatedInput.status) {
    conditions.push(eq(tasks.status, validatedInput.status))
  }

  if (validatedInput.task_type) {
    conditions.push(eq(tasks.taskType, validatedInput.task_type))
  }

  if (validatedInput.priority) {
    conditions.push(eq(tasks.priority, validatedInput.priority))
  }

  if (validatedInput.source_story_id) {
    conditions.push(eq(tasks.sourceStoryId, validatedInput.source_story_id))
  }

  if (validatedInput.tags && validatedInput.tags.length > 0) {
    // ANY tag match using PostgreSQL array overlap
    conditions.push(sql`${tasks.tags} && ${validatedInput.tags}`)
  }

  if (validatedInput.stale_days) {
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - validatedInput.stale_days)
    const staleCondition = and(eq(tasks.status, 'open'), lt(tasks.createdAt, staleDate))
    if (staleCondition) {
      conditions.push(staleCondition)
    }
  }

  if (validatedInput.blocked_only) {
    conditions.push(sql`${tasks.blockedBy} IS NOT NULL`)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(whereClause)

  const total = countResult[0]?.count ?? 0

  // Get paginated results
  const result = await db
    .select()
    .from(tasks)
    .where(whereClause)
    .orderBy(desc(tasks.createdAt))
    .limit(validatedInput.limit ?? 20)
    .offset(validatedInput.offset ?? 0)

  return { tasks: result, total }
}
