import { configureStore } from '@reduxjs/toolkit';
import { mocApi } from './mocApi';
import mocReducer from './mocSlice';

export const store = configureStore({
  reducer: {
    moc: mocReducer,
    [mocApi.reducerPath]: mocApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(mocApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 