import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  roles?: string[]
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    notifications?: boolean
  }
}

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  tokens: {
    accessToken?: string
    idToken?: string
    refreshToken?: string
  } | null
  error: string | null
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  tokens: null,
  error: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    setAuthenticated: (
      state,
      action: PayloadAction<{ user: User; tokens: AuthState['tokens'] }>,
    ) => {
      state.isAuthenticated = true
      state.isLoading = false
      state.user = action.payload.user
      state.tokens = action.payload.tokens
      state.error = null
    },

    setUnauthenticated: state => {
      state.isAuthenticated = false
      state.isLoading = false
      state.user = null
      state.tokens = null
      state.error = null
    },

    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },

    updateTokens: (state, action: PayloadAction<AuthState['tokens']>) => {
      state.tokens = action.payload
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },

    clearError: state => {
      state.error = null
    },
  },
})

export const {
  setLoading,
  setAuthenticated,
  setUnauthenticated,
  updateUser,
  updateTokens,
  setError,
  clearError,
} = authSlice.actions

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error
