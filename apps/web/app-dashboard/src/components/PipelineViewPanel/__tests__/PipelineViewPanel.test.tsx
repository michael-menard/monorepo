/**
 * Tests for PipelineViewPanel (Kanban layout)
 *
 * AC-1: in-progress stories appear in the first active column
 * AC-7: loading skeleton, retry button on error
 * AC-8: ARIA labels, aria-live region, state badges
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PipelineViewPanel } from '../index'
import type { PipelineStory } from '../../../hooks/usePipelineMonitor'

const mockStories: PipelineStory[] = [
  {
    story_id: 'APIP-2020',
    title: 'In Progress Story',
    feature: 'apip',
    state: 'in_progress',
    priority: 'P1',
    blocked_by: null,
    updated_at: new Date().toISOString(),
  },
  {
    story_id: 'APIP-2021',
    title: 'Ready Story',
    feature: 'apip',
    state: 'ready',
    priority: 'P2',
    blocked_by: null,
    updated_at: new Date().toISOString(),
  },
  {
    story_id: 'APIP-2022',
    title: 'In Review Story',
    feature: 'apip',
    state: 'in_review',
    priority: 'P2',
    blocked_by: null,
    updated_at: new Date().toISOString(),
  },
]

describe('PipelineViewPanel', () => {
  it('shows animate-pulse skeleton during isLoading=true (AC-7)', () => {
    render(
      <PipelineViewPanel
        stories={[]}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('shows retry button when fetch returns error (AC-7)', async () => {
    const onRetry = vi.fn()
    render(
      <PipelineViewPanel
        stories={[]}
        isLoading={false}
        error="HTTP 503: Service Unavailable"
        onRetry={onRetry}
      />,
    )

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()
    await userEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders Kanban columns with story cards (AC-1, AC-8)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    // Kanban column headers
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByText('In Review')).toBeInTheDocument()
  })

  it('renders story IDs and titles (AC-1)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('APIP-2020')).toBeInTheDocument()
    expect(screen.getByText('In Progress Story')).toBeInTheDocument()
    expect(screen.getByText('APIP-2021')).toBeInTheDocument()
  })

  it('shows blocked indicator for blocked stories', () => {
    const blockedStory: PipelineStory = {
      story_id: 'APIP-2030',
      title: 'Blocked Story',
      feature: 'apip',
      state: 'in_progress',
      priority: 'P1',
      blocked_by: 'Waiting on external API',
      updated_at: new Date().toISOString(),
    }
    render(
      <PipelineViewPanel
        stories={[blockedStory]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('shows empty state when no stories', () => {
    render(
      <PipelineViewPanel
        stories={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/no active stories/i)).toBeInTheDocument()
  })

  it('has aria-label on the card container (AC-8)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(document.querySelector('[aria-label="Pipeline view"]')).toBeTruthy()
  })

  it('has aria-live region (AC-8)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })

  it('renders feature name in story card', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    // Feature label appears in story cards
    const featureLabels = screen.getAllByText('apip')
    expect(featureLabels.length).toBeGreaterThan(0)
  })
})
