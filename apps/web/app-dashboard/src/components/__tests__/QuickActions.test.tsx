/**
 * QuickActions Component Tests
 * Story 2.10: Dashboard Unit Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuickActions } from '../QuickActions'

// Mock TanStack Router
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to} data-testid="action-link">
      {children}
    </a>
  ),
}))

describe('QuickActions', () => {
  it('renders the Add MOC action button', () => {
    render(<QuickActions />)

    expect(screen.getByText('Add MOC')).toBeInTheDocument()
  })

  it('links to correct route', () => {
    render(<QuickActions />)

    const links = screen.getAllByTestId('action-link')
    expect(links).toHaveLength(1)

    expect(links[0]).toHaveAttribute('href', '/instructions/new')
  })

  it('renders button with correct role', () => {
    render(<QuickActions />)

    // Check that the link is rendered
    const buttons = screen.getAllByRole('link')
    expect(buttons).toHaveLength(1)
  })
})
