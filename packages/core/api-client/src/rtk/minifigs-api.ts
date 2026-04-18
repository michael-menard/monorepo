/**
 * Minifigs Collection API
 *
 * RTK Query endpoints for minifig instance CRUD, archetypes, and variants.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  MinifigListResponseSchema,
  MinifigInstanceSchema,
  type MinifigListResponse,
  type MinifigInstance,
  type MinifigListQuery,
  type MinifigVariant,
  type MinifigArchetype,
  type UpdateMinifigInstanceInput,
} from '../schemas/minifigs'
import { createServerlessBaseQuery } from './base-query'

export const minifigsApi = createApi({
  reducerPath: 'minifigsApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['Minifig', 'MinifigList', 'MinifigVariant', 'MinifigArchetype'],
  endpoints: builder => ({
    /**
     * GET /minifigs
     */
    getMinifigs: builder.query<MinifigListResponse, Partial<MinifigListQuery>>({
      query: params => ({
        url: '/minifigs',
        params: {
          search: params.search,
          status: params.status,
          condition: params.condition,
          sourceType: params.sourceType,
          tags: params.tags?.join(','),
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: (response: unknown) => MinifigListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Minifig' as const, id })),
              { type: 'MinifigList' },
            ]
          : [{ type: 'MinifigList' }],
    }),

    /**
     * GET /minifigs/:id
     */
    getMinifigById: builder.query<MinifigInstance, string>({
      query: id => ({ url: `/minifigs/${id}` }),
      transformResponse: (response: unknown) => MinifigInstanceSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Minifig', id }],
    }),

    /**
     * PATCH /minifigs/:id
     */
    updateMinifig: builder.mutation<
      MinifigInstance,
      { id: string; body: UpdateMinifigInstanceInput }
    >({
      query: ({ id, body }) => ({
        url: `/minifigs/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Minifig', id },
        { type: 'MinifigList' },
      ],
    }),

    /**
     * PATCH /minifigs/variants/:id
     */
    updateVariant: builder.mutation<
      MinifigVariant,
      { id: string; body: { theme?: string | null; subtheme?: string | null } }
    >({
      query: ({ id, body }) => ({
        url: `/minifigs/variants/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MinifigVariant', id },
        { type: 'Minifig' },
        { type: 'MinifigList' },
      ],
    }),

    /**
     * DELETE /minifigs/:id
     */
    deleteMinifig: builder.mutation<void, { id: string; displayName?: string }>({
      query: ({ id }) => ({
        url: `/minifigs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'MinifigList' }],
    }),

    /**
     * GET /minifigs/archetypes
     */
    getArchetypes: builder.query<MinifigArchetype[], { search?: string }>({
      query: params => ({
        url: '/minifigs/archetypes',
        params: { search: params.search },
      }),
      providesTags: [{ type: 'MinifigArchetype' }],
    }),

    /**
     * GET /minifigs/variants
     */
    getVariants: builder.query<MinifigVariant[], { archetypeId?: string; search?: string }>({
      query: params => ({
        url: '/minifigs/variants',
        params: {
          archetypeId: params.archetypeId,
          search: params.search,
        },
      }),
      providesTags: [{ type: 'MinifigVariant' }],
    }),

    /**
     * GET /minifigs/variants/:id
     */
    getVariantById: builder.query<MinifigVariant, string>({
      query: id => ({ url: `/minifigs/variants/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'MinifigVariant', id }],
    }),
  }),
})

export const {
  useGetMinifigsQuery,
  useGetMinifigByIdQuery,
  useUpdateMinifigMutation,
  useUpdateVariantMutation,
  useDeleteMinifigMutation,
  useGetArchetypesQuery,
  useGetVariantsQuery,
  useGetVariantByIdQuery,
} = minifigsApi
