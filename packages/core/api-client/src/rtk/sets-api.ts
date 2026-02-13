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
  SetImageSchema,
  type SetListResponse,
  type Set,
  type SetImage,
  type SetListQuery,
  type CreateSetInput,
  type UpdateSetInput,
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
          isBuilt: typeof params.isBuilt === 'boolean' ? String(params.isBuilt) : undefined,
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

    /**
     * POST /api/sets
     *
     * Creates a new set for the authenticated user.
     */
    addSet: builder.mutation<Set, CreateSetInput>({
      query: data => ({
        url: '/sets',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: result =>
        result
          ? [
              { type: 'SetList' as const, id: 'LIST' },
              { type: 'Set' as const, id: result.id },
            ]
          : [{ type: 'SetList' as const, id: 'LIST' }],
    }),

    /**
     * POST /api/sets/:id/images/presign
     *
     * Generates a presigned URL for uploading a set image to S3.
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
     * POST /api/sets/:id/images
     *
     * Registers an uploaded image for a set.
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

          // Update getSetById cache to include the new image without refetching
          dispatch(
            setsApi.util.updateQueryData('getSetById', setId, draft => {
              draft.images.push(data)
              draft.images.sort((a, b) => a.position - b.position)
            }),
          )
        } catch {
          // Ignore; API error surfaces in the calling component via .unwrap()
        }
      },
      invalidatesTags: (_result, _error, { setId }) => [
        { type: 'Set' as const, id: setId },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/sets/:id/images/:imageId
     *
     * Deletes a registered set image.
     */
    deleteSetImage: builder.mutation<void, { setId: string; imageId: string }>({
      query: ({ setId, imageId }) => ({
        url: `/sets/${setId}/images/${imageId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ setId, imageId }, { dispatch, queryFulfilled }) {
        // Optimistically remove image from getSetById cache
        const patchResult = dispatch(
          setsApi.util.updateQueryData('getSetById', setId, draft => {
            draft.images = draft.images.filter(image => image.id !== imageId)
          }),
        )

        try {
          await queryFulfilled
        } catch {
          // Roll back optimistic update on failure
          patchResult.undo()
        }
      },
      invalidatesTags: (_result, _error, { setId }) => [
        { type: 'Set' as const, id: setId },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/sets/:id
     *
     * Deletes a set from the user's collection.
     * Uses optimistic update to remove from list cache immediately.
     */
    deleteSet: builder.mutation<void, { id: string; title?: string }>({
      query: ({ id }) => ({
        url: `/sets/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        // Optimistically remove from getSetById cache
        const patchResult = dispatch(
          setsApi.util.updateQueryData('getSetById', id, () => {
            // Invalidate the individual set cache entry
            return undefined as unknown as Set
          }),
        )

        try {
          await queryFulfilled
        } catch {
          // Roll back optimistic update on failure
          patchResult.undo()
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Set' as const, id },
        { type: 'SetList' as const, id: 'LIST' },
      ],
    }),

    /**
     * PATCH /api/sets/:id
     *
     * Updates an existing set with partial data.
     * Backend uses PATCH (not PUT) per ADR-001.
     */
    updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
      query: ({ id, data }) => ({
        url: `/sets/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: unknown) => SetSchema.parse(response),
      invalidatesTags: (result, _error, { id }) =>
        result
          ? [
              { type: 'Set' as const, id },
              { type: 'SetList' as const, id: 'LIST' },
            ]
          : [{ type: 'SetList' as const, id: 'LIST' }],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetSetsQuery,
  useLazyGetSetsQuery,
  useGetSetByIdQuery,
  useAddSetMutation,
  usePresignSetImageMutation,
  useRegisterSetImageMutation,
  useDeleteSetImageMutation,
  useDeleteSetMutation,
  useUpdateSetMutation,
} = setsApi
