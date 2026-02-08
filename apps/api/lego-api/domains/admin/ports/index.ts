import type { Result } from '@repo/api-core'
import type {
  CognitoUser,
  UserListResponse,
  AuditLogEntry,
  AuditActionType,
  AuditResult,
} from '../types.js'

/**
 * Admin Domain Ports
 *
 * These interfaces define what the domain needs from infrastructure.
 * Implementations (adapters) are in cognito-client.ts and repositories.ts.
 */

// ─────────────────────────────────────────────────────────────────────────
// Cognito User Port
// ─────────────────────────────────────────────────────────────────────────

export interface CognitoUserPort {
  /**
   * List users from Cognito with optional pagination
   *
   * @param limit - Maximum number of users to return (max 60)
   * @param paginationToken - Token for next page of results
   */
  listUsers(
    limit: number,
    paginationToken?: string,
  ): Promise<Result<UserListResponse, 'COGNITO_ERROR'>>

  /**
   * Search users by email prefix
   *
   * @param emailPrefix - Email prefix to search for
   * @param limit - Maximum number of users to return
   */
  searchUsersByEmail(
    emailPrefix: string,
    limit: number,
  ): Promise<Result<UserListResponse, 'COGNITO_ERROR'>>

  /**
   * Get a single user by their Cognito user ID (sub)
   *
   * @param userId - Cognito user ID (sub claim)
   */
  getUser(userId: string): Promise<Result<CognitoUser, 'NOT_FOUND' | 'COGNITO_ERROR'>>

  /**
   * Globally sign out a user (invalidate all refresh tokens)
   *
   * @param userId - Cognito user ID (sub claim)
   */
  globalSignOut(userId: string): Promise<Result<void, 'NOT_FOUND' | 'COGNITO_ERROR'>>
}

// ─────────────────────────────────────────────────────────────────────────
// Audit Log Repository Port
// ─────────────────────────────────────────────────────────────────────────

export interface AuditLogRepository {
  /**
   * Create a new audit log entry
   */
  create(entry: {
    adminUserId: string
    actionType: AuditActionType
    targetUserId?: string
    reason?: string
    details?: Record<string, unknown>
    result: AuditResult
    errorMessage?: string
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLogEntry>

  /**
   * List audit log entries with optional filters
   */
  list(options: {
    limit: number
    targetUserId?: string
    actionType?: string
  }): Promise<AuditLogEntry[]>

  /**
   * Get audit log entries for a specific target user
   */
  findByTargetUserId(targetUserId: string, limit: number): Promise<AuditLogEntry[]>
}

// ─────────────────────────────────────────────────────────────────────────
// User Quota Repository Port (for suspension status)
// ─────────────────────────────────────────────────────────────────────────

export interface UserQuotaReadPort {
  /**
   * Get user quota record by user ID
   * Returns suspension status and tier information
   */
  findByUserId(userId: string): Promise<{
    tier: string
    isSuspended: boolean
    suspendedAt: Date | null
    suspendedReason: string | null
  } | null>
}
