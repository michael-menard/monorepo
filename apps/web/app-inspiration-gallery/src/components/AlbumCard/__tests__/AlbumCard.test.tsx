/**
 * AlbumCard Component Tests
 *
 * INSP-002: Card Component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlbumCard } from '../index'

describe('AlbumCard', () => {
  const defaultProps = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Test Album',
  }

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<AlbumCard {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /Test Album album with 0 items/i }),
      ).toBeInTheDocument()
    })

    it('renders cover image when provided', () => {
      render(
        <AlbumCard {...defaultProps} coverImageUrl="https://example.com/cover.jpg" />,
      )

      const img = screen.getByRole('img', { name: /Test Album/i })
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
    })

    it('renders folder icon when no cover image', () => {
      render(<AlbumCard {...defaultProps} />)

      // Should not have an img element
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('renders item count', () => {
      render(<AlbumCard {...defaultProps} itemCount={5} />)

      expect(screen.getByText(/5 items/i)).toBeInTheDocument()
    })

    it('renders singular item label for single item', () => {
      render(<AlbumCard {...defaultProps} itemCount={1} />)

      expect(screen.getByText(/1 item(?!s)/i)).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(<AlbumCard {...defaultProps} description="My favorite builds" />)

      expect(screen.getByText('My favorite builds')).toBeInTheDocument()
    })

    it('renders child album count when provided', () => {
      render(<AlbumCard {...defaultProps} childAlbumCount={3} />)

      expect(screen.getByText(/3 sub-albums/i)).toBeInTheDocument()
    })

    it('renders tags when provided', () => {
      render(<AlbumCard {...defaultProps} tags={['favorites', 'castle', 'space']} />)

      expect(screen.getByText('favorites')).toBeInTheDocument()
      expect(screen.getByText('castle')).toBeInTheDocument()
      expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('renders more options button', () => {
      render(<AlbumCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /More options/i })).toBeInTheDocument()
    })

    it('has correct test id', () => {
      render(<AlbumCard {...defaultProps} />)

      expect(
        screen.getByTestId('album-card-223e4567-e89b-12d3-a456-426614174001'),
      ).toBeInTheDocument()
    })

    it('has stacked card effect (visual)', () => {
      const { container } = render(<AlbumCard {...defaultProps} />)

      // Should have multiple divs for the stacking effect
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('relative')
    })
  })

  describe('selection mode', () => {
    it('shows selection checkbox in selection mode', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} />)

      const card = screen.getByTestId('album-card-223e4567-e89b-12d3-a456-426614174001')
      expect(card).toBeInTheDocument()
    })

    it('shows check icon when selected', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Album album with 0 items, selected/i })
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('applies selected styling when isSelected is true', () => {
      render(<AlbumCard {...defaultProps} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Album album with 0 items, selected/i })
      expect(card).toHaveClass('ring-2', 'ring-primary')
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      await userEvent.click(screen.getByRole('button', { name: /Test Album album/i }))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onSelect when clicked in selection mode', async () => {
      const onSelect = vi.fn()
      render(
        <AlbumCard
          {...defaultProps}
          selectionMode={true}
          isSelected={false}
          onSelect={onSelect}
        />,
      )

      await userEvent.click(screen.getByRole('button', { name: /Test Album album/i }))

      expect(onSelect).toHaveBeenCalledWith(true)
    })

    it('calls onSelect with false when clicking selected card', async () => {
      const onSelect = vi.fn()
      render(
        <AlbumCard
          {...defaultProps}
          selectionMode={true}
          isSelected={true}
          onSelect={onSelect}
        />,
      )

      await userEvent.click(
        screen.getByRole('button', { name: /Test Album album with 0 items, selected/i }),
      )

      expect(onSelect).toHaveBeenCalledWith(false)
    })

    it('calls onMenuClick when more button is clicked', async () => {
      const onMenuClick = vi.fn()
      render(<AlbumCard {...defaultProps} onMenuClick={onMenuClick} />)

      await userEvent.click(screen.getByRole('button', { name: /More options/i }))

      expect(onMenuClick).toHaveBeenCalledTimes(1)
    })

    it('stops propagation when menu button is clicked', async () => {
      const onClick = vi.fn()
      const onMenuClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} onMenuClick={onMenuClick} />)

      await userEvent.click(screen.getByRole('button', { name: /More options/i }))

      expect(onMenuClick).toHaveBeenCalledTimes(1)
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('keyboard navigation', () => {
    it('can be focused', () => {
      render(<AlbumCard {...defaultProps} />)

      const card = screen.getByRole('button', { name: /Test Album album/i })
      card.focus()

      expect(card).toHaveFocus()
    })

    it('activates on Enter key', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByRole('button', { name: /Test Album album/i })
      card.focus()

      await userEvent.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('activates on Space key', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByRole('button', { name: /Test Album album/i })
      card.focus()

      await userEvent.keyboard(' ')

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role button', () => {
      render(<AlbumCard {...defaultProps} />)

      expect(screen.getByRole('button', { name: /Test Album album/i })).toBeInTheDocument()
    })

    it('has aria-pressed attribute', () => {
      render(<AlbumCard {...defaultProps} isSelected={false} />)

      const card = screen.getByRole('button', { name: /Test Album album/i })
      expect(card).toHaveAttribute('aria-pressed', 'false')
    })

    it('has aria-pressed true when selected', () => {
      render(<AlbumCard {...defaultProps} isSelected={true} />)

      const card = screen.getByRole('button', { name: /Test Album album with 0 items, selected/i })
      expect(card).toHaveAttribute('aria-pressed', 'true')
    })

    it('has accessible label with item count', () => {
      render(<AlbumCard {...defaultProps} itemCount={5} />)

      expect(
        screen.getByRole('button', { name: /Test Album album with 5 items/i }),
      ).toBeInTheDocument()
    })

    it('has accessible label with selected state', () => {
      render(<AlbumCard {...defaultProps} isSelected={true} />)

      expect(
        screen.getByRole('button', { name: /Test Album album with 0 items, selected/i }),
      ).toBeInTheDocument()
    })

    it('image has alt text when cover image is provided', () => {
      render(<AlbumCard {...defaultProps} coverImageUrl="https://example.com/cover.jpg" />)

      expect(screen.getByRole('img', { name: /Test Album/i })).toBeInTheDocument()
    })

    it('has lazy loading on cover image', () => {
      render(<AlbumCard {...defaultProps} coverImageUrl="https://example.com/cover.jpg" />)

      const img = screen.getByRole('img', { name: /Test Album/i })
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })
})
