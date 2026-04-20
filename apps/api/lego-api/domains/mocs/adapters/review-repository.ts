import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '@repo/db'
import type { MocReview, MocReviewRepository } from '../ports/index.js'

type Schema = typeof schema

export function createMocReviewRepository(
  db: NodePgDatabase<Schema>,
  dbSchema: Schema,
): MocReviewRepository {
  const { mocReviews } = dbSchema

  return {
    async create(mocId: string, userId: string): Promise<MocReview> {
      const [row] = await db
        .insert(mocReviews)
        .values({ mocId, userId, status: 'draft', sections: {} })
        .returning()

      return mapRow(row)
    },

    async findByMocAndUser(mocId: string, userId: string): Promise<MocReview | null> {
      const result = await db.query.mocReviews.findFirst({
        where: and(eq(mocReviews.mocId, mocId), eq(mocReviews.userId, userId)),
      })

      return result ? mapRow(result) : null
    },

    async update(
      mocId: string,
      userId: string,
      data: { sections?: Record<string, unknown>; status?: string },
    ): Promise<MocReview> {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (data.sections !== undefined) updateData.sections = data.sections
      if (data.status !== undefined) updateData.status = data.status

      const [row] = await db
        .update(mocReviews)
        .set(updateData)
        .where(and(eq(mocReviews.mocId, mocId), eq(mocReviews.userId, userId)))
        .returning()

      return mapRow(row)
    },
  }
}

function mapRow(row: typeof schema.mocReviews.$inferSelect): MocReview {
  return {
    id: row.id,
    mocId: row.mocId,
    userId: row.userId,
    status: row.status,
    sections: (row.sections as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
