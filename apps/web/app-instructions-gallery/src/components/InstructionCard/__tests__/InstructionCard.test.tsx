/**
 * InstructionCard Component Tests
 * Story 3.1.2: Instructions Card Component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstructionCard } from '../index'
import type { Instruction } from '../../../__types__'

// Mock @repo/gallery
vi.mock('@repo/gallery', () => ({
  GalleryCard: vi.fn(
    ({ image, title, onClick, metadata, actions, 'data-testid': testId, className }) => (
      <div data-testid={testId} className={className} onClick={onClick} role="button" tabIndex={0}>
        <img src={image.src} alt={image.alt} data-testid="gallery-card-image" />
        <h3 data-testid="gallery-card-title">{title}</h3>
        {metadata && <div data-testid="gallery-card-metadata">{metadata}</div>}
        {actions && <div data-testid="gallery-card-actions">{actions}</div>}
      </div>
    ),
  ),
}))

// Mock @repo/app-component-library
vi.mock('@repo/app-component-library', () => ({
  Badge: vi.fn(({ children, variant, 'data-testid': testId }) => (
    <span data-testid={testId} data-variant={variant}>
      {children}
    </span>
  )),
  Button: vi.fn(({ children, onClick, 'aria-label': ariaLabel, 'data-testid': testId }) => (
    <button onClick={onClick} aria-label={ariaLabel} data-testid={testId}>
      {children}
    </button>
  )),
  cn: (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' '),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Heart: vi.fn(({ className }) => <svg data-testid="heart-icon" className={className} />),
  Pencil: vi.fn(({ className }) => <svg data-testid="pencil-icon" className={className} />),
}))

const mockInstruction: Instruction = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test LEGO MOC',
  thumbnail: 'https://example.com/thumbnail.jpg',
  images: [],
  pieceCount: 1500,
  theme: 'Technic',
  tags: ['vehicle', 'supercar'],
  createdAt: '2025-01-15T10:30:00Z',
  isFavorite: false,
}

describe('InstructionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders instruction data correctly', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      expect(screen.getByTestId('gallery-card-title')).toHaveTextContent('Test LEGO MOC')
      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute(
        'src',
        'https://example.com/thumbnail.jpg',
      )
      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute('alt', 'Test LEGO MOC')
    })

    it('displays piece count badge', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      expect(screen.getByTestId('piece-count-badge')).toHaveTextContent('1,500 pieces')
    })

    it('displays theme tag', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      expect(screen.getByTestId('theme-tag')).toHaveTextContent('Technic')
    })

    it('applies custom className', () => {
      render(<InstructionCard instruction={mockInstruction} className="custom-class" />)

      expect(screen.getByTestId(`instruction-card-${mockInstruction.id}`)).toHaveClass(
        'custom-class',
      )
    })
  })

  describe('Click Navigation', () => {
    it('calls onClick with instruction id when card is clicked', async () => {
      const handleClick = vi.fn()
      render(<InstructionCard instruction={mockInstruction} onClick={handleClick} />)

      const card = screen.getByTestId(`instruction-card-${mockInstruction.id}`)
      fireEvent.click(card)

      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(handleClick).toHaveBeenCalledWith(mockInstruction.id)
    })

    it('does not render if onClick is not provided', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      // Card still renders, just without click handler
      expect(screen.getByTestId(`instruction-card-${mockInstruction.id}`)).toBeInTheDocument()
    })
  })

  describe('Favorite Action', () => {
    it('renders favorite button when onFavorite is provided', () => {
      const handleFavorite = vi.fn()
      render(<InstructionCard instruction={mockInstruction} onFavorite={handleFavorite} />)

      expect(screen.getByTestId('favorite-button')).toBeInTheDocument()
    })

    it('does not render favorite button when onFavorite is not provided', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      expect(screen.queryByTestId('favorite-button')).not.toBeInTheDocument()
    })

    it('calls onFavorite with instruction id when favorite button is clicked', async () => {
      const handleFavorite = vi.fn()
      const user = userEvent.setup()
      render(<InstructionCard instruction={mockInstruction} onFavorite={handleFavorite} />)

      await user.click(screen.getByTestId('favorite-button'))

      expect(handleFavorite).toHaveBeenCalledTimes(1)
      expect(handleFavorite).toHaveBeenCalledWith(mockInstruction.id)
    })

    it('shows filled heart when isFavorite is true', () => {
      const favoriteInstruction = { ...mockInstruction, isFavorite: true }
      render(<InstructionCard instruction={favoriteInstruction} onFavorite={vi.fn()} />)

      const heartIcon = screen.getByTestId('heart-icon')
      expect(heartIcon).toHaveClass('fill-current')
      expect(heartIcon).toHaveClass('text-red-500')
    })

    it('shows unfilled heart when isFavorite is false', () => {
      render(<InstructionCard instruction={mockInstruction} onFavorite={vi.fn()} />)

      const heartIcon = screen.getByTestId('heart-icon')
      expect(heartIcon).not.toHaveClass('fill-current')
    })

    it('has correct aria-label for favorite button', () => {
      render(<InstructionCard instruction={mockInstruction} onFavorite={vi.fn()} />)

      expect(screen.getByTestId('favorite-button')).toHaveAttribute(
        'aria-label',
        'Add to favorites',
      )
    })

    it('has correct aria-label when already favorited', () => {
      const favoriteInstruction = { ...mockInstruction, isFavorite: true }
      render(<InstructionCard instruction={favoriteInstruction} onFavorite={vi.fn()} />)

      expect(screen.getByTestId('favorite-button')).toHaveAttribute(
        'aria-label',
        'Remove from favorites',
      )
    })
  })

  describe('Edit Action', () => {
    it('renders edit button when onEdit is provided', () => {
      const handleEdit = vi.fn()
      render(<InstructionCard instruction={mockInstruction} onEdit={handleEdit} />)

      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
    })

    it('does not render edit button when onEdit is not provided', () => {
      render(<InstructionCard instruction={mockInstruction} />)

      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument()
    })

    it('calls onEdit with instruction id when edit button is clicked', async () => {
      const handleEdit = vi.fn()
      const user = userEvent.setup()
      render(<InstructionCard instruction={mockInstruction} onEdit={handleEdit} />)

      await user.click(screen.getByTestId('edit-button'))

      expect(handleEdit).toHaveBeenCalledTimes(1)
      expect(handleEdit).toHaveBeenCalledWith(mockInstruction.id)
    })

    it('has correct aria-label for edit button', () => {
      render(<InstructionCard instruction={mockInstruction} onEdit={vi.fn()} />)

      expect(screen.getByTestId('edit-button')).toHaveAttribute('aria-label', 'Edit instruction')
    })
  })

  describe('Event Propagation', () => {
    it('stops propagation when favorite button is clicked', async () => {
      const handleClick = vi.fn()
      const handleFavorite = vi.fn()
      render(
        <InstructionCard
          instruction={mockInstruction}
          onClick={handleClick}
          onFavorite={handleFavorite}
        />,
      )

      const favoriteButton = screen.getByTestId('favorite-button')
      // Create a click event with stopPropagation spy
      const event = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      fireEvent(favoriteButton, event)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('stops propagation when edit button is clicked', async () => {
      const handleClick = vi.fn()
      const handleEdit = vi.fn()
      render(
        <InstructionCard instruction={mockInstruction} onClick={handleClick} onEdit={handleEdit} />,
      )

      const editButton = screen.getByTestId('edit-button')
      const event = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation')

      fireEvent(editButton, event)

      expect(stopPropagationSpy).toHaveBeenCalled()
    })
  })

  describe('Complete Card', () => {
    it('renders all actions when both onFavorite and onEdit are provided', () => {
      render(
        <InstructionCard
          instruction={mockInstruction}
          onClick={vi.fn()}
          onFavorite={vi.fn()}
          onEdit={vi.fn()}
        />,
      )

      expect(screen.getByTestId('favorite-button')).toBeInTheDocument()
      expect(screen.getByTestId('edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('piece-count-badge')).toBeInTheDocument()
      expect(screen.getByTestId('theme-tag')).toBeInTheDocument()
    })
  })
})
