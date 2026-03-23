import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { PortMonitorPage } from '../index'
import { portMonitorApi } from '../../../store/portMonitorApi'

vi.mock('../../../store/portMonitorApi', async () => {
  const actual = await vi.importActual('../../../store/portMonitorApi')
  return {
    ...actual,
    useGetPortHealthQuery: vi.fn(),
  }
})

import { useGetPortHealthQuery } from '../../../store/portMonitorApi'

const mockUseGetPortHealthQuery = vi.mocked(useGetPortHealthQuery)

function createTestStore() {
  return configureStore({
    reducer: {
      [portMonitorApi.reducerPath]: portMonitorApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(portMonitorApi.middleware),
  })
}

function renderWithStore() {
  const store = createTestStore()
  return render(
    <Provider store={store}>
      <PortMonitorPage />
    </Provider>,
  )
}

describe('PortMonitorPage', () => {
  it('renders the page header', () => {
    mockUseGetPortHealthQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetPortHealthQuery>)

    renderWithStore()
    expect(screen.getByText('Port Monitor')).toBeInTheDocument()
  })

  it('renders stats cards with data', () => {
    mockUseGetPortHealthQuery.mockReturnValue({
      data: {
        services: [
          {
            key: 'MAIN_APP_PORT',
            name: 'Main App',
            port: 8000,
            kind: 'frontend',
            status: 'healthy',
            responseTimeMs: 12,
            error: null,
            checkedAt: '2026-03-22T12:00:00Z',
          },
        ],
        summary: { total: 1, healthy: 1, unhealthy: 0, unknown: 0 },
        checkedAt: '2026-03-22T12:00:00Z',
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetPortHealthQuery>)

    renderWithStore()
    expect(screen.getByText('Main App')).toBeInTheDocument()
  })

  it('shows last checked timestamp', () => {
    mockUseGetPortHealthQuery.mockReturnValue({
      data: {
        services: [],
        summary: { total: 0, healthy: 0, unhealthy: 0, unknown: 0 },
        checkedAt: '2026-03-22T12:00:00Z',
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as ReturnType<typeof useGetPortHealthQuery>)

    renderWithStore()
    expect(screen.getByText(/Last checked:/)).toBeInTheDocument()
  })
})
