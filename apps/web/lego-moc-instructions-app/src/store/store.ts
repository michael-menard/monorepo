import { configureStore } from '@reduxjs/toolkit'
import { authApi, authReducer } from '@repo/auth'
import { instructionsApi, instructionsReducer } from '@repo/moc-instructions'
import { api } from '../services/api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    instructions: instructionsReducer,
    [authApi.reducerPath]: authApi.reducer,
    [instructionsApi.reducerPath]: instructionsApi.reducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, instructionsApi.middleware, api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 