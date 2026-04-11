/**
 * Dashboard API Integration
 * RTK Query endpoint for dashboard statistics
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createLogger } from '@repo/logger'
import { createServerlessBaseQuery } from './base-query'

const logger = createLogger('api-client:dashboard')

export const DashboardStatsSchema = z.object({
  totalMocs: z.number().int().nonnegative(),
  wishlistCount: z.number().int().nonnegative(),
  themeCount: z.number().int().nonnegative(),
  lastUpdated: z.string(),
})

export type DashboardStats = z.infer<typeof DashboardStatsSchema>

export const ThemeBreakdownItemSchema = z.object({
  theme: z.string(),
  mocCount: z.number().int().nonnegative(),
  setCount: z.number().int().nonnegative(),
})

export const RecentMocSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable(),
  thumbnail: z.string().nullable(),
  theme: z.string(),
  createdAt: z.string(),
})

export type RecentMoc = z.infer<typeof RecentMocSchema>

export const ActivityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['added', 'built', 'wishlist', 'progress']),
  message: z.string(),
  timestamp: z.string(),
})

export type ActivityItem = z.infer<typeof ActivityItemSchema>

export const DashboardDataSchema = z.object({
  stats: DashboardStatsSchema,
  themeBreakdown: z.array(ThemeBreakdownItemSchema),
  recentMocs: z.array(RecentMocSchema),
  activityFeed: z.array(ActivityItemSchema),
})

export type DashboardData = z.infer<typeof DashboardDataSchema>

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['Dashboard'],
  endpoints: builder => ({
    /**
     * GET /dashboard/stats — all dashboard data in one call
     * Polls every 10 seconds for responsive feel
     */
    getDashboardData: builder.query<DashboardData, void>({
      query: () => '/dashboard/stats',
      providesTags: ['Dashboard'],
      transformResponse: (response: unknown) => {
        const validated = DashboardDataSchema.parse(response)
        logger.debug('Dashboard data fetched', undefined, {
          totalMocs: validated.stats.totalMocs,
          themes: validated.themeBreakdown.length,
          recentMocs: validated.recentMocs.length,
        })
        return validated
      },
    }),

    /** Refresh dashboard data (invalidates cache) */
    refreshDashboard: builder.mutation<void, void>({
      queryFn: () => ({ data: undefined }),
      invalidatesTags: ['Dashboard'],
    }),
  }),
})

export const { useGetDashboardDataQuery, useRefreshDashboardMutation } = dashboardApi

export const dashboardApiReducer = dashboardApi.reducer
export const dashboardApiMiddleware = dashboardApi.middleware
