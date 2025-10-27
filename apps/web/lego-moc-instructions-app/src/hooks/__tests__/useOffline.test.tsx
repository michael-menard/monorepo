import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useOffline } from '../useOffline'
import {
  offlineApi,
  useGetOfflineStatusQuery,
  useProcessOfflineActionsMutation,
} from '../../services/offlineApi'

// Mock the offline API hooks
vi.mock('../../services/offlineApi', () => ({
  offlineApi: {
    reducerPath: 'offlineApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
  useGetOfflineStatusQuery: vi.fn(),
  useProcessOfflineActionsMutation: vi.fn(),
}))

// Mock the offline manager
vi.mock('../../services/offlineManager', () => ({
  offlineManager: {
    storeData: vi.fn(),
    getStoredData: vi.fn(),
    queueAction: vi.fn(),
    clearOfflineData: vi.fn(),
  },
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

const createMockStore = () => {
  return configureStore({
    reducer: {
      [offlineApi.reducerPath]: offlineApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(offlineApi.middleware),
  })
}

const renderHookWithProvider = (hook: () => any) => {
  const store = createMockStore()
  return renderHook(hook, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  })
}

describe('useOffline', () => {
  const mockUseGetOfflineStatusQuery = vi.mocked(useGetOfflineStatusQuery)
  const mockUseProcessOfflineActionsMutation = vi.mocked(useProcessOfflineActionsMutation)

  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
  })

  it('should return online status when connected', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 0,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([vi.fn(), { isLoading: false }] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.isOnline).toBe(true)
    expect(result.current.isOffline).toBe(false)
    expect(result.current.pendingActions).toBe(0)
  })

  it('should return offline status when disconnected', () => {
    navigator.onLine = false
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: false,
        pendingActions: 0,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([vi.fn(), { isLoading: false }] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.isOnline).toBe(false)
    expect(result.current.isOffline).toBe(true)
  })

  it('should show pending actions count', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 3,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([vi.fn(), { isLoading: false }] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.pendingActions).toBe(3)
    expect(result.current.hasPendingActions).toBe(true)
  })

  it('should handle sync when online and has pending actions', async () => {
    const mockProcessActions = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: undefined }),
    })
    const mockRefetch = vi.fn()

    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 2,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: mockRefetch,
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      mockProcessActions,
      { isLoading: false },
    ] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.canSync).toBe(true)

    await act(async () => {
      await result.current.syncOfflineActions()
    })

    expect(mockProcessActions).toHaveBeenCalled()
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('should not sync when offline', async () => {
    navigator.onLine = false
    const mockProcessActions = vi.fn()

    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: false,
        pendingActions: 1,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      mockProcessActions,
      { isLoading: false },
    ] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.canSync).toBe(false)

    await act(async () => {
      await result.current.syncOfflineActions()
    })

    expect(mockProcessActions).not.toHaveBeenCalled()
  })

  it('should handle loading state during sync', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 1,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([vi.fn(), { isLoading: true }] as any)

    const { result } = renderHookWithProvider(useOffline)

    expect(result.current.isProcessing).toBe(true)
  })
})
