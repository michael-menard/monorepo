import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@repo/auth';
import { authApi } from '@/services/authApi';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore, createTransform } from 'redux-persist';

// Transform to remove tokens from persisted auth state
const removeTokensTransform = createTransform(
  (inboundState) => {
    if (!inboundState) return inboundState;
    const rest = { ...inboundState } as Record<string, unknown>;
    delete rest.tokens;
    return rest;
  },
  (outboundState) => outboundState,
  { whitelist: ['auth'] }
);

const persistConfig = {
  key: 'auth',
  storage,
  whitelist: ['auth'], // Only persist the auth slice
  transforms: [removeTokensTransform],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // redux-persist uses non-serializable values
    }).concat(authApi.middleware),
});

export const persistor = persistStore(store);

export default store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 