/**
 * Redux Store Configuration
 * Central store setup with persistence and feature slices
 */
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import { combineReducers } from '@reduxjs/toolkit';
// Import feature slices
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import preferencesSlice from './slices/preferencesSlice';
import { baseApi } from './api';
// =============================================================================
// PERSISTENCE CONFIGURATION
// =============================================================================
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['auth', 'preferences'], // Only persist auth and preferences
    blacklist: ['ui'], // Don't persist UI state (except what we specifically want)
};
const authPersistConfig = {
    key: 'auth',
    storage,
    blacklist: ['isLoading', 'error', 'showAuthModal', 'authModalType'], // Don't persist UI state
};
const preferencesPersistConfig = {
    key: 'preferences',
    storage,
    blacklist: ['lastSyncTime'], // Don't persist sync timestamps
};
// =============================================================================
// ROOT REDUCER
// =============================================================================
const rootReducer = combineReducers({
    auth: persistReducer(authPersistConfig, authSlice),
    ui: uiSlice, // No persistence for UI state
    preferences: persistReducer(preferencesPersistConfig, preferencesSlice),
    [baseApi.reducerPath]: baseApi.reducer,
});
const persistedReducer = persistReducer(persistConfig, rootReducer);
// =============================================================================
// STORE CONFIGURATION
// =============================================================================
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: [
                'persist/PERSIST',
                'persist/REHYDRATE',
                'persist/PAUSE',
                'persist/PURGE',
                'persist/REGISTER',
            ],
        },
    }).concat(baseApi.middleware),
    // Enable Redux DevTools in development
    devTools: process.env.NODE_ENV !== 'production',
});
// =============================================================================
// PERSISTOR
// =============================================================================
export const persistor = persistStore(store);
// =============================================================================
// TYPED HOOKS
// =============================================================================
// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
// =============================================================================
// SELECTORS
// =============================================================================
export const selectAuth = (state) => state.auth;
export const selectUI = (state) => state.ui;
export const selectPreferences = (state) => state.preferences;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated && !!state.auth.user;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsLoading = (state) => state.auth.isLoading || state.ui.isLoading;
export const selectTheme = (state) => state.preferences.theme || state.ui.theme;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
export const getAuthStatus = () => {
    const state = store.getState();
    return {
        isAuthenticated: selectIsAuthenticated(state),
        user: selectCurrentUser(state),
        isLoading: selectIsLoading(state),
    };
};
export const isUserAuthenticated = (auth) => {
    return auth.isAuthenticated && !!auth.user;
};
export const purgePersistedData = async () => {
    await persistor.purge();
};
// =============================================================================
// SETUP LISTENERS
// =============================================================================
setupListeners(store.dispatch);
