import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import { QueueHealth } from '../index'

describe('QueueHealth', () => {
  it('renders health cards for all 6 queues', async () => {
    renderWithProviders(<QueueHealth />)

    await waitFor(() => {
      expect(screen.getByText('BL Minifig')).toBeInTheDocument()
      expect(screen.getByText('BL Catalog')).toBeInTheDocument()
      expect(screen.getByText('BL Prices')).toBeInTheDocument()
      expect(screen.getByText('LEGO Set')).toBeInTheDocument()
      expect(screen.getByText('RB Set')).toBeInTheDocument()
      expect(screen.getByText('RB MOCs')).toBeInTheDocument()
    })
  })

  it('shows waiting count for queues with pending jobs', async () => {
    renderWithProviders(<QueueHealth />)

    await waitFor(() => {
      expect(screen.getByText('2 waiting')).toBeInTheDocument() // bricklink-minifig
      expect(screen.getByText('5 waiting')).toBeInTheDocument() // bricklink-prices
    })
  })

  it('shows active count', async () => {
    renderWithProviders(<QueueHealth />)

    await waitFor(() => {
      expect(screen.getByText('1 active')).toBeInTheDocument() // bricklink-minifig
    })
  })

  it('shows circuit breaker alert for tripped queue', async () => {
    renderWithProviders(<QueueHealth />)

    await waitFor(() => {
      expect(screen.getByText(/Rate limited on cas002/)).toBeInTheDocument()
    })
  })

  it('shows Idle for queues with no activity', async () => {
    renderWithProviders(<QueueHealth />)

    await waitFor(() => {
      // Multiple queues should show Idle
      const idleLabels = screen.getAllByText('Idle')
      expect(idleLabels.length).toBeGreaterThanOrEqual(2)
    })
  })
})
