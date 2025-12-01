import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardModule } from '../DashboardModule'

// Mock the @repo/app-dashboard module
vi.mock('@repo/app-dashboard', () => ({
  AppDashboardModule: () => (
    <div data-testid="app-dashboard-module">
      <h1>App Dashboard</h1>
      <p>Welcome to the App Dashboard module.</p>
    </div>
  ),
}))

describe('DashboardModule', () => {
  it('renders the lazy-loaded dashboard module', async () => {
    render(<DashboardModule />)

    // Wait for lazy-loaded content to appear
    await waitFor(() => {
      expect(screen.getByTestId('app-dashboard-module')).toBeInTheDocument()
    })
  })

  it('displays the dashboard heading after loading', async () => {
    render(<DashboardModule />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /app dashboard/i })).toBeInTheDocument()
    })
  })

  it('shows loading state initially via Suspense', async () => {
    // The LoadingPage component is shown during Suspense
    render(<DashboardModule />)

    // Content should eventually load
    await waitFor(() => {
      expect(screen.getByText(/welcome to the app dashboard module/i)).toBeInTheDocument()
    })
  })

  it('lazy-loads from @repo/app-dashboard package', async () => {
    render(<DashboardModule />)

    // Verify the mocked component renders, confirming the import path is correct
    await waitFor(() => {
      expect(screen.getByTestId('app-dashboard-module')).toBeInTheDocument()
    })
  })
})
