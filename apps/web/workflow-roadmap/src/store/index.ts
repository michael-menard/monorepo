import { configureStore } from '@reduxjs/toolkit'
import { roadmapApi } from './roadmapApi'
import { roadmapFiltersSlice } from './roadmapFiltersSlice'

export const store = configureStore({
  reducer: {
    [roadmapApi.reducerPath]: roadmapApi.reducer,
    roadmapFilters: roadmapFiltersSlice.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(roadmapApi.middleware),
})

store.subscribe(() => {
  try {
    localStorage.setItem('roadmapFilters', JSON.stringify(store.getState().roadmapFilters))
  } catch {
    // storage unavailable — ignore
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
