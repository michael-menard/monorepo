import { configureStore } from '@reduxjs/toolkit'
import { instructionsApi } from '@repo/moc-instructions'
import { galleryApi } from '@repo/gallery'
import { wishlistReducer, mocInstructionsReducer, profileReducer } from '@repo/mock-data'
import { api } from '../services/api'
import { offlineApi } from '../services/offlineApi'
import galleryReducer from './gallerySlice'

// Import centralized RTK reducers

export const store = configureStore({
  reducer: {
    gallery: galleryReducer,
    // Centralized RTK reducers (replacing old instructions reducer)
    wishlist: wishlistReducer,
    mocInstructions: mocInstructionsReducer,
    profile: profileReducer,
    // API reducers
    [instructionsApi.reducerPath]: instructionsApi.reducer,
    // Temporarily commented out due to import resolution issue
    // [galleryApi.reducerPath]: galleryApi.reducer,
    [api.reducerPath]: api.reducer,
    [offlineApi.reducerPath]: offlineApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state - specifically for Date objects
        ignoredPaths: [
          'mocInstructions.instructions',
          'profile.recentActivities',
          'wishlist.items',
        ],
      },
    }).concat(
      instructionsApi.middleware,
      // Temporarily commented out due to import resolution issue
      // galleryApi.middleware,
      api.middleware,
      offlineApi.middleware,
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
