import { z } from 'zod'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { pgSchema, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { plans, planStoryLinks, type Plan } from '@repo/knowledge-base/db'
import { eq, desc, sql, inArray, type SQL, and, or, like, asc } from 'drizzle-orm'

// Local schema definitions — explicit schema prefix ensures queries resolve correctly
// regardless of DB search_path. Kept in sync with actual DB columns only.
const workflowSchema = pgSchema('workflow')
const stories = workflowSchema.table('stories', {
  storyId: text('story_id').notNull(),
  feature: text('feature').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  blockedReason: text('blocked_reason'),
  blockedByStory: text('blocked_by_story'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fileHash: text('file_hash'),
  state: text('state'),
  priority: text('priority'),
  // Added by 999_stories_add_tags_experiment_variant migration:
  tags: text('tags').array(),
  experimentVariant: text('experiment_variant'),
})

// View created by migration 1000_create_story_details_view.sql
// Columns mirror the view definition — jsonb aggregates typed as jsonb.
const storyDetailsView = workflowSchema.table('story_details', {
  storyId: text('story_id'),
  feature: text('feature'),
  title: text('title'),
  description: text('description'),
  state: text('state'),
  priority: text('priority'),
  tags: text('tags').array(),
  experimentVariant: text('experiment_variant'),
  blockedReason: text('blocked_reason'),
  blockedByStory: text('blocked_by_story'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  fileHash: text('file_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  // Outcome (null when no outcome row exists)
  outcomeVerdict: text('outcome_verdict'),
  outcomeQualityScore: integer('outcome_quality_score'),
  outcomeReviewIterations: integer('outcome_review_iterations'),
  outcomeQaIterations: integer('outcome_qa_iterations'),
  outcomeDurationMs: integer('outcome_duration_ms'),
  outcomeTotalInputTokens: integer('outcome_total_input_tokens'),
  outcomeTotalOutputTokens: integer('outcome_total_output_tokens'),
  outcomeTotalCachedTokens: integer('outcome_total_cached_tokens'),
  outcomeEstimatedTotalCost: text('outcome_estimated_total_cost'),
  outcomePrimaryBlocker: text('outcome_primary_blocker'),
  outcomeCompletedAt: timestamp('outcome_completed_at', { withTimezone: true }),
  // Work state (null when no work_state row exists)
  wsBranch: text('ws_branch'),
  wsPhase: text('ws_phase'),
  wsNextSteps: jsonb('ws_next_steps'),
  wsBlockers: jsonb('ws_blockers'),
  // Pre-aggregated jsonb arrays
  contentSections: jsonb('content_sections'),
  stateHistory: jsonb('state_history'),
  linkedPlans: jsonb('linked_plans'),
  dependencies: jsonb('dependencies'),
})

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const database = drizzle(pool)

export const StoryUpdateInputSchema = z.object({
  description: z.string().nullable().optional(),
})

export type StoryUpdateInput = z.infer<typeof StoryUpdateInputSchema>

export async function updateStory(
  storyId: string,
  input: StoryUpdateInput,
): Promise<{ storyId: string } | null> {
  const existing = await database
    .select({ storyId: stories.storyId })
    .from(stories)
    .where(eq(stories.storyId, storyId))
    .limit(1)

  if (existing.length === 0) {
    return null
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() }

  if (input.description !== undefined) {
    updateData.description = input.description
  }

  await database.update(stories).set(updateData).where(eq(stories.storyId, storyId))

  return { storyId }
}

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

export type StoryRef = {
  storyId: string
  title: string
}

export type PlanSummary = {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  storyPrefix: string | null
  tags: string[] | null
  status: string | null
  priority: string | null
  priorityOrder: number | null
  supersedesPlanSlug: string | null
  createdAt: Date
  updatedAt: Date
  // Computed from story links
  totalStories: number
  completedStories: number
  activeStories: number
  blockedStories: number
  lastStoryActivityAt: Date | null
  // Churn metrics
  churnDepth: number
  hasRegression: boolean
  // Next story to work on + blocked list
  nextStory: StoryRef | null
  blockedStoryList: StoryRef[]
}

export type PlanListResult = Omit<z.infer<typeof PlanListResultSchema>, 'data'> & {
  data: PlanSummary[]
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
    conditions.push(
      sql`${plans.tags} && ARRAY[${sql.join(
        tags.map(t => sql`${t}`),
        sql`, `,
      )}]::text[]`,
    )
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
    .select({
      id: plans.id,
      planSlug: plans.planSlug,
      title: plans.title,
      summary: plans.summary,
      planType: plans.planType,
      storyPrefix: plans.storyPrefix,
      tags: plans.tags,
      status: plans.status,
      priority: plans.priority,
      priorityOrder: plans.priorityOrder,
      supersedesPlanSlug: plans.supersedesPlanSlug,
      createdAt: plans.createdAt,
      updatedAt: plans.updatedAt,
      // Story state breakdown
      totalStories: sql<number>`(
        select count(*)::int
        from workflow.plan_story_links psl
        where psl.plan_slug = plans.plan_slug
      )`,
      completedStories: sql<number>`(
        select count(*)::int
        from workflow.plan_story_links psl
        join workflow.stories s on s.story_id = psl.story_id
        where psl.plan_slug = plans.plan_slug
          and s.state = 'completed'
      )`,
      activeStories: sql<number>`(
        select count(*)::int
        from workflow.plan_story_links psl
        join workflow.stories s on s.story_id = psl.story_id
        where psl.plan_slug = plans.plan_slug
          and s.state in ('in_progress','in_review','in_qa','uat','needs_code_review')
      )`,
      blockedStories: sql<number>`(
        select count(*)::int
        from workflow.plan_story_links psl
        join workflow.stories s on s.story_id = psl.story_id
        where psl.plan_slug = plans.plan_slug
          and s.state = 'blocked'
      )`,
      lastStoryActivityAt: sql<Date | null>`(
        select max(s.updated_at)
        from workflow.plan_story_links psl
        join workflow.stories s on s.story_id = psl.story_id
        where psl.plan_slug = plans.plan_slug
      )`,
      // Churn: how many prior plans does this one supersede (chain length)
      churnDepth: sql<number>`(
        with recursive chain as (
          select supersedes_plan_slug, 1 as depth
          from workflow.plans
          where plan_slug = plans.plan_slug
            and supersedes_plan_slug is not null
          union all
          select p.supersedes_plan_slug, chain.depth + 1
          from workflow.plans p
          join chain on p.plan_slug = chain.supersedes_plan_slug
          where p.supersedes_plan_slug is not null
            and chain.depth < 20
        )
        select coalesce(max(depth), 0) from chain
      )`,
      // Regression: has this plan ever gone backwards in status?
      hasRegression: sql<boolean>`(
        select exists(
          select 1
          from workflow.plan_status_history psh
          where psh.plan_slug = plans.plan_slug
            and psh.from_status in ('implemented','in-progress','stories-created','accepted')
            and psh.to_status   in ('draft','active','blocked')
        )
      )`,
      // Next story to work on (lowest priority backlog/ready story)
      nextStory: sql<StoryRef | null>`(
        select row_to_json(t)
        from (
          select s.story_id as "storyId", s.title
          from workflow.plan_story_links psl
          join workflow.stories s on s.story_id = psl.story_id
          where psl.plan_slug = plans.plan_slug
            and (s.state is null or s.state not in (
              'completed','in_progress','in_review','in_qa','uat','needs_code_review','blocked'
            ))
          order by s.priority asc nulls last, s.created_at asc
          limit 1
        ) t
      )`,
      // Blocked stories list
      blockedStoryList: sql<StoryRef[]>`(
        select coalesce(json_agg(t order by t."storyId"), '[]'::json)
        from (
          select s.story_id as "storyId", s.title
          from workflow.plan_story_links psl
          join workflow.stories s on s.story_id = psl.story_id
          where psl.plan_slug = plans.plan_slug
            and s.state = 'blocked'
        ) t
      )`,
    })
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
    data: dataResult as PlanSummary[],
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
  description: z.string().nullable(),
  state: z.string().nullable(),
  priority: z.string().nullable(),
  currentPhase: z.string().nullable(),
  phaseStatus: z.string().nullable(),
  isBlocked: z.boolean(),
  hasBlockers: z.boolean(),
  blockedByStory: z.string().nullable(),
  createdAt: z.date().nullable(),
  updatedAt: z.date().nullable(),
})

export type PlanStory = z.infer<typeof PlanStorySchema>

type LinkedStoryRow = {
  storyId: string
  title: string
  description: string | null
  state: string | null
  priority: string | null
  blockedByStory: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getStoriesByPlanSlug(slug: string): Promise<PlanStory[]> {
  const linkedStories = await database
    .select({
      storyId: stories.storyId,
      title: stories.title,
      description: stories.description,
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
    description: story.description ?? null,
    state: story.state,
    priority: story.priority,
    currentPhase: null,
    phaseStatus: null,
    isBlocked: story.state === 'blocked',
    hasBlockers: !!story.blockedByStory,
    blockedByStory: story.blockedByStory ?? null,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
  })) as PlanStory[]
}

export const StoryDetailsSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  storyType: z.string(),
  epic: z.string().nullable(),
  wave: z.number().nullable(),
  priority: z.string().nullable(),
  complexity: z.string().nullable(),
  storyPoints: z.number().nullable(),
  state: z.string(),
  blockedReason: z.string().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  tags: z.array(z.string()).nullable(),
  experimentVariant: z.string().nullable(),
  outcome: z
    .object({
      finalVerdict: z.string(),
      qualityScore: z.number(),
      reviewIterations: z.number(),
      qaIterations: z.number(),
      durationMs: z.number(),
      totalInputTokens: z.number(),
      totalOutputTokens: z.number(),
      totalCachedTokens: z.number(),
      estimatedTotalCost: z.string(),
      primaryBlocker: z.string().nullable(),
      completedAt: z.date().nullable(),
    })
    .nullable(),
  contentSections: z.array(
    z.object({
      sectionName: z.string(),
      contentText: z.string().nullable(),
    }),
  ),
  stateHistory: z.array(
    z.object({
      eventType: z.string(),
      fromState: z.string().nullable(),
      toState: z.string().nullable(),
      createdAt: z.date(),
    }),
  ),
  currentWorkState: z
    .object({
      branch: z.string().nullable(),
      phase: z.string().nullable(),
      nextSteps: z.unknown(),
      blockers: z.unknown(),
    })
    .nullable(),
  linkedPlans: z.array(
    z.object({
      planSlug: z.string(),
      linkType: z.string(),
    }),
  ),
  dependencies: z.array(
    z.object({
      dependsOnId: z.string(),
      dependencyType: z.string(),
    }),
  ),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type StoryDetails = z.infer<typeof StoryDetailsSchema>

export async function getStoryById(storyId: string): Promise<StoryDetails | null> {
  const rows = await database
    .select()
    .from(storyDetailsView)
    .where(eq(storyDetailsView.storyId, storyId))
    .limit(1)

  if (rows.length === 0) {
    return null
  }

  const r = rows[0]

  type ContentSection = { section_name: string; content_text: string | null }
  type StateHistoryEntry = {
    event_type: string
    from_state: string | null
    to_state: string | null
    created_at: string
  }
  type LinkedPlan = { plan_slug: string; link_type: string }
  type Dependency = { depends_on_id: string; dependency_type: string }

  const contentSections = ((r.contentSections as ContentSection[]) ?? []).map(cs => ({
    sectionName: cs.section_name,
    contentText: cs.content_text,
  }))
  const stateHistory = ((r.stateHistory as StateHistoryEntry[]) ?? []).map(h => ({
    eventType: h.event_type,
    fromState: h.from_state,
    toState: h.to_state,
    createdAt: new Date(h.created_at),
  }))
  const linkedPlans = ((r.linkedPlans as LinkedPlan[]) ?? []).map(lp => ({
    planSlug: lp.plan_slug,
    linkType: lp.link_type,
  }))
  const dependencies = ((r.dependencies as Dependency[]) ?? []).map(d => ({
    dependsOnId: d.depends_on_id,
    dependencyType: d.dependency_type,
  }))

  return {
    id: r.storyId!,
    storyId: r.storyId!,
    title: r.title!,
    description: r.description ?? null,
    storyType: r.feature!,
    epic: r.feature ?? null,
    wave: null,
    priority: r.priority ?? null,
    complexity: null,
    storyPoints: null,
    state: r.state ?? 'backlog',
    blockedReason: r.blockedReason ?? null,
    startedAt: r.startedAt ?? null,
    completedAt: r.completedAt ?? null,
    tags: r.tags ?? null,
    experimentVariant: r.experimentVariant ?? null,
    outcome: r.outcomeVerdict
      ? {
          finalVerdict: r.outcomeVerdict,
          qualityScore: r.outcomeQualityScore ?? 0,
          reviewIterations: r.outcomeReviewIterations ?? 0,
          qaIterations: r.outcomeQaIterations ?? 0,
          durationMs: r.outcomeDurationMs ?? 0,
          totalInputTokens: r.outcomeTotalInputTokens ?? 0,
          totalOutputTokens: r.outcomeTotalOutputTokens ?? 0,
          totalCachedTokens: r.outcomeTotalCachedTokens ?? 0,
          estimatedTotalCost: r.outcomeEstimatedTotalCost ?? '0.0000',
          primaryBlocker: r.outcomePrimaryBlocker ?? null,
          completedAt: r.outcomeCompletedAt ?? null,
        }
      : null,
    contentSections,
    stateHistory,
    currentWorkState:
      r.wsBranch != null || r.wsPhase != null
        ? {
            branch: r.wsBranch ?? null,
            phase: r.wsPhase ?? null,
            nextSteps: r.wsNextSteps,
            blockers: r.wsBlockers,
          }
        : null,
    linkedPlans,
    dependencies,
    createdAt: r.createdAt!,
    updatedAt: r.updatedAt!,
  }
}
