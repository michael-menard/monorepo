import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlowHealthStrip } from '../FlowHealthStrip'
import type { DashboardResponse } from '../../../store/roadmapApi'

function makeFlowHealth(
  overrides: Partial<DashboardResponse['flowHealth']> = {},
): DashboardResponse['flowHealth'] {
  return {
    totalStories: 100,
    distribution: [
      { state: 'backlog', count: 40 },
      { state: 'in_progress', count: 30 },
      { state: 'completed', count: 20 },
      { state: 'blocked', count: 10 },
    ],
    blockedCount: 10,
    ...overrides,
  }
}

describe('FlowHealthStrip', () => {
  it('renders null when totalStories is 0', () => {
    const { container } = render(
      <FlowHealthStrip flowHealth={makeFlowHealth({ totalStories: 0, distribution: [] })} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows Flow Health heading', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth()} />)
    expect(screen.getByText('Flow Health')).toBeInTheDocument()
  })

  it('shows total story count', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth({ totalStories: 325 })} />)
    expect(screen.getByText('325 stories')).toBeInTheDocument()
  })

  it('shows blocked count when blockedCount > 0', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth({ blockedCount: 5 })} />)
    expect(screen.getByText('5 blocked')).toBeInTheDocument()
  })

  it('does not show blocked indicator when blockedCount is 0', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth({ blockedCount: 0 })} />)
    // The word "blocked" should not appear (heading "Flow Health" doesn't contain it)
    const blockedSpans = screen.queryAllByText(/\d+ blocked/)
    expect(blockedSpans).toHaveLength(0)
  })

  it('renders SVG rect elements for each state', () => {
    const { container } = render(<FlowHealthStrip flowHealth={makeFlowHealth()} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(4)
  })

  it('renders SVG rects with title tooltips', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth()} />)
    expect(screen.getByText('backlog: 40')).toBeInTheDocument()
    expect(screen.getByText('in_progress: 30')).toBeInTheDocument()
    expect(screen.getByText('completed: 20')).toBeInTheDocument()
    expect(screen.getByText('blocked: 10')).toBeInTheDocument()
  })

  it('renders legend items with state names and counts', () => {
    render(<FlowHealthStrip flowHealth={makeFlowHealth()} />)
    expect(screen.getByText('backlog')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('in_progress')).toBeInTheDocument()
    expect(screen.getByText('30')).toBeInTheDocument()
  })

  it('handles single-state distribution', () => {
    const flowHealth = makeFlowHealth({
      totalStories: 50,
      distribution: [{ state: 'backlog', count: 50 }],
      blockedCount: 0,
    })
    const { container } = render(<FlowHealthStrip flowHealth={flowHealth} />)
    const rects = container.querySelectorAll('rect')
    expect(rects).toHaveLength(1)
  })
})
