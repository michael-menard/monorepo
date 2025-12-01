import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'

import {
  themeSlice,
  setTheme,
  setSystemTheme,
  initializeTheme,
  selectTheme,
  selectResolvedTheme,
  selectSystemTheme,
} from '../themeSlice'

type TestRootState = {
  theme: ReturnType<typeof themeSlice.getInitialState>
}

const createTestStore = () =>
  configureStore({
    reducer: {
      theme: themeSlice.reducer,
    },
  }) as EnhancedStore<TestRootState>

describe('themeSlice', () => {
  let store: EnhancedStore<TestRootState>

  beforeEach(() => {
    // Ensure a clean environment between tests
    localStorage.clear()
    store = createTestStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState()

      expect(selectTheme(state)).toBe('system')
      expect(selectSystemTheme(state)).toBe('light')
      expect(selectResolvedTheme(state)).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('should set theme to light and update resolvedTheme', () => {
      store.dispatch(setTheme('light'))
      const state = store.getState()

      expect(selectTheme(state)).toBe('light')
      expect(selectResolvedTheme(state)).toBe('light')
      expect(localStorage.getItem('main-app-theme')).toBe('light')
    })

    it('should set theme to dark and update resolvedTheme', () => {
      store.dispatch(setTheme('dark'))
      const state = store.getState()

      expect(selectTheme(state)).toBe('dark')
      expect(selectResolvedTheme(state)).toBe('dark')
      expect(localStorage.getItem('main-app-theme')).toBe('dark')
    })

    it('should respect system theme when theme is system', () => {
      // Default theme is `system` with systemTheme derived from matchMedia mock (light)
      store.dispatch(setSystemTheme('dark'))
      store.dispatch(setTheme('system'))
      const state = store.getState()

      expect(selectTheme(state)).toBe('system')
      expect(selectSystemTheme(state)).toBe('dark')
      expect(selectResolvedTheme(state)).toBe('dark')
      expect(localStorage.getItem('main-app-theme')).toBe('system')
    })
  })

  describe('setSystemTheme', () => {
    it('should update systemTheme and recompute resolvedTheme without changing theme', () => {
      // Initial theme is `system`
      store.dispatch(setSystemTheme('dark'))
      const state = store.getState()

      expect(selectTheme(state)).toBe('system')
      expect(selectSystemTheme(state)).toBe('dark')
      expect(selectResolvedTheme(state)).toBe('dark')
    })
  })

  describe('initializeTheme', () => {
    it('should load valid theme from localStorage and update resolvedTheme', () => {
      localStorage.setItem('main-app-theme', 'dark')

      store.dispatch(initializeTheme())
      const state = store.getState()

      expect(selectTheme(state)).toBe('dark')
      expect(selectResolvedTheme(state)).toBe('dark')
    })

    it('should ignore invalid stored theme values and keep defaults', () => {
      localStorage.setItem('main-app-theme', 'invalid-theme')

      store.dispatch(initializeTheme())
      const state = store.getState()

      expect(selectTheme(state)).toBe('system')
      expect(selectResolvedTheme(state)).toBe('light')
    })
  })
})
