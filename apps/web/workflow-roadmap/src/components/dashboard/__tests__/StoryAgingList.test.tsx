import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { StoryAgingList } from '../StoryAgingList'
import type { DashboardResponse } from '../../../store/roadmapApi'

type AgingStory = DashboardResponse['agingStories'][number]

function makeStory(overrides: Partial<AgingStory> = {}): AgingStory {
  return {
    storyId: 'TEST-001',
    title: 'Test Story',
    state: 'in_progress',
    daysInState: 5,
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

describe('StoryAgingList', () => {
  it('renders nothing when stories is empty', async () => {
    const { container } = renderWithRouter(<StoryAgingList stories={[]} />)
    await waitFor(() => {
      expect(container.querySelector('[class*="space-y"]')).toBeNull()
    })
  })

  it('shows Aging Stories heading', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory()]} />)
    await waitFor(() => {
      expect(screen.getByText('Aging Stories')).toBeInTheDocument()
    })
  })

  it('renders story ID', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ storyId: 'FEAT-042' })]} />)
    await waitFor(() => {
      expect(screen.getByText('FEAT-042')).toBeInTheDocument()
    })
  })

  it('shows story title', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ title: 'Fix login bug' })]} />)
    await waitFor(() => {
      expect(screen.getByText('Fix login bug')).toBeInTheDocument()
    })
  })

  it('shows state badge', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ state: 'blocked' })]} />)
    await waitFor(() => {
      expect(screen.getByText('blocked')).toBeInTheDocument()
    })
  })

  it('formats days correctly for < 7 days', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ daysInState: 3 })]} />)
    await waitFor(() => {
      expect(screen.getByText('3d')).toBeInTheDocument()
    })
  })

  it('formats days as weeks for 7-29 days', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ daysInState: 14 })]} />)
    await waitFor(() => {
      expect(screen.getByText('2w')).toBeInTheDocument()
    })
  })

  it('formats days as months for 30+ days', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ daysInState: 60 })]} />)
    await waitFor(() => {
      expect(screen.getByText('2mo')).toBeInTheDocument()
    })
  })

  it('shows "today" for 0 days', async () => {
    renderWithRouter(<StoryAgingList stories={[makeStory({ daysInState: 0 })]} />)
    await waitFor(() => {
      expect(screen.getByText('today')).toBeInTheDocument()
    })
  })

  it('shows plan slug', async () => {
    renderWithRouter(
      <StoryAgingList
        stories={[makeStory({ plans: [{ planSlug: 'my-plan', title: 'My Plan' }] })]}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('my-plan')).toBeInTheDocument()
    })
  })
})
