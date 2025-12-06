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

  it('renders the gallery grid with instruction cards', () => {
    render(<App />)
    // Gallery grid should be present
    expect(screen.getByTestId('gallery-grid')).toBeInTheDocument()
    // Mock data includes 4 instruction cards
    expect(screen.getByText('Technic Supercar')).toBeInTheDocument()
    expect(screen.getByText('City Fire Station')).toBeInTheDocument()
    expect(screen.getByText('Star Wars X-Wing')).toBeInTheDocument()
    expect(screen.getByText('Creator Expert Modular Building')).toBeInTheDocument()
  })

  it('displays piece count badges on cards', () => {
    render(<App />)
    // Check for piece count badges (from mock data)
    expect(screen.getByText('3,599 pieces')).toBeInTheDocument()
    expect(screen.getByText('1,152 pieces')).toBeInTheDocument()
  })

  it('displays theme tags on cards', () => {
    render(<App />)
    expect(screen.getByText('Technic')).toBeInTheDocument()
    expect(screen.getByText('City')).toBeInTheDocument()
    expect(screen.getByText('Star Wars')).toBeInTheDocument()
  })
})
