/**
 * EmptyState Component Tests
 *
 * BUGF-012: Test coverage for untested components
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../index'

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders no-inspirations variant by default', () => {
      render(<EmptyState />)

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Start collecting inspiration/i)).toBeInTheDocument()
    })

    it('renders no-albums variant', () => {
      render(<EmptyState variant="no-albums" />)

      expect(screen.getByText(/Organize with albums/i)).toBeInTheDocument()
    })

    it('renders empty-album variant', () => {
      render(<EmptyState variant="empty-album" />)

      expect(screen.getByText(/This album is empty/i)).toBeInTheDocument()
    })

    it('renders no-search-results variant', () => {
      render(<EmptyState variant="no-search-results" />)

      expect(screen.getByText(/No results found/i)).toBeInTheDocument()
    })

    it('renders first-time variant', () => {
      render(<EmptyState variant="first-time" />)

      expect(screen.getByText(/Welcome to your Inspiration Gallery/i)).toBeInTheDocument()
    })

    it('customizes description for empty-album with albumName', () => {
      render(<EmptyState variant="empty-album" albumName="My Cool Project" />)

      expect(screen.getByText(/Add inspirations to "My Cool Project"/i)).toBeInTheDocument()
    })

    it('customizes description for no-search-results with searchQuery', () => {
      render(<EmptyState variant="no-search-results" searchQuery="castle" />)

      expect(screen.getByText(/No results found for "castle"/i)).toBeInTheDocument()
    })

    it('shows onboarding tips for first-time variant', () => {
      render(<EmptyState variant="first-time" />)

      expect(screen.getByText(/Upload Images/i)).toBeInTheDocument()
      expect(screen.getByText(/Create Albums/i)).toBeInTheDocument()
      expect(screen.getByText(/Link to MOCs/i)).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('calls onPrimaryAction when primary button clicked', async () => {
      const onPrimaryAction = vi.fn()
      render(<EmptyState variant="no-inspirations" onPrimaryAction={onPrimaryAction} />)

      const button = screen.getByRole('button', { name: /Upload Inspiration/i })
      await userEvent.click(button)

      expect(onPrimaryAction).toHaveBeenCalledTimes(1)
    })

    it('calls onSecondaryAction when secondary button clicked', async () => {
      const onSecondaryAction = vi.fn()
      render(
        <EmptyState
          variant="no-inspirations"
          onPrimaryAction={vi.fn()}
          onSecondaryAction={onSecondaryAction}
        />,
      )

      const button = screen.getByRole('button', { name: /Create Album/i })
      await userEvent.click(button)

      expect(onSecondaryAction).toHaveBeenCalledTimes(1)
    })

    it('does not render primary button when onPrimaryAction not provided', () => {
      render(<EmptyState variant="no-inspirations" />)

      expect(screen.queryByRole('button', { name: /Upload Inspiration/i })).not.toBeInTheDocument()
    })

    it('does not render secondary button when onSecondaryAction not provided', () => {
      render(<EmptyState variant="no-inspirations" onPrimaryAction={vi.fn()} />)

      expect(screen.queryByRole('button', { name: /Create Album/i })).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role status', () => {
      render(<EmptyState variant="no-inspirations" />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible label matching title', () => {
      render(<EmptyState variant="no-inspirations" />)

      expect(screen.getByRole('status', { name: /Start collecting inspiration/i })).toBeInTheDocument()
    })

    it('all action buttons are accessible', () => {
      render(
        <EmptyState
          variant="no-inspirations"
          onPrimaryAction={vi.fn()}
          onSecondaryAction={vi.fn()}
        />,
      )

      expect(screen.getByRole('button', { name: /Upload Inspiration/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Create Album/i })).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies custom className', () => {
      render(<EmptyState variant="no-inspirations" className="custom-class" />)

      const container = screen.getByRole('status')
      expect(container).toHaveClass('custom-class')
    })
  })
})
