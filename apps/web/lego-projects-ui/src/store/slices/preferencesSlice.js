/**
 * Preferences Slice
 * Manages user preferences and application settings
 */
import { createSlice } from '@reduxjs/toolkit';
// =============================================================================
// INITIAL STATE
// =============================================================================
const initialState = {
    // Display preferences
    theme: 'auto',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Notification preferences
    emailNotifications: true,
    pushNotifications: false,
    marketingEmails: false,
    // Privacy preferences
    publicProfile: false,
    showEmail: false,
    showActivity: true,
    allowAnalytics: true,
    // LEGO-specific preferences
    defaultCurrency: 'USD',
    defaultSortOrder: 'newest',
    showRetiredSets: true,
    preferredThemes: [],
    // UI preferences
    compactMode: false,
    showImages: true,
    itemsPerPage: 20,
    // Accessibility
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium',
    // Data sync
    syncAcrossDevices: true,
    lastSyncTime: null,
    // Onboarding
    hasCompletedOnboarding: false,
    dismissedFeatures: [],
};
// =============================================================================
// SLICE DEFINITION
// =============================================================================
const preferencesSlice = createSlice({
    name: 'preferences',
    initialState,
    reducers: {
        // =============================================================================
        // DISPLAY PREFERENCES
        // =============================================================================
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
        setLanguage: (state, action) => {
            state.language = action.payload;
        },
        setTimezone: (state, action) => {
            state.timezone = action.payload;
        },
        // =============================================================================
        // NOTIFICATION PREFERENCES
        // =============================================================================
        updateNotificationPreferences: (state, action) => {
            Object.assign(state, action.payload);
        },
        setEmailNotifications: (state, action) => {
            state.emailNotifications = action.payload;
        },
        setPushNotifications: (state, action) => {
            state.pushNotifications = action.payload;
        },
        setMarketingEmails: (state, action) => {
            state.marketingEmails = action.payload;
        },
        // =============================================================================
        // PRIVACY PREFERENCES
        // =============================================================================
        updatePrivacyPreferences: (state, action) => {
            Object.assign(state, action.payload);
        },
        setPublicProfile: (state, action) => {
            state.publicProfile = action.payload;
        },
        setShowEmail: (state, action) => {
            state.showEmail = action.payload;
        },
        setShowActivity: (state, action) => {
            state.showActivity = action.payload;
        },
        setAllowAnalytics: (state, action) => {
            state.allowAnalytics = action.payload;
        },
        // =============================================================================
        // LEGO-SPECIFIC PREFERENCES
        // =============================================================================
        setDefaultCurrency: (state, action) => {
            state.defaultCurrency = action.payload;
        },
        setDefaultSortOrder: (state, action) => {
            state.defaultSortOrder = action.payload;
        },
        setShowRetiredSets: (state, action) => {
            state.showRetiredSets = action.payload;
        },
        addPreferredTheme: (state, action) => {
            if (!state.preferredThemes.includes(action.payload)) {
                state.preferredThemes.push(action.payload);
            }
        },
        removePreferredTheme: (state, action) => {
            state.preferredThemes = state.preferredThemes.filter(theme => theme !== action.payload);
        },
        setPreferredThemes: (state, action) => {
            state.preferredThemes = action.payload;
        },
        // =============================================================================
        // UI PREFERENCES
        // =============================================================================
        setCompactMode: (state, action) => {
            state.compactMode = action.payload;
        },
        setShowImages: (state, action) => {
            state.showImages = action.payload;
        },
        setItemsPerPage: (state, action) => {
            state.itemsPerPage = Math.max(10, Math.min(100, action.payload));
        },
        // =============================================================================
        // ACCESSIBILITY
        // =============================================================================
        setReduceMotion: (state, action) => {
            state.reduceMotion = action.payload;
        },
        setHighContrast: (state, action) => {
            state.highContrast = action.payload;
        },
        setFontSize: (state, action) => {
            state.fontSize = action.payload;
        },
        updateAccessibilityPreferences: (state, action) => {
            Object.assign(state, action.payload);
        },
        // =============================================================================
        // DATA SYNC
        // =============================================================================
        setSyncAcrossDevices: (state, action) => {
            state.syncAcrossDevices = action.payload;
        },
        updateLastSyncTime: (state) => {
            state.lastSyncTime = new Date().toISOString();
        },
        // =============================================================================
        // ONBOARDING
        // =============================================================================
        completeOnboarding: (state) => {
            state.hasCompletedOnboarding = true;
        },
        dismissFeature: (state, action) => {
            if (!state.dismissedFeatures.includes(action.payload)) {
                state.dismissedFeatures.push(action.payload);
            }
        },
        undismissFeature: (state, action) => {
            state.dismissedFeatures = state.dismissedFeatures.filter(feature => feature !== action.payload);
        },
        // =============================================================================
        // BULK OPERATIONS
        // =============================================================================
        updatePreferences: (state, action) => {
            Object.assign(state, action.payload);
        },
        resetPreferences: () => initialState,
        resetToDefaults: () => initialState,
    },
});
// =============================================================================
// EXPORTS
// =============================================================================
export const preferencesActions = preferencesSlice.actions;
export default preferencesSlice.reducer;
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Get preferences for local storage
 */
export const getPreferencesForStorage = (state) => {
    // Only store preferences that should persist across sessions
    return {
        theme: state.theme,
        language: state.language,
        timezone: state.timezone,
        emailNotifications: state.emailNotifications,
        pushNotifications: state.pushNotifications,
        marketingEmails: state.marketingEmails,
        publicProfile: state.publicProfile,
        showEmail: state.showEmail,
        showActivity: state.showActivity,
        allowAnalytics: state.allowAnalytics,
        defaultCurrency: state.defaultCurrency,
        defaultSortOrder: state.defaultSortOrder,
        showRetiredSets: state.showRetiredSets,
        preferredThemes: state.preferredThemes,
        compactMode: state.compactMode,
        showImages: state.showImages,
        itemsPerPage: state.itemsPerPage,
        reduceMotion: state.reduceMotion,
        highContrast: state.highContrast,
        fontSize: state.fontSize,
        syncAcrossDevices: state.syncAcrossDevices,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        dismissedFeatures: state.dismissedFeatures,
    };
};
