/**
 * MainPage Component Tests
 * Story 2.8: Dashboard Empty State Integration
 * Story 2.9: Dashboard Loading State Integration
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MainPage } from '../main-page'

// Mock the dashboard API hook
vi.mock('@repo/api-client/rtk/dashboard-api', () => ({
  useGetStatsQuery: vi.fn(),
}))

// Mock the EmptyDashboard component
vi.mock('../../components/EmptyDashboard', () => ({
  EmptyDashboard: () => <div data-testid="empty-dashboard">Empty Dashboard</div>,
}))

// Mock the DashboardSkeleton component
vi.mock('../../components/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Loading Skeleton</div>,
}))

import { useGetStatsQuery } from '@repo/api-client/rtk/dashboard-api'

const mockUseGetStatsQuery = useGetStatsQuery as ReturnType<typeof vi.fn>

describe('MainPage', () => {
  it('shows loading skeleton while fetching stats', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    })

    render(<MainPage />)
    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument()
  })

  it('shows error state when stats fetch fails', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: 'Server error' },
    })

    render(<MainPage />)
    expect(screen.getByText(/Failed to load dashboard/i)).toBeInTheDocument()
  })

  it('shows EmptyDashboard when user has no MOCs', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: {
        data: {
          totalMocs: 0,
          wishlistCount: 0,
          themeCount: 0,
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      },
      isLoading: false,
      error: undefined,
    })

    render(<MainPage />)
    expect(screen.getByTestId('empty-dashboard')).toBeInTheDocument()
  })

  it('shows dashboard content when user has MOCs', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: {
        data: {
          totalMocs: 5,
          wishlistCount: 3,
          themeCount: 2,
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      },
      isLoading: false,
      error: undefined,
    })

    render(<MainPage />)
    expect(screen.getByText('App Dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('empty-dashboard')).not.toBeInTheDocument()
  })

  it('applies custom className to wrapper', () => {
    mockUseGetStatsQuery.mockReturnValue({
      data: {
        data: {
          totalMocs: 5,
          wishlistCount: 3,
          themeCount: 2,
          lastUpdated: '2025-01-01T00:00:00Z',
        },
      },
      isLoading: false,
      error: undefined,
    })

    const { container } = render(<MainPage className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
