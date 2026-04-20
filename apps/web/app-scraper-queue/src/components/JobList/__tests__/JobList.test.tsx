import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test/render'
import { JobList } from '../index'

describe('JobList', () => {
  it('renders filter tabs', async () => {
    renderWithProviders(<JobList />)

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /waiting/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /failed/i })).toBeInTheDocument()
  })

  it('renders jobs from API', async () => {
    renderWithProviders(<JobList />)

    await waitFor(() => {
      expect(screen.getByText('cas002')).toBeInTheDocument()
      expect(screen.getByText('sw0001')).toBeInTheDocument()
    })
  })

  it('shows status badges', async () => {
    renderWithProviders(<JobList />)

    await waitFor(() => {
      expect(screen.getByText('completed')).toBeInTheDocument()
      expect(screen.getByText('waiting')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })
  })

  it('shows type badges', async () => {
    renderWithProviders(<JobList />)

    await waitFor(() => {
      expect(screen.getAllByText('Minifig').length).toBeGreaterThanOrEqual(2)
      expect(screen.getByText('LEGO Set')).toBeInTheDocument()
    })
  })

  it('shows failed reason for failed jobs', async () => {
    renderWithProviders(<JobList />)

    await waitFor(() => {
      expect(screen.getByText('Scrape failed: timeout')).toBeInTheDocument()
    })
  })
})
