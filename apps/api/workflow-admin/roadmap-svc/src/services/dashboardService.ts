import { sql, eq, inArray, not } from 'drizzle-orm'
import { text, timestamp } from 'drizzle-orm/pg-core'
import { plans, planStoryLinks, tasks } from '@repo/knowledge-base/db'
import {
  database,
  stories,
  storyDependenciesTable,
  workflowSchema,
  computeWaves,
  getPlans,
} from './planService'

const storyStateHistory = workflowSchema.table('story_state_history', {
  storyId: text('story_id').notNull(),
  toState: text('to_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
})

const COMPLETED_STATES = ['completed', 'cancelled']
const BACKLOG_EXCLUDED_STATUSES = ['done', 'wont_do', 'promoted']

export type DashboardResponse = {
  flowHealth: {
    totalStories: number
    distribution: Array<{ state: string; count: number }>
    blockedCount: number
  }
  unblockedQueue: Array<{
    storyId: string
    title: string
    priority: string | null
    state: string | null
    plans: Array<{ planSlug: string; title: string }>
    fanOut: number
    daysInState: number
  }>
  planProgress: Array<{
    planSlug: string
    title: string
    status: string | null
    priority: string | null
    totalStories: number
    completedStories: number
    activeStories: number
    blockedStories: number
    daysSinceActivity: number | null
    health: 'green' | 'yellow' | 'red'
  }>
  agingStories: Array<{
    storyId: string
    title: string
    state: string
    daysInState: number
    plans: Array<{ planSlug: string; title: string }>
  }>
  impactRanking: Array<{
    storyId: string
    title: string
    state: string | null
    priority: string | null
    fanOut: number
    plans: Array<{ planSlug: string; title: string }>
  }>
  backlogSummary: {
    totalOpen: number
    byPriority: Array<{ priority: string; count: number }>
    byType: Array<{ taskType: string; count: number }>
  }
  backlogAging: Array<{
    bucket: string
    count: number
  }>
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000)
}

// BFS fan-out: count transitive non-completed dependents
function computeFanOut(
  storyId: string,
  reverseDeps: Map<string, string[]>,
  completedSet: Set<string>,
): number {
  const visited = new Set<string>()
  const queue = [storyId]
  while (queue.length > 0) {
    const current = queue.pop()!
    const dependents = reverseDeps.get(current) ?? []
    for (const dep of dependents) {
      if (!visited.has(dep) && !completedSet.has(dep)) {
        visited.add(dep)
        queue.push(dep)
      }
    }
  }
  return visited.size
}

type BacklogSummaryRow = {
  priority: string | null
  taskType: string
  count: number
}

type BacklogAgingRow = {
  bucket: string
  count: number
}

export function buildBacklogSummary(
  rows: BacklogSummaryRow[],
): DashboardResponse['backlogSummary'] {
  const totalOpen = rows.reduce((sum, r) => sum + r.count, 0)

  const priorityMap = new Map<string, number>()
  const typeMap = new Map<string, number>()

  for (const row of rows) {
    const pKey = row.priority ?? 'none'
    priorityMap.set(pKey, (priorityMap.get(pKey) ?? 0) + row.count)
    typeMap.set(row.taskType, (typeMap.get(row.taskType) ?? 0) + row.count)
  }

  const byPriority = Array.from(priorityMap.entries())
    .map(([priority, count]) => ({ priority, count }))
    .sort((a, b) => b.count - a.count)

  const byType = Array.from(typeMap.entries())
    .map(([taskType, count]) => ({ taskType, count }))
    .sort((a, b) => b.count - a.count)

  return { totalOpen, byPriority, byType }
}

export function buildBacklogAging(rows: BacklogAgingRow[]): DashboardResponse['backlogAging'] {
  const BUCKETS = ['<7d', '7-14d', '14-30d', '30+d']
  const bucketMap = new Map(rows.map(r => [r.bucket, r.count]))
  return BUCKETS.map(bucket => ({ bucket, count: bucketMap.get(bucket) ?? 0 }))
}

export async function getDashboard(): Promise<DashboardResponse> {
  const now = new Date()

  // Run 7 parallel queries
  const [
    stateDistRows,
    allStoryRows,
    allDepsRows,
    planLinkRows,
    stateHistoryRows,
    backlogSummaryRows,
    backlogAgingRows,
  ] = await Promise.all([
    // 1. State distribution
    database
      .select({
        state: sql<string>`coalesce(${stories.state}, 'backlog')`,
        count: sql<number>`count(*)::int`,
      })
      .from(stories)
      .groupBy(sql`coalesce(${stories.state}, 'backlog')`),

    // 2. All non-completed stories
    database
      .select({
        storyId: stories.storyId,
        title: stories.title,
        state: stories.state,
        priority: stories.priority,
      })
      .from(stories)
      .where(not(inArray(sql`coalesce(${stories.state}, 'backlog')`, COMPLETED_STATES))),

    // 3. All dependencies
    database
      .select({
        storyId: storyDependenciesTable.storyId,
        dependsOnId: storyDependenciesTable.dependsOnId,
      })
      .from(storyDependenciesTable),

    // 4. Plan links with titles
    database
      .select({
        storyId: planStoryLinks.storyId,
        planSlug: planStoryLinks.planSlug,
        planTitle: plans.title,
      })
      .from(planStoryLinks)
      .innerJoin(plans, eq(planStoryLinks.planSlug, plans.planSlug)),

    // 5. Latest state entry per story (for days-in-state)
    database.execute<{ story_id: string; created_at: Date }>(sql`
      select distinct on (story_id) story_id, created_at
      from workflow.story_state_history
      order by story_id, created_at desc
    `),

    // 6. Backlog summary: group by priority and taskType
    database
      .select({
        priority: tasks.priority,
        taskType: tasks.taskType,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        sql`${tasks.deletedAt} is null and ${tasks.status} not in (${sql.join(
          BACKLOG_EXCLUDED_STATUSES.map(s => sql`${s}`),
          sql`, `,
        )})`,
      )
      .groupBy(tasks.priority, tasks.taskType),

    // 7. Backlog aging: CASE buckets on age from created_at
    database
      .select({
        bucket: sql<string>`
          case
            when now() - "tasks"."created_at" < interval '7 days' then '<7d'
            when now() - "tasks"."created_at" < interval '14 days' then '7-14d'
            when now() - "tasks"."created_at" < interval '30 days' then '14-30d'
            else '30+d'
          end
        `,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        sql`${tasks.deletedAt} is null and ${tasks.status} not in (${sql.join(
          BACKLOG_EXCLUDED_STATUSES.map(s => sql`${s}`),
          sql`, `,
        )})`,
      )
      .groupBy(
        sql`
          case
            when now() - ${tasks.createdAt} < interval '7 days' then '<7d'
            when now() - ${tasks.createdAt} < interval '14 days' then '7-14d'
            when now() - ${tasks.createdAt} < interval '30 days' then '14-30d'
            else '30+d'
          end
        `,
      ),
  ])

  // Build lookup maps
  const completedSet = new Set<string>()
  // We need all story states for completeness check
  const allStatesResult = await database
    .select({ storyId: stories.storyId, state: stories.state })
    .from(stories)
    .where(inArray(sql`coalesce(${stories.state}, 'backlog')`, COMPLETED_STATES))
  for (const r of allStatesResult) completedSet.add(r.storyId)

  // Dependency maps
  const depsMap = new Map<string, string[]>()
  const reverseDeps = new Map<string, string[]>()
  for (const dep of allDepsRows) {
    if (!depsMap.has(dep.storyId)) depsMap.set(dep.storyId, [])
    depsMap.get(dep.storyId)!.push(dep.dependsOnId)
    if (!reverseDeps.has(dep.dependsOnId)) reverseDeps.set(dep.dependsOnId, [])
    reverseDeps.get(dep.dependsOnId)!.push(dep.storyId)
  }

  // Plan links by story
  const plansByStory = new Map<string, Array<{ planSlug: string; title: string }>>()
  for (const link of planLinkRows) {
    if (!plansByStory.has(link.storyId)) plansByStory.set(link.storyId, [])
    plansByStory.get(link.storyId)!.push({ planSlug: link.planSlug, title: link.planTitle })
  }

  // State history by story (latest entry date)
  const stateEntryDate = new Map<string, Date>()
  for (const row of stateHistoryRows.rows) {
    stateEntryDate.set(row.story_id, new Date(row.created_at))
  }

  // --- Flow Health ---
  const totalStories = stateDistRows.reduce((sum, r) => sum + r.count, 0)
  const blockedCount = stateDistRows.find(r => r.state === 'blocked')?.count ?? 0
  const distribution = stateDistRows
    .sort((a, b) => b.count - a.count)
    .map(r => ({ state: r.state, count: r.count }))

  // --- Waves + fan-out ---
  const nonCompletedIds = new Set(allStoryRows.map(s => s.storyId))
  const waves = computeWaves(nonCompletedIds, depsMap)

  // Fan-out for each non-completed story
  const fanOutMap = new Map<string, number>()
  for (const id of nonCompletedIds) {
    fanOutMap.set(id, computeFanOut(id, reverseDeps, completedSet))
  }

  // --- Unblocked Work Queue ---
  // Wave 0 OR all deps completed
  const unblockedStories = allStoryRows.filter(s => {
    const wave = waves.get(s.storyId) ?? 0
    if (wave === 0) return true
    const deps = depsMap.get(s.storyId) ?? []
    return deps.every(d => completedSet.has(d))
  })

  // Sort by priority ASC (P0 < P1 < ...), then fan-out DESC
  const priorityRank = (p: string | null) => {
    if (!p) return 99
    const match = p.match(/^P(\d+)$/)
    return match ? parseInt(match[1]) : 99
  }

  const unblockedQueue = unblockedStories
    .map(s => ({
      storyId: s.storyId,
      title: s.title,
      priority: s.priority,
      state: s.state,
      plans: plansByStory.get(s.storyId) ?? [],
      fanOut: fanOutMap.get(s.storyId) ?? 0,
      daysInState: stateEntryDate.has(s.storyId)
        ? daysBetween(stateEntryDate.get(s.storyId)!, now)
        : 0,
    }))
    .sort((a, b) => {
      const pDiff = priorityRank(a.priority) - priorityRank(b.priority)
      if (pDiff !== 0) return pDiff
      return b.fanOut - a.fanOut
    })
    .slice(0, 30)

  // --- Plan Progress ---
  const plansResult = await getPlans({
    page: 1,
    limit: 100,
    excludeCompleted: true,
  })

  const planProgress = plansResult.data.map(p => {
    const lastActivity = p.lastStoryActivityAt ? new Date(p.lastStoryActivityAt) : null
    const daysSinceActivity = lastActivity ? daysBetween(lastActivity, now) : null

    let health: 'green' | 'yellow' | 'red' = 'green'
    if (p.blockedStories > 0) health = 'red'
    else if (daysSinceActivity !== null && daysSinceActivity > 14) health = 'red'
    else if (daysSinceActivity !== null && daysSinceActivity > 7) health = 'yellow'

    return {
      planSlug: p.planSlug,
      title: p.title,
      status: p.status,
      priority: p.priority,
      totalStories: p.totalStories,
      completedStories: p.completedStories,
      activeStories: p.activeStories,
      blockedStories: p.blockedStories,
      daysSinceActivity,
      health,
    }
  })

  // --- Aging Stories ---
  const agingStories = allStoryRows
    .map(s => ({
      storyId: s.storyId,
      title: s.title,
      state: s.state ?? 'backlog',
      daysInState: stateEntryDate.has(s.storyId)
        ? daysBetween(stateEntryDate.get(s.storyId)!, now)
        : 0,
      plans: plansByStory.get(s.storyId) ?? [],
    }))
    .sort((a, b) => b.daysInState - a.daysInState)
    .slice(0, 15)

  // --- Impact Ranking ---
  const impactRanking = allStoryRows
    .map(s => ({
      storyId: s.storyId,
      title: s.title,
      state: s.state,
      priority: s.priority,
      fanOut: fanOutMap.get(s.storyId) ?? 0,
      plans: plansByStory.get(s.storyId) ?? [],
    }))
    .sort((a, b) => b.fanOut - a.fanOut)
    .slice(0, 15)

  // --- Backlog Summary & Aging ---
  const backlogSummary = buildBacklogSummary(backlogSummaryRows)
  const backlogAging = buildBacklogAging(backlogAgingRows)

  return {
    flowHealth: { totalStories, distribution, blockedCount },
    unblockedQueue,
    planProgress,
    agingStories,
    impactRanking,
    backlogSummary,
    backlogAging,
  }
}
