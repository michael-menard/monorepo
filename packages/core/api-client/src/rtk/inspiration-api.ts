/**
 * Inspiration Gallery API
 *
 * RTK Query endpoints for inspiration gallery operations.
 * Uses Zod schemas from @repo/api-client/schemas/inspiration for response validation.
 *
 * Epic 5: Inspiration Gallery
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  InspirationListResponseSchema,
  InspirationSchema,
  AlbumListResponseSchema,
  AlbumWithMetadataSchema,
  AlbumSchema,
  PresignResponseSchema,
  ReorderResponseSchema,
  AlbumItemsResponseSchema,
  BreadcrumbsResponseSchema,
  type InspirationListResponse,
  type Inspiration,
  type AlbumListResponse,
  type AlbumWithMetadata,
  type Album,
  type InspirationQueryParams,
  type AlbumQueryParams,
  type CreateInspiration,
  type UpdateInspiration,
  type CreateAlbum,
  type UpdateAlbum,
  type CreateAlbumFromStack,
  type PresignRequest,
  type PresignResponse,
  type BatchReorderInspirations,
  type BatchReorderAlbums,
  type ReorderResponse,
  type AddToAlbum,
  type RemoveFromAlbum,
  type AlbumItemsResponse,
  type AddAlbumParent,
  type BreadcrumbsResponse,
  type LinkToMoc,
} from '../schemas/inspiration'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Inspiration Gallery API
 *
 * Provides operations for managing inspirations and albums.
 * Uses JWT Bearer token authentication via CognitoTokenManager.
 */
export const inspirationApi = createApi({
  reducerPath: 'inspirationApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: ['Inspiration', 'InspirationItem', 'Album', 'AlbumItem'],
  endpoints: builder => ({
    // ─────────────────────────────────────────────────────────────────────
    // Inspiration Endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * GET /api/inspiration - List user's inspirations
     */
    getInspirations: builder.query<InspirationListResponse, Partial<InspirationQueryParams>>({
      query: params => ({
        url: '/inspiration',
        params: {
          page: params.page,
          limit: params.limit,
          search: params.q,
          tags: params.tags,
          albumId: params.albumId,
          unassigned: params.unassigned,
          sort: params.sort,
          order: params.order,
        },
      }),
      transformResponse: (response: unknown) => InspirationListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'InspirationItem' as const, id })),
              { type: 'Inspiration', id: 'LIST' },
            ]
          : [{ type: 'Inspiration', id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /api/inspiration/:id - Get single inspiration
     */
    getInspiration: builder.query<Inspiration, string>({
      query: id => `/inspiration/${id}`,
      transformResponse: (response: unknown) => InspirationSchema.parse(response),
      providesTags: (_, __, id) => [{ type: 'InspirationItem', id }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * POST /api/inspiration - Create new inspiration
     */
    createInspiration: builder.mutation<Inspiration, CreateInspiration>({
      query: body => ({
        url: '/inspiration',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => InspirationSchema.parse(response),
      invalidatesTags: [{ type: 'Inspiration', id: 'LIST' }],
    }),

    /**
     * PUT /api/inspiration/:id - Update inspiration
     */
    updateInspiration: builder.mutation<Inspiration, { id: string; data: UpdateInspiration }>({
      query: ({ id, data }) => ({
        url: `/inspiration/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: unknown) => InspirationSchema.parse(response),
      invalidatesTags: (_, __, { id }) => [
        { type: 'InspirationItem', id },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/inspiration/:id - Delete inspiration
     */
    deleteInspiration: builder.mutation<void, string>({
      query: id => ({
        url: `/inspiration/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        { type: 'InspirationItem', id },
        { type: 'Inspiration', id: 'LIST' },
        { type: 'Album', id: 'LIST' }, // Albums may reference this inspiration
      ],
    }),

    /**
     * GET /api/inspiration/images/presign - Get presigned URL for image upload
     */
    getInspirationImagePresignUrl: builder.mutation<PresignResponse, PresignRequest>({
      query: params => ({
        url: '/inspiration/images/presign',
        params,
      }),
      transformResponse: (response: unknown) => PresignResponseSchema.parse(response),
    }),

    /**
     * PUT /api/inspiration/reorder - Reorder inspirations
     */
    reorderInspirations: builder.mutation<ReorderResponse, BatchReorderInspirations>({
      query: body => ({
        url: '/inspiration/reorder',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
      // Optimistic update handled in component
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          inspirationApi.util.updateQueryData('getInspirations', {}, draft => {
            const itemMap = new Map(arg.items.map(item => [item.id, item.sortOrder]))
            for (const item of draft.items) {
              const newSortOrder = itemMap.get(item.id)
              if (newSortOrder !== undefined) {
                item.sortOrder = newSortOrder
              }
            }
            draft.items.sort((a, b) => a.sortOrder - b.sortOrder)
          }),
        )

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: [],
    }),

    // ─────────────────────────────────────────────────────────────────────
    // Album Endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * GET /api/inspiration/albums - List user's albums
     */
    getAlbums: builder.query<AlbumListResponse, Partial<AlbumQueryParams>>({
      query: params => ({
        url: '/inspiration/albums',
        params: {
          page: params.page,
          limit: params.limit,
          search: params.q,
          tags: params.tags,
          parentAlbumId: params.parentAlbumId,
          rootOnly: params.rootOnly,
          sort: params.sort,
          order: params.order,
        },
      }),
      transformResponse: (response: unknown) => AlbumListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'AlbumItem' as const, id })),
              { type: 'Album', id: 'LIST' },
            ]
          : [{ type: 'Album', id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /api/inspiration/albums/:id - Get single album with metadata
     */
    getAlbum: builder.query<AlbumWithMetadata, string>({
      query: id => `/inspiration/albums/${id}`,
      transformResponse: (response: unknown) => AlbumWithMetadataSchema.parse(response),
      providesTags: (_, __, id) => [{ type: 'AlbumItem', id }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * POST /api/inspiration/albums - Create new album
     */
    createAlbum: builder.mutation<Album, CreateAlbum>({
      query: body => ({
        url: '/inspiration/albums',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => AlbumSchema.parse(response),
      invalidatesTags: [{ type: 'Album', id: 'LIST' }],
    }),

    /**
     * POST /api/inspiration/albums/from-stack - Create album from stacked inspirations (INSP-012)
     */
    createAlbumFromStack: builder.mutation<Album, CreateAlbumFromStack>({
      query: body => ({
        url: '/inspiration/albums/from-stack',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => AlbumSchema.parse(response),
      invalidatesTags: [
        { type: 'Album', id: 'LIST' },
        { type: 'Inspiration', id: 'LIST' }, // Inspirations may now be in album
      ],
    }),

    /**
     * PUT /api/inspiration/albums/:id - Update album
     */
    updateAlbum: builder.mutation<Album, { id: string; data: UpdateAlbum }>({
      query: ({ id, data }) => ({
        url: `/inspiration/albums/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: (response: unknown) => AlbumSchema.parse(response),
      invalidatesTags: (_, __, { id }) => [
        { type: 'AlbumItem', id },
        { type: 'Album', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/inspiration/albums/:id - Delete album
     */
    deleteAlbum: builder.mutation<void, string>({
      query: id => ({
        url: `/inspiration/albums/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        { type: 'AlbumItem', id },
        { type: 'Album', id: 'LIST' },
        { type: 'Inspiration', id: 'LIST' }, // Inspirations may no longer be in album
      ],
    }),

    /**
     * PUT /api/inspiration/albums/reorder - Reorder albums
     */
    reorderAlbums: builder.mutation<ReorderResponse, BatchReorderAlbums>({
      query: body => ({
        url: '/inspiration/albums/reorder',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
      // Optimistic update handled in component
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          inspirationApi.util.updateQueryData('getAlbums', {}, draft => {
            const itemMap = new Map(arg.items.map(item => [item.id, item.sortOrder]))
            for (const item of draft.items) {
              const newSortOrder = itemMap.get(item.id)
              if (newSortOrder !== undefined) {
                item.sortOrder = newSortOrder
              }
            }
            draft.items.sort((a, b) => a.sortOrder - b.sortOrder)
          }),
        )

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: [],
    }),

    // ─────────────────────────────────────────────────────────────────────
    // Album Items Endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * POST /api/inspiration/albums/:id/items - Add inspirations to album
     */
    addToAlbum: builder.mutation<AlbumItemsResponse, { albumId: string; data: AddToAlbum }>({
      query: ({ albumId, data }) => ({
        url: `/inspiration/albums/${albumId}/items`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => AlbumItemsResponseSchema.parse(response),
      invalidatesTags: (_, __, { albumId }) => [
        { type: 'AlbumItem', id: albumId },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/inspiration/albums/:id/items - Remove inspirations from album
     */
    removeFromAlbum: builder.mutation<
      AlbumItemsResponse,
      { albumId: string; data: RemoveFromAlbum }
    >({
      query: ({ albumId, data }) => ({
        url: `/inspiration/albums/${albumId}/items`,
        method: 'DELETE',
        body: data,
      }),
      transformResponse: (response: unknown) => AlbumItemsResponseSchema.parse(response),
      invalidatesTags: (_, __, { albumId }) => [
        { type: 'AlbumItem', id: albumId },
        { type: 'Inspiration', id: 'LIST' },
      ],
    }),

    // ─────────────────────────────────────────────────────────────────────
    // Album Hierarchy Endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * GET /api/inspiration/albums/:id/breadcrumbs - Get album breadcrumbs
     */
    getAlbumBreadcrumbs: builder.query<BreadcrumbsResponse, string>({
      query: id => `/inspiration/albums/${id}/breadcrumbs`,
      transformResponse: (response: unknown) => BreadcrumbsResponseSchema.parse(response),
      providesTags: (_, __, id) => [{ type: 'AlbumItem', id }],
      ...getServerlessCacheConfig('short'),
    }),

    /**
     * POST /api/inspiration/albums/:id/parents - Add parent album
     */
    addAlbumParent: builder.mutation<void, { albumId: string; data: AddAlbumParent }>({
      query: ({ albumId, data }) => ({
        url: `/inspiration/albums/${albumId}/parents`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { albumId }) => [
        { type: 'AlbumItem', id: albumId },
        { type: 'Album', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/inspiration/albums/:id/parents/:parentId - Remove parent album
     */
    removeAlbumParent: builder.mutation<void, { albumId: string; parentAlbumId: string }>({
      query: ({ albumId, parentAlbumId }) => ({
        url: `/inspiration/albums/${albumId}/parents/${parentAlbumId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { albumId }) => [
        { type: 'AlbumItem', id: albumId },
        { type: 'Album', id: 'LIST' },
      ],
    }),

    // ─────────────────────────────────────────────────────────────────────
    // MOC Linking Endpoints
    // ─────────────────────────────────────────────────────────────────────

    /**
     * POST /api/inspiration/:id/mocs - Link inspiration to MOC
     */
    linkInspirationToMoc: builder.mutation<void, { inspirationId: string; data: LinkToMoc }>({
      query: ({ inspirationId, data }) => ({
        url: `/inspiration/${inspirationId}/mocs`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { inspirationId }) => [
        { type: 'InspirationItem', id: inspirationId },
      ],
    }),

    /**
     * DELETE /api/inspiration/:id/mocs/:mocId - Unlink inspiration from MOC
     */
    unlinkInspirationFromMoc: builder.mutation<void, { inspirationId: string; mocId: string }>({
      query: ({ inspirationId, mocId }) => ({
        url: `/inspiration/${inspirationId}/mocs/${mocId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { inspirationId }) => [
        { type: 'InspirationItem', id: inspirationId },
      ],
    }),

    /**
     * POST /api/inspiration/albums/:id/mocs - Link album to MOC
     */
    linkAlbumToMoc: builder.mutation<void, { albumId: string; data: LinkToMoc }>({
      query: ({ albumId, data }) => ({
        url: `/inspiration/albums/${albumId}/mocs`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_, __, { albumId }) => [{ type: 'AlbumItem', id: albumId }],
    }),

    /**
     * DELETE /api/inspiration/albums/:id/mocs/:mocId - Unlink album from MOC
     */
    unlinkAlbumFromMoc: builder.mutation<void, { albumId: string; mocId: string }>({
      query: ({ albumId, mocId }) => ({
        url: `/inspiration/albums/${albumId}/mocs/${mocId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, { albumId }) => [{ type: 'AlbumItem', id: albumId }],
    }),
  }),
})

// Export hooks for use in components
export const {
  // Inspiration hooks
  useGetInspirationsQuery,
  useLazyGetInspirationsQuery,
  useGetInspirationQuery,
  useCreateInspirationMutation,
  useUpdateInspirationMutation,
  useDeleteInspirationMutation,
  useGetInspirationImagePresignUrlMutation,
  useReorderInspirationsMutation,
  // Album hooks
  useGetAlbumsQuery,
  useLazyGetAlbumsQuery,
  useGetAlbumQuery,
  useCreateAlbumMutation,
  useCreateAlbumFromStackMutation,
  useUpdateAlbumMutation,
  useDeleteAlbumMutation,
  useReorderAlbumsMutation,
  // Album items hooks
  useAddToAlbumMutation,
  useRemoveFromAlbumMutation,
  // Album hierarchy hooks
  useGetAlbumBreadcrumbsQuery,
  useAddAlbumParentMutation,
  useRemoveAlbumParentMutation,
  // MOC linking hooks
  useLinkInspirationToMocMutation,
  useUnlinkInspirationFromMocMutation,
  useLinkAlbumToMocMutation,
  useUnlinkAlbumFromMocMutation,
} = inspirationApi

// Re-export types and schemas for component use
export {
  InspirationSchema,
  AlbumSchema,
  type Inspiration,
  type Album,
  type AlbumWithMetadata,
  type InspirationListResponse,
  type AlbumListResponse,
} from '../schemas/inspiration'
