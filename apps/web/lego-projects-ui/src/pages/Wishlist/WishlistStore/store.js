import { configureStore } from '@reduxjs/toolkit';
// import wishlistReducer from './wishlistSlice'; // Uncomment and implement when ready
const placeholderReducer = (state = {}, action) => state;
export const store = configureStore({
    reducer: {
        // wishlist: wishlistReducer,
        wishlist: placeholderReducer,
    },
    devTools: process.env.NODE_ENV !== 'production',
});
