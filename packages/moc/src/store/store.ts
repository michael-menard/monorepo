import { configureStore } from '@reduxjs/toolkit';
// import mocReducer from './mocSlice'; // Uncomment and implement when ready

const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    // moc: mocReducer,
    moc: placeholderReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 