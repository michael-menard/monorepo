/**
 * Dashboard API Integration
 * RTK Query endpoints for dashboard statistics and recent MOCs
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createLogger } from '@repo/logger'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

const logger = createLogger('api-client:dashboard')

/**
 * Dashboard statistics Zod schema
 * Story 2.3: Stats Endpoint Integration
 */
export const DashboardStatsSchema = z.object({
  totalMocs: z.number().int().nonnegative(),
  wishlistCount: z.number().int().nonnegative(),
  themeCount: z.number().int().nonnegative(),
  lastUpdated: z.string().datetime(),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

/**
 * Recent MOC summary Zod schema
 * Story 2.4: Recent MOCs Endpoint Integration
 * Story 3.1.39: Added slug for edit navigation
 */
export const RecentMocSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().nullable(), // Story 3.1.39: For edit link navigation
  thumbnail: z.string().url().nullable(),
  createdAt: z.string().datetime(),
})

export type RecentMoc = z.infer<typeof RecentMocSchema>

/**
 * Dashboard API response wrapper schema
 */
export const DashboardResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    performance: z
      .object({
        duration: z.number().nonnegative(),
        cached: z.boolean(),
      })
      .optional(),
  })

export type DashboardResponse<T> = {
  data: T
  performance?: {
    duration: number
    cached: boolean
  }
}

/**
 * Dashboard API slice with RTK Query
 */
export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['DashboardStats', 'RecentMocs'],
  endpoints: builder => ({
    /**
     * Get dashboard statistics
     * Story 2.3: Stats Endpoint Integration
     */
    getStats: builder.query<DashboardResponse<DashboardStats>, void>({
      query: () => '/dashboard/stats',
      providesTags: ['DashboardStats'],
      ...getServerlessCacheConfig('medium'),
      transformResponse: (response: unknown) => {
        // Validate response with Zod schema
        // Using .parse() for fail-fast validation (QA Note: ERROR-001 - intentional)
        // Rationale: API contract violations should fail immediately rather than silently
        // return malformed data. RTK Query handles errors gracefully in consuming components.
        const validatedStats = DashboardStatsSchema.parse(response)
        logger.debug('Dashboard stats fetched', undefined, { stats: validatedStats })
        // Note: Performance metrics tracked by baseQuery performanceMonitor
        // performance field omitted as we don't have access to real metrics here
        return {
          data: validatedStats,
        }
      },
    }),

    /**
     * Get recent MOCs for dashboard
     * Story 2.4: Recent MOCs Endpoint Integration
     */
    getRecentMocs: builder.query<DashboardResponse<RecentMoc[]>, number | void>({
      query: (limit = 5) => `/dashboard/recent?limit=${limit}`,
      providesTags: ['RecentMocs'],
      ...getServerlessCacheConfig('short'),
      transformResponse: (response: unknown) => {
        // Validate response with Zod schema
        // Using .parse() for fail-fast validation (QA Note: ERROR-001 - intentional)
        // Rationale: API contract violations should fail immediately rather than silently
        // return malformed data. RTK Query handles errors gracefully in consuming components.
        const validatedMocs = z.array(RecentMocSchema).parse(response)
        logger.debug('Recent MOCs fetched', undefined, { count: validatedMocs.length })
        // Note: Performance metrics tracked by baseQuery performanceMonitor
        // performance field omitted as we don't have access to real metrics here
        return {
          data: validatedMocs,
        }
      },
    }),

    /**
     * Refresh dashboard data (invalidates all dashboard caches)
     */
    refreshDashboard: builder.mutation<void, void>({
      queryFn: () => ({ data: undefined }),
      invalidatesTags: ['DashboardStats', 'RecentMocs'],
    }),
  }),
})

// Export hooks for use in components
export const { useGetStatsQuery, useGetRecentMocsQuery, useRefreshDashboardMutation } = dashboardApi

// Export reducer and middleware for store configuration
export const dashboardApiReducer = dashboardApi.reducer
export const dashboardApiMiddleware = dashboardApi.middleware
