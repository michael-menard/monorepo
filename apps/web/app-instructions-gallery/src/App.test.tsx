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

describe('Instructions Gallery Module', () => {
  it('renders the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /My Instructions/i })).toBeInTheDocument()
  })

  it('displays the description', () => {
    render(<App />)
    expect(screen.getByText(/Browse your MOC instruction collection/i)).toBeInTheDocument()
  })

  it('shows the empty state card', () => {
    render(<App />)
    expect(screen.getByText(/No instructions yet/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Upload your first MOC instructions to start your collection/i),
    ).toBeInTheDocument()
  })
})
