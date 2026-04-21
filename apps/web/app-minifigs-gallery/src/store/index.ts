import { configureStore } from '@reduxjs/toolkit'
import { minifigsApi } from '@repo/api-client/rtk/minifigs-api'
import { recommenderApi } from '@repo/api-client/rtk/recommender-api'

export const store = configureStore({
  reducer: {
    [minifigsApi.reducerPath]: minifigsApi.reducer,
    [recommenderApi.reducerPath]: recommenderApi.reducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(minifigsApi.middleware).concat(recommenderApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
