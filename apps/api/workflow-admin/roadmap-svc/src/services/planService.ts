import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { plans, type Plan } from '@repo/database-schema/schema'
import { eq, desc, sql, type SQL } from 'drizzle-orm'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://kbuser:TestPassword123!@localhost:5433/knowledgebase',
})

export const database = drizzle(pool)

export interface PlanListParams {
  page: number
  limit: number
  status?: string
  planType?: string
  priority?: string
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
  const { page, limit, status, planType, priority } = params
  const offset = (page - 1) * limit

  const conditions: SQL[] = []

  if (status) {
    conditions.push(eq(plans.status, status))
  }

  if (planType) {
    conditions.push(eq(plans.planType, planType))
  }

  if (priority) {
    conditions.push(eq(plans.priority, priority))
  }

  const whereClause =
    conditions.length > 0
      ? (conditions.reduce((acc, c) => sql`${acc} AND ${c}`, sql``) as SQL)
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
