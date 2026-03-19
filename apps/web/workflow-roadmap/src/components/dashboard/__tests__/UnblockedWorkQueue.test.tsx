import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { UnblockedWorkQueue } from '../UnblockedWorkQueue'
import type { DashboardResponse } from '../../../store/roadmapApi'

type QueueItem = DashboardResponse['unblockedQueue'][number]

function makeItem(overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    storyId: 'TEST-001',
    title: 'Test Story',
    priority: 'P1',
    state: 'ready',
    plans: [{ planSlug: 'plan-a', title: 'Plan A' }],
    fanOut: 3,
    daysInState: 2,
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

describe('UnblockedWorkQueue', () => {
  it('shows heading', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[]} />)
    await waitFor(() => {
      expect(screen.getByText('Unblocked Work Queue')).toBeInTheDocument()
    })
  })

  it('shows empty state when queue is empty', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[]} />)
    await waitFor(() => {
      expect(screen.getByText('No unblocked stories')).toBeInTheDocument()
    })
  })

  it('renders table headers', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem()]} />)
    await waitFor(() => {
      expect(screen.getByText('Story')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Pri')).toBeInTheDocument()
      expect(screen.getByText('Fan-out')).toBeInTheDocument()
      expect(screen.getByText('Age')).toBeInTheDocument()
    })
  })

  it('renders story ID', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem({ storyId: 'FEAT-042' })]} />)
    await waitFor(() => {
      expect(screen.getByText('FEAT-042')).toBeInTheDocument()
    })
  })

  it('renders story title', async () => {
    renderWithRouter(
      <UnblockedWorkQueue queue={[makeItem({ title: 'Implement caching layer' })]} />,
    )
    await waitFor(() => {
      expect(screen.getByText('Implement caching layer')).toBeInTheDocument()
    })
  })

  it('renders priority badge', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem({ priority: 'P0' })]} />)
    await waitFor(() => {
      expect(screen.getByText('P0')).toBeInTheDocument()
    })
  })

  it('renders fan-out count', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem({ fanOut: 8 })]} />)
    await waitFor(() => {
      expect(screen.getByText('8')).toBeInTheDocument()
    })
  })

  it('formats age as days for < 7', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem({ daysInState: 5 })]} />)
    await waitFor(() => {
      expect(screen.getByText('5d')).toBeInTheDocument()
    })
  })

  it('formats age as "today" for 0', async () => {
    renderWithRouter(<UnblockedWorkQueue queue={[makeItem({ daysInState: 0 })]} />)
    await waitFor(() => {
      expect(screen.getByText('today')).toBeInTheDocument()
    })
  })

  it('renders multiple rows', async () => {
    const items = [
      makeItem({ storyId: 'A-001' }),
      makeItem({ storyId: 'B-002' }),
    ]
    renderWithRouter(<UnblockedWorkQueue queue={items} />)
    await waitFor(() => {
      expect(screen.getByText('A-001')).toBeInTheDocument()
      expect(screen.getByText('B-002')).toBeInTheDocument()
    })
  })
})
