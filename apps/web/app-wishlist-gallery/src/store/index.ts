/**
 * Wishlist Gallery Redux Store
 *
 * Configures the Redux store with RTK Query for the wishlist gallery module.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { configureStore } from '@reduxjs/toolkit'
import { wishlistGalleryApi } from '@repo/api-client/rtk/wishlist-gallery-api'
import { authSlice } from './slices/authSlice'
import { wishlistDraftSlice } from './slices/wishlistDraftSlice'
import { draftPersistenceMiddleware, loadDraftFromLocalStorage } from './middleware/draftPersistenceMiddleware'
import { setDraft, setDraftRestored } from './slices/wishlistDraftSlice'

/**
 * Create Redux store for wishlist gallery module
 */
export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    wishlistDraft: wishlistDraftSlice.reducer,
    [wishlistGalleryApi.reducerPath]: wishlistGalleryApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware()
      .concat(wishlistGalleryApi.middleware)
      .concat(draftPersistenceMiddleware),
})

/**
 * WISH-2015: Rehydrate draft from localStorage after auth is populated
 * Call this from AddItemPage after auth state is available
 */
export function rehydrateDraftIfNeeded(): void {
  const state = store.getState()
  const userId = state.auth.user?.id

  if (!userId) {
    return
  }

  // Don't rehydrate if already restored
  if (state.wishlistDraft.isRestored) {
    return
  }

  const draft = loadDraftFromLocalStorage(userId)
  if (draft) {
    store.dispatch(setDraft(draft.formData))
    store.dispatch(setDraftRestored(true))
  }
}

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
