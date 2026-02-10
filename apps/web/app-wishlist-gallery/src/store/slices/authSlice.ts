/**
 * Auth Slice (App Wishlist Gallery)
 *
 * Minimal auth slice for the wishlist gallery module.
 * Stores basic user info for scoping operations like draft persistence.
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (REQUIRED per CLAUDE.md - no TypeScript interfaces)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User schema - minimal user info needed for the module
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
})

export type User = z.infer<typeof UserSchema>

/**
 * Auth state schema
 */
export const AuthStateSchema = z.object({
  user: UserSchema.nullable(),
  isAuthenticated: z.boolean(),
})

export type AuthState = z.infer<typeof AuthStateSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// Slice Definition
// ─────────────────────────────────────────────────────────────────────────────

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Set authenticated user
     */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },

    /**
     * Clear user (logout)
     */
    clearUser: state => {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const { setUser, clearUser } = authSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const selectUser = (state: { auth: AuthState }) => state.auth.user
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
