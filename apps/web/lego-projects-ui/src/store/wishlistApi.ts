import { baseApi } from './api';
import type { WishlistItem } from '@/types/schemas';

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