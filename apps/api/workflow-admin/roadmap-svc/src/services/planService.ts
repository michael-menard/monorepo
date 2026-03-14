import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { plans, planDetails, type Plan } from '@repo/database-schema/schema'
import { eq, desc, sql, inArray, type SQL, and, or, like } from 'drizzle-orm'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})

export const database = drizzle(pool)

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
    .orderBy(desc(plans.createdAt))
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
