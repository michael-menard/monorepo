import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /App Inspiration Gallery/i })).toBeInTheDocument()
  })

  it('displays the welcome message', () => {
    render(<App />)
    expect(
      screen.getByText(/Welcome to the App Inspiration Gallery module/i),
    ).toBeInTheDocument()
  })

  it('shows the Getting Started card', () => {
    render(<App />)
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument()
    expect(screen.getByText(/Customize this module to build your feature/i)).toBeInTheDocument()
  })
})
