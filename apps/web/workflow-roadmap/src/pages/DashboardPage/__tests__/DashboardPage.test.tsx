/**
 * DashboardPage integration test
 *
 * Tests loading, error, and rendered states using a mocked RTK Query hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from 'react-router-dom'
import type { DashboardResponse } from '../../../store/roadmapApi'

// Mock the RTK Query hook
const mockUseGetDashboardQuery = vi.fn()
vi.mock('../../../store/roadmapApi', () => ({
  useGetDashboardQuery: () => mockUseGetDashboardQuery(),
}))

// Must import after mock setup
const { DashboardPage } = await import('..')

function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({
    routeTree: rootRoute.addChildren([]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

const MOCK_DASHBOARD: DashboardResponse = {
  flowHealth: {
    totalStories: 100,
    distribution: [
      { state: 'backlog', count: 50 },
      { state: 'in_progress', count: 30 },
      { state: 'blocked', count: 20 },
    ],
    blockedCount: 20,
  },
  unblockedQueue: [
    {
      storyId: 'FEAT-001',
      title: 'First unblocked story',
      priority: 'P1',
      state: 'ready',
      plans: [{ planSlug: 'plan-a', title: 'Plan A' }],
      fanOut: 5,
      daysInState: 3,
    },
  ],
  planProgress: [
    {
      planSlug: 'plan-a',
      title: 'Plan A',
      status: 'active',
      priority: 'P1',
      totalStories: 10,
      completedStories: 3,
      activeStories: 2,
      blockedStories: 1,
      daysSinceActivity: 2,
      health: 'red',
    },
  ],
  agingStories: [
    {
      storyId: 'OLD-001',
      title: 'Ancient story',
      state: 'in_progress',
      daysInState: 45,
      plans: [{ planSlug: 'plan-a', title: 'Plan A' }],
    },
  ],
  impactRanking: [
    {
      storyId: 'IMP-001',
      title: 'High impact story',
      state: 'ready',
      priority: 'P0',
      fanOut: 12,
      plans: [{ planSlug: 'plan-a', title: 'Plan A' }],
    },
  ],
  backlogSummary: {
    totalOpen: 15,
    byPriority: [
      { priority: 'P1', count: 8 },
      { priority: 'P2', count: 7 },
    ],
    byType: [
      { taskType: 'bug', count: 10 },
      { taskType: 'feature', count: 5 },
    ],
  },
  backlogAging: [
    { bucket: '<7d', count: 5 },
    { bucket: '7-14d', count: 4 },
    { bucket: '14-30d', count: 3 },
    { bucket: '30+d', count: 3 },
  ],
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
    })
  })

  it('shows error state', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 500 },
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()
    })
  })

  it('renders page title when data is loaded', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: MOCK_DASHBOARD,
      isLoading: false,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Cross-plan project health and next actions')).toBeInTheDocument()
    })
  })

  it('renders all 7 dashboard sections', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: MOCK_DASHBOARD,
      isLoading: false,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Flow Health')).toBeInTheDocument()
      expect(screen.getByText('Unblocked Work Queue')).toBeInTheDocument()
      expect(screen.getByText('Plan Progress')).toBeInTheDocument()
      expect(screen.getByText('Aging Stories')).toBeInTheDocument()
      expect(screen.getByText('Impact Ranking')).toBeInTheDocument()
      expect(screen.getByText('Backlog Health')).toBeInTheDocument()
      expect(screen.getByText('Backlog Aging')).toBeInTheDocument()
    })
  })

  it('passes flow health data correctly', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: MOCK_DASHBOARD,
      isLoading: false,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('100 stories')).toBeInTheDocument()
      expect(screen.getByText('20 blocked')).toBeInTheDocument()
    })
  })

  it('renders unblocked queue stories', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: MOCK_DASHBOARD,
      isLoading: false,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('FEAT-001')).toBeInTheDocument()
    })
  })

  it('renders impact ranking stories', async () => {
    mockUseGetDashboardQuery.mockReturnValue({
      data: MOCK_DASHBOARD,
      isLoading: false,
      error: undefined,
    })
    renderWithRouter(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('IMP-001')).toBeInTheDocument()
      expect(screen.getByText('fan: 12')).toBeInTheDocument()
    })
  })
})
