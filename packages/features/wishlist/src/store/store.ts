import { configureStore } from '@reduxjs/toolkit'
import { wishlistApi } from './wishlistApi'
import wishlistReducer from './wishlistSlice'

export const store = configureStore({
  reducer: {
    wishlist: wishlistReducer,
    [wishlistApi.reducerPath]: wishlistApi.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(wishlistApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
