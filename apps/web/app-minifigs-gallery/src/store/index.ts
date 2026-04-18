import { configureStore } from '@reduxjs/toolkit'
import { minifigsApi } from '@repo/api-client/rtk/minifigs-api'

export const store = configureStore({
  reducer: {
    [minifigsApi.reducerPath]: minifigsApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(minifigsApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
