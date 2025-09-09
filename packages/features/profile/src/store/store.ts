import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { profileApi } from './profileApi';
import profileReducer from './profileSlice';

export const store: EnhancedStore = configureStore({
  reducer: {
    profile: profileReducer,
    [profileApi.reducerPath]: profileApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(profileApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
