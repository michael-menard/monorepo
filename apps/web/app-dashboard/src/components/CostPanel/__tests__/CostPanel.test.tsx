/**
 * Tests for CostPanel
 *
 * AC-2: per-story cost rows with total_tokens
 * AC-7: loading skeleton, retry button on error
 * AC-8: ARIA labels, table caption, aria-live region
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CostPanel } from '../index'
import type { CostSummaryRow } from '../../../hooks/usePipelineMonitor'

const mockCostSummary: CostSummaryRow[] = [
  {
    story_id: 'APIP-2020',
    phase: 'plan',
    total_tokens: 5000,
    tokens_input: 3000,
    tokens_output: 2000,
  },
  {
    story_id: 'APIP-2020',
    phase: 'execute',
    total_tokens: 15000,
    tokens_input: 8000,
    tokens_output: 7000,
  },
]

describe('CostPanel', () => {
  it('shows animate-pulse skeleton during isLoading=true (AC-7)', () => {
    render(
      <CostPanel
        costSummary={[]}
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
      <CostPanel
        costSummary={[]}
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

  it('renders cost rows with story_id and phase (AC-2)', () => {
    render(
      <CostPanel
        costSummary={mockCostSummary}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('APIP-2020')).toHaveLength(2)
    expect(screen.getByText('plan')).toBeInTheDocument()
    expect(screen.getByText('execute')).toBeInTheDocument()
  })

  it('formats token counts correctly', () => {
    render(
      <CostPanel
        costSummary={mockCostSummary}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    // 5000 -> 5.0K
    expect(screen.getByText('5.0K')).toBeInTheDocument()
    // 15000 -> 15.0K
    expect(screen.getByText('15.0K')).toBeInTheDocument()
  })

  it('shows empty state when no cost data', () => {
    render(
      <CostPanel
        costSummary={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/no token usage data/i)).toBeInTheDocument()
  })

  it('has aria-live region (AC-8)', () => {
    render(
      <CostPanel
        costSummary={mockCostSummary}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument()
  })

  it('has table caption for screen readers (AC-8)', () => {
    render(
      <CostPanel
        costSummary={mockCostSummary}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText(/per-story token usage/i)).toBeInTheDocument()
  })
})
