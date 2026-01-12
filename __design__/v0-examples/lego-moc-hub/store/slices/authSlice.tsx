import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface User {
  id: string
  name?: string
  email: string
}

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  loading: boolean
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<{ user: User }>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.loading = false
    },
    clearAuth: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.loading = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
  },
})

export const { setAuth, clearAuth, setLoading } = authSlice.actions

// Selector
export const selectAuth = (state: { auth: AuthState }) => state.auth

export default authSlice.reducer
