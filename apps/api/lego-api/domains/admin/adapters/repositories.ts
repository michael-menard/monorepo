import { desc, eq, and, type SQL } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type * as schema from '@repo/database-schema'
import type { AuditLogRepository, UserQuotaReadPort } from '../ports/index.js'
import type { AuditLogEntry, AuditActionType, AuditResult } from '../types.js'

/**
 * Create Audit Log Repository
 *
 * Drizzle ORM adapter for admin audit log operations.
 */
export function createAuditLogRepository(
  db: PostgresJsDatabase<typeof schema>,
  tables: typeof schema,
): AuditLogRepository {
  return {
    async create(entry: {
      adminUserId: string
      actionType: AuditActionType
      targetUserId?: string
      reason?: string
      details?: Record<string, unknown>
      result: AuditResult
      errorMessage?: string
      ipAddress?: string
      userAgent?: string
    }): Promise<AuditLogEntry> {
      const [row] = await db
        .insert(tables.adminAuditLog)
        .values({
          adminUserId: entry.adminUserId,
          actionType: entry.actionType,
          targetUserId: entry.targetUserId ?? null,
          reason: entry.reason ?? null,
          details: entry.details ?? null,
          result: entry.result,
          errorMessage: entry.errorMessage ?? null,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        })
        .returning()

      return {
        id: row.id,
        adminUserId: row.adminUserId,
        actionType: row.actionType as AuditActionType,
        targetUserId: row.targetUserId,
        reason: row.reason,
        details: row.details as Record<string, unknown> | null,
        result: row.result as AuditResult,
        errorMessage: row.errorMessage,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      }
    },

    async list(options: {
      limit: number
      targetUserId?: string
      actionType?: string
    }): Promise<AuditLogEntry[]> {
      const conditions: SQL<unknown>[] = []

      if (options.targetUserId) {
        conditions.push(eq(tables.adminAuditLog.targetUserId, options.targetUserId))
      }

      if (options.actionType) {
        conditions.push(eq(tables.adminAuditLog.actionType, options.actionType))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const rows = await db
        .select()
        .from(tables.adminAuditLog)
        .where(whereClause)
        .orderBy(desc(tables.adminAuditLog.createdAt))
        .limit(options.limit)

      return rows.map(row => ({
        id: row.id,
        adminUserId: row.adminUserId,
        actionType: row.actionType as AuditActionType,
        targetUserId: row.targetUserId,
        reason: row.reason,
        details: row.details as Record<string, unknown> | null,
        result: row.result as AuditResult,
        errorMessage: row.errorMessage,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      }))
    },

    async findByTargetUserId(targetUserId: string, limit: number): Promise<AuditLogEntry[]> {
      const rows = await db
        .select()
        .from(tables.adminAuditLog)
        .where(eq(tables.adminAuditLog.targetUserId, targetUserId))
        .orderBy(desc(tables.adminAuditLog.createdAt))
        .limit(limit)

      return rows.map(row => ({
        id: row.id,
        adminUserId: row.adminUserId,
        actionType: row.actionType as AuditActionType,
        targetUserId: row.targetUserId,
        reason: row.reason,
        details: row.details as Record<string, unknown> | null,
        result: row.result as AuditResult,
        errorMessage: row.errorMessage,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
      }))
    },
  }
}

/**
 * Create User Quota Read Repository
 *
 * Read-only adapter for getting user quota/suspension information.
 */
export function createUserQuotaReadRepository(
  db: PostgresJsDatabase<typeof schema>,
  tables: typeof schema,
): UserQuotaReadPort {
  return {
    async findByUserId(userId: string): Promise<{
      tier: string
      isSuspended: boolean
      suspendedAt: Date | null
      suspendedReason: string | null
    } | null> {
      const [row] = await db
        .select({
          tier: tables.userQuotas.tier,
          isSuspended: tables.userQuotas.isSuspended,
          suspendedAt: tables.userQuotas.suspendedAt,
          suspendedReason: tables.userQuotas.suspendedReason,
        })
        .from(tables.userQuotas)
        .where(eq(tables.userQuotas.userId, userId))
        .limit(1)

      if (!row) {
        return null
      }

      return {
        tier: row.tier,
        isSuspended: row.isSuspended,
        suspendedAt: row.suspendedAt,
        suspendedReason: row.suspendedReason,
      }
    },
  }
}
