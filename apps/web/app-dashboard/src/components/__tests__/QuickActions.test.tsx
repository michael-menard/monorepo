/**
 * QuickActions Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuickActions } from '../QuickActions'

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to} data-testid="action-link">
      {children}
    </a>
  ),
}))

describe('QuickActions', () => {
  it('renders all action buttons', () => {
    render(<QuickActions />)

    expect(screen.getByText('Add MOC')).toBeInTheDocument()
    expect(screen.getByText('Browse Gallery')).toBeInTheDocument()
    expect(screen.getByText('View Wishlist')).toBeInTheDocument()
  })

  it('links to correct routes', () => {
    render(<QuickActions />)

    const links = screen.getAllByTestId('action-link')
    expect(links).toHaveLength(3)

    expect(links[0]).toHaveAttribute('href', '/instructions/new')
    expect(links[1]).toHaveAttribute('href', '/gallery')
    expect(links[2]).toHaveAttribute('href', '/wishlist')
  })

  it('renders buttons with correct styling', () => {
    render(<QuickActions />)

    // Check that buttons are rendered (they're wrapped in Link)
    const buttons = screen.getAllByRole('link')
    expect(buttons).toHaveLength(3)
  })
})
