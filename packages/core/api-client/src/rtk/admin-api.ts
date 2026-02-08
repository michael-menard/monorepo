/**
 * Admin API
 *
 * RTK Query endpoints for admin user management operations.
 * Uses Zod schemas for response validation.
 *
 * Admin Panel Implementation
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  UserListResponseSchema,
  UserDetailSchema,
  SuccessResponseSchema,
  AuditLogResponseSchema,
  type UserListResponse,
  type UserDetail,
  type SuccessResponse,
  type AuditLogResponse,
  type BlockUserInput,
  type ListUsersQuery,
  type ListAuditLogQuery,
} from '../schemas/admin'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Admin API
 *
 * Provides admin user management operations.
 * Uses JWT Bearer token authentication via CognitoTokenManager.
 * Requires admin role.
 */
export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: ['AdminUser', 'AdminUserList', 'AuditLog'],
  endpoints: builder => ({
    /**
     * GET /admin/users/users
     *
     * List users with optional search by email prefix.
     * Supports pagination via paginationToken.
     */
    listUsers: builder.query<UserListResponse, ListUsersQuery | void>({
      query: params => ({
        url: '/admin/users/users',
        params: params
          ? {
              limit: params.limit,
              paginationToken: params.paginationToken,
              email: params.email,
            }
          : undefined,
      }),
      transformResponse: (response: unknown) => UserListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.users.map(user => ({ type: 'AdminUser' as const, id: user.userId })),
              { type: 'AdminUserList', id: 'LIST' },
            ]
          : [{ type: 'AdminUserList', id: 'LIST' }],
      ...getServerlessCacheConfig('short'),
    }),

    /**
     * GET /admin/users/users/:userId
     *
     * Get detailed user information (Cognito + database).
     */
    getUserDetail: builder.query<UserDetail, string>({
      query: userId => `/admin/users/users/${userId}`,
      transformResponse: (response: unknown) => UserDetailSchema.parse(response),
      providesTags: (_, __, userId) => [{ type: 'AdminUser', id: userId }],
      ...getServerlessCacheConfig('short'),
    }),

    /**
     * POST /admin/users/users/:userId/revoke-tokens
     *
     * Revoke all refresh tokens for a user.
     * Forces user to re-authenticate on all devices.
     */
    revokeTokens: builder.mutation<SuccessResponse, string>({
      query: userId => ({
        url: `/admin/users/users/${userId}/revoke-tokens`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => SuccessResponseSchema.parse(response),
      invalidatesTags: (_, __, userId) => [{ type: 'AdminUser', id: userId }],
    }),

    /**
     * POST /admin/users/users/:userId/block
     *
     * Block a user account with a reason.
     * Also revokes all their tokens.
     */
    blockUser: builder.mutation<SuccessResponse, { userId: string; input: BlockUserInput }>({
      query: ({ userId, input }) => ({
        url: `/admin/users/users/${userId}/block`,
        method: 'POST',
        body: input,
      }),
      transformResponse: (response: unknown) => SuccessResponseSchema.parse(response),
      invalidatesTags: (_, __, { userId }) => [
        { type: 'AdminUser', id: userId },
        { type: 'AdminUserList', id: 'LIST' },
      ],
    }),

    /**
     * POST /admin/users/users/:userId/unblock
     *
     * Unblock a previously blocked user account.
     */
    unblockUser: builder.mutation<SuccessResponse, string>({
      query: userId => ({
        url: `/admin/users/users/${userId}/unblock`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) => SuccessResponseSchema.parse(response),
      invalidatesTags: (_, __, userId) => [
        { type: 'AdminUser', id: userId },
        { type: 'AdminUserList', id: 'LIST' },
      ],
    }),

    /**
     * GET /admin/users/audit-log
     *
     * Get admin audit log entries with optional filters.
     */
    getAuditLog: builder.query<AuditLogResponse, ListAuditLogQuery | void>({
      query: params => ({
        url: '/admin/users/audit-log',
        params: params
          ? {
              limit: params.limit,
              targetUserId: params.targetUserId,
              actionType: params.actionType,
            }
          : undefined,
      }),
      transformResponse: (response: unknown) => AuditLogResponseSchema.parse(response),
      providesTags: [{ type: 'AuditLog', id: 'LIST' }],
      ...getServerlessCacheConfig('short'),
    }),
  }),
})

// Export hooks for use in components
export const {
  useListUsersQuery,
  useLazyListUsersQuery,
  useGetUserDetailQuery,
  useLazyGetUserDetailQuery,
  useRevokeTokensMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetAuditLogQuery,
  useLazyGetAuditLogQuery,
} = adminApi
