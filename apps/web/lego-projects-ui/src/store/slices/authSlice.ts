/**
 * Authentication Slice
 * Manages user authentication state, tokens, and auth-related UI state
 */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
// @ts-expect-error: TypeScript cannot resolve .js import for schemas, but it exists and is correct for NodeNext/ESM
import type { UserProfileSchema } from '../../types/schemas.js';
import { z } from 'zod'

// =============================================================================
// TYPES
// =============================================================================

type UserProfile = z.infer<typeof UserProfileSchema>

export interface AuthState {
  // User data
  user: UserProfile | null
  token: string | null
  refreshToken: string | null
  
  // Authentication status
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  
  // Error handling
  error: string | null
  lastLoginAttempt: string | null
  
  // Session management
  sessionExpiry: string | null
  rememberMe: boolean
  
  // UI state
  showAuthModal: boolean
  authModalType: 'login' | 'signup' | 'forgot-password' | 'reset-password' | null
  redirectAfterLogin: string | null
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: AuthState = {
  // User data
  user: null,
  token: null,
  refreshToken: null,
  
  // Authentication status
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  
  // Error handling
  error: null,
  lastLoginAttempt: null,
  
  // Session management
  sessionExpiry: null,
  rememberMe: false,
  
  // UI state
  showAuthModal: false,
  authModalType: null,
  redirectAfterLogin: null,
}

// =============================================================================
// SLICE DEFINITION
// =============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // =============================================================================
    // AUTHENTICATION ACTIONS
    // =============================================================================
    
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
      state.lastLoginAttempt = new Date().toISOString()
    },
    
    loginSuccess: (state, action: PayloadAction<{
      user: UserProfile
      token: string
      refreshToken?: string
      sessionExpiry?: string
      rememberMe?: boolean
    }>) => {
      state.isLoading = false
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken || null
      state.sessionExpiry = action.payload.sessionExpiry || null
      state.rememberMe = action.payload.rememberMe || false
      state.error = null
      state.showAuthModal = false
      state.authModalType = null
    },
    
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.sessionExpiry = null
      state.error = action.payload
    },
    
    logout: (state) => {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.sessionExpiry = null
      state.rememberMe = false
      state.error = null
      state.showAuthModal = false
      state.authModalType = null
      state.redirectAfterLogin = null
    },
    
    // =============================================================================
    // TOKEN MANAGEMENT
    // =============================================================================
    
    tokenRefreshStart: (state) => {
      state.isLoading = true
    },
    
    tokenRefreshSuccess: (state, action: PayloadAction<{
      token: string
      refreshToken?: string
      sessionExpiry?: string
    }>) => {
      state.isLoading = false
      state.token = action.payload.token
      state.refreshToken = action.payload.refreshToken || state.refreshToken
      state.sessionExpiry = action.payload.sessionExpiry || null
      state.error = null
    },
    
    tokenRefreshFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.sessionExpiry = null
      state.error = action.payload
    },
    
    // =============================================================================
    // USER PROFILE MANAGEMENT
    // =============================================================================
    
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
    
    updateAvatar: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.avatar = action.payload
      }
    },
    
    // =============================================================================
    // ERROR HANDLING
    // =============================================================================
    
    clearError: (state) => {
      state.error = null
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    
    // =============================================================================
    // INITIALIZATION
    // =============================================================================
    
    initializeAuth: (state, action: PayloadAction<{
      user?: UserProfile
      token?: string
      refreshToken?: string
      sessionExpiry?: string
      rememberMe?: boolean
    }>) => {
      const { user, token, refreshToken, sessionExpiry, rememberMe } = action.payload
      
      if (user && token) {
        state.user = user
        state.token = token
        state.refreshToken = refreshToken || null
        state.sessionExpiry = sessionExpiry || null
        state.rememberMe = rememberMe || false
        state.isAuthenticated = true
      }
      
      state.isInitialized = true
      state.isLoading = false
    },
    
    // =============================================================================
    // UI STATE MANAGEMENT
    // =============================================================================
    
    showAuthModal: (state, action: PayloadAction<{
      type: 'login' | 'signup' | 'forgot-password' | 'reset-password'
      redirectAfterLogin?: string
    }>) => {
      state.showAuthModal = true
      state.authModalType = action.payload.type
      state.redirectAfterLogin = action.payload.redirectAfterLogin || null
    },
    
    hideAuthModal: (state) => {
      state.showAuthModal = false
      state.authModalType = null
      state.error = null
    },
    
    setRedirectAfterLogin: (state, action: PayloadAction<string | null>) => {
      state.redirectAfterLogin = action.payload
    },
    
    // =============================================================================
    // SESSION MANAGEMENT
    // =============================================================================
    
    updateSessionExpiry: (state, action: PayloadAction<string>) => {
      state.sessionExpiry = action.payload
    },
    
    checkSessionExpiry: (state) => {
      if (state.sessionExpiry && new Date() > new Date(state.sessionExpiry)) {
        // Session expired, clear auth state
        state.user = null
        state.token = null
        state.refreshToken = null
        state.isAuthenticated = false
        state.sessionExpiry = null
        state.error = 'Session expired. Please log in again.'
      }
    },
    
    // =============================================================================
    // PREFERENCES
    // =============================================================================
    
    updateRememberMe: (state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload
    },
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const authActions: typeof authSlice.actions = authSlice.actions
export { authSlice }
export default authSlice.reducer

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Store tokens in appropriate storage based on rememberMe preference
 */
export const storeTokens = (token: string, refreshToken?: string, rememberMe = false) => {
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem('authToken', token)
  if (refreshToken) {
    storage.setItem('refreshToken', refreshToken)
  }
  localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false')
}

/**
 * Clear all stored authentication tokens
 */
export const clearStoredTokens = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('refreshToken')
  sessionStorage.removeItem('authToken')
  sessionStorage.removeItem('refreshToken')
  localStorage.removeItem('userPreferences')
}

/**
 * Get stored tokens from storage
 */
export const getStoredTokens = () => {
  const rememberMe = localStorage.getItem('rememberMe') === 'true'
  const storage = rememberMe ? localStorage : sessionStorage
  
  return {
    token: storage.getItem('authToken'),
    refreshToken: storage.getItem('refreshToken'),
    rememberMe,
  }
} 