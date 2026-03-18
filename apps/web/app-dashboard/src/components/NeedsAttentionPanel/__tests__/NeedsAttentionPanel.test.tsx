/**
 * Tests for NeedsAttentionPanel
 *
 * Tests that failed/blocked stories are surfaced correctly.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NeedsAttentionPanel } from '../index'
import type { NeedsAttentionStory } from '../../../hooks/usePipelineMonitor'

const mockItems: NeedsAttentionStory[] = [
  {
    story_id: 'WINT-3050',
    title: 'Implement Outcome Logging',
    feature: 'platform',
    state: 'failed_code_review',
    priority: 'P2',
    blocked_reason: 'TypeScript errors in handler',
    updated_at: new Date().toISOString(),
  },
  {
    story_id: 'KFMB-2020',
    title: 'KB-Native Bootstrap Setup Leader',
    feature: 'platform',
    state: 'failed_qa',
    priority: 'P3',
    blocked_reason: null,
    updated_at: new Date().toISOString(),
  },
  {
    story_id: 'WISH-2032',
    title: 'Optimistic UI for Form Submission',
    feature: 'wish',
    state: 'blocked',
    priority: null,
    blocked_reason: 'Waiting on WISH-2031',
    updated_at: new Date().toISOString(),
  },
]

describe('NeedsAttentionPanel', () => {
  it('shows loading skeleton when isLoading=true', () => {
    render(
      <NeedsAttentionPanel items={[]} isLoading={true} error={null} onRetry={vi.fn()} />,
    )

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy()
  })

  it('shows retry button when error is present', async () => {
    const onRetry = vi.fn()
    render(
      <NeedsAttentionPanel
        items={[]}
        isLoading={false}
        error="HTTP 500: Internal Server Error"
        onRetry={onRetry}
      />,
    )

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    expect(retryBtn).toBeInTheDocument()
    await userEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows empty/clear state when no items', () => {
    render(
      <NeedsAttentionPanel items={[]} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(screen.getByText(/no stories require immediate attention/i)).toBeInTheDocument()
  })

  it('renders story IDs and titles', () => {
    render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(screen.getByText('WINT-3050')).toBeInTheDocument()
    expect(screen.getByText('Implement Outcome Logging')).toBeInTheDocument()
    expect(screen.getByText('KFMB-2020')).toBeInTheDocument()
  })

  it('renders state labels for failed states', () => {
    render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(screen.getByLabelText(/State: Failed Review/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/State: Failed QA/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/State: Blocked/i)).toBeInTheDocument()
  })

  it('renders blocked_reason when present', () => {
    render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(screen.getByText('TypeScript errors in handler')).toBeInTheDocument()
    expect(screen.getByText('Waiting on WISH-2031')).toBeInTheDocument()
  })

  it('shows item count in header badge', () => {
    render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(screen.getByText('3 stories')).toBeInTheDocument()
  })

  it('has destructive border when items present', () => {
    const { container } = render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    // Card should have red border class when items are present
    const card = container.querySelector('[class*="border-red"]')
    expect(card).toBeTruthy()
  })

  it('has aria-live region', () => {
    render(
      <NeedsAttentionPanel items={mockItems} isLoading={false} error={null} onRetry={vi.fn()} />,
    )

    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })
})
