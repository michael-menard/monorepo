import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useNavigationSync } from '../useNavigationSync'
import { globalUISlice, selectIsNavigating } from '@/store/slices/globalUISlice'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useRouterState: vi.fn(),
}))

import { useRouterState } from '@tanstack/react-router'

const mockedUseRouterState = vi.mocked(useRouterState)

// Create test store
const createTestStore = () =>
  configureStore({
    reducer: {
      globalUI: globalUISlice.reducer,
    },
  })

// Test wrapper
const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  return Wrapper
}

describe('useNavigationSync', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('router state subscription', () => {
    it('subscribes to isLoading state', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      // Verify useRouterState was called (subscribed to router)
      expect(mockedUseRouterState).toHaveBeenCalled()
    })

    it('subscribes to isTransitioning state', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      // Called 3 times: isLoading, isTransitioning, status
      expect(mockedUseRouterState).toHaveBeenCalledTimes(3)
    })

    it('subscribes to status state', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(mockedUseRouterState).toHaveBeenCalledTimes(3)
    })
  })

  describe('loading state detection', () => {
    it('sets navigating true when isLoading is true', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: true, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(true)
    })

    it('sets navigating true when isTransitioning is true', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: true, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(true)
    })

    it('sets navigating true when status is pending', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'pending' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(true)
    })

    it('sets navigating false when all states are idle', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(false)
    })

    it('sets navigating true when multiple states are active', () => {
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: true, isTransitioning: true, status: 'pending' }
        return select?.(mockState as never) ?? mockState
      })

      renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(true)
    })
  })

  describe('state transitions', () => {
    it('updates Redux when router state changes', () => {
      // Start with idle state
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      const { rerender } = renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(false)

      // Simulate navigation start
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: true, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      rerender()

      expect(selectIsNavigating(store.getState())).toBe(true)
    })

    it('clears navigating when navigation completes', () => {
      // Start with loading state
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: true, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      const { rerender } = renderHook(() => useNavigationSync(), {
        wrapper: createWrapper(store),
      })

      expect(selectIsNavigating(store.getState())).toBe(true)

      // Simulate navigation complete
      mockedUseRouterState.mockImplementation(({ select }) => {
        const mockState = { isLoading: false, isTransitioning: false, status: 'idle' }
        return select?.(mockState as never) ?? mockState
      })

      rerender()

      expect(selectIsNavigating(store.getState())).toBe(false)
    })
  })
})
