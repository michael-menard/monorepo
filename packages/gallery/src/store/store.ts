import { configureStore } from '@reduxjs/toolkit';
// import galleryReducer from './gallerySlice'; // Uncomment and implement when ready

const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    // gallery: galleryReducer,
    gallery: placeholderReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 