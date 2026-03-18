import { z } from 'zod'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { pgSchema, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'
import { plans, planStoryLinks, type Plan } from '@repo/knowledge-base/db'
import { eq, desc, sql, inArray, type SQL, and, or, like, asc } from 'drizzle-orm'

// Local schema definitions — explicit schema prefix ensures queries resolve correctly
// regardless of DB search_path. Kept in sync with actual DB columns only.
export const workflowSchema = pgSchema('workflow')
export const stories = workflowSchema.table('stories', {
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

const storyContent = workflowSchema.table('story_content', {
  storyId: text('story_id').notNull(),
  sectionName: text('section_name').notNull(),
  contentText: text('content_text'),
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

const artifactsSchema = pgSchema('artifacts')
const artifactElaborations = artifactsSchema.table('artifact_elaborations', {
  targetId: text('target_id').notNull(),
  verdict: text('verdict'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
const artifactEvidence = artifactsSchema.table('artifact_evidence', {
  targetId: text('target_id').notNull(),
  acTotal: integer('ac_total'),
  acMet: integer('ac_met'),
  acStatus: text('ac_status'),
  testPassCount: integer('test_pass_count'),
  testFailCount: integer('test_fail_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
const artifactQaGates = artifactsSchema.table('artifact_qa_gates', {
  targetId: text('target_id').notNull(),
  decision: text('decision').notNull(),
  reviewer: text('reviewer'),
  findingCount: integer('finding_count'),
  blockerCount: integer('blocker_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
const artifactCheckpoints = artifactsSchema.table('artifact_checkpoints', {
  targetId: text('target_id').notNull(),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
const artifactReviews = artifactsSchema.table('artifact_reviews', {
  targetId: text('target_id').notNull(),
  verdict: text('verdict'),
  findingCount: integer('finding_count'),
  criticalCount: integer('critical_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
const artifactVerifications = artifactsSchema.table('artifact_verifications', {
  targetId: text('target_id').notNull(),
  verdict: text('verdict'),
  findingCount: integer('finding_count'),
  criticalCount: integer('critical_count'),
  data: jsonb('data'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const storyDependenciesTable = workflowSchema.table('story_dependencies', {
  storyId: text('story_id').notNull(),
  dependsOnId: text('depends_on_id').notNull(),
  dependencyType: text('dependency_type').notNull(),
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

export async function updateStoryContentSection(
  storyId: string,
  sectionName: string,
  contentText: string,
): Promise<{ storyId: string; sectionName: string } | null> {
  const existing = await database
    .select({ sectionName: storyContent.sectionName })
    .from(storyContent)
    .where(and(eq(storyContent.storyId, storyId), eq(storyContent.sectionName, sectionName)))
    .limit(1)

  if (existing.length === 0) {
    return null
  }

  await database
    .update(storyContent)
    .set({ contentText })
    .where(and(eq(storyContent.storyId, storyId), eq(storyContent.sectionName, sectionName)))

  return { storyId, sectionName }
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

const DepEntrySchema = z.object({
  dependsOnId: z.string(),
  dependencyType: z.string(),
  dependsOnState: z.string().nullable(),
})

const DependentSchema = z.object({
  storyId: z.string(),
  dependencyType: z.string(),
})

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
  dependencies: z.array(DepEntrySchema),
  dependents: z.array(DependentSchema),
  wave: z.number(),
  thrashCount: z.number(),
  isExternal: z.boolean(),
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
  thrashCount: number
  createdAt: Date
  updatedAt: Date
}

export function computeWaves(
  storyIds: Set<string>,
  depsMap: Map<string, string[]>,
): Map<string, number> {
  const waves = new Map<string, number>()
  const computing = new Set<string>()

  function getWave(id: string): number {
    if (waves.has(id)) return waves.get(id)!
    if (computing.has(id)) return 0 // cycle guard
    computing.add(id)
    const deps = (depsMap.get(id) ?? []).filter(d => storyIds.has(d))
    const wave = deps.length === 0 ? 0 : Math.max(...deps.map(getWave)) + 1
    waves.set(id, wave)
    computing.delete(id)
    return wave
  }

  for (const id of storyIds) getWave(id)
  return waves
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
      thrashCount: sql<number>`(
        select count(*)::int
        from workflow.story_state_history h
        where h.story_id = ${stories.storyId}
          and h.event_type = 'state_change'
          and h.from_state is not null
          and h.to_state is not null
          and (
            case h.from_state
              when 'backlog' then 0 when 'created' then 1 when 'ready' then 2
              when 'in_progress' then 3 when 'needs_code_review' then 4
              when 'ready_for_review' then 5 when 'in_review' then 6
              when 'ready_for_qa' then 7 when 'in_qa' then 8
              when 'UAT' then 9 when 'completed' then 10
              else 0
            end
          ) > (
            case h.to_state
              when 'backlog' then 0 when 'created' then 1 when 'ready' then 2
              when 'in_progress' then 3 when 'needs_code_review' then 4
              when 'ready_for_review' then 5 when 'in_review' then 6
              when 'ready_for_qa' then 7 when 'in_qa' then 8
              when 'UAT' then 9 when 'completed' then 10
              else 0
            end
          )
      )`,
    })
    .from(planStoryLinks)
    .innerJoin(stories, eq(planStoryLinks.storyId, stories.storyId))
    .where(eq(planStoryLinks.planSlug, slug))
    .orderBy(asc(stories.priority), desc(stories.createdAt))

  if (linkedStories.length === 0) return []

  const planStoryIds = new Set(linkedStories.map(s => s.storyId))
  const allStoryIds = new Set(planStoryIds)

  // All story rows keyed by storyId (plan stories + external)
  const allStoryRows = new Map<string, LinkedStoryRow>()
  for (const s of linkedStories) allStoryRows.set(s.storyId, s)

  // Accumulate all dependency rows across iterations
  type DepRow = { storyId: string; dependsOnId: string; dependencyType: string }
  const allDepRows: DepRow[] = []

  // Iterative frontier expansion: discover external dependencies
  let frontier = new Set(planStoryIds)
  for (let iter = 0; iter < 10 && frontier.size > 0; iter++) {
    // Fetch deps where any frontier story appears as storyId or dependsOnId
    const depRows = await database
      .select({
        storyId: storyDependenciesTable.storyId,
        dependsOnId: storyDependenciesTable.dependsOnId,
        dependencyType: storyDependenciesTable.dependencyType,
      })
      .from(storyDependenciesTable)
      .where(
        or(
          inArray(storyDependenciesTable.storyId, [...frontier]),
          inArray(storyDependenciesTable.dependsOnId, [...frontier]),
        )!,
      )
    allDepRows.push(...depRows)

    // Find external story IDs not yet in our set
    const newExternalIds = new Set<string>()
    for (const dep of depRows) {
      if (!allStoryIds.has(dep.dependsOnId)) newExternalIds.add(dep.dependsOnId)
      if (!allStoryIds.has(dep.storyId)) newExternalIds.add(dep.storyId)
    }

    if (newExternalIds.size === 0) break

    // Fetch external story rows
    const externalRows = await database
      .select({
        storyId: stories.storyId,
        title: stories.title,
        description: stories.description,
        state: stories.state,
        priority: stories.priority,
        blockedByStory: stories.blockedByStory,
        createdAt: stories.createdAt,
        updatedAt: stories.updatedAt,
        thrashCount: sql<number>`0`,
      })
      .from(stories)
      .where(inArray(stories.storyId, [...newExternalIds]))

    for (const row of externalRows) {
      allStoryRows.set(row.storyId, row)
      allStoryIds.add(row.storyId)
    }

    // Next iteration expands from newly discovered stories
    frontier = newExternalIds
  }

  // Deduplicate dep rows
  const depKey = (d: DepRow) => `${d.storyId}|${d.dependsOnId}`
  const seenDeps = new Set<string>()
  const uniqueDeps: DepRow[] = []
  for (const d of allDepRows) {
    const k = depKey(d)
    if (!seenDeps.has(k)) {
      seenDeps.add(k)
      uniqueDeps.push(d)
    }
  }

  // Build maps: storyId -> [dependency objects], storyId -> [dependent objects]
  type DepEntry = z.infer<typeof DepEntrySchema>
  type Dependent = z.infer<typeof DependentSchema>
  const depsMap = new Map<string, DepEntry[]>()
  const dependentsMap = new Map<string, Dependent[]>()
  // Flat ID-only map for wave computation
  const depsIdMap = new Map<string, string[]>()
  for (const dep of uniqueDeps) {
    if (allStoryIds.has(dep.storyId)) {
      if (!depsMap.has(dep.storyId)) depsMap.set(dep.storyId, [])
      depsMap.get(dep.storyId)!.push({
        dependsOnId: dep.dependsOnId,
        dependencyType: dep.dependencyType,
        dependsOnState: allStoryRows.get(dep.dependsOnId)?.state ?? null,
      })
      if (!depsIdMap.has(dep.storyId)) depsIdMap.set(dep.storyId, [])
      depsIdMap.get(dep.storyId)!.push(dep.dependsOnId)
    }
    if (allStoryIds.has(dep.dependsOnId)) {
      if (!dependentsMap.has(dep.dependsOnId)) dependentsMap.set(dep.dependsOnId, [])
      dependentsMap.get(dep.dependsOnId)!.push({
        storyId: dep.storyId,
        dependencyType: dep.dependencyType,
      })
    }
  }

  const waves = computeWaves(allStoryIds, depsIdMap)

  // Build response: plan stories + external stories
  const result: PlanStory[] = []
  for (const [storyId, story] of allStoryRows) {
    const deps = depsMap.get(storyId) ?? []
    result.push({
      storyId: story.storyId,
      title: story.title,
      description: story.description ?? null,
      state: story.state,
      priority: story.priority,
      currentPhase: null,
      phaseStatus: null,
      isBlocked: story.state === 'blocked',
      hasBlockers: deps.length > 0,
      blockedByStory: story.blockedByStory ?? null,
      dependencies: deps,
      dependents: dependentsMap.get(storyId) ?? [],
      wave: waves.get(storyId) ?? 0,
      thrashCount: story.thrashCount ?? 0,
      isExternal: !planStoryIds.has(storyId),
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
    } satisfies PlanStory)
  }

  return result
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
  blockedByIds: z.array(z.string()),
  blocksIds: z.array(z.string()),
  branch: z.string().nullable(),
  worktreePath: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  elaboration: z
    .object({
      verdict: z.string().nullable(),
      risk: z.string().nullable(),
      confidence: z.string().nullable(),
      skillLevel: z.string().nullable(),
      implementationEstimate: z.string().nullable(),
      elabPhase: z.string().nullable(),
      data: z.unknown().nullable(),
    })
    .nullable(),
  evidence: z
    .object({
      acTotal: z.number().nullable(),
      acMet: z.number().nullable(),
      acStatus: z.string().nullable(),
      testPassCount: z.number().nullable(),
      testFailCount: z.number().nullable(),
      data: z.unknown().nullable(),
    })
    .nullable(),
  qaGate: z
    .object({
      decision: z.string(),
      reviewer: z.string().nullable(),
      findingCount: z.number().nullable(),
      blockerCount: z.number().nullable(),
      data: z.unknown().nullable(),
    })
    .nullable(),
  review: z
    .object({
      verdict: z.string().nullable(),
      findingCount: z.number().nullable(),
      criticalCount: z.number().nullable(),
      data: z.unknown().nullable(),
    })
    .nullable(),
  verification: z
    .object({
      verdict: z.string().nullable(),
      findingCount: z.number().nullable(),
      criticalCount: z.number().nullable(),
      data: z.unknown().nullable(),
    })
    .nullable(),
})

export type StoryDetails = z.infer<typeof StoryDetailsSchema>

export async function getStoryById(storyId: string): Promise<StoryDetails | null> {
  const [
    rows,
    elabRows,
    evidenceRows,
    qaRows,
    reverseDepsRows,
    checkpointRows,
    reviewRows,
    verificationRows,
  ] = await Promise.all([
    database.select().from(storyDetailsView).where(eq(storyDetailsView.storyId, storyId)).limit(1),
    database
      .select()
      .from(artifactElaborations)
      .where(eq(artifactElaborations.targetId, storyId))
      .orderBy(desc(artifactElaborations.createdAt))
      .limit(1),
    database
      .select()
      .from(artifactEvidence)
      .where(eq(artifactEvidence.targetId, storyId))
      .orderBy(desc(artifactEvidence.createdAt))
      .limit(1),
    database
      .select()
      .from(artifactQaGates)
      .where(eq(artifactQaGates.targetId, storyId))
      .orderBy(desc(artifactQaGates.createdAt))
      .limit(1),
    // Stories that depend on this story (i.e., this story blocks them)
    database
      .select({ storyId: storyDependenciesTable.storyId })
      .from(storyDependenciesTable)
      .where(eq(storyDependenciesTable.dependsOnId, storyId)),
    database
      .select({ data: artifactCheckpoints.data })
      .from(artifactCheckpoints)
      .where(eq(artifactCheckpoints.targetId, storyId))
      .orderBy(desc(artifactCheckpoints.createdAt))
      .limit(1),
    database
      .select()
      .from(artifactReviews)
      .where(eq(artifactReviews.targetId, storyId))
      .orderBy(desc(artifactReviews.createdAt))
      .limit(1),
    database
      .select()
      .from(artifactVerifications)
      .where(eq(artifactVerifications.targetId, storyId))
      .orderBy(desc(artifactVerifications.createdAt))
      .limit(1),
  ])

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
  type Dependency = {
    depends_on_id: string
    dependency_type: string
    depends_on_state: string | null
  }

  const allSections = (r.contentSections as ContentSection[]) ?? []

  // Parse state_info: "{state} | {elab_phase} | {complexity} | {elab_verdict}"
  const stateInfoText =
    allSections.find(cs => cs.section_name === 'state_info')?.content_text ?? null
  const stateInfoParts = stateInfoText ? stateInfoText.split('|').map(p => p.trim()) : []
  const stateInfoComplexity = stateInfoParts[2] || null
  const stateInfoElabPhase = stateInfoParts[1] || null
  const stateInfoElabVerdict = stateInfoParts[3] || null

  const contentSections = allSections
    .filter(cs => cs.section_name !== 'state_info')
    .map(cs => ({
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
    dependsOnState: d.depends_on_state ?? null,
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
    complexity: stateInfoComplexity,
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
    // blockedByIds: stories this story is blocked by (depends on, must complete first) — excludes completed
    blockedByIds: dependencies
      .filter(
        d =>
          (d.dependencyType === 'blocks' || d.dependencyType === 'requires') &&
          d.dependsOnState !== 'completed',
      )
      .map(d => d.dependsOnId),
    // blocksIds: stories that are waiting on this story to complete
    blocksIds: reverseDepsRows.map(r2 => r2.storyId),
    branch:
      checkpointRows.length > 0
        ? (((checkpointRows[0].data as Record<string, unknown> | null)?.branch as string) ?? null)
        : null,
    worktreePath:
      checkpointRows.length > 0
        ? (((checkpointRows[0].data as Record<string, unknown> | null)?.worktree_path as string) ??
          null)
        : null,
    createdAt: r.createdAt!,
    updatedAt: r.updatedAt!,
    elaboration: (() => {
      const verdict =
        elabRows.length > 0 ? (elabRows[0].verdict ?? null) : (stateInfoElabVerdict ?? null)
      const readiness =
        elabRows.length > 0
          ? ((elabRows[0].data as Record<string, unknown> | null)?.readiness as
              | Record<string, unknown>
              | null
              | undefined)
          : null
      if (!verdict && !stateInfoElabPhase && !stateInfoComplexity) return null
      return {
        verdict,
        risk: (readiness?.risk as string) ?? stateInfoComplexity,
        confidence: (readiness?.confidence as string) ?? null,
        skillLevel: (readiness?.skill_level as string) ?? null,
        implementationEstimate: (readiness?.implementation_estimate as string) ?? null,
        elabPhase: stateInfoElabPhase,
        data: elabRows.length > 0 ? (elabRows[0].data ?? null) : null,
      }
    })(),
    evidence:
      evidenceRows.length > 0
        ? {
            acTotal: evidenceRows[0].acTotal ?? null,
            acMet: evidenceRows[0].acMet ?? null,
            acStatus: evidenceRows[0].acStatus ?? null,
            testPassCount: evidenceRows[0].testPassCount ?? null,
            testFailCount: evidenceRows[0].testFailCount ?? null,
            data: evidenceRows[0].data ?? null,
          }
        : null,
    qaGate:
      qaRows.length > 0
        ? {
            decision: qaRows[0].decision,
            reviewer: qaRows[0].reviewer ?? null,
            findingCount: qaRows[0].findingCount ?? null,
            blockerCount: qaRows[0].blockerCount ?? null,
            data: qaRows[0].data ?? null,
          }
        : null,
    review:
      reviewRows.length > 0
        ? {
            verdict: reviewRows[0].verdict ?? null,
            findingCount: reviewRows[0].findingCount ?? null,
            criticalCount: reviewRows[0].criticalCount ?? null,
            data: reviewRows[0].data ?? null,
          }
        : null,
    verification:
      verificationRows.length > 0
        ? {
            verdict: verificationRows[0].verdict ?? null,
            findingCount: verificationRows[0].findingCount ?? null,
            criticalCount: verificationRows[0].criticalCount ?? null,
            data: verificationRows[0].data ?? null,
          }
        : null,
  }
}
