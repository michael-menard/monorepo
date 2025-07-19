/**
 * Preferences Slice
 * Manages user preferences and application settings
 */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// =============================================================================
// TYPES
// =============================================================================

interface PreferencesState {
  // Display preferences
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  
  // Notification preferences
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  
  // Privacy preferences
  publicProfile: boolean
  showEmail: boolean
  showActivity: boolean
  allowAnalytics: boolean
  
  // LEGO-specific preferences
  defaultCurrency: 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'
  defaultSortOrder: 'newest' | 'oldest' | 'name' | 'pieces' | 'price'
  showRetiredSets: boolean
  preferredThemes: string[]
  
  // UI preferences
  compactMode: boolean
  showImages: boolean
  itemsPerPage: number
  
  // Accessibility
  reduceMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  
  // Data sync
  syncAcrossDevices: boolean
  lastSyncTime: string | null
  
  // Onboarding
  hasCompletedOnboarding: boolean
  dismissedFeatures: string[]
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: PreferencesState = {
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
}

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
    
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload
    },
    
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload
    },
    
    setTimezone: (state, action: PayloadAction<string>) => {
      state.timezone = action.payload
    },
    
    // =============================================================================
    // NOTIFICATION PREFERENCES
    // =============================================================================
    
    updateNotificationPreferences: (state, action: PayloadAction<{
      emailNotifications?: boolean
      pushNotifications?: boolean
      marketingEmails?: boolean
    }>) => {
      Object.assign(state, action.payload)
    },
    
    setEmailNotifications: (state, action: PayloadAction<boolean>) => {
      state.emailNotifications = action.payload
    },
    
    setPushNotifications: (state, action: PayloadAction<boolean>) => {
      state.pushNotifications = action.payload
    },
    
    setMarketingEmails: (state, action: PayloadAction<boolean>) => {
      state.marketingEmails = action.payload
    },
    
    // =============================================================================
    // PRIVACY PREFERENCES
    // =============================================================================
    
    updatePrivacyPreferences: (state, action: PayloadAction<{
      publicProfile?: boolean
      showEmail?: boolean
      showActivity?: boolean
      allowAnalytics?: boolean
    }>) => {
      Object.assign(state, action.payload)
    },
    
    setPublicProfile: (state, action: PayloadAction<boolean>) => {
      state.publicProfile = action.payload
    },
    
    setShowEmail: (state, action: PayloadAction<boolean>) => {
      state.showEmail = action.payload
    },
    
    setShowActivity: (state, action: PayloadAction<boolean>) => {
      state.showActivity = action.payload
    },
    
    setAllowAnalytics: (state, action: PayloadAction<boolean>) => {
      state.allowAnalytics = action.payload
    },
    
    // =============================================================================
    // LEGO-SPECIFIC PREFERENCES
    // =============================================================================
    
    setDefaultCurrency: (state, action: PayloadAction<'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD'>) => {
      state.defaultCurrency = action.payload
    },
    
    setDefaultSortOrder: (state, action: PayloadAction<'newest' | 'oldest' | 'name' | 'pieces' | 'price'>) => {
      state.defaultSortOrder = action.payload
    },
    
    setShowRetiredSets: (state, action: PayloadAction<boolean>) => {
      state.showRetiredSets = action.payload
    },
    
    addPreferredTheme: (state, action: PayloadAction<string>) => {
      if (!state.preferredThemes.includes(action.payload)) {
        state.preferredThemes.push(action.payload)
      }
    },
    
    removePreferredTheme: (state, action: PayloadAction<string>) => {
      state.preferredThemes = state.preferredThemes.filter(theme => theme !== action.payload)
    },
    
    setPreferredThemes: (state, action: PayloadAction<string[]>) => {
      state.preferredThemes = action.payload
    },
    
    // =============================================================================
    // UI PREFERENCES
    // =============================================================================
    
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.compactMode = action.payload
    },
    
    setShowImages: (state, action: PayloadAction<boolean>) => {
      state.showImages = action.payload
    },
    
    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = Math.max(10, Math.min(100, action.payload))
    },
    
    // =============================================================================
    // ACCESSIBILITY
    // =============================================================================
    
    setReduceMotion: (state, action: PayloadAction<boolean>) => {
      state.reduceMotion = action.payload
    },
    
    setHighContrast: (state, action: PayloadAction<boolean>) => {
      state.highContrast = action.payload
    },
    
    setFontSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.fontSize = action.payload
    },
    
    updateAccessibilityPreferences: (state, action: PayloadAction<{
      reduceMotion?: boolean
      highContrast?: boolean
      fontSize?: 'small' | 'medium' | 'large'
    }>) => {
      Object.assign(state, action.payload)
    },
    
    // =============================================================================
    // DATA SYNC
    // =============================================================================
    
    setSyncAcrossDevices: (state, action: PayloadAction<boolean>) => {
      state.syncAcrossDevices = action.payload
    },
    
    updateLastSyncTime: (state) => {
      state.lastSyncTime = new Date().toISOString()
    },
    
    // =============================================================================
    // ONBOARDING
    // =============================================================================
    
    completeOnboarding: (state) => {
      state.hasCompletedOnboarding = true
    },
    
    dismissFeature: (state, action: PayloadAction<string>) => {
      if (!state.dismissedFeatures.includes(action.payload)) {
        state.dismissedFeatures.push(action.payload)
      }
    },
    
    undismissFeature: (state, action: PayloadAction<string>) => {
      state.dismissedFeatures = state.dismissedFeatures.filter(
        feature => feature !== action.payload
      )
    },
    
    // =============================================================================
    // BULK OPERATIONS
    // =============================================================================
    
    updatePreferences: (state, action: PayloadAction<Partial<PreferencesState>>) => {
      Object.assign(state, action.payload)
    },
    
    resetPreferences: () => initialState,
    
    resetToDefaults: () => initialState,
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const preferencesActions = preferencesSlice.actions
export default preferencesSlice.reducer

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get preferences for local storage
 */
export const getPreferencesForStorage = (state: PreferencesState) => {
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
  }
} 