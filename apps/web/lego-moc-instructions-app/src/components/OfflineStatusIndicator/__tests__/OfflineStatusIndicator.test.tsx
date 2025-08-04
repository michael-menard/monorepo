import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { OfflineStatusIndicator } from '../OfflineStatusIndicator'
import { offlineApi, useGetOfflineStatusQuery, useProcessOfflineActionsMutation } from '../../../services/offlineApi'

// Mock the offline API hooks
vi.mock('../../../services/offlineApi', () => ({
  offlineApi: {
    reducerPath: 'offlineApi',
    reducer: (state = {}, action: any) => state,
    middleware: () => (next: any) => (action: any) => next(action),
  },
  useGetOfflineStatusQuery: vi.fn(),
  useProcessOfflineActionsMutation: vi.fn(),
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
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(offlineApi.middleware),
  })
}

const renderWithProvider = (component: React.ReactElement) => {
  const store = createMockStore()
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  )
}

describe('OfflineStatusIndicator', () => {
  const mockUseGetOfflineStatusQuery = vi.mocked(useGetOfflineStatusQuery)
  const mockUseProcessOfflineActionsMutation = vi.mocked(useProcessOfflineActionsMutation)

  beforeEach(() => {
    vi.clearAllMocks()
    navigator.onLine = true
  })

  it('should not render when online and no pending actions', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 0,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    expect(screen.queryByText('You are online')).not.toBeInTheDocument()
  })

  it('should render when offline', () => {
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

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    expect(screen.getByText('You are offline')).toBeInTheDocument()
    expect(screen.getByText('Some features may be limited')).toBeInTheDocument()
  })

  it('should render when there are pending actions', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 3,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    expect(screen.getByText('You are online')).toBeInTheDocument()
    expect(screen.getByText('3 actions pending sync')).toBeInTheDocument()
    expect(screen.getByText('Sync Now')).toBeInTheDocument()
  })

  it('should handle sync button click', async () => {
    const mockProcessActions = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ data: undefined })
    })
    const mockRefetch = vi.fn()

    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 1,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: mockRefetch,
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      mockProcessActions,
      { isLoading: false },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    const syncButton = screen.getByText('Sync Now')
    fireEvent.click(syncButton)

    await waitFor(() => {
      expect(mockProcessActions).toHaveBeenCalled()
      expect(mockRefetch).toHaveBeenCalled()
    })
  })

  it('should show loading state when syncing', () => {
    mockUseGetOfflineStatusQuery.mockReturnValue({
      data: {
        isOnline: true,
        pendingActions: 1,
        lastSync: Date.now(),
        dataVersion: '1.0.0',
      },
      refetch: vi.fn(),
    } as any)

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      vi.fn(),
      { isLoading: true },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('should show offline warning message', () => {
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

    mockUseProcessOfflineActionsMutation.mockReturnValue([
      vi.fn(),
      { isLoading: false },
    ] as any)

    renderWithProvider(<OfflineStatusIndicator />)
    
    expect(screen.getByText('Changes will sync when you\'re back online')).toBeInTheDocument()
  })
}) 