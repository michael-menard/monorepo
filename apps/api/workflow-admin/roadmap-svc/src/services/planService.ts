import { z } from 'zod'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { plans, type Plan } from '@repo/knowledge-base/db'
import { eq, desc, sql, inArray, type SQL, and, or, like, asc } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgSchema,
} from 'drizzle-orm/pg-core'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const database = drizzle(pool)

const workflowSchema = pgSchema('workflow')

export const stories = workflowSchema.table('stories', {
  storyId: text('story_id').notNull(),
  feature: text('feature').notNull(),
  state: text('state').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority'),
  blockedReason: text('blocked_reason'),
  blockedByStory: text('blocked_by_story'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fileHash: text('file_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

const planStoryLinks = pgTable(
  'plan_story_links',
  {
    id: uuid('id').defaultRandom().notNull(),
    planSlug: text('plan_slug').notNull(),
    storyId: text('story_id').notNull(),
    linkType: text('link_type').default('mentioned').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table: {
    planSlug: ReturnType<typeof text>
    storyId: ReturnType<typeof text>
  }) => ({
    planSlugIdx: index('idx_plan_story_links_plan_slug').on(table.planSlug),
    storyIdIdx: index('idx_plan_story_links_story_id').on(table.storyId),
  }),
)

export const PlanUpdateInputSchema = z.object({
  title: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  planType: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  storyPrefix: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  priority: z.string().nullable().optional(),
  priorityOrder: z.number().nullable().optional(),
})

export type PlanUpdateInput = z.infer<typeof PlanUpdateInputSchema>

export const PlanListParamsSchema = z.object({
  page: z.number(),
  limit: z.number(),
  status: z.array(z.string()).optional(),
  planType: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  excludeCompleted: z.boolean().optional(),
  search: z.string().optional(),
})

export type PlanListParams = z.infer<typeof PlanListParamsSchema>

export const PlanListResultSchema = z.object({
  data: z.array(z.record(z.unknown())),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// PlanListResult uses Plan[] from drizzle which is not a Zod type, so we extend the inferred shape
export type PlanListResult = Omit<z.infer<typeof PlanListResultSchema>, 'data'> & {
  data: Plan[]
}

export async function getPlans(params: PlanListParams): Promise<PlanListResult> {
  const { page, limit, status, planType, priority, tags, excludeCompleted = true, search } = params
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  if (status && status.length > 0) {
    conditions.push(inArray(plans.status, status))
  }

  if (planType && planType.length > 0) {
    conditions.push(inArray(plans.planType, planType))
  }

  if (priority && priority.length > 0) {
    conditions.push(inArray(plans.priority, priority))
  }

  if (tags && tags.length > 0) {
    conditions.push(sql`${plans.tags} && ${sql`{${tags.join(',')}}`}`)
  }

  if (excludeCompleted) {
    conditions.push(sql`${plans.status} NOT IN ('implemented', 'superseded', 'archived')`)
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`
    conditions.push(or(like(plans.title, searchTerm), like(plans.summary, searchTerm)) as SQL)
  }

  const whereClause =
    conditions.length > 0
      ? ((conditions.length === 1
          ? conditions[0]
          : conditions.reduce((acc, c) => and(acc, c) as SQL, conditions[0])) as SQL)
      : undefined

  const countResult = await database
    .select({ count: sql<number>`count(*)` })
    .from(plans)
    .where(whereClause)

  const total = countResult[0]?.count || 0

  const dataResult = await database
    .select()
    .from(plans)
    .where(whereClause)
    .orderBy(
      asc(plans.priority),
      asc(sql`coalesce(${plans.priorityOrder}, 9999)`),
      desc(plans.createdAt),
    )
    .limit(limit)
    .offset(offset)

  return {
    data: dataResult as Plan[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export const PlanWithDetailsSchema = z.object({
  id: z.string(),
  planSlug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  planType: z.string().nullable(),
  status: z.string().nullable(),
  storyPrefix: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  priority: z.string().nullable(),
  priorityOrder: z.number().nullable(),
  rawContent: z.string().nullable(),
  sections: z.unknown(),
  contentHash: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type PlanWithDetails = z.infer<typeof PlanWithDetailsSchema>

export async function getPlanBySlug(slug: string): Promise<PlanWithDetails | null> {
  const result = await database.select().from(plans).where(eq(plans.planSlug, slug)).limit(1)

  if (result.length === 0) {
    return null
  }

  const plan = result[0]

  return {
    id: plan.id,
    planSlug: plan.planSlug,
    title: plan.title,
    summary: plan.summary,
    planType: plan.planType,
    status: plan.status,
    storyPrefix: plan.storyPrefix,
    tags: plan.tags,
    priority: plan.priority,
    priorityOrder: plan.priorityOrder,
    rawContent: plan.rawContent,
    sections: plan.sections,
    contentHash: plan.contentHash,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

export const ReorderItemSchema = z.object({
  id: z.string(),
  priorityOrder: z.number(),
})

export type ReorderItem = z.infer<typeof ReorderItemSchema>

export async function reorderPlansPriority(priority: string, items: ReorderItem[]): Promise<void> {
  const updates = items.map(item =>
    database
      .update(plans)
      .set({ priorityOrder: item.priorityOrder, updatedAt: new Date() })
      .where(eq(plans.id, item.id))
      .returning({ id: plans.id }),
  )

  await Promise.all(updates)
}

export async function updatePlan(
  slug: string,
  input: PlanUpdateInput,
): Promise<PlanWithDetails | null> {
  const existingPlan = await database.select().from(plans).where(eq(plans.planSlug, slug)).limit(1)

  if (existingPlan.length === 0) {
    return null
  }

  const plan = existingPlan[0]

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.title !== undefined) {
    updateData.title = input.title
  }
  if (input.summary !== undefined) {
    updateData.summary = input.summary
  }
  if (input.planType !== undefined) {
    updateData.planType = input.planType
  }
  if (input.status !== undefined) {
    updateData.status = input.status
  }
  if (input.storyPrefix !== undefined) {
    updateData.storyPrefix = input.storyPrefix
  }
  if (input.tags !== undefined) {
    updateData.tags = input.tags
  }
  if (input.priority !== undefined) {
    updateData.priority = input.priority
  }
  if (input.priorityOrder !== undefined) {
    updateData.priorityOrder = input.priorityOrder
  }

  await database.update(plans).set(updateData).where(eq(plans.id, plan.id))

  return getPlanBySlug(slug)
}

export const PlanStorySchema = z.object({
  storyId: z.string(),
  title: z.string().nullable(),
  state: z.string().nullable(),
  priority: z.string().nullable(),
  currentPhase: z.string().nullable(),
  phaseStatus: z.string().nullable(),
  isBlocked: z.boolean(),
  hasBlockers: z.boolean(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
})

export type PlanStory = z.infer<typeof PlanStorySchema>

const LinkedStoryRowSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  state: z.string(),
  priority: z.string().nullable(),
  blockedByStory: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
type LinkedStoryRow = z.infer<typeof LinkedStoryRowSchema>

export async function getStoriesByPlanSlug(slug: string): Promise<PlanStory[]> {
  const linkedStories = await database
    .select({
      storyId: stories.storyId,
      title: stories.title,
      state: stories.state,
      priority: stories.priority,
      blockedByStory: stories.blockedByStory,
      createdAt: stories.createdAt,
      updatedAt: stories.updatedAt,
    })
    .from(planStoryLinks)
    .innerJoin(stories, eq(planStoryLinks.storyId, stories.storyId))
    .where(eq(planStoryLinks.planSlug, slug))
    .orderBy(asc(stories.priority), desc(stories.createdAt))

  return linkedStories.map((story: LinkedStoryRow) => ({
    storyId: story.storyId,
    title: story.title,
    state: story.state,
    priority: story.priority,
    currentPhase: null,
    phaseStatus: null,
    isBlocked: story.state === 'blocked',
    hasBlockers: !!story.blockedByStory,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  })) as PlanStory[]
}

export const StoryDetailsSchema = z.object({
  storyId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  feature: z.string(),
  priority: z.string().nullable(),
  state: z.string(),
  blockedReason: z.string().nullable(),
  blockedByStory: z.string().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  fileHash: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type StoryDetails = z.infer<typeof StoryDetailsSchema>

export async function getStoryById(storyId: string): Promise<StoryDetails | null> {
  const result = await database.select().from(stories).where(eq(stories.storyId, storyId)).limit(1)

  if (result.length === 0) {
    return null
  }

  const story = result[0]

  return {
    storyId: story.storyId,
    title: story.title,
    description: story.description,
    feature: story.feature,
    priority: story.priority,
    state: story.state,
    blockedReason: story.blockedReason,
    blockedByStory: story.blockedByStory,
    startedAt: story.startedAt,
    completedAt: story.completedAt,
    fileHash: story.fileHash,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  }
}
