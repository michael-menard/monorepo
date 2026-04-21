/**
 * MainPage Component Tests
 * Tests for the dashboard main page.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MainPage } from '../main-page'

// Mock TanStack Router Link (used by QuickActions and RecentMocsGrid)
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('MainPage', () => {
  it('renders the dashboard header', () => {
    render(<MainPage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders quick actions section', () => {
    render(<MainPage />)
    expect(screen.getByText('Add MOC')).toBeInTheDocument()
  })

  it('applies custom className to wrapper', () => {
    const { container } = render(<MainPage className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
