import { configureStore } from '@reduxjs/toolkit';
// import mocReducer from './mocSlice'; // Uncomment and implement when ready
const placeholderReducer = (state = {}, action) => state;
export const store = configureStore({
    reducer: {
        // moc: mocReducer,
        moc: placeholderReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});
