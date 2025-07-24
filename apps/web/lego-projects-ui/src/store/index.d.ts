import type { TypedUseSelectorHook } from 'react-redux';
export declare const store: import("@reduxjs/toolkit").EnhancedStore<Partial<{
    auth: import("./slices/authSlice.js").AuthState & import("redux-persist/es/persistReducer").PersistPartial;
    ui: import("./slices/uiSlice.js").UIState;
    preferences: import("./slices/preferencesSlice.js").PreferencesState & import("redux-persist/es/persistReducer").PersistPartial;
    api: import("@reduxjs/toolkit/query").CombinedState<{}, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", "api">;
}> & import("redux-persist/es/persistReducer").PersistPartial, import("@reduxjs/toolkit").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("@reduxjs/toolkit").StoreEnhancer<{
    dispatch: import("@reduxjs/toolkit").ThunkDispatch<Partial<{
        auth: import("./slices/authSlice.js").AuthState & import("redux-persist/es/persistReducer").PersistPartial;
        ui: import("./slices/uiSlice.js").UIState;
        preferences: import("./slices/preferencesSlice.js").PreferencesState & import("redux-persist/es/persistReducer").PersistPartial;
        api: import("@reduxjs/toolkit/query").CombinedState<{}, "User" | "LegoSet" | "Auth" | "Collection" | "Wishlist" | "MOC" | "FileUpload", "api">;
    }> & import("redux-persist/es/persistReducer").PersistPartial, undefined, import("@reduxjs/toolkit").UnknownAction>;
}>, import("@reduxjs/toolkit").StoreEnhancer]>>;
export declare const persistor: import("redux-persist").Persistor;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export declare const useAppDispatch: () => AppDispatch;
export declare const useAppSelector: TypedUseSelectorHook<RootState>;
export declare const selectAuth: (state: RootState) => RootState["auth"];
export declare const selectUI: (state: RootState) => RootState["ui"];
export declare const selectPreferences: (state: RootState) => RootState["preferences"];
export declare const selectIsAuthenticated: (state: RootState) => boolean;
export declare const selectCurrentUser: (state: RootState) => RootState["auth"]["user"];
export declare const selectIsLoading: (state: RootState) => boolean;
export declare const selectTheme: (state: RootState) => string | undefined;
export declare const getAuthStatus: () => {
    isAuthenticated: boolean;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        username: string;
        createdAt: string;
        updatedAt: string;
        avatar?: string;
        bio?: string;
        location?: string;
        website?: string;
        socialLinks?: {
            instagram?: string;
            youtube?: string;
            flickr?: string;
            rebrickable?: string;
        };
        preferences?: {
            theme: "light" | "dark" | "system";
            emailNotifications: boolean;
            publicProfile: boolean;
            showEmail: boolean;
        };
    };
    isLoading: boolean;
};
export declare const isUserAuthenticated: (auth: RootState["auth"]) => auth is RootState["auth"] & {
    user: NonNullable<RootState["auth"]["user"]>;
};
export declare const purgePersistedData: () => Promise<void>;
