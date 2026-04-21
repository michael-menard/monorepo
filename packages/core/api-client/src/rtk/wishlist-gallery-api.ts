/**
 * Wishlist Gallery API — SHIM
 *
 * Proxies to the unified /sets API with status=wanted.
 * Returns WishlistItem types via setToWishlistItem mapper for backward compat.
 * Components import hooks from here unchanged until Phase 4.5 migration completes.
 *
 * @deprecated Use setsApi from './sets-api' directly.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  type WishlistListResponse,
  type WishlistItem,
  type WishlistQueryParams,
  type CreateWishlistItem,
  type PresignResponse,
  type PresignRequest,
  type PurchaseDetailsInput,
  type BatchReorder,
  type ReorderResponse,
  type BuildStatus,
  setToWishlistItem,
} from '../schemas/wishlist'
import {
  SetListResponseSchema,
  SetSchema,
  ReorderResponseSchema,
  PresignResponseSchema,
} from '../schemas/sets'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Map a unified Set list response to the legacy WishlistListResponse shape
 */
function mapSetsResponseToWishlistResponse(response: unknown): WishlistListResponse {
  const parsed = SetListResponseSchema.parse(response)
  return {
    items: parsed.items.map(setToWishlistItem),
    pagination: parsed.pagination,
  }
}

export const wishlistGalleryApi = createApi({
  reducerPath: 'wishlistGalleryApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: ['Wishlist', 'WishlistItem', 'Sets'],
  endpoints: builder => ({
    /**
     * GET /api/sets?status=wanted
     */
    getWishlist: builder.query<WishlistListResponse, Partial<WishlistQueryParams>>({
      query: params => ({
        url: '/sets',
        params: {
          search: params.q,
          status: 'wanted',
          tags: params.tags,
          priority: params.priority,
          sort: params.sort ?? 'sortOrder',
          order: params.order ?? 'asc',
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: mapSetsResponseToWishlistResponse,
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'WishlistItem' as const, id })),
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [{ type: 'Wishlist', id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /api/sets/:id
     */
    getWishlistItem: builder.query<WishlistItem, string>({
      query: id => `/sets/${id}`,
      transformResponse: (response: unknown) => {
        const set = SetSchema.parse(response)
        return setToWishlistItem(set)
      },
      providesTags: (_, __, id) => [{ type: 'WishlistItem', id }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * POST /api/sets (with status=wanted)
     */
    addWishlistItem: builder.mutation<
      WishlistItem,
      CreateWishlistItem & {
        onOptimisticError?: (error: unknown) => void
        tempId?: string
      }
    >({
      query: arg => {
        const { onOptimisticError: _onOptimisticError, tempId: _tempId, ...body } = arg
        return {
          url: '/sets',
          method: 'POST',
          body: {
            status: 'wanted',
            title: body.title,
            setNumber: body.setNumber,
            sourceUrl: body.sourceUrl,
            imageUrl: body.imageUrl,
            purchasePrice: body.price,
            pieceCount: body.pieceCount,
            releaseDate: body.releaseDate,
            tags: body.tags,
            priority: body.priority,
            notes: body.notes,
          },
        }
      },
      transformResponse: (response: unknown) => {
        const set = SetSchema.parse(response)
        return setToWishlistItem(set)
      },
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const tempId = arg.tempId || `temp-${Date.now()}`
        const now = new Date().toISOString()

        const optimisticItem: WishlistItem = {
          id: tempId,
          userId: 'temp-user',
          title: arg.title,
          store: arg.store ?? 'Other',
          setNumber: arg.setNumber || null,
          sourceUrl: arg.sourceUrl || null,
          imageUrl: arg.imageUrl || null,
          imageVariants: null,
          price: arg.price || null,
          currency: 'USD',
          pieceCount: arg.pieceCount ?? null,
          releaseDate: arg.releaseDate || null,
          tags: arg.tags || [],
          priority: arg.priority ?? 0,
          notes: arg.notes || null,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: null,
          updatedBy: null,
          status: 'wishlist',
          statusChangedAt: null,
          purchaseDate: null,
          purchasePrice: null,
          purchaseTax: null,
          purchaseShipping: null,
          buildStatus: null,
        }

        const patchResult = dispatch(
          wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
            draft.items.unshift(optimisticItem)
            if (draft.pagination) {
              draft.pagination.total += 1
            }
          }),
        )

        try {
          const { data: realItem } = await queryFulfilled
          dispatch(
            wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
              const index = draft.items.findIndex(item => item.id === tempId)
              if (index !== -1) {
                draft.items[index] = realItem
              }
            }),
          )
        } catch (error) {
          patchResult.undo()
          if (arg.onOptimisticError) {
            arg.onOptimisticError(error)
          }
        }
      },
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),

    /**
     * POST /api/sets/:id/images/presign
     */
    getWishlistImagePresignUrl: builder.mutation<PresignResponse, PresignRequest>({
      query: params => ({
        url: '/sets/images/presign',
        method: 'POST',
        body: {
          filename: params.fileName,
          contentType: params.mimeType,
        },
      }),
      transformResponse: (response: unknown) => {
        const parsed = PresignResponseSchema.parse(response)
        return {
          presignedUrl: parsed.uploadUrl,
          key: parsed.key,
          expiresIn: 900,
        }
      },
    }),

    /**
     * POST /api/sets/:id/purchase — transition wanted → owned
     */
    updateItemPurchase: builder.mutation<
      WishlistItem,
      { itemId: string; input: PurchaseDetailsInput }
    >({
      query: ({ itemId, input }) => ({
        url: `/sets/${itemId}/purchase`,
        method: 'POST',
        body: {
          purchaseDate: input.purchaseDate,
          purchasePrice: input.purchasePrice,
          purchaseTax: input.purchaseTax,
          purchaseShipping: input.purchaseShipping,
          buildStatus: input.buildStatus,
        },
      }),
      transformResponse: (response: unknown) => {
        const set = SetSchema.parse(response)
        return setToWishlistItem(set)
      },
      invalidatesTags: (result, _error, { itemId }) =>
        result
          ? [
              { type: 'WishlistItem', id: itemId },
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [],
    }),

    /**
     * @deprecated Use updateItemPurchase instead
     */
    markAsPurchased: builder.mutation<WishlistItem, { itemId: string; input: unknown }>({
      query: ({ itemId, input }) => ({
        url: `/sets/${itemId}/purchase`,
        method: 'POST',
        body: input,
      }),
      transformResponse: (response: unknown) => {
        const set = SetSchema.parse(response)
        return setToWishlistItem(set)
      },
      invalidatesTags: (result, _error, { itemId }) =>
        result
          ? [
              { type: 'WishlistItem', id: itemId },
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [],
    }),

    /**
     * PATCH /api/sets/:id/build-status
     */
    updateBuildStatus: builder.mutation<WishlistItem, { itemId: string; buildStatus: BuildStatus }>(
      {
        query: ({ itemId, buildStatus }) => ({
          url: `/sets/${itemId}/build-status`,
          method: 'PATCH',
          body: { buildStatus },
        }),
        transformResponse: (response: unknown) => {
          const set = SetSchema.parse(response)
          return setToWishlistItem(set)
        },
        async onQueryStarted({ itemId, buildStatus }, { dispatch, queryFulfilled }) {
          const patchResult = dispatch(
            wishlistGalleryApi.util.updateQueryData(
              'getWishlist',
              { status: 'owned' as any, page: 1, limit: 100 },
              draft => {
                const item = draft.items.find(i => i.id === itemId)
                if (item) {
                  item.buildStatus = buildStatus
                }
              },
            ),
          )

          try {
            await queryFulfilled
          } catch {
            patchResult.undo()
          }
        },
        invalidatesTags: (result, _error, { itemId }) =>
          result
            ? [
                { type: 'WishlistItem', id: itemId },
                { type: 'Wishlist', id: 'LIST' },
              ]
            : [],
      },
    ),

    /**
     * DELETE /api/sets/:id
     */
    deleteWishlistItem: builder.mutation<void, string>({
      query: itemId => ({
        url: `/sets/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, itemId) => [
        { type: 'WishlistItem', id: itemId },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/sets/:id (Alias)
     */
    removeFromWishlist: builder.mutation<void, string>({
      query: itemId => ({
        url: `/sets/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, itemId) => [
        { type: 'WishlistItem', id: itemId },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * POST /api/sets/reorder
     */
    reorderWishlist: builder.mutation<ReorderResponse, BatchReorder>({
      query: body => ({
        url: '/sets/reorder',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
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
  }),
})

export const {
  useGetWishlistQuery,
  useGetWishlistItemQuery,
  useLazyGetWishlistQuery,
  useAddWishlistItemMutation,
  useGetWishlistImagePresignUrlMutation,
  useMarkAsPurchasedMutation,
  useUpdateItemPurchaseMutation,
  useUpdateBuildStatusMutation,
  useDeleteWishlistItemMutation,
  useRemoveFromWishlistMutation,
  useReorderWishlistMutation,
} = wishlistGalleryApi
