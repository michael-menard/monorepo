import { configureStore } from '@reduxjs/toolkit'
import { authApi, authReducer } from '@repo/auth'
import { instructionsApi } from '@repo/moc-instructions'
// Temporarily commented out due to import resolution issue
// import { galleryApi } from '@repo/gallery'
import { api } from '../services/api'
import { offlineApi } from '../services/offlineApi'

// Import centralized RTK reducers
import {
  wishlistReducer,
  mocInstructionsReducer,
  profileReducer,
} from '@repo/mock-data'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Centralized RTK reducers (replacing old instructions reducer)
    wishlist: wishlistReducer,
    mocInstructions: mocInstructionsReducer,
    profile: profileReducer,
    // API reducers
    [authApi.reducerPath]: authApi.reducer,
    [instructionsApi.reducerPath]: instructionsApi.reducer,
    // Temporarily commented out due to import resolution issue
    // [galleryApi.reducerPath]: galleryApi.reducer,
    [api.reducerPath]: api.reducer,
    [offlineApi.reducerPath]: offlineApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      instructionsApi.middleware,
      // Temporarily commented out due to import resolution issue
      // galleryApi.middleware,
      api.middleware,
      offlineApi.middleware
    ),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 