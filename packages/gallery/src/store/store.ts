// If you see a type error for '@reduxjs/toolkit', ensure you have @reduxjs/toolkit installed.
import { configureStore } from '@reduxjs/toolkit';
import { galleryApi } from './galleryApi';
// import galleryReducer from './gallerySlice'; // Uncomment and implement when ready

const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    // gallery: galleryReducer,
    gallery: placeholderReducer,
    [galleryApi.reducerPath]: galleryApi.reducer, // RTK Query API slice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(galleryApi.middleware),
  // Set devTools: false for production if needed
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Now RTK Query hooks from galleryApi will work with this store. 