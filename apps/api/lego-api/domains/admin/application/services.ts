import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { CognitoUserPort, AuditLogRepository, UserQuotaReadPort } from '../ports/index.js'
import type {
  UserListResponse,
  UserDetail,
  BlockUserInput,
  AuditLogEntry,
  AdminError,
} from '../types.js'
import type { AuthorizationService } from '../../authorization/application/index.js'

/**
 * Admin Service Dependencies
 *
 * Injected via function parameters - no global state.
 */
export interface AdminServiceDeps {
  cognitoClient: CognitoUserPort
  auditRepo: AuditLogRepository
  quotaReadRepo: UserQuotaReadPort
  authService: AuthorizationService
}

/**
 * Request context for audit logging
 */
export interface RequestContext {
  ipAddress?: string
  userAgent?: string
}

/**
 * Create the Admin Service
 *
 * Pure business logic for admin user management.
 * All I/O is done through injected ports.
 */
export function createAdminService(deps: AdminServiceDeps) {
  const { cognitoClient, auditRepo, quotaReadRepo, authService } = deps

  return {
    /**
     * List users with optional pagination
     */
    async listUsers(
      adminUserId: string,
      limit: number,
      paginationToken?: string,
      context?: RequestContext,
    ): Promise<Result<UserListResponse, AdminError>> {
      // Log the action
      await auditRepo.create({
        adminUserId,
        actionType: 'search',
        details: { limit, hasPaginationToken: !!paginationToken },
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      const result = await cognitoClient.listUsers(limit, paginationToken)

      if (!result.ok) {
        return err('COGNITO_ERROR')
      }

      return ok(result.data)
    },

    /**
     * Search users by email prefix
     */
    async searchUsers(
      adminUserId: string,
      emailPrefix: string,
      limit: number = 20,
      context?: RequestContext,
    ): Promise<Result<UserListResponse, AdminError>> {
      // Log the action
      await auditRepo.create({
        adminUserId,
        actionType: 'search',
        details: { emailPrefix, limit },
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      const result = await cognitoClient.searchUsersByEmail(emailPrefix, limit)

      if (!result.ok) {
        return err('COGNITO_ERROR')
      }

      return ok(result.data)
    },

    /**
     * Get detailed user information (Cognito + database)
     */
    async getUserDetail(
      adminUserId: string,
      targetUserId: string,
      context?: RequestContext,
    ): Promise<Result<UserDetail, AdminError>> {
      // Get Cognito user
      const cognitoResult = await cognitoClient.getUser(targetUserId)

      if (!cognitoResult.ok) {
        await auditRepo.create({
          adminUserId,
          actionType: 'view',
          targetUserId,
          result: 'failure',
          errorMessage: cognitoResult.error,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err(cognitoResult.error === 'NOT_FOUND' ? 'NOT_FOUND' : 'COGNITO_ERROR')
      }

      // Get database user info
      const quotaInfo = await quotaReadRepo.findByUserId(targetUserId)

      // Log successful view
      await auditRepo.create({
        adminUserId,
        actionType: 'view',
        targetUserId,
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      // Combine Cognito and database data
      const userDetail: UserDetail = {
        ...cognitoResult.data,
        tier: quotaInfo?.tier ?? null,
        isSuspended: quotaInfo?.isSuspended ?? false,
        suspendedAt: quotaInfo?.suspendedAt ?? null,
        suspendedReason: quotaInfo?.suspendedReason ?? null,
      }

      return ok(userDetail)
    },

    /**
     * Revoke all refresh tokens for a user
     */
    async revokeTokens(
      adminUserId: string,
      targetUserId: string,
      context?: RequestContext,
    ): Promise<Result<void, AdminError>> {
      const result = await cognitoClient.globalSignOut(targetUserId)

      if (!result.ok) {
        await auditRepo.create({
          adminUserId,
          actionType: 'revoke_tokens',
          targetUserId,
          result: 'failure',
          errorMessage: result.error,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err(result.error === 'NOT_FOUND' ? 'NOT_FOUND' : 'COGNITO_ERROR')
      }

      await auditRepo.create({
        adminUserId,
        actionType: 'revoke_tokens',
        targetUserId,
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      logger.info('Admin revoked user tokens', { adminUserId, targetUserId })
      return ok(undefined)
    },

    /**
     * Block a user account
     */
    async blockUser(
      adminUserId: string,
      targetUserId: string,
      input: BlockUserInput,
      context?: RequestContext,
    ): Promise<Result<void, AdminError>> {
      // Check if user exists in Cognito first
      const userResult = await cognitoClient.getUser(targetUserId)
      if (!userResult.ok) {
        await auditRepo.create({
          adminUserId,
          actionType: 'block',
          targetUserId,
          reason: input.reason,
          result: 'failure',
          errorMessage: 'User not found',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('NOT_FOUND')
      }

      // Check if already suspended
      const quotaInfo = await quotaReadRepo.findByUserId(targetUserId)
      if (quotaInfo?.isSuspended) {
        await auditRepo.create({
          adminUserId,
          actionType: 'block',
          targetUserId,
          reason: input.reason,
          result: 'failure',
          errorMessage: 'User already blocked',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('USER_ALREADY_BLOCKED')
      }

      // Build suspension reason
      const suspensionReason = input.notes ? `${input.reason}: ${input.notes}` : input.reason

      // Suspend the user using the authorization service
      const suspendResult = await authService.suspendUser(targetUserId, suspensionReason)

      if (!suspendResult.ok) {
        await auditRepo.create({
          adminUserId,
          actionType: 'block',
          targetUserId,
          reason: input.reason,
          details: { notes: input.notes },
          result: 'failure',
          errorMessage: suspendResult.error,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('DB_ERROR')
      }

      // Also revoke all their tokens
      await cognitoClient.globalSignOut(targetUserId)

      await auditRepo.create({
        adminUserId,
        actionType: 'block',
        targetUserId,
        reason: input.reason,
        details: { notes: input.notes },
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      logger.info('Admin blocked user', { adminUserId, targetUserId, reason: input.reason })
      return ok(undefined)
    },

    /**
     * Unblock a user account
     */
    async unblockUser(
      adminUserId: string,
      targetUserId: string,
      context?: RequestContext,
    ): Promise<Result<void, AdminError>> {
      // Check if user exists
      const quotaInfo = await quotaReadRepo.findByUserId(targetUserId)
      if (!quotaInfo) {
        await auditRepo.create({
          adminUserId,
          actionType: 'unblock',
          targetUserId,
          result: 'failure',
          errorMessage: 'User not found',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('NOT_FOUND')
      }

      // Check if actually suspended
      if (!quotaInfo.isSuspended) {
        await auditRepo.create({
          adminUserId,
          actionType: 'unblock',
          targetUserId,
          result: 'failure',
          errorMessage: 'User not blocked',
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('USER_NOT_BLOCKED')
      }

      // Unsuspend the user using the authorization service
      const unsuspendResult = await authService.unsuspendUser(targetUserId)

      if (!unsuspendResult.ok) {
        await auditRepo.create({
          adminUserId,
          actionType: 'unblock',
          targetUserId,
          result: 'failure',
          errorMessage: unsuspendResult.error,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        })
        return err('DB_ERROR')
      }

      await auditRepo.create({
        adminUserId,
        actionType: 'unblock',
        targetUserId,
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      logger.info('Admin unblocked user', { adminUserId, targetUserId })
      return ok(undefined)
    },

    /**
     * Get audit log entries
     */
    async getAuditLog(
      adminUserId: string,
      options: {
        limit: number
        targetUserId?: string
        actionType?: string
      },
      context?: RequestContext,
    ): Promise<AuditLogEntry[]> {
      // Log that admin viewed the audit log
      await auditRepo.create({
        adminUserId,
        actionType: 'view',
        details: { viewedAuditLog: true, filters: options },
        result: 'success',
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      })

      return auditRepo.list(options)
    },
  }
}

// Export the service type for use in routes
export type AdminService = ReturnType<typeof createAdminService>
