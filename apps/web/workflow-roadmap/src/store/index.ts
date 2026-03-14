import { configureStore } from '@reduxjs/toolkit'
import { roadmapApi } from './roadmapApi'

export const store = configureStore({
  reducer: {
    [roadmapApi.reducerPath]: roadmapApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(roadmapApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
