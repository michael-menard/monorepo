/**
 * Redux Store Tests
 * Tests for store configuration and basic functionality
 */
import { describe, it, expect } from 'vitest';
import { store } from '../index';
import { authActions } from '../slices/authSlice';
import { uiActions } from '../slices/uiSlice';
import { preferencesActions } from '../slices/preferencesSlice';
describe('Redux Store', () => {
    it('should have initial state', () => {
        const state = store.getState();
        expect(state.auth).toBeDefined();
        expect(state.ui).toBeDefined();
        expect(state.preferences).toBeDefined();
        // Check initial auth state
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.token).toBeNull();
        // Check initial UI state
        expect(state.ui.isLoading).toBe(false);
        expect(state.ui.theme).toBe('auto');
        expect(state.ui.sidebarOpen).toBe(false);
        // Check initial preferences state
        expect(state.preferences.theme).toBe('auto');
        expect(state.preferences.language).toBe('en');
        expect(state.preferences.hasCompletedOnboarding).toBe(false);
    });
    it('should handle auth actions', () => {
        // Test login start
        store.dispatch(authActions.loginStart());
        let state = store.getState();
        expect(state.auth.isLoading).toBe(true);
        expect(state.auth.error).toBeNull();
        // Test login success
        const mockUser = {
            id: 'test-id',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
        };
        store.dispatch(authActions.loginSuccess({
            user: mockUser,
            token: 'test-token',
            refreshToken: 'test-refresh-token',
        }));
        state = store.getState();
        expect(state.auth.isLoading).toBe(false);
        expect(state.auth.isAuthenticated).toBe(true);
        expect(state.auth.user).toEqual(mockUser);
        expect(state.auth.token).toBe('test-token');
        // Test logout
        store.dispatch(authActions.logout());
        state = store.getState();
        expect(state.auth.isAuthenticated).toBe(false);
        expect(state.auth.user).toBeNull();
        expect(state.auth.token).toBeNull();
    });
    it('should handle UI actions', () => {
        // Test loading actions
        store.dispatch(uiActions.startLoading('Testing...'));
        let state = store.getState();
        expect(state.ui.isLoading).toBe(true);
        expect(state.ui.loadingMessage).toBe('Testing...');
        store.dispatch(uiActions.stopLoading());
        state = store.getState();
        expect(state.ui.isLoading).toBe(false);
        expect(state.ui.loadingMessage).toBeNull();
        // Test theme toggle
        store.dispatch(uiActions.setTheme('dark'));
        state = store.getState();
        expect(state.ui.theme).toBe('dark');
        store.dispatch(uiActions.toggleTheme());
        state = store.getState();
        expect(state.ui.theme).toBe('light');
        // Test sidebar
        store.dispatch(uiActions.toggleSidebar());
        state = store.getState();
        expect(state.ui.sidebarOpen).toBe(true);
    });
    it('should handle preferences actions', () => {
        // Test theme preference
        store.dispatch(preferencesActions.setTheme('dark'));
        let state = store.getState();
        expect(state.preferences.theme).toBe('dark');
        // Test language preference
        store.dispatch(preferencesActions.setLanguage('es'));
        state = store.getState();
        expect(state.preferences.language).toBe('es');
        // Test notification preferences
        store.dispatch(preferencesActions.setEmailNotifications(false));
        state = store.getState();
        expect(state.preferences.emailNotifications).toBe(false);
        // Test onboarding completion
        store.dispatch(preferencesActions.completeOnboarding());
        state = store.getState();
        expect(state.preferences.hasCompletedOnboarding).toBe(true);
    });
    it('should handle notifications', () => {
        store.dispatch(uiActions.addNotification({
            type: 'success',
            title: 'Test Success',
            message: 'This is a test notification',
        }));
        const state = store.getState();
        expect(state.ui.notifications).toHaveLength(1);
        expect(state.ui.notifications[0].type).toBe('success');
        expect(state.ui.notifications[0].title).toBe('Test Success');
        expect(state.ui.notifications[0].id).toBeDefined();
        expect(state.ui.notifications[0].timestamp).toBeDefined();
        // Test notification removal
        const notificationId = state.ui.notifications[0].id;
        store.dispatch(uiActions.removeNotification(notificationId));
        const updatedState = store.getState();
        expect(updatedState.ui.notifications).toHaveLength(0);
    });
    it('should handle modal management', () => {
        // Open modal
        store.dispatch(uiActions.openModal({
            id: 'test-modal',
            data: { message: 'Test data' }
        }));
        let state = store.getState();
        expect(state.ui.modals['test-modal']).toBeDefined();
        expect(state.ui.modals['test-modal'].isOpen).toBe(true);
        expect(state.ui.modals['test-modal'].data).toEqual({ message: 'Test data' });
        // Close modal
        store.dispatch(uiActions.closeModal('test-modal'));
        state = store.getState();
        expect(state.ui.modals['test-modal'].isOpen).toBe(false);
        // Remove modal
        store.dispatch(uiActions.removeModal('test-modal'));
        state = store.getState();
        expect(state.ui.modals['test-modal']).toBeUndefined();
    });
});
