import { eq, and, desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { ok, err, paginate } from '@repo/api-core'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import type { UserProfileRepository, ActivityEventRepository } from '../ports/index.js'
import type { UserProfile, ActivityEvent } from '../types.js'

type Schema = typeof import('@repo/db')

function mapRowToProfile(row: any): UserProfile {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName ?? null,
    bio: row.bio ?? null,
    avatarUrl: row.avatarUrl ?? null,
    memberSince: row.memberSince,
    preferences: (row.preferences as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapRowToActivity(row: any): ActivityEvent {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message ?? null,
    relatedId: row.relatedId ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.createdAt,
  }
}

export function createUserProfileRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): UserProfileRepository {
  const { userProfiles } = schema

  return {
    async findByUserId(userId: string): Promise<Result<UserProfile, 'NOT_FOUND'>> {
      const rows = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .limit(1)

      if (!rows[0]) return err('NOT_FOUND')
      return ok(mapRowToProfile(rows[0]))
    },

    async upsert(
      userId: string,
      data: Partial<Pick<UserProfile, 'displayName' | 'bio' | 'avatarUrl' | 'preferences'>>,
    ): Promise<UserProfile> {
      const now = new Date()
      const [row] = await db
        .insert(userProfiles)
        .values({
          userId,
          displayName: data.displayName ?? null,
          bio: data.bio ?? null,
          avatarUrl: data.avatarUrl ?? null,
          preferences: data.preferences ?? {},
          memberSince: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: {
            ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
            ...(data.bio !== undefined ? { bio: data.bio } : {}),
            ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
            ...(data.preferences !== undefined ? { preferences: data.preferences } : {}),
            updatedAt: now,
          },
        })
        .returning()

      return mapRowToProfile(row)
    },

    async updatePreferences(
      userId: string,
      preferences: Record<string, unknown>,
    ): Promise<Result<UserProfile, 'NOT_FOUND'>> {
      const [row] = await db
        .update(userProfiles)
        .set({ preferences, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning()

      if (!row) return err('NOT_FOUND')
      return ok(mapRowToProfile(row))
    },
  }
}

export function createActivityEventRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): ActivityEventRepository {
  const { activityEvents } = schema

  return {
    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      typeFilter?: string,
    ): Promise<PaginatedResult<ActivityEvent>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const conditions = [eq(activityEvents.userId, userId)]
      if (typeFilter) {
        conditions.push(eq(activityEvents.type, typeFilter))
      }

      const rows = await db
        .select()
        .from(activityEvents)
        .where(and(...conditions))
        .orderBy(desc(activityEvents.createdAt))
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(activityEvents)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      return paginate(rows.map(mapRowToActivity), total, pagination)
    },

    async insert(event: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<ActivityEvent> {
      const [row] = await db
        .insert(activityEvents)
        .values({
          userId: event.userId,
          type: event.type,
          title: event.title,
          message: event.message,
          relatedId: event.relatedId,
          metadata: event.metadata ?? {},
        })
        .returning()

      return mapRowToActivity(row)
    },
  }
}
