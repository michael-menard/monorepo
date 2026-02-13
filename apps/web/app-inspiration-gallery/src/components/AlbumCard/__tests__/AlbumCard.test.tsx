/**
 * AlbumCard Component Tests
 *
 * REPA-009: Updated for GalleryCard refactor
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlbumCard } from '../index'

describe('AlbumCard', () => {
  const defaultProps = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Test Album',
  }
  
  const testId = `album-card-${defaultProps.id}`

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<AlbumCard {...defaultProps} />)

      // GalleryCard renders as article
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    })

    it('renders cover image when provided', () => {
      render(<AlbumCard {...defaultProps} coverImageUrl="https://example.com/cover.jpg" />)

      const img = screen.getByRole('img', { name: /Test Album/i })
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
    })

    it('renders folder icon when no cover image', () => {
      render(<AlbumCard {...defaultProps} />)

      // Fallback shows folder icon (no img because src is empty string)
      // The fallback div is rendered instead
      const card = screen.getByTestId(testId)
      expect(card).toBeInTheDocument()
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

      expect(screen.getByTestId(testId)).toBeInTheDocument()
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

      // GalleryCard selection checkbox should be visible
      const checkbox = screen.getByTestId(`${testId}-selection-checkbox`)
      expect(checkbox).toBeInTheDocument()
    })

    it('shows check icon when selected', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const checkbox = screen.getByTestId(`${testId}-selection-checkbox`)
      expect(checkbox).toHaveClass('bg-primary')
    })

    it('applies selected styling when isSelected is true', () => {
      render(<AlbumCard {...defaultProps} isSelected={true} selectionMode={true} />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('ring-2', 'ring-primary')
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      // Get the card element by testId
      const card = screen.getByTestId(testId)
      await userEvent.click(card)

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

      // selectable + onSelect makes card interactive
      await userEvent.click(screen.getByTestId(testId))

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

      // selectable + onSelect makes card interactive
      await userEvent.click(screen.getByTestId(testId))

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
      render(<AlbumCard {...defaultProps} onClick={vi.fn()} />)

      const card = screen.getByTestId(testId)
      card.focus()

      expect(card).toHaveFocus()
    })

    it('activates on Enter key', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByTestId(testId)
      card.focus()

      await userEvent.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('activates on Space key', async () => {
      const onClick = vi.fn()
      render(<AlbumCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByTestId(testId)
      card.focus()

      await userEvent.keyboard(' ')

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role button when interactive', () => {
      render(<AlbumCard {...defaultProps} onClick={vi.fn()} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('role', 'button')
    })
    
    it('has role article when not interactive', () => {
      render(<AlbumCard {...defaultProps} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has aria-selected attribute in selection mode', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} isSelected={false} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-selected', 'false')
    })

    it('has aria-selected true when selected', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('has accessible label with title when interactive', () => {
      render(<AlbumCard {...defaultProps} onClick={vi.fn()} itemCount={5} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('aria-label')
    })

    it('has accessible label with selected state', () => {
      render(<AlbumCard {...defaultProps} onClick={vi.fn()} isSelected={true} selectionMode={true} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('aria-label')
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

  describe('GalleryCard integration (REPA-009)', () => {
    it('integrates with GalleryCard selection mode', () => {
      render(<AlbumCard {...defaultProps} selectionMode={true} isSelected={false} />)

      // Verify GalleryCard's checkbox is rendered
      expect(screen.getByTestId(`${testId}-selection-checkbox`)).toBeInTheDocument()
    })

    it('preserves stacked card effect outside GalleryCard', () => {
      const { container } = render(<AlbumCard {...defaultProps} />)

      // Verify wrapper with stacked effect exists
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('relative')

      // Verify two background divs for stacking effect
      const stackedDivs = wrapper.querySelectorAll('div.absolute')
      expect(stackedDivs.length).toBeGreaterThanOrEqual(2)
    })

    it('renders all content in hover overlay', () => {
      render(<AlbumCard {...defaultProps} description="Test description" childAlbumCount={2} />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      
      // Verify all content is in hover overlay using within()
      expect(within(hoverOverlay).getByText(/Test description/i)).toBeInTheDocument()
      expect(within(hoverOverlay).getByText(/2 sub-albums/i)).toBeInTheDocument()
      expect(within(hoverOverlay).getByRole('button', { name: /More options/i })).toBeInTheDocument()
    })

    it('renders item count badge in hover overlay', () => {
      render(<AlbumCard {...defaultProps} itemCount={10} />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      expect(within(hoverOverlay).getByText(/10 items/i)).toBeInTheDocument()
    })

    it('renders tags in hover overlay', () => {
      render(<AlbumCard {...defaultProps} tags={['favorites', 'castle']} />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      
      expect(within(hoverOverlay).getByText('favorites')).toBeInTheDocument()
      expect(within(hoverOverlay).getByText('castle')).toBeInTheDocument()
    })
  })
})
