import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { PlanProgressGrid } from '../PlanProgressGrid'
import type { DashboardResponse } from '../../../store/roadmapApi'

type PlanProgressItem = DashboardResponse['planProgress'][number]

function makePlan(overrides: Partial<PlanProgressItem> = {}): PlanProgressItem {
  return {
    planSlug: 'test-plan',
    title: 'Test Plan',
    status: 'active',
    priority: 'P1',
    totalStories: 10,
    completedStories: 3,
    activeStories: 2,
    blockedStories: 0,
    daysSinceActivity: 1,
    health: 'green',
    ...overrides,
  }
}

function renderWithRouter(ui: React.ReactElement) {
  const rootRoute = createRootRoute({ component: () => ui })
  const router = createRouter({
    routeTree: rootRoute.addChildren([]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('PlanProgressGrid', () => {
  it('renders null when plans is empty', async () => {
    const { container } = renderWithRouter(<PlanProgressGrid plans={[]} />)
    await waitFor(() => {
      expect(container.querySelector('[class*="space-y"]')).toBeNull()
    })
  })

  it('shows Plan Progress heading', async () => {
    renderWithRouter(<PlanProgressGrid plans={[makePlan()]} />)
    await waitFor(() => {
      expect(screen.getByText('Plan Progress')).toBeInTheDocument()
    })
  })

  it('renders a card for each plan', async () => {
    const plans = [
      makePlan({ planSlug: 'a', title: 'Plan A' }),
      makePlan({ planSlug: 'b', title: 'Plan B' }),
    ]
    renderWithRouter(<PlanProgressGrid plans={plans} />)
    await waitFor(() => {
      expect(screen.getByText('Plan A')).toBeInTheDocument()
      expect(screen.getByText('Plan B')).toBeInTheDocument()
    })
  })

  it('shows completed/total stories count', async () => {
    renderWithRouter(
      <PlanProgressGrid plans={[makePlan({ completedStories: 5, totalStories: 20 })]} />,
    )
    await waitFor(() => {
      expect(screen.getByText('5/20 done')).toBeInTheDocument()
    })
  })

  it('shows active count when > 0', async () => {
    renderWithRouter(<PlanProgressGrid plans={[makePlan({ activeStories: 4 })]} />)
    await waitFor(() => {
      expect(screen.getByText('4 active')).toBeInTheDocument()
    })
  })

  it('shows blocked count when > 0', async () => {
    renderWithRouter(
      <PlanProgressGrid plans={[makePlan({ blockedStories: 2, health: 'red' })]} />,
    )
    await waitFor(() => {
      expect(screen.getByText('2 blocked')).toBeInTheDocument()
    })
  })

  it('shows priority badge', async () => {
    renderWithRouter(<PlanProgressGrid plans={[makePlan({ priority: 'P2' })]} />)
    await waitFor(() => {
      expect(screen.getByText('P2')).toBeInTheDocument()
    })
  })

  it('applies green border for healthy plans', async () => {
    const { container } = renderWithRouter(
      <PlanProgressGrid plans={[makePlan({ health: 'green' })]} />,
    )
    await waitFor(() => {
      const card = container.querySelector('a')
      expect(card?.className).toContain('border-l-emerald-500')
    })
  })

  it('applies red border for unhealthy plans', async () => {
    const { container } = renderWithRouter(
      <PlanProgressGrid plans={[makePlan({ health: 'red' })]} />,
    )
    await waitFor(() => {
      const card = container.querySelector('a')
      expect(card?.className).toContain('border-l-red-500')
    })
  })
})
