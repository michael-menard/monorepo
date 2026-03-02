/**
 * Tests for BlockedQueuePanel
 *
 * AC-3: blocked stories with blocked_by text; null blocked_by shown as 'Unknown'
 * AC-7: loading skeleton, retry button on error
 * AC-8: ARIA labels, table caption, aria-live region
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlockedQueuePanel } from '../index'
import type { BlockedStory } from '../../../hooks/usePipelineMonitor'

const mockBlockedQueue: BlockedStory[] = [
  {
    story_id: 'APIP-2021',
    title: 'Story Blocked by APIP-2020',
    state: 'ready-to-work',
    blocked_by: 'APIP-2020',
  },
  {
    story_id: 'APIP-2022',
    title: 'Story With Unknown Blocker',
    state: 'in-progress',
    blocked_by: null,
  },
]

describe('BlockedQueuePanel', () => {
  it('shows animate-pulse skeleton during isLoading=true (AC-7)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={[]}
        isLoading={true}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows retry button when error occurs (AC-7)', async () => {
    const onRetry = vi.fn()
    render(
      <BlockedQueuePanel
        blockedQueue={[]}
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

  it('renders blocked stories with blocked_by text (AC-3)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByText('APIP-2020')).toBeInTheDocument()
    expect(screen.getByText('Story Blocked by APIP-2020')).toBeInTheDocument()
  })

  it('shows "Unknown" when blocked_by is null (AC-3)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('shows empty state when no blocked stories', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/no stories are currently blocked/i)).toBeInTheDocument()
  })

  it('shows warning border when blocked stories exist (AC-3)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    // Warning border class should be present
    expect(document.querySelector('.border-amber-400\\/50')).toBeInTheDocument()
  })

  it('has aria-live region (AC-8)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })

  it('has table caption for screen readers (AC-8)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/stories blocked by dependencies/i)).toBeInTheDocument()
  })

  it('shows count of blocked stories (AC-3)', () => {
    render(
      <BlockedQueuePanel
        blockedQueue={mockBlockedQueue}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('2 blocked')).toBeInTheDocument()
  })
})
