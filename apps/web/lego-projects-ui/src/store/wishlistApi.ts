import { baseApi } from './api.js';
// @ts-expect-error: TypeScript cannot resolve .js import for schemas, but it exists and is correct for NodeNext/ESM
import type { WishlistItem } from '../types/schemas.js';

export const wishlistApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateWishlist: build.mutation<
      { success: boolean },
      { items: WishlistItem[] }
    >({
      query: ({ items }) => ({
        url: '/wishlist',
        method: 'PUT',
        body: { items },
      }),
      invalidatesTags: ['Wishlist'],
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateWishlistMutation } = wishlistApi; 