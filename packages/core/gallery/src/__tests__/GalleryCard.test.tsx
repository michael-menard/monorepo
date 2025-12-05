import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GalleryCard, GalleryCardSkeleton } from '../components/GalleryCard'

describe('GalleryCard', () => {
  const defaultProps = {
    image: { src: '/test-image.jpg', alt: 'Test image' },
    title: 'Test Title',
  }

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card')).toBeInTheDocument()
      expect(screen.getByTestId('gallery-card-title')).toHaveTextContent('Test Title')
      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute('src', '/test-image.jpg')
      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute('alt', 'Test image')
    })

    it('renders subtitle when provided', () => {
      render(<GalleryCard {...defaultProps} subtitle="Test Subtitle" />)

      expect(screen.getByTestId('gallery-card-subtitle')).toHaveTextContent('Test Subtitle')
    })

    it('does not render subtitle when not provided', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.queryByTestId('gallery-card-subtitle')).not.toBeInTheDocument()
    })

    it('renders metadata slot when provided', () => {
      render(
        <GalleryCard
          {...defaultProps}
          metadata={<span data-testid="custom-metadata">Custom Metadata</span>}
        />,
      )

      expect(screen.getByTestId('gallery-card-metadata')).toBeInTheDocument()
      expect(screen.getByTestId('custom-metadata')).toHaveTextContent('Custom Metadata')
    })

    it('renders actions slot when provided', () => {
      render(
        <GalleryCard
          {...defaultProps}
          actions={<button data-testid="action-button">Action</button>}
        />,
      )

      expect(screen.getByTestId('gallery-card-actions')).toBeInTheDocument()
      expect(screen.getByTestId('action-button')).toBeInTheDocument()
    })

    it('renders with custom data-testid', () => {
      render(<GalleryCard {...defaultProps} data-testid="custom-card" />)

      expect(screen.getByTestId('custom-card')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<GalleryCard {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('gallery-card')).toHaveClass('custom-class')
    })
  })

  describe('aspect ratios', () => {
    it('applies 4/3 aspect ratio by default', () => {
      render(<GalleryCard {...defaultProps} />)

      const imageContainer = screen.getByTestId('gallery-card-image').parentElement
      expect(imageContainer).toHaveClass('aspect-[4/3]')
    })

    it('applies 16/9 aspect ratio', () => {
      render(
        <GalleryCard {...defaultProps} image={{ ...defaultProps.image, aspectRatio: '16/9' }} />,
      )

      const imageContainer = screen.getByTestId('gallery-card-image').parentElement
      expect(imageContainer).toHaveClass('aspect-video')
    })

    it('applies 1/1 aspect ratio', () => {
      render(
        <GalleryCard {...defaultProps} image={{ ...defaultProps.image, aspectRatio: '1/1' }} />,
      )

      const imageContainer = screen.getByTestId('gallery-card-image').parentElement
      expect(imageContainer).toHaveClass('aspect-square')
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<GalleryCard {...defaultProps} onClick={handleClick} />)

      fireEvent.click(screen.getByTestId('gallery-card'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Enter key is pressed', () => {
      const handleClick = vi.fn()
      render(<GalleryCard {...defaultProps} onClick={handleClick} />)

      const card = screen.getByTestId('gallery-card')
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick when Space key is pressed', () => {
      const handleClick = vi.fn()
      render(<GalleryCard {...defaultProps} onClick={handleClick} />)

      const card = screen.getByTestId('gallery-card')
      fireEvent.keyDown(card, { key: ' ' })

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick for other keys', () => {
      const handleClick = vi.fn()
      render(<GalleryCard {...defaultProps} onClick={handleClick} />)

      const card = screen.getByTestId('gallery-card')
      fireEvent.keyDown(card, { key: 'Tab' })

      expect(handleClick).not.toHaveBeenCalled()
    })

    it('has role="button" when onClick is provided', () => {
      render(<GalleryCard {...defaultProps} onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('role', 'button')
    })

    it('has role="article" when not interactive', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('role', 'article')
    })

    it('has tabIndex="0" when interactive', () => {
      render(<GalleryCard {...defaultProps} onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('tabindex', '0')
    })

    it('does not have tabIndex when not interactive', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card')).not.toHaveAttribute('tabindex')
    })

    it('stops propagation when clicking actions', () => {
      const handleClick = vi.fn()
      const handleAction = vi.fn()

      render(
        <GalleryCard
          {...defaultProps}
          onClick={handleClick}
          actions={<button onClick={handleAction}>Action</button>}
        />,
      )

      fireEvent.click(screen.getByText('Action'))

      expect(handleAction).toHaveBeenCalledTimes(1)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('selected state', () => {
    it('has aria-selected="true" when selected', () => {
      render(<GalleryCard {...defaultProps} selected onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('aria-selected', 'true')
    })

    it('has aria-selected="false" when not selected', () => {
      render(<GalleryCard {...defaultProps} selected={false} onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('aria-selected', 'false')
    })

    it('applies selected ring styling when selected', () => {
      render(<GalleryCard {...defaultProps} selected onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveClass('ring-2')
      expect(screen.getByTestId('gallery-card')).toHaveClass('ring-primary')
    })
  })

  describe('loading state', () => {
    it('applies loading styles when loading', () => {
      render(<GalleryCard {...defaultProps} loading />)

      const card = screen.getByTestId('gallery-card')
      expect(card).toHaveClass('animate-pulse')
      expect(card).toHaveClass('pointer-events-none')
    })

    it('does not apply loading styles when not loading', () => {
      render(<GalleryCard {...defaultProps} />)

      const card = screen.getByTestId('gallery-card')
      expect(card).not.toHaveClass('animate-pulse')
      expect(card).not.toHaveClass('pointer-events-none')
    })
  })

  describe('accessibility', () => {
    it('has aria-label with title when interactive', () => {
      render(<GalleryCard {...defaultProps} onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute('aria-label', 'Test Title')
    })

    it('has aria-label with title and subtitle when interactive', () => {
      render(<GalleryCard {...defaultProps} subtitle="Test Subtitle" onClick={() => {}} />)

      expect(screen.getByTestId('gallery-card')).toHaveAttribute(
        'aria-label',
        'Test Title - Test Subtitle',
      )
    })

    it('does not have aria-label when not interactive', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card')).not.toHaveAttribute('aria-label')
    })

    it('image has proper alt text', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute('alt', 'Test image')
    })

    it('image has lazy loading', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card-image')).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('image loading states', () => {
    it('shows skeleton while image is loading', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card-image-skeleton')).toBeInTheDocument()
    })

    it('shows error state when image fails to load', () => {
      render(<GalleryCard {...defaultProps} />)

      fireEvent.error(screen.getByTestId('gallery-card-image'))

      expect(screen.getByTestId('gallery-card-image-error')).toBeInTheDocument()
    })
  })

  describe('link behavior', () => {
    it('renders as anchor when href is provided', () => {
      render(<GalleryCard {...defaultProps} href="/test-link" />)

      const card = screen.getByTestId('gallery-card')
      expect(card.tagName).toBe('A')
      expect(card).toHaveAttribute('href', '/test-link')
    })

    it('renders as div when href is not provided', () => {
      render(<GalleryCard {...defaultProps} />)

      expect(screen.getByTestId('gallery-card').tagName).toBe('DIV')
    })
  })
})

describe('GalleryCardSkeleton', () => {
  it('renders skeleton', () => {
    render(<GalleryCardSkeleton />)

    expect(screen.getByTestId('gallery-card-skeleton')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<GalleryCardSkeleton className="custom-class" />)

    expect(screen.getByTestId('gallery-card-skeleton')).toHaveClass('custom-class')
  })

  it('applies custom data-testid', () => {
    render(<GalleryCardSkeleton data-testid="custom-skeleton" />)

    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument()
  })

  it('applies animate-pulse for loading effect', () => {
    render(<GalleryCardSkeleton />)

    expect(screen.getByTestId('gallery-card-skeleton')).toHaveClass('animate-pulse')
  })

  it('applies 4/3 aspect ratio by default', () => {
    render(<GalleryCardSkeleton />)

    const skeleton = screen.getByTestId('gallery-card-skeleton')
    const imageArea = skeleton.querySelector('.aspect-\\[4\\/3\\]')
    expect(imageArea).toBeInTheDocument()
  })

  it('applies 16/9 aspect ratio when specified', () => {
    render(<GalleryCardSkeleton aspectRatio="16/9" />)

    const skeleton = screen.getByTestId('gallery-card-skeleton')
    const imageArea = skeleton.querySelector('.aspect-video')
    expect(imageArea).toBeInTheDocument()
  })
})
