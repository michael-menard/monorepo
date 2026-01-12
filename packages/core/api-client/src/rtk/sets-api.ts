/**
 * Sets Gallery API
 *
 * RTK Query endpoints for sets gallery operations.
 * Uses Zod schemas from @repo/api-client/schemas/sets for response validation.
 *
 * Story sets-2001: Sets Gallery MVP (read-only)
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  SetListResponseSchema,
  SetSchema,
  type SetListResponse,
  type Set,
  type SetListQuery,
} from '../schemas/sets'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Sets Gallery API
 *
 * Provides list and get operations for the sets gallery.
 * Uses cookie-based authentication via credentials: 'include'.
 */
export const setsApi = createApi({
  reducerPath: 'setsApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['Set', 'SetList'],
  endpoints: builder => ({
    /**
     * GET /api/sets
     *
     * Returns paginated sets with filtering, sorting, and filters metadata.
     */
    getSets: builder.query<SetListResponse, Partial<SetListQuery>>({
      query: params => ({
        url: '/sets',
        params: {
          search: params.search,
          theme: params.theme,
          // API accepts tags as comma-separated string
          tags: params.tags?.join(','),
          isBuilt:
            typeof params.isBuilt === 'boolean' ? String(params.isBuilt) : undefined,
          sortField: params.sortField,
          sortDirection: params.sortDirection,
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: (response: unknown) => SetListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Set' as const, id })),
              { type: 'SetList' as const, id: 'LIST' },
            ]
          : [{ type: 'SetList' as const, id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /api/sets/:id
     *
     * Returns a single set by ID.
     */
    getSetById: builder.query<Set, string>({
      query: id => `/sets/${id}`,
      transformResponse: (response: unknown) => SetSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Set' as const, id }],
      ...getServerlessCacheConfig('medium'),
    }),
  }),
})

// Export hooks for use in components
export const { useGetSetsQuery, useLazyGetSetsQuery, useGetSetByIdQuery } = setsApi
