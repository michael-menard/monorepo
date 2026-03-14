import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { plans, planDetails, type Plan } from '@repo/knowledge-base/src/db'
import { eq, desc, sql, inArray, type SQL, and, or, like, asc, isNull } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  pgSchema,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})

export const database = drizzle(pool)

const workflowSchema = pgSchema('workflow')

export const stories = workflowSchema.table('stories', {
  storyId: text('story_id').notNull(),
  feature: text('feature').notNull(),
  state: text('state').notNull(),
  title: text('title').notNull(),
  priority: text('priority'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const storyDetails = workflowSchema.table('story_details', {
  id: uuid('id').defaultRandom().notNull(),
  storyId: text('story_id').notNull(),
  storyDir: text('story_dir'),
  storyFile: text('story_file'),
  blockedReason: text('blocked_reason'),
  blockedByStory: text('blocked_by_story'),
  touchesBackend: boolean('touches_backend').default(false),
  touchesFrontend: boolean('touches_frontend').default(false),
  touchesDatabase: boolean('touches_database').default(false),
  touchesInfra: boolean('touches_infra').default(false),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fileSyncedAt: timestamp('file_synced_at', { withTimezone: true }),
  fileHash: text('file_hash'),
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
  table => ({
    planSlugIdx: index('idx_plan_story_links_plan_slug').on(table.planSlug),
    storyIdIdx: index('idx_plan_story_links_story_id').on(table.storyId),
  }),
)

export interface PlanUpdateInput {
  title?: string | null
  summary?: string | null
  planType?: string | null
  status?: string | null
  featureDir?: string | null
  storyPrefix?: string | null
  estimatedStories?: number | null
  tags?: string[] | null
  priority?: string | null
  priorityOrder?: number | null
}

export interface PlanListParams {
  page: number
  limit: number
  status?: string[]
  planType?: string[]
  priority?: string[]
  tags?: string[]
  excludeCompleted?: boolean
  search?: string
}

export interface PlanListResult {
  data: Plan[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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
      ? (conditions.reduce((acc, c) => and(acc, c) as SQL, sql``) as SQL)
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

export interface PlanWithDetails {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  tags: string[] | null
  priority: string | null
  createdAt: Date
  updatedAt: Date
  details: {
    rawContent: string
    phases: unknown
    sections: unknown
    formatVersion: string | null
    sourceFile: string | null
    contentHash: string | null
    importedAt: Date | null
    updatedAt: Date
  } | null
}

export async function getPlanBySlug(slug: string): Promise<PlanWithDetails | null> {
  const result = await database.select().from(plans).where(eq(plans.planSlug, slug)).limit(1)

  if (result.length === 0) {
    return null
  }

  const plan = result[0]

  const detailsResult = await database
    .select()
    .from(planDetails)
    .where(eq(planDetails.planId, plan.id))
    .limit(1)

  const details = detailsResult.length > 0 ? detailsResult[0] : null

  return {
    id: plan.id,
    planSlug: plan.planSlug,
    title: plan.title,
    summary: plan.summary,
    planType: plan.planType,
    status: plan.status,
    featureDir: plan.featureDir,
    storyPrefix: plan.storyPrefix,
    estimatedStories: plan.estimatedStories,
    tags: plan.tags,
    priority: plan.priority,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    details: details
      ? {
          rawContent: details.rawContent,
          phases: details.phases,
          sections: details.sections,
          formatVersion: details.formatVersion,
          sourceFile: details.sourceFile,
          contentHash: details.contentHash,
          importedAt: details.importedAt,
          updatedAt: details.updatedAt,
        }
      : null,
  }
}

export interface ReorderItem {
  id: string
  priorityOrder: number
}

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
  if (input.featureDir !== undefined) {
    updateData.featureDir = input.featureDir
  }
  if (input.storyPrefix !== undefined) {
    updateData.storyPrefix = input.storyPrefix
  }
  if (input.estimatedStories !== undefined) {
    updateData.estimatedStories = input.estimatedStories
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

export interface PlanStory {
  storyId: string
  title: string | null
  state: string | null
  priority: string | null
  currentPhase: string | null
  phaseStatus: string | null
  isBlocked: boolean
  hasBlockers: boolean
  createdAt: Date | null
  updatedAt: Date | null
}

export async function getStoriesByPlanSlug(slug: string): Promise<PlanStory[]> {
  const linkedStories = await database
    .select({
      storyId: stories.storyId,
      title: stories.title,
      state: stories.state,
      priority: stories.priority,
      createdAt: stories.createdAt,
      updatedAt: stories.updatedAt,
    })
    .from(planStoryLinks)
    .innerJoin(stories, eq(planStoryLinks.storyId, stories.storyId))
    .where(eq(planStoryLinks.planSlug, slug))
    .orderBy(asc(stories.priority), desc(stories.createdAt))

  const storyIds = linkedStories.map(s => s.storyId)

  if (storyIds.length === 0) {
    return []
  }

  const detailsResult = await database
    .select({
      storyId: storyDetails.storyId,
      blockedByStory: storyDetails.blockedByStory,
    })
    .from(storyDetails)
    .where(inArray(storyDetails.storyId, storyIds))

  const detailsMap = new Map(detailsResult.map(d => [d.storyId, d]))

  return linkedStories.map(story => {
    const details = detailsMap.get(story.storyId)
    return {
      storyId: story.storyId,
      title: story.title,
      state: story.state,
      priority: story.priority,
      currentPhase: null,
      phaseStatus: null,
      isBlocked: story.state === 'blocked',
      hasBlockers: !!details?.blockedByStory,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    }
  }) as PlanStory[]
}

export interface StoryDetails {
  id: string
  storyId: string
  title: string
  description: string | null
  storyType: string
  epic: string | null
  wave: number | null
  priority: string | null
  complexity: string | null
  storyPoints: number | null
  state: string
  metadata: {
    surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
    tags?: string[]
    experimentVariant?: 'control' | 'variant_a' | 'variant_b'
    blocked_by?: string[]
    blocks?: string[]
  } | null
  createdAt: Date
  updatedAt: Date
}

export async function getStoryById(storyId: string): Promise<StoryDetails | null> {
  const result = await database.select().from(stories).where(eq(stories.storyId, storyId)).limit(1)

  if (result.length === 0) {
    return null
  }

  const story = result[0]

  const detailsResult = await database
    .select()
    .from(storyDetails)
    .where(eq(storyDetails.storyId, storyId))
    .limit(1)

  const details = detailsResult.length > 0 ? detailsResult[0] : null

  return {
    id: story.storyId,
    storyId: story.storyId,
    title: story.title,
    description: story.description,
    storyType: story.feature,
    epic: story.feature,
    wave: null,
    priority: story.priority,
    complexity: null,
    storyPoints: null,
    state: story.state,
    metadata: details
      ? {
          surfaces: {
            backend: details.touchesBackend ?? false,
            frontend: details.touchesFrontend ?? false,
            database: details.touchesDatabase ?? false,
            infra: details.touchesInfra ?? false,
          },
          blocked_by: details.blockedByStory ? [details.blockedByStory] : undefined,
        }
      : null,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  }
}
