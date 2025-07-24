import { configureStore } from '@reduxjs/toolkit';
// import profileReducer from './profileSlice'; // Uncomment and implement when ready

const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    // profile: profileReducer,
    profile: placeholderReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 