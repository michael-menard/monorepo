/**
 * Wishlist Gallery Redux Store
 *
 * Configures the Redux store with RTK Query for the wishlist gallery module.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { configureStore } from '@reduxjs/toolkit'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'

/**
 * Create Redux store for wishlist gallery module
 */
export const store = configureStore({
  reducer: {
    [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(wishlistGalleryApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
