import { configureStore } from '@reduxjs/toolkit';

// Placeholder store configuration
// This will be expanded as other packages are properly configured
export const store = configureStore({
  reducer: {
    // Placeholder reducer
    placeholder: (state = {}, action: any) => state,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 