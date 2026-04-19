/**
 * Dashboard API Integration
 * RTK Query endpoint for dashboard statistics
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import { createLogger } from '@repo/logger'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import { createServerlessBaseQuery } from './base-query'

const logger = createLogger('api-client:dashboard')

export const DashboardStatsSchema = z.object({
  totalMocs: z.number().int().nonnegative(),
  wishlistCount: z.number().int().nonnegative(),
  ownedSetsCount: z.number().int().nonnegative(),
  ownedMinifigsCount: z.number().int().nonnegative(),
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

// Tag-theme mapping schemas (many-to-many: a tag can belong to multiple themes)
export const TagWithThemesSchema = z.object({
  tag: z.string(),
  themes: z.array(z.string()),
  mocCount: z.number().int().nonnegative(),
})

export type TagWithThemes = z.infer<typeof TagWithThemesSchema>

const UserTagsResponseSchema = z.object({
  tags: z.array(TagWithThemesSchema),
})

const ThemesResponseSchema = z.object({
  themes: z.array(z.string()),
})

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    priority: 'high',
  }),
  tagTypes: ['Dashboard', 'TagThemes'],
  endpoints: builder => ({
    /**
     * GET /dashboard/stats — all dashboard data in one call
     * Polls every 10 seconds for responsive feel
     */
    getDashboardData: builder.query<DashboardData, void>({
      query: () => SERVERLESS_ENDPOINTS.DASHBOARD.STATS,
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

    /**
     * GET /dashboard/tags — all user tags with theme mappings and MOC counts
     */
    getUserTags: builder.query<TagWithThemes[], void>({
      query: () => SERVERLESS_ENDPOINTS.DASHBOARD.TAGS,
      providesTags: ['TagThemes'],
      transformResponse: (response: unknown) => {
        const validated = UserTagsResponseSchema.parse(response)
        return validated.tags
      },
    }),

    /**
     * GET /dashboard/themes — distinct theme names
     */
    getDistinctThemes: builder.query<string[], void>({
      query: () => SERVERLESS_ENDPOINTS.DASHBOARD.THEMES,
      providesTags: ['TagThemes'],
      transformResponse: (response: unknown) => {
        const validated = ThemesResponseSchema.parse(response)
        return validated.themes
      },
    }),

    /**
     * POST /dashboard/themes — create a new theme bucket
     */
    createTheme: builder.mutation<{ ok: boolean; name: string }, string>({
      query: name => ({
        url: SERVERLESS_ENDPOINTS.DASHBOARD.THEMES,
        method: 'POST',
        body: { name },
      }),
      invalidatesTags: ['TagThemes'],
    }),

    /**
     * DELETE /dashboard/themes/:name — delete a theme and its mappings
     */
    deleteTheme: builder.mutation<{ ok: boolean }, string>({
      query: name => ({
        url: buildEndpoint(SERVERLESS_ENDPOINTS.DASHBOARD.THEME, {
          name: encodeURIComponent(name),
        }),
        method: 'DELETE',
      }),
      invalidatesTags: ['Dashboard', 'TagThemes'],
    }),

    /**
     * DELETE /dashboard/tags/:tag — remove a tag globally from all MOCs
     */
    deleteTagGlobally: builder.mutation<{ ok: boolean; updatedCount: number }, string>({
      query: tag => ({
        url: buildEndpoint(SERVERLESS_ENDPOINTS.DASHBOARD.TAG, {
          tag: encodeURIComponent(tag),
        }),
        method: 'DELETE',
      }),
      invalidatesTags: ['Dashboard', 'TagThemes'],
    }),

    /**
     * POST /dashboard/tag-themes — add tag-to-theme mappings (many-to-many)
     */
    addTagThemeMappings: builder.mutation<
      { ok: boolean; count: number },
      { mappings: { tag: string; theme: string }[] }
    >({
      query: body => ({
        url: SERVERLESS_ENDPOINTS.DASHBOARD.TAG_THEMES,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Dashboard', 'TagThemes'],
    }),

    /**
     * DELETE /dashboard/tag-themes/:tag/:theme — remove a specific tag-theme pair
     */
    removeTagThemeMapping: builder.mutation<{ ok: boolean }, { tag: string; theme: string }>({
      query: ({ tag, theme }) => ({
        url: buildEndpoint(SERVERLESS_ENDPOINTS.DASHBOARD.TAG_THEME, {
          tag: encodeURIComponent(tag),
          theme: encodeURIComponent(theme),
        }),
        method: 'DELETE',
      }),
      invalidatesTags: ['Dashboard', 'TagThemes'],
    }),
  }),
})

export const {
  useGetDashboardDataQuery,
  useRefreshDashboardMutation,
  useGetUserTagsQuery,
  useGetDistinctThemesQuery,
  useDeleteTagGloballyMutation,
  useCreateThemeMutation,
  useDeleteThemeMutation,
  useAddTagThemeMappingsMutation,
  useRemoveTagThemeMappingMutation,
} = dashboardApi

export const dashboardApiReducer = dashboardApi.reducer
export const dashboardApiMiddleware = dashboardApi.middleware
