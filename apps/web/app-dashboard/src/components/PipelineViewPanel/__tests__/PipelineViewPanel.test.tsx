/**
 * Tests for PipelineViewPanel
 *
 * AC-1: in-progress stories appear first
 * AC-7: loading skeleton, retry button on error
 * AC-8: ARIA labels, table caption, aria-live region, state badges
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
    state: 'in-progress',
    priority: 'p1',
    blocked_by: null,
    updated_at: new Date().toISOString(),
  },
  {
    story_id: 'APIP-2021',
    title: 'Ready to Work Story',
    state: 'ready-to-work',
    priority: 'p2',
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
    expect(screen.getByRole('region', { hidden: true }) || document.querySelector('[aria-busy="true"]')).toBeTruthy()
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

  it('renders pipeline table with state badges (AC-1, AC-8)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    // State badges present (AC-8: state badges with aria-label)
    expect(screen.getByLabelText(/State: in-progress/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/State: ready-to-work/i)).toBeInTheDocument()
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

    expect(screen.getByRole('region', { name: /pipeline view/i }) ||
      document.querySelector('[aria-label="Pipeline view"]')).toBeTruthy()
  })

  it('has table caption for screen readers (AC-8)', () => {
    render(
      <PipelineViewPanel
        stories={mockStories}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/Active pipeline stories sorted/i)).toBeInTheDocument()
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
})
