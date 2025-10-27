import { configureStore } from '@reduxjs/toolkit'
import { instructionsApi } from './instructionsApi'
import instructionsReducer from './instructionsSlice'

export const store = configureStore({
  reducer: {
    instructions: instructionsReducer,
    [instructionsApi.reducerPath]: instructionsApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(instructionsApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
