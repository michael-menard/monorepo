import { describe, it, expect, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import { render, screen } from './test/test-utils'
import { App } from './App'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('App Inspiration Gallery Module', () => {
  it('renders the page heading', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Inspiration Gallery/i })).toBeInTheDocument()
    })
  })

  it('displays the gallery description', async () => {
    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByText(/Collect and organize visual inspiration for your LEGO MOC builds/i),
      ).toBeInTheDocument()
    })
  })

  it('shows the Add Inspiration button', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Inspiration/i })).toBeInTheDocument()
    })
  })

  it('shows the New Album button', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /New Album/i })).toBeInTheDocument()
    })
  })

  it('renders tab navigation', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /All Inspirations/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Albums/i })).toBeInTheDocument()
    })
  })
})
