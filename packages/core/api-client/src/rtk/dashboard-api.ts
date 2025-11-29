/**
 * Dashboard API Integration
 * RTK Query endpoints for dashboard statistics and recent MOCs
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'
import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:dashboard')

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  totalMocs: number
  wishlistCount: number
  themeCount: number
  lastUpdated: string
}

/**
 * Recent MOC summary for dashboard display
 */
export interface RecentMoc {
  id: string
  title: string
  thumbnail: string | null
  createdAt: string
}

/**
 * Dashboard API response wrapper
 */
export interface DashboardResponse<T> {
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
      transformResponse: (response: DashboardStats) => {
        logger.debug('Dashboard stats fetched', undefined, { stats: response })
        return {
          data: response,
          performance: {
            duration: 0,
            cached: false,
          },
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
      transformResponse: (response: RecentMoc[]) => {
        logger.debug('Recent MOCs fetched', undefined, { count: response.length })
        return {
          data: response,
          performance: {
            duration: 0,
            cached: false,
          },
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
