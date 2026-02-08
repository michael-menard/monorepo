/**
 * Permissions API Integration
 * RTK Query endpoints for user permissions, features, and quotas
 *
 * Cognito Scopes / Authorization System
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'
import {
  UserPermissionsSchema,
  UserQuotasSchema,
  FeaturesResponseSchema,
  type UserPermissions,
  type UserQuotas,
  type FeaturesResponse,
} from '../schemas/permissions'

const logger = createLogger('api-client:permissions')

/**
 * Permissions API slice with RTK Query
 *
 * Provides access to user permissions, features, and quotas from the
 * authorization backend. Uses cookie-based authentication (credentials: include).
 */
export const permissionsApi = createApi({
  reducerPath: 'permissionsApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['Permissions', 'Quotas', 'Features'],
  endpoints: builder => ({
    /**
     * Get full user permissions
     *
     * Returns complete permissions object including:
     * - User tier (free-tier, pro-tier, power-tier, admin)
     * - Available features
     * - Current quotas and usage
     * - Active addons
     * - Admin/adult/suspended status
     */
    getPermissions: builder.query<UserPermissions, void>({
      query: () => '/authorization/me/permissions',
      providesTags: ['Permissions'],
      ...getServerlessCacheConfig('medium'),
      transformResponse: (response: unknown) => {
        const validated = UserPermissionsSchema.parse(response)
        logger.debug('Permissions fetched', undefined, {
          tier: validated.tier,
          features: validated.features.length,
          isAdmin: validated.isAdmin,
        })
        return validated
      },
    }),

    /**
     * Get user quotas only
     *
     * Lighter-weight endpoint that returns only quota information.
     * Use this when you only need to check/display quota usage.
     */
    getQuotas: builder.query<UserQuotas, void>({
      query: () => '/authorization/me/quotas',
      providesTags: ['Quotas'],
      ...getServerlessCacheConfig('short'), // Shorter cache since quotas change frequently
      transformResponse: (response: unknown) => {
        const validated = UserQuotasSchema.parse(response)
        logger.debug('Quotas fetched', undefined, {
          mocs: `${validated.mocs.current}/${validated.mocs.limit ?? '∞'}`,
          storage: `${validated.storage.current}/${validated.storage.limit ?? '∞'} MB`,
        })
        return validated
      },
    }),

    /**
     * Get user features only
     *
     * Lighter-weight endpoint that returns only feature list.
     * Use this when you only need to check feature access.
     */
    getFeatures: builder.query<FeaturesResponse, void>({
      query: () => '/authorization/me/features',
      providesTags: ['Features'],
      ...getServerlessCacheConfig('medium'),
      transformResponse: (response: unknown) => {
        const validated = FeaturesResponseSchema.parse(response)
        logger.debug('Features fetched', undefined, { count: validated.features.length })
        return validated
      },
    }),

    /**
     * Invalidate permissions cache
     *
     * Use this after operations that may change permissions:
     * - Tier upgrade/downgrade
     * - Addon purchase
     * - Creating/deleting resources (affects quotas)
     */
    invalidatePermissions: builder.mutation<void, void>({
      queryFn: () => ({ data: undefined }),
      invalidatesTags: ['Permissions', 'Quotas', 'Features'],
    }),

    /**
     * Invalidate quotas cache only
     *
     * Use this after operations that change quotas but not features/tier:
     * - Creating a new MOC
     * - Deleting a gallery
     * - Uploading files (storage)
     */
    invalidateQuotas: builder.mutation<void, void>({
      queryFn: () => ({ data: undefined }),
      invalidatesTags: ['Quotas'],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetPermissionsQuery,
  useGetQuotasQuery,
  useGetFeaturesQuery,
  useInvalidatePermissionsMutation,
  useInvalidateQuotasMutation,
} = permissionsApi

// Export reducer and middleware for store configuration
export const permissionsApiReducer = permissionsApi.reducer
export const permissionsApiMiddleware = permissionsApi.middleware
