/**
 * StoryGauge regression tests
 *
 * Covers the hover tooltip behaviour that was broken when:
 * - TooltipContent lacked a Portal (tooltip rendered inside backdrop-filter container)
 * - TooltipProvider was missing from the app tree
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@repo/app-component-library'
import { describe, it, expect } from 'vitest'
import { StoryGauge } from '../RoadmapPage'
import type { Plan } from '../../store/roadmapApi'

const basePlan: Plan = {
  id: 'plan-1',
  planSlug: 'TEST-001',
  title: 'Test Plan',
  summary: null,
  planType: 'feature',
  status: 'active',
  storyPrefix: 'TEST',
  tags: null,
  priority: 'P2',
  priorityOrder: 1,
  supersedesPlanSlug: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  totalStories: 10,
  completedStories: 4,
  activeStories: 2,
  blockedStories: 1,
  lastStoryActivityAt: null,
  churnDepth: 0,
  hasRegression: false,
  nextStory: { storyId: 'TEST-005', title: 'Implement the thing' },
  blockedStoryList: [{ storyId: 'TEST-003', title: 'Blocked by infra' }],
}

function renderGauge(overrides: Partial<Plan> = {}) {
  const plan = { ...basePlan, ...overrides }
  return render(
    // delayDuration=0 avoids needing fake timers in tests
    <TooltipProvider delayDuration={0}>
      <StoryGauge plan={plan} />
    </TooltipProvider>,
  )
}

// Radix shows tooltip on focus AND hover. The trigger button can auto-focus on mount,
// opening the tooltip before our explicit hover. Use getAllByText and check existence.
function expectTooltipText(pattern: RegExp | string) {
  const matches = screen.getAllByText(pattern)
  expect(matches.length).toBeGreaterThan(0)
}

function expectNoTooltipText(pattern: RegExp | string) {
  // queryAllByText is safe — returns [] if nothing found
  expect(screen.queryAllByText(pattern)).toHaveLength(0)
}

describe('StoryGauge – empty state', () => {
  it('renders an em-dash when there are no stories', () => {
    renderGauge({ totalStories: 0 })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('does not render a gauge bar when there are no stories', () => {
    renderGauge({ totalStories: 0 })
    expect(document.querySelector('.bg-emerald-500')).toBeNull()
    expect(document.querySelector('.bg-slate-700')).toBeNull()
  })
})

describe('StoryGauge – gauge bar segments', () => {
  it('renders the gauge container when stories exist', () => {
    renderGauge()
    expect(document.querySelector('.bg-slate-700')).toBeInTheDocument()
  })

  it('renders a completed (emerald) segment when completedStories > 0', () => {
    renderGauge({ completedStories: 5, totalStories: 10 })
    expect(document.querySelector('.bg-emerald-500')).toBeInTheDocument()
  })

  it('omits the completed segment when completedStories = 0', () => {
    renderGauge({ completedStories: 0, totalStories: 5, activeStories: 0, blockedStories: 0 })
    expect(document.querySelector('.bg-emerald-500')).toBeNull()
  })

  it('renders an active (blue) segment when activeStories > 0', () => {
    renderGauge({ activeStories: 3, totalStories: 10 })
    expect(document.querySelector('.bg-blue-400')).toBeInTheDocument()
  })

  it('renders a blocked (red) segment when blockedStories > 0', () => {
    renderGauge({ blockedStories: 2, totalStories: 10 })
    expect(document.querySelector('.bg-red-500')).toBeInTheDocument()
  })
})

describe('StoryGauge – tooltip content (hover regression)', () => {
  it('shows story counts in tooltip on hover', async () => {
    const user = userEvent.setup()
    renderGauge()

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => expectTooltipText(/4 done/i))
    expectTooltipText(/2 active/i)
    expectTooltipText(/1 blocked/i)
  })

  it('shows "Next up" section when nextStory is provided', async () => {
    const user = userEvent.setup()
    renderGauge()

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => expectTooltipText('TEST-005'))
    expectTooltipText('Implement the thing')
  })

  it('hides "Next up" section when nextStory is null', async () => {
    const user = userEvent.setup()
    renderGauge({ nextStory: null })

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    // Confirm tooltip IS open (count text visible), but no "Next up"
    await waitFor(() => expectTooltipText(/4 done/i))
    expectNoTooltipText('TEST-005')
    expectNoTooltipText('Implement the thing')
  })

  it('shows blocked story list in tooltip', async () => {
    const user = userEvent.setup()
    renderGauge()

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => expectTooltipText('TEST-003'))
    expectTooltipText('Blocked by infra')
  })

  it('hides blocked section when blockedStoryList is empty', async () => {
    const user = userEvent.setup()
    renderGauge({ blockedStories: 0, blockedStoryList: [] })

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => expectTooltipText(/4 done/i))
    expectNoTooltipText('TEST-003')
  })

  it('shows backlog count when stories are not active/completed/blocked', async () => {
    const user = userEvent.setup()
    // 10 total, 2 completed, 1 active, 1 blocked → 6 backlog
    renderGauge({
      totalStories: 10,
      completedStories: 2,
      activeStories: 1,
      blockedStories: 1,
    })

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => expectTooltipText(/6 backlog/i))
  })

  it('tooltip content is portalled outside the component container', async () => {
    const user = userEvent.setup()
    const { container } = renderGauge()

    const trigger = screen.getByRole('button')
    await user.hover(trigger)

    await waitFor(() => {
      // Content should be in document.body...
      expect(document.body.textContent).toContain('4 done')
      // ...but NOT inside the component's own container
      expect(container.textContent).not.toContain('4 done')
    })
  })
})
