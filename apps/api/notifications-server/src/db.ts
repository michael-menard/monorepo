import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { env } from './env'
import type { NotificationEvent } from './__types__'

let pool: Pool | null = null

export function initDb(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: env.DATABASE_URL })
    pool.on('error', err => {
      logger.warn('PostgreSQL pool error', { err })
    })
  }
  return pool
}

export async function closeDb() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export function isDbConnected(): boolean {
  return pool !== null
}

function getPool(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return pool
}

export async function persistNotification(userId: string, event: NotificationEvent) {
  const db = getPool()
  await db.query(
    `INSERT INTO notifications (id, user_id, channel, type, severity, title, message, data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO NOTHING`,
    [
      event.id,
      userId,
      event.channel,
      event.type,
      event.severity,
      event.title,
      event.message ?? '',
      JSON.stringify(event.data ?? {}),
      event.timestamp ?? new Date().toISOString(),
    ],
  )
}

export async function getUserNotifications(
  userId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ notifications: any[]; total: number; page: number; limit: number }> {
  const db = getPool()
  const offset = (page - 1) * limit

  try {
    const result = await db.query(
      `SELECT id, channel, type, severity, title, message, data, read_at, created_at,
              COUNT(*) OVER() AS total_count
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    )

    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0
    const notifications = result.rows.map(row => ({
      id: row.id,
      channel: row.channel,
      type: row.type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read_at !== null,
      createdAt: row.created_at,
    }))

    return { notifications, total, page, limit }
  } catch (err) {
    logger.warn('Failed to get user notifications from DB', { userId, err })
    return { notifications: [], total: 0, page, limit }
  }
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const db = getPool()

  try {
    const result = await db.query(
      `UPDATE notifications SET read_at = now()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
      [notificationId, userId],
    )
    return (result.rowCount ?? 0) > 0
  } catch (err) {
    logger.warn('Failed to mark notification as read in DB', { userId, notificationId, err })
    return false
  }
}

export async function getUserPreferences(
  userId: string,
): Promise<{ channel: string; enabled: boolean; min_severity: string }[]> {
  const db = getPool()

  try {
    const result = await db.query(
      `SELECT channel, enabled, min_severity FROM notification_preferences WHERE user_id = $1`,
      [userId],
    )
    return result.rows
  } catch (err) {
    logger.warn('Failed to get user preferences from DB', { userId, err })
    return []
  }
}

export async function setUserPreferences(
  userId: string,
  preferences: { channel: string; enabled?: boolean; min_severity?: string }[],
): Promise<boolean> {
  const db = getPool()

  try {
    for (const pref of preferences) {
      await db.query(
        `INSERT INTO notification_preferences (user_id, channel, enabled, min_severity, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (user_id, channel) DO UPDATE
           SET enabled = EXCLUDED.enabled,
               min_severity = EXCLUDED.min_severity,
               updated_at = now()`,
        [userId, pref.channel, pref.enabled ?? true, pref.min_severity ?? 'info'],
      )
    }
    return true
  } catch (err) {
    logger.warn('Failed to set user preferences in DB', { userId, err })
    return false
  }
}
