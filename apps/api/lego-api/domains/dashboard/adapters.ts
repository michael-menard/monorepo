import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '@repo/db'
import type {
  DashboardRepository,
  DashboardStats,
  ThemeBreakdownItem,
  RecentMoc,
  ActivityItem,
} from './ports.js'

type Schema = typeof schema

export function createDashboardRepository(
  db: NodePgDatabase<Schema>,
  _schema: Schema,
): DashboardRepository {
  return {
    async getStats(userId: string): Promise<DashboardStats> {
      const result = await db.execute(sql`
        SELECT
          (SELECT COUNT(*)::int FROM moc_instructions WHERE user_id = ${userId}) AS total_mocs,
          (SELECT COUNT(*)::int FROM wishlist_items WHERE user_id = ${userId}) AS wishlist_count,
          (SELECT COUNT(DISTINCT tm.theme)::int
           FROM moc_instructions mi,
                jsonb_array_elements_text(mi.tags) AS t
           JOIN tag_theme_mappings tm ON LOWER(t) = LOWER(tm.tag)
           WHERE mi.user_id = ${userId}
          ) AS theme_count,
          (SELECT MAX(updated_at) FROM moc_instructions WHERE user_id = ${userId}) AS last_updated
      `)
      const row = result.rows[0] as any
      return {
        totalMocs: row?.total_mocs ?? 0,
        wishlistCount: row?.wishlist_count ?? 0,
        themeCount: row?.theme_count ?? 0,
        lastUpdated: row?.last_updated ? new Date(row.last_updated).toISOString() : null,
      }
    },

    async getThemeBreakdown(userId: string): Promise<ThemeBreakdownItem[]> {
      const result = await db.execute(sql`
        SELECT tm.theme, COUNT(DISTINCT mi.id)::int AS moc_count, 0 AS set_count
        FROM moc_instructions mi,
             jsonb_array_elements_text(mi.tags) AS t
        JOIN tag_theme_mappings tm ON LOWER(t) = LOWER(tm.tag)
        WHERE mi.user_id = ${userId}
        GROUP BY tm.theme
        ORDER BY moc_count DESC
        LIMIT 10
      `)
      return result.rows.map((row: any) => ({
        theme: row.theme,
        mocCount: row.moc_count,
        setCount: row.set_count,
      }))
    },

    async getRecentMocs(userId: string, limit: number): Promise<RecentMoc[]> {
      const result = await db.execute(sql`
        SELECT id, title, slug, thumbnail_url, created_at
        FROM moc_instructions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `)
      return result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        thumbnailS3Key: row.thumbnail_url,
        theme: null,
        createdAt: new Date(row.created_at).toISOString(),
      }))
    },

    async getActivityFeed(userId: string, limit: number): Promise<ActivityItem[]> {
      const result = await db.execute(sql`
        SELECT id, title, type, timestamp FROM (
          SELECT id, title, 'added' AS type, created_at AS timestamp
          FROM moc_instructions WHERE user_id = ${userId}
          UNION ALL
          SELECT id, title, 'progress' AS type, updated_at AS timestamp
          FROM moc_instructions WHERE user_id = ${userId} AND updated_at > created_at + interval '1 minute'
        ) combined
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `)
      return result.rows.map((row: any) => ({
        id: row.id,
        type: row.type as 'added' | 'progress',
        message: row.type === 'added' ? `Added: ${row.title}` : `Updated: ${row.title}`,
        timestamp: new Date(row.timestamp).toISOString(),
      }))
    },
  }
}
