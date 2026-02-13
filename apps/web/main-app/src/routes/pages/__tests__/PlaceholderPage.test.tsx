import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlaceholderPage } from '../PlaceholderPage'

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/test-page' }),
}))

// Mock lucide-react
vi.mock('lucide-react', async () => {
  const React = await import('react')
  return {
    Construction: () => React.createElement('svg', { 'data-testid': 'construction-icon' }),
  }
})

describe('PlaceholderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render "Coming Soon" heading', () => {
      render(<PlaceholderPage />)

      expect(screen.getByText('Coming Soon')).toBeInTheDocument()
    })

    it('should show pathname in description', () => {
      render(<PlaceholderPage />)

      expect(
        screen.getByText(/This page \(\/test-page\) is under construction/i),
      ).toBeInTheDocument()
    })

    it('should render construction icon', () => {
      render(<PlaceholderPage />)

      expect(screen.getByTestId('construction-icon')).toBeInTheDocument()
    })

    it('should display complete under construction message', () => {
      render(<PlaceholderPage />)

      expect(screen.getByText(/will be available in a future update/i)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<PlaceholderPage />)

      const heading = screen.getByText('Coming Soon')
      expect(heading.tagName).toBe('H1')
    })

    it('should have descriptive text for users', () => {
      render(<PlaceholderPage />)

      const description = screen.getByText(/under construction/i)
      expect(description).toBeInTheDocument()
    })
  })
})
