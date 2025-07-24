import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
// Mock authApi with a reducerPath and a reducer that returns a valid initial state
const mockAuthApi = {
    reducerPath: 'authApi',
    reducer: (state = {}) => state,
};
describe('Minimal AuthApi Store', () => {
    let store;
    beforeEach(() => {
        store = configureStore({
            reducer: {
                [mockAuthApi.reducerPath]: mockAuthApi.reducer,
            },
        });
    });
    it('should integrate with Redux store', () => {
        const state = store.getState();
        expect(state).toHaveProperty('authApi');
    });
});
