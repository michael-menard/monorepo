/**
 * InspirationCard Component Tests
 *
 * REPA-009: Updated for GalleryCard refactor
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InspirationCard } from '../index'

describe('InspirationCard', () => {
  const defaultProps = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Test Inspiration',
    imageUrl: 'https://example.com/image.jpg',
  }
  
  const testId = `inspiration-card-${defaultProps.id}`

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<InspirationCard {...defaultProps} />)

      // GalleryCard renders as article
      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByTestId(testId)).toBeInTheDocument()
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

      expect(screen.getByTestId(testId)).toBeInTheDocument()
    })
  })

  describe('selection mode', () => {
    it('shows selection checkbox in selection mode', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} />)

      // GalleryCard selection checkbox should be visible
      const checkbox = screen.getByTestId(`${testId}-selection-checkbox`)
      expect(checkbox).toBeInTheDocument()
    })

    it('shows check icon when selected', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const checkbox = screen.getByTestId(`${testId}-selection-checkbox`)
      expect(checkbox).toHaveClass('bg-primary')
    })

    it('applies selected styling when isSelected is true', () => {
      render(<InspirationCard {...defaultProps} isSelected={true} selectionMode={true} />)

      const card = screen.getByRole('article')
      expect(card).toHaveClass('ring-2', 'ring-primary')
    })
  })

  describe('interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      // Get the card element by testId
      const card = screen.getByTestId(testId)
      await userEvent.click(card)

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

      // selectable + onSelect makes card interactive (role="button")
      await userEvent.click(screen.getByTestId(testId))

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

      // selectable + onSelect makes card interactive (role="button")
      await userEvent.click(screen.getByTestId(testId))

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
      render(<InspirationCard {...defaultProps} onClick={vi.fn()} />)

      const card = screen.getByTestId(testId)
      card.focus()

      expect(card).toHaveFocus()
    })

    it('activates on Enter key', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByTestId(testId)
      card.focus()

      await userEvent.keyboard('{Enter}')

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('activates on Space key', async () => {
      const onClick = vi.fn()
      render(<InspirationCard {...defaultProps} onClick={onClick} />)

      const card = screen.getByTestId(testId)
      card.focus()

      await userEvent.keyboard(' ')

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has role button when interactive', () => {
      render(<InspirationCard {...defaultProps} onClick={vi.fn()} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('role', 'button')
    })
    
    it('has role article when not interactive', () => {
      render(<InspirationCard {...defaultProps} />)

      expect(screen.getByRole('article')).toBeInTheDocument()
    })

    it('has aria-selected attribute in selection mode', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} isSelected={false} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-selected', 'false')
    })

    it('has aria-selected true when selected', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} isSelected={true} />)

      const card = screen.getByRole('article')
      expect(card).toHaveAttribute('aria-selected', 'true')
    })

    it('has accessible label with title when interactive', () => {
      render(<InspirationCard {...defaultProps} onClick={vi.fn()} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('aria-label', 'Test Inspiration')
    })

    it('has accessible label with selected state', () => {
      render(<InspirationCard {...defaultProps} onClick={vi.fn()} isSelected={true} selectionMode={true} />)

      const card = screen.getByTestId(testId)
      expect(card).toHaveAttribute('aria-label')
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

  describe('GalleryCard integration (REPA-009)', () => {
    it('integrates with GalleryCard selection mode', () => {
      render(<InspirationCard {...defaultProps} selectionMode={true} isSelected={false} />)

      // Verify GalleryCard's checkbox is rendered
      expect(screen.getByTestId(`${testId}-selection-checkbox`)).toBeInTheDocument()
    })

    it('renders hover overlay content within GalleryCard', () => {
      render(<InspirationCard {...defaultProps} />)

      // Verify hover overlay container exists
      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      expect(hoverOverlay).toBeInTheDocument()

      // Verify title is in hover overlay
      expect(within(hoverOverlay).getByText('Test Inspiration')).toBeInTheDocument()
    })

    it('renders all action buttons in hover overlay', () => {
      render(<InspirationCard {...defaultProps} sourceUrl="https://example.com/source" />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      
      // Both source link and more menu should be in overlay
      expect(within(hoverOverlay).getByRole('button', { name: /Open source link/i })).toBeInTheDocument()
      expect(within(hoverOverlay).getByRole('button', { name: /More options/i })).toBeInTheDocument()
    })

    it('renders badges in hover overlay', () => {
      render(<InspirationCard {...defaultProps} albumCount={3} mocCount={2} />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      
      expect(within(hoverOverlay).getByText(/3 albums/i)).toBeInTheDocument()
      expect(within(hoverOverlay).getByText(/2 MOCs/i)).toBeInTheDocument()
    })

    it('renders tags in hover overlay', () => {
      render(<InspirationCard {...defaultProps} tags={['lego', 'castle']} />)

      const hoverOverlay = screen.getByTestId(`${testId}-hover-overlay`)
      
      expect(within(hoverOverlay).getByText('lego')).toBeInTheDocument()
      expect(within(hoverOverlay).getByText('castle')).toBeInTheDocument()
    })
  })
})
