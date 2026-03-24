import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BacklogAgingList } from '../BacklogAgingList'
import type { DashboardResponse } from '../../../store/roadmapApi'

type BacklogAging = DashboardResponse['backlogAging']

const EMPTY_AGING: BacklogAging = [
  { bucket: '<7d', count: 0 },
  { bucket: '7-14d', count: 0 },
  { bucket: '14-30d', count: 0 },
  { bucket: '30+d', count: 0 },
]

const SAMPLE_AGING: BacklogAging = [
  { bucket: '<7d', count: 10 },
  { bucket: '7-14d', count: 5 },
  { bucket: '14-30d', count: 3 },
  { bucket: '30+d', count: 2 },
]

describe('BacklogAgingList', () => {
  it('renders nothing when all counts are 0', () => {
    const { container } = render(<BacklogAgingList backlogAging={EMPTY_AGING} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for empty array', () => {
    const { container } = render(<BacklogAgingList backlogAging={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows Backlog Aging heading', async () => {
    render(<BacklogAgingList backlogAging={SAMPLE_AGING} />)
    await waitFor(() => {
      expect(screen.getByText('Backlog Aging')).toBeInTheDocument()
    })
  })

  it('shows all 4 bucket labels', async () => {
    render(<BacklogAgingList backlogAging={SAMPLE_AGING} />)
    await waitFor(() => {
      expect(screen.getByText('<7d')).toBeInTheDocument()
      expect(screen.getByText('7-14d')).toBeInTheDocument()
      expect(screen.getByText('14-30d')).toBeInTheDocument()
      expect(screen.getByText('30+d')).toBeInTheDocument()
    })
  })

  it('shows counts for each bucket', async () => {
    render(<BacklogAgingList backlogAging={SAMPLE_AGING} />)
    await waitFor(() => {
      // Each count appears with its percentage: "10 (50%)", "5 (25%)", etc.
      expect(screen.getByText('10 (50%)')).toBeInTheDocument()
      expect(screen.getByText('5 (25%)')).toBeInTheDocument()
      expect(screen.getByText('3 (15%)')).toBeInTheDocument()
      expect(screen.getByText('2 (10%)')).toBeInTheDocument()
    })
  })

  it('renders with partial data (only some buckets non-zero)', async () => {
    const partialAging: BacklogAging = [
      { bucket: '<7d', count: 5 },
      { bucket: '7-14d', count: 0 },
      { bucket: '14-30d', count: 0 },
      { bucket: '30+d', count: 0 },
    ]
    render(<BacklogAgingList backlogAging={partialAging} />)
    await waitFor(() => {
      expect(screen.getByText('Backlog Aging')).toBeInTheDocument()
      expect(screen.getByText('<7d')).toBeInTheDocument()
    })
  })
})
