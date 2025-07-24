import { baseApi } from './api';
export const wishlistApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        updateWishlist: build.mutation({
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
