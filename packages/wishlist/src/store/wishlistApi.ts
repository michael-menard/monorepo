import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { 
  WishlistItem, 
  Wishlist, 
  CreateWishlistItem, 
  UpdateWishlistItem,
  CreateWishlist,
  UpdateWishlist,
  WishlistFilter
} from '../schemas';

const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api/wishlist'
  : '/api/wishlist';

export const wishlistApi = createApi({
  reducerPath: 'wishlistApi',
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: 'include',
  }),
  tagTypes: ['Wishlist', 'WishlistItem'],
  endpoints: (builder) => ({
    // Wishlist endpoints
    getWishlists: builder.query<Wishlist[], void>({
      query: () => '/',
      providesTags: ['Wishlist'],
    }),
    getWishlist: builder.query<Wishlist, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Wishlist', id }],
    }),
    createWishlist: builder.mutation<Wishlist, CreateWishlist>({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),
    updateWishlist: builder.mutation<Wishlist, { id: string; data: UpdateWishlist }>({
      query: ({ id, data }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Wishlist', id }],
    }),
    deleteWishlist: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),

    // Wishlist item endpoints
    getWishlistItems: builder.query<WishlistItem[], { wishlistId: string; filters?: WishlistFilter }>({
      query: ({ wishlistId, filters }) => ({
        url: `/${wishlistId}/items`,
        params: filters,
      }),
      providesTags: (result, error, { wishlistId }) => [
        { type: 'WishlistItem', id: wishlistId }
      ],
    }),
    getWishlistItem: builder.query<WishlistItem, { wishlistId: string; itemId: string }>({
      query: ({ wishlistId, itemId }) => `/${wishlistId}/items/${itemId}`,
      providesTags: (result, error, { itemId }) => [{ type: 'WishlistItem', id: itemId }],
    }),
    createWishlistItem: builder.mutation<WishlistItem, { wishlistId: string; data: CreateWishlistItem }>({
      query: ({ wishlistId, data }) => ({
        url: `/${wishlistId}/items`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { wishlistId }) => [
        { type: 'WishlistItem', id: wishlistId }
      ],
    }),
    updateWishlistItem: builder.mutation<WishlistItem, { wishlistId: string; itemId: string; data: UpdateWishlistItem }>({
      query: ({ wishlistId, itemId, data }) => ({
        url: `/${wishlistId}/items/${itemId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { itemId }) => [
        { type: 'WishlistItem', id: itemId }
      ],
    }),
    deleteWishlistItem: builder.mutation<void, { wishlistId: string; itemId: string }>({
      query: ({ wishlistId, itemId }) => ({
        url: `/${wishlistId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { wishlistId }) => [
        { type: 'WishlistItem', id: wishlistId }
      ],
    }),
    reorderWishlistItems: builder.mutation<void, { wishlistId: string; sourceIndex: number; destinationIndex: number }>({
      query: ({ wishlistId, sourceIndex, destinationIndex }) => ({
        url: `/${wishlistId}/items/reorder`,
        method: 'PUT',
        body: { sourceIndex, destinationIndex },
      }),
      invalidatesTags: (result, error, { wishlistId }) => [
        { type: 'WishlistItem', id: wishlistId }
      ],
    }),
  }),
});

export const {
  useGetWishlistsQuery,
  useGetWishlistQuery,
  useCreateWishlistMutation,
  useUpdateWishlistMutation,
  useDeleteWishlistMutation,
  useGetWishlistItemsQuery,
  useGetWishlistItemQuery,
  useCreateWishlistItemMutation,
  useUpdateWishlistItemMutation,
  useDeleteWishlistItemMutation,
  useReorderWishlistItemsMutation,
} = wishlistApi; 