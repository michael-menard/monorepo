import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { ServiceStatusTable } from '../index'
import { portMonitorApi } from '../../../store/portMonitorApi'
import type { ServiceHealth } from '../../../store/__types__'

vi.mock('@repo/charts', () => ({
  Sparkline: ({ data }: { data: unknown[] }) => (
    <div data-testid="sparkline">{data.length} points</div>
  ),
}))

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    useToast: () => ({ success: vi.fn(), error: vi.fn() }),
  }
})

function renderWithStore(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      [portMonitorApi.reducerPath]: portMonitorApi.reducer,
    },
    middleware: gDM => gDM().concat(portMonitorApi.middleware),
  })
  return render(<Provider store={store}>{ui}</Provider>)
}

const mockServices: ServiceHealth[] = [
  {
    key: 'MAIN_APP_PORT',
    name: 'Main App',
    port: 8000,
    kind: 'frontend',
    status: 'healthy',
    responseTimeMs: 12,
    error: null,
    checkedAt: '2026-03-22T12:00:00Z',
    pid: 1234,
    processName: 'node',
    conflict: null,
  },
  {
    key: 'LEGO_API_PORT',
    name: 'Lego Api',
    port: 9100,
    kind: 'backend',
    status: 'unhealthy',
    responseTimeMs: null,
    error: 'Connection refused',
    checkedAt: '2026-03-22T12:00:00Z',
    pid: null,
    processName: null,
    conflict: null,
  },
]

describe('ServiceStatusTable', () => {
  it('renders all service rows', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('Main App')).toBeInTheDocument()
    expect(screen.getByText('Lego Api')).toBeInTheDocument()
  })

  it('displays port numbers', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('8000')).toBeInTheDocument()
    expect(screen.getByText('9100')).toBeInTheDocument()
  })

  it('shows kind badges', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()
  })

  it('shows response time for healthy services', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('12ms')).toBeInTheDocument()
  })

  it('shows error message for unhealthy services', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('Connection refused')).toBeInTheDocument()
  })

  it('renders loading skeletons when isLoading', () => {
    const { container } = renderWithStore(<ServiceStatusTable isLoading />)
    const skeletons = container.querySelectorAll('[class*="animate-pulse"], [data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders table headers', () => {
    renderWithStore(<ServiceStatusTable services={mockServices} />)
    expect(screen.getByText('Service')).toBeInTheDocument()
    expect(screen.getByText('Port')).toBeInTheDocument()
    expect(screen.getByText('Kind')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Response')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
  })
})
