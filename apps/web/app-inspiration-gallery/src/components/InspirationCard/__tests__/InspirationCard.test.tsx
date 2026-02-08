/**
 * InspirationCard Component Tests
 *
 * INSP-002: Card Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InspirationCard } from '../index'

describe('InspirationCard', () => {
  const defaultProps = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    imageUrl: 'https://example.com/image.jpg',
  }

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Test Inspiration/i })).toBeInTheDocument()
    })

    it('renders thumbnail when provided', () => {
      render(
        <InspirationCard {...defaultProps} thumbnailUrl="https://example.com/thumb.jpg" />,
      )

      const img = screen.getByRole('img', { name: /Test Inspiration/i })
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('falls back to imageUrl when thumbnailUrl is not provided', () => {
      render(<InspirationCard {...defaultProps} />)

      const img = screen.getByRole('img', { name: /Test Inspiration/i })
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg')
    })

    it('renders title in overlay', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByText('Test Inspiration')).toBeInTheDocument()
    })

    it('renders tags when provided', () => {
      render(<InspirationCard {...defaultProps} tags={['lego', 'castle', 'medieval']} />)

      expect(screen.getByText('lego')).toBeInTheDocument()
      expect(screen.getByText('castle')).toBeInTheDocument()
      expect(screen.getByText('+1')).toBeInTheDocument() // Shows +1 for third tag
    })

    it('renders source link button when sourceUrl is provided', () => {
      render(<InspirationCard {...defaultProps} sourceUrl="https://example.com/source" />)

      expect(screen.getByRole('button', { name: /Open source link/i })).toBeInTheDocument()
    })

    it('does not render source link button when sourceUrl is not provided', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /Open source link/i })).not.toBeInTheDocument()
    })

    it('renders more options button', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /More options/i })).toBeInTheDocument()
    })

    it('renders album count when provided', () => {
      render(<InspirationCard {...defaultProps} albumCount={3} />)

      expect(screen.getByText(/3 albums/i)).toBeInTheDocument()
    })

    it('renders MOC count when provided', () => {
      render(<InspirationCard {...defaultProps} mocCount={2} />)

      expect(screen.getByText(/2 MOCs/i)).toBeInTheDocument()
    })

    it('has correct test id', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(
        screen.getByTestId('inspiration-card-123e4567-e89b-12d3-a456-426614174001'),
      ).toBeInTheDocument()
    })
  })

  describe('selection mode', () => {
    it('shows selection checkbox in selection mode', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} />)

      // Selection checkbox overlay should be visible
      const card = screen.getByTestId('inspiration-card-123e4567-e89b-12d3-a456-426614174001')
      expect(card).toBeInTheDocument()
    })

    it('shows check icon when selected', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Inspiration, selected/i })
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('applies selected styling when isSelected is true', () => {
      render(<InspirationCard {...defaultProps} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Inspiration, selected/i })
      expect(card).toHaveClass('ring-2', 'ring-primary')
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      await userEvent.click(screen.getByRole('button', { name: /Test Inspiration/i }))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onSelect when clicked in selection mode', async () => {
      const onSelect = vi.fn()
      render(
        <InspirationCard
          {...defaultProps}
          selectionMode={true}
          isSelected={false}
          onSelect={onSelect}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Test Inspiration/i }))

      expect(onSelect).toHaveBeenCalledWith(true)
    })

    it('calls onSelect with false when clicking selected card', async () => {
      const onSelect = vi.fn()
      render(
        <InspirationCard
          {...defaultProps}
          selectionMode={true}
          isSelected={true}
          onSelect={onSelect}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Test Inspiration, selected/i }))

      expect(onSelect).toHaveBeenCalledWith(false)
    })

    it('calls onMenuClick when more button is clicked', async () => {
      const onMenuClick = vi.fn()
      render(<InspirationCard {...defaultProps} onMenuClick={onMenuClick} />)

      await userEvent.click(screen.getByRole('button', { name: /More options/i }))

      expect(onMenuClick).toHaveBeenCalledTimes(1)
    })

    it('stops propagation when menu button is clicked', async () => {
      const onClick = vi.fn()
      const onMenuClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} onMenuClick={onMenuClick} />)

      await userEvent.click(screen.getByRole('button', { name: /More options/i }))

      expect(onMenuClick).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('opens source URL in new tab when source link is clicked', async () => {
      const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)

      render(<InspirationCard {...defaultProps} sourceUrl="https://example.com/source" />)

      await userEvent.click(screen.getByRole('button', { name: /Open source link/i }))

      expect(windowOpen).toHaveBeenCalledWith(
        'https://example.com/source',
        '_blank',
        'noopener,noreferrer',
      )

      windowOpen.mockRestore()
    })
  })

  describe('keyboard navigation', () => {
    it('can be focused', () => {
      render(<InspirationCard {...defaultProps} />)

      const card = screen.getByRole('button', { name: /Test Inspiration/i })
      card.focus()

      expect(card).toHaveFocus()
    })

    it('activates on Enter key', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByRole('button', { name: /Test Inspiration/i })
      card.focus()

      await userEvent.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('activates on Space key', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByRole('button', { name: /Test Inspiration/i })
      card.focus()

      await userEvent.keyboard(' ')

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role button', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Test Inspiration/i })).toBeInTheDocument()
    })

    it('has aria-pressed attribute', () => {
      render(<InspirationCard {...defaultProps} isSelected={false} />)

      const card = screen.getByRole('button', { name: /Test Inspiration/i })
      expect(card).toHaveAttribute('aria-pressed', 'false')
    })

    it('has aria-pressed true when selected', () => {
      render(<InspirationCard {...defaultProps} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Inspiration, selected/i })
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('has accessible label with selected state', () => {
      render(<InspirationCard {...defaultProps} isSelected={true} />)

      expect(
        screen.getByRole('button', { name: /Test Inspiration, selected/i }),
      ).toBeInTheDocument()
    })

    it('image has alt text', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByRole('img', { name: /Test Inspiration/i })).toBeInTheDocument()
    })

    it('has lazy loading on image', () => {
      render(<InspirationCard {...defaultProps} />)

      const img = screen.getByRole('img', { name: /Test Inspiration/i })
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})
