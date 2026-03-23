import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BacklogSummaryCard } from '../BacklogSummaryCard'
import type { DashboardResponse } from '../../../store/roadmapApi'

type BacklogSummary = DashboardResponse['backlogSummary']

function makeSummary(overrides: Partial<BacklogSummary> = {}): BacklogSummary {
  return {
    totalOpen: 10,
    byPriority: [
      { priority: 'P1', count: 5 },
      { priority: 'P2', count: 3 },
      { priority: 'none', count: 2 },
    ],
    byType: [
      { taskType: 'bug', count: 6 },
      { taskType: 'feature', count: 4 },
    ],
    ...overrides,
  }
}

describe('BacklogSummaryCard', () => {
  it('renders nothing when totalOpen is 0', () => {
    const { container } = render(
      <BacklogSummaryCard
        backlogSummary={makeSummary({ totalOpen: 0, byPriority: [], byType: [] })}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows Backlog Health heading', async () => {
    render(<BacklogSummaryCard backlogSummary={makeSummary()} />)
    await waitFor(() => {
      expect(screen.getByText('Backlog Health')).toBeInTheDocument()
    })
  })

  it('shows total open task count', async () => {
    render(<BacklogSummaryCard backlogSummary={makeSummary({ totalOpen: 42 })} />)
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('open tasks')).toBeInTheDocument()
    })
  })

  it('shows priority rows', async () => {
    render(
      <BacklogSummaryCard
        backlogSummary={makeSummary({
          byPriority: [
            { priority: 'P0', count: 3 },
            { priority: 'P1', count: 7 },
          ],
        })}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('P0')).toBeInTheDocument()
      expect(screen.getByText('P1')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('shows type rows', async () => {
    render(
      <BacklogSummaryCard
        backlogSummary={makeSummary({
          byType: [
            { taskType: 'refactor', count: 2 },
            { taskType: 'docs', count: 1 },
          ],
        })}
      />,
    )
    await waitFor(() => {
      expect(screen.getByText('refactor')).toBeInTheDocument()
      expect(screen.getByText('docs')).toBeInTheDocument()
    })
  })

  it('shows By Priority and By Type section labels', async () => {
    render(<BacklogSummaryCard backlogSummary={makeSummary()} />)
    await waitFor(() => {
      expect(screen.getByText('By Priority')).toBeInTheDocument()
      expect(screen.getByText('By Type')).toBeInTheDocument()
    })
  })
})
