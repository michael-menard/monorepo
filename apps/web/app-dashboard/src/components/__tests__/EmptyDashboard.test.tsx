/**
 * EmptyDashboard Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyDashboard } from '../EmptyDashboard'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to} data-testid="cta-link">
      {children}
    </a>
  ),
}))

describe('EmptyDashboard', () => {
  it('renders welcome message', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Welcome to LEGO MOC Instructions!')).toBeInTheDocument()
  })

  it('renders description text', () => {
    render(<EmptyDashboard />)

    expect(
      screen.getByText(/Organize your MOC instructions, track your collection/),
    ).toBeInTheDocument()
  })

  it('renders CTA button linking to add MOC', () => {
    render(<EmptyDashboard />)

    const ctaLink = screen.getByTestId('cta-link')
    expect(ctaLink).toHaveAttribute('href', '/instructions/new')
    expect(screen.getByText('Add Your First MOC')).toBeInTheDocument()
  })

  it('renders all feature highlights', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Organize MOCs')).toBeInTheDocument()
    expect(screen.getByText('Gallery View')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })

  it('renders feature descriptions', () => {
    render(<EmptyDashboard />)

    expect(screen.getByText('Keep all your MOC instructions in one place')).toBeInTheDocument()
    expect(screen.getByText('Browse your collection with beautiful thumbnails')).toBeInTheDocument()
    expect(screen.getByText('Track sets and MOCs you want to build')).toBeInTheDocument()
    expect(screen.getByText('Access your PDF instructions anytime')).toBeInTheDocument()
  })
})
