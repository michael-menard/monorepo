import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  authSlice,
  setLoading,
  setAuthenticated,
  setUnauthenticated,
  updateUser,
  updateTokens,
  setError,
  clearError,
  selectAuth,
  selectIsAuthenticated,
  selectUser,
  selectAuthLoading,
  selectAuthError,
} from '../authSlice'
import type { User } from '../authSlice'

describe('authSlice', () => {
  const createStore = () =>
    configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
    })

  type TestStore = ReturnType<typeof createStore>

  let store: TestStore

  beforeEach(() => {
    store = createStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState()
      expect(selectAuth(state)).toEqual({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        tokens: null,
        error: null,
      })
    })
  })

  describe('setLoading', () => {
    it('should set loading state', () => {
      store.dispatch(setLoading(false))
      const state = store.getState()
      expect(selectAuthLoading(state)).toBe(false)
    })
  })

  describe('setAuthenticated', () => {
    it('should set authenticated state with user and tokens', () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
      }
      const mockTokens = {
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
      }

      store.dispatch(setAuthenticated({ user: mockUser, tokens: mockTokens }))
      const state = store.getState()

      expect(selectIsAuthenticated(state)).toBe(true)
      expect(selectAuthLoading(state)).toBe(false)
      expect(selectUser(state)).toEqual(mockUser)
      expect(selectAuth(state).tokens).toEqual(mockTokens)
      expect(selectAuthError(state)).toBeNull()
    })
  })

  describe('setUnauthenticated', () => {
    it('should clear authentication state', () => {
      // First set authenticated
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      store.dispatch(setAuthenticated({ user: mockUser, tokens: { accessToken: 'token' } }))

      // Then set unauthenticated
      store.dispatch(setUnauthenticated())
      const state = store.getState()

      expect(selectIsAuthenticated(state)).toBe(false)
      expect(selectAuthLoading(state)).toBe(false)
      expect(selectUser(state)).toBeNull()
      expect(selectAuth(state).tokens).toBeNull()
      expect(selectAuthError(state)).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user properties when user exists', () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }
      store.dispatch(setAuthenticated({ user: mockUser, tokens: null }))

      store.dispatch(updateUser({ name: 'Updated Name', avatar: 'avatar-url' }))
      const state = store.getState()

      expect(selectUser(state)).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
        avatar: 'avatar-url',
      })
    })

    it('should not update when user is null', () => {
      store.dispatch(updateUser({ name: 'Updated Name' }))
      const state = store.getState()

      expect(selectUser(state)).toBeNull()
    })
  })

  describe('updateTokens', () => {
    it('should update tokens', () => {
      const newTokens = {
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
      }

      store.dispatch(updateTokens(newTokens))
      const state = store.getState()

      expect(selectAuth(state).tokens).toEqual(newTokens)
    })
  })

  describe('error handling', () => {
    it('should set error and stop loading', () => {
      store.dispatch(setError('Authentication failed'))
      const state = store.getState()

      expect(selectAuthError(state)).toBe('Authentication failed')
      expect(selectAuthLoading(state)).toBe(false)
    })

    it('should clear error', () => {
      store.dispatch(setError('Some error'))
      store.dispatch(clearError())
      const state = store.getState()

      expect(selectAuthError(state)).toBeNull()
    })
  })
})
