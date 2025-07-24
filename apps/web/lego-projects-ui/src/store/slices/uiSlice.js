/**
 * UI Slice
 * Manages global UI state including loading, modals, notifications, and theme
 */
import { createSlice } from '@reduxjs/toolkit';
// =============================================================================
// INITIAL STATE
// =============================================================================
const initialState = {
    // Loading states
    isLoading: false,
    loadingMessage: null,
    // Theme
    theme: 'auto',
    systemTheme: 'light',
    // Layout
    sidebarOpen: false,
    mobileMenuOpen: false,
    // Modals
    modals: {},
    // Notifications
    notifications: [],
    // Navigation
    currentPage: '/',
    breadcrumbs: [],
    // Search
    searchQuery: '',
    searchOpen: false,
    // Responsive
    isMobile: false,
    screenSize: 'lg',
};
// =============================================================================
// SLICE DEFINITION
// =============================================================================
const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        // =============================================================================
        // LOADING STATES
        // =============================================================================
        setLoading: (state, action) => {
            state.isLoading = action.payload.isLoading;
            state.loadingMessage = action.payload.message || null;
        },
        startLoading: (state, action) => {
            state.isLoading = true;
            state.loadingMessage = action.payload || null;
        },
        stopLoading: (state) => {
            state.isLoading = false;
            state.loadingMessage = null;
        },
        // =============================================================================
        // THEME MANAGEMENT
        // =============================================================================
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setSystemTheme: (state, action) => {
            state.systemTheme = action.payload;
        },
        toggleTheme: (state) => {
            if (state.theme === 'auto') {
                state.theme = state.systemTheme === 'light' ? 'dark' : 'light';
            }
            else {
                state.theme = state.theme === 'light' ? 'dark' : 'light';
            }
        },
        // =============================================================================
        // LAYOUT MANAGEMENT
        // =============================================================================
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action) => {
            state.sidebarOpen = action.payload;
        },
        toggleMobileMenu: (state) => {
            state.mobileMenuOpen = !state.mobileMenuOpen;
        },
        setMobileMenuOpen: (state, action) => {
            state.mobileMenuOpen = action.payload;
        },
        // =============================================================================
        // MODAL MANAGEMENT
        // =============================================================================
        openModal: (state, action) => {
            state.modals[action.payload.id] = {
                id: action.payload.id,
                isOpen: true,
                data: action.payload.data,
            };
        },
        closeModal: (state, action) => {
            if (state.modals[action.payload]) {
                state.modals[action.payload].isOpen = false;
            }
        },
        removeModal: (state, action) => {
            delete state.modals[action.payload];
        },
        closeAllModals: (state) => {
            Object.keys(state.modals).forEach(id => {
                state.modals[id].isOpen = false;
            });
        },
        // =============================================================================
        // NOTIFICATION MANAGEMENT
        // =============================================================================
        addNotification: (state, action) => {
            const notification = {
                ...action.payload,
                id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
            };
            state.notifications.push(notification);
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(notification => notification.id !== action.payload);
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },
        // =============================================================================
        // NAVIGATION
        // =============================================================================
        setCurrentPage: (state, action) => {
            state.currentPage = action.payload;
        },
        setBreadcrumbs: (state, action) => {
            state.breadcrumbs = action.payload;
        },
        addBreadcrumb: (state, action) => {
            state.breadcrumbs.push(action.payload);
        },
        // =============================================================================
        // SEARCH
        // =============================================================================
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        setSearchOpen: (state, action) => {
            state.searchOpen = action.payload;
        },
        toggleSearch: (state) => {
            state.searchOpen = !state.searchOpen;
            if (!state.searchOpen) {
                state.searchQuery = '';
            }
        },
        // =============================================================================
        // RESPONSIVE
        // =============================================================================
        setIsMobile: (state, action) => {
            state.isMobile = action.payload;
        },
        setScreenSize: (state, action) => {
            state.screenSize = action.payload;
            state.isMobile = ['sm', 'md'].includes(action.payload);
        },
    },
});
// =============================================================================
// EXPORTS
// =============================================================================
export const uiActions = uiSlice.actions;
export { uiSlice };
export default uiSlice.reducer;
// =============================================================================
// HELPER ACTION CREATORS
// =============================================================================
/**
 * Show a success notification
 */
export const showSuccessNotification = (title, message, duration) => uiActions.addNotification({ type: 'success', title, message, duration });
/**
 * Show an error notification
 */
export const showErrorNotification = (title, message, duration) => uiActions.addNotification({ type: 'error', title, message, duration });
/**
 * Show a warning notification
 */
export const showWarningNotification = (title, message, duration) => uiActions.addNotification({ type: 'warning', title, message, duration });
/**
 * Show an info notification
 */
export const showInfoNotification = (title, message, duration) => uiActions.addNotification({ type: 'info', title, message, duration });
