import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { ImpactRanking } from '../ImpactRanking'
import type { DashboardResponse } from '../../../store/roadmapApi'

type ImpactItem = DashboardResponse['impactRanking'][number]

function makeItem(overrides: Partial<ImpactItem> = {}): ImpactItem {
  return {
    storyId: 'TEST-001',
    title: 'Test Story',
    state: 'ready',
    priority: 'P1',
    fanOut: 5,
    plans: [{ planSlug: 'plan-a', title: 'Plan A' }],
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

describe('ImpactRanking', () => {
  it('renders nothing when stories is empty', async () => {
    const { container } = renderWithRouter(<ImpactRanking stories={[]} />)
    await waitFor(() => {
      expect(container.querySelector('[class*="space-y"]')).toBeNull()
    })
  })

  it('shows Impact Ranking heading', async () => {
    renderWithRouter(<ImpactRanking stories={[makeItem()]} />)
    await waitFor(() => {
      expect(screen.getByText('Impact Ranking')).toBeInTheDocument()
    })
  })

  it('shows numbered ranking', async () => {
    const items = [
      makeItem({ storyId: 'A-001', fanOut: 12 }),
      makeItem({ storyId: 'B-002', fanOut: 8 }),
    ]
    renderWithRouter(<ImpactRanking stories={items} />)
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
    })
  })

  it('shows fan-out count', async () => {
    renderWithRouter(<ImpactRanking stories={[makeItem({ fanOut: 12 })]} />)
    await waitFor(() => {
      expect(screen.getByText('fan: 12')).toBeInTheDocument()
    })
  })

  it('shows story ID', async () => {
    renderWithRouter(<ImpactRanking stories={[makeItem({ storyId: 'FEAT-007' })]} />)
    await waitFor(() => {
      expect(screen.getByText('FEAT-007')).toBeInTheDocument()
    })
  })

  it('shows plan slug', async () => {
    renderWithRouter(
      <ImpactRanking
        stories={[makeItem({ plans: [{ planSlug: 'mvp-plan', title: 'MVP Plan' }] })]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('mvp-plan')).toBeInTheDocument()
    })
  })
})
