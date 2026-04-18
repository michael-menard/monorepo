/**
 * Unified Sets API
 *
 * RTK Query endpoints for both wishlist (wanted) and collection (owned) operations.
 * Replaces separate wishlist-gallery-api and old sets-api.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  SetListResponseSchema,
  SetSchema,
  SetImageSchema,
  ReorderResponseSchema,
  SetPartsResponseSchema,
  type SetListResponse,
  type Set,
  type SetImage,
  type SetListQuery,
  type CreateSetInput,
  type UpdateSetInput,
  type BatchReorder,
  type ReorderResponse,
  type PurchaseInput,
  type UpdateBuildStatus,
  type Store,
  type SetPartsResponse,
} from '../schemas/sets'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

export const setsApi = createApi({
  reducerPath: 'setsApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['Set', 'SetList', 'Store'],
  endpoints: builder => ({
    /**
     * GET /api/sets
     */
    getSets: builder.query<SetListResponse, Partial<SetListQuery>>({
      query: params => ({
        url: '/sets',
        params: {
          search: params.search,
          status: params.status,
          storeId: params.storeId,
          tags: params.tags?.join(','),
          priority: params.priority,
          priorityRange: params.priorityRange
            ? `${params.priorityRange.min},${params.priorityRange.max}`
            : undefined,
          priceRange: params.priceRange
            ? `${params.priceRange.min},${params.priceRange.max}`
            : undefined,
          isBuilt: typeof params.isBuilt === 'boolean' ? String(params.isBuilt) : undefined,
          sort: params.sort,
          order: params.order,
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
     */
    getSetById: builder.query<Set, string>({
      query: id => `/sets/${id}`,
      transformResponse: (response: unknown) => SetSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Set' as const, id }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * POST /api/sets
     */
    addSet: builder.mutation<Set, CreateSetInput>({
      query: data => ({
        url: '/sets',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: [{ type: 'SetList' as const, id: 'LIST' }],
    }),

    /**
     * PATCH /api/sets/:id
     */
    updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/sets/:id
     */
    deleteSet: builder.mutation<void, { id: string }>({
      query: ({ id }) => ({
        url: `/sets/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          setsApi.util.updateQueryData('getSetById', id, () => {
            return undefined as unknown as Set
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * POST /api/sets/:id/purchase — transition wanted → owned
     */
    purchaseSet: builder.mutation<Set, { id: string; data: PurchaseInput }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}/purchase`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * PATCH /api/sets/:id/build-status
     */
    updateBuildStatus: builder.mutation<Set, { id: string; data: UpdateBuildStatus }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}/build-status`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * POST /api/sets/reorder — reorder wanted items
     */
    reorderSets: builder.mutation<ReorderResponse, BatchReorder>({
      query: data => ({
        url: '/sets/reorder',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
      invalidatesTags: [{ type: 'SetList' as const, id: 'LIST' }],
    }),

    /**
     * POST /api/sets/:id/images/presign
     */
    presignSetImage: builder.mutation<
      { uploadUrl: string; imageUrl: string; key: string },
      { setId: string; filename: string; contentType: string }
    >({
      query: ({ setId, ...body }) => ({
        url: `/sets/${setId}/images/presign`,
        method: 'POST',
        body,
      }),
    }),

    /**
     * POST /api/sets/:id/images — register after presign
     */
    registerSetImage: builder.mutation<
      SetImage,
      { setId: string; imageUrl: string; key: string; thumbnailUrl?: string }
    >({
      query: ({ setId, ...body }) => ({
        url: `/sets/${setId}/images`,
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => SetImageSchema.parse(response),
      async onQueryStarted({ setId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            setsApi.util.updateQueryData('getSetById', setId, draft => {
              draft.images.push(data)
              draft.images.sort((a, b) => a.position - b.position)
            }),
          )
        } catch {
          // API error surfaces via .unwrap()
        }
      },
      invalidatesTags: (_result, _error, { setId }) => [
        { type: 'Set' as const, id: setId },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/sets/:id/images/:imageId
     */
    deleteSetImage: builder.mutation<void, { setId: string; imageId: string }>({
      query: ({ setId, imageId }) => ({
        url: `/sets/${setId}/images/${imageId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ setId, imageId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          setsApi.util.updateQueryData('getSetById', setId, draft => {
            draft.images = draft.images.filter(image => image.id !== imageId)
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: (_result, _error, { setId }) => [
        { type: 'Set' as const, id: setId },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * GET /api/sets/:id/parts — parts lists from linked MOC
     */
    getSetParts: builder.query<SetPartsResponse, string>({
      query: id => `/sets/${id}/parts`,
      transformResponse: (response: unknown) => SetPartsResponseSchema.parse(response),
      providesTags: (_result, _error, id) => [{ type: 'Set' as const, id: `${id}-parts` }],
      ...getServerlessCacheConfig('long'),
    }),

    /**
     * GET /api/sets/stores
     */
    getStores: builder.query<Store[], void>({
      query: () => '/sets/stores',
      providesTags: [{ type: 'Store' as const, id: 'LIST' }],
      ...getServerlessCacheConfig('long'),
    }),
  }),
})

export const {
  useGetSetsQuery,
  useLazyGetSetsQuery,
  useGetSetByIdQuery,
  useAddSetMutation,
  useUpdateSetMutation,
  useDeleteSetMutation,
  usePurchaseSetMutation,
  useUpdateBuildStatusMutation,
  useReorderSetsMutation,
  usePresignSetImageMutation,
  useRegisterSetImageMutation,
  useDeleteSetImageMutation,
  useGetSetPartsQuery,
  useGetStoresQuery,
} = setsApi
