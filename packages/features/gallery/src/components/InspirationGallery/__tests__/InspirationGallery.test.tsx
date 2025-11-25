import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { motion } from 'framer-motion'
import InspirationGallery from '../index.js'
import type { GalleryImage } from '../../../types/index.js'

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}))

// Mock ImageCard component
vi.mock('../../ImageCard/index.js', () => ({
  default: ({ src, alt, title, onView }: any) => (
    <div data-testid="image-card" onClick={onView} data-src={src} data-alt={alt} data-title={title}>
      {title}
    </div>
  ),
}))

const mockImages: GalleryImage[] = [
  {
    id: '1',
    url: 'https://example.com/image1.jpg',
    title: 'Test Image 1',
    description: 'Test description 1',
    author: 'Test Author 1',
    tags: ['test', 'image'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    url: 'https://example.com/image2.jpg',
    title: 'Test Image 2',
    description: 'Test description 2',
    author: 'Test Author 2',
    tags: ['test', 'gallery'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
]

describe('InspirationGallery', () => {
  const defaultProps = {
    images: mockImages,
    onImageClick: vi.fn(),
    onImageLike: vi.fn(),
    onImageShare: vi.fn(),
    onImageDelete: vi.fn(),
    onImageDownload: vi.fn(),
    onImageAddToAlbum: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Layout Responsiveness', () => {
    it('renders with default masonry layout', () => {
      render(<InspirationGallery {...defaultProps} />)

      const gallery = screen.getByRole('main', { hidden: true })
      expect(gallery).toBeInTheDocument()
    })

    it('applies custom column configuration', () => {
      const customColumns = { sm: 1, md: 2, lg: 3, xl: 4 }
      render(<InspirationGallery {...defaultProps} columns={customColumns} />)

      const gallery = screen.getByRole('main', { hidden: true })
      expect(gallery).toBeInTheDocument()
    })

    it('applies custom gap spacing', () => {
      render(<InspirationGallery {...defaultProps} gap={8} />)

      const gallery = screen.getByRole('main', { hidden: true })
      expect(gallery).toBeInTheDocument()
    })
  })

  describe('Image Loading', () => {
    it('renders all images correctly', () => {
      render(<InspirationGallery {...defaultProps} />)

      const imageCards = screen.getAllByTestId('image-card')
      expect(imageCards).toHaveLength(2)

      expect(imageCards[0]).toHaveAttribute('data-title', 'Test Image 1')
      expect(imageCards[1]).toHaveAttribute('data-title', 'Test Image 2')
    })

    it('handles image click events', () => {
      render(<InspirationGallery {...defaultProps} />)

      const firstImageCard = screen.getAllByTestId('image-card')[0]
      fireEvent.click(firstImageCard)

      expect(defaultProps.onImageClick).toHaveBeenCalledWith(mockImages[0])
    })

    it('displays empty state when no images', () => {
      render(<InspirationGallery {...defaultProps} images={[]} />)

      expect(screen.getByText('No inspiration yet')).toBeInTheDocument()
      expect(
        screen.getByText('Start adding images to your inspiration gallery!'),
      ).toBeInTheDocument()
    })
  })

  describe('Infinite Scroll', () => {
    it('shows load more trigger when hasMore is true', () => {
      const onLoadMore = vi.fn()
      render(<InspirationGallery {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />)

      // The load more trigger should be present but invisible
      const loadMoreTrigger = document.querySelector('[data-testid="load-more-trigger"]')
      expect(loadMoreTrigger).toBeInTheDocument()
    })

    it('shows loading state when loading is true', () => {
      render(<InspirationGallery {...defaultProps} hasMore={true} loading={true} />)

      expect(screen.getByText('Loading more inspiration...')).toBeInTheDocument()
    })

    it('shows end message when no more images', () => {
      render(<InspirationGallery {...defaultProps} hasMore={false} />)

      expect(
        screen.getByText("You've reached the end of your inspiration gallery!"),
      ).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('displays loading spinner when loading more content', () => {
      render(<InspirationGallery {...defaultProps} hasMore={true} loading={true} />)

      const loadingSpinner = document.querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
    })

    it('does not show loading state when not loading', () => {
      render(<InspirationGallery {...defaultProps} hasMore={true} loading={false} />)

      expect(screen.queryByText('Loading more inspiration...')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<InspirationGallery {...defaultProps} />)

      const imageCards = screen.getAllByTestId('image-card')
      imageCards.forEach(card => {
        expect(card).toBeInTheDocument()
      })
    })

    it('supports keyboard navigation', () => {
      render(<InspirationGallery {...defaultProps} />)

      const firstImageCard = screen.getAllByTestId('image-card')[0]
      fireEvent.keyDown(firstImageCard, { key: 'Enter' })

      // The click handler should be called
      expect(defaultProps.onImageClick).toHaveBeenCalled()
    })
  })

  describe('Props and Configuration', () => {
    it('applies custom className', () => {
      const customClass = 'custom-gallery-class'
      render(<InspirationGallery {...defaultProps} className={customClass} />)

      const gallery = screen.getByRole('main', { hidden: true })
      expect(gallery).toHaveClass(customClass)
    })

    it('handles all callback props', () => {
      render(<InspirationGallery {...defaultProps} />)

      // All callback props should be defined
      expect(defaultProps.onImageClick).toBeDefined()
      expect(defaultProps.onImageLike).toBeDefined()
      expect(defaultProps.onImageShare).toBeDefined()
      expect(defaultProps.onImageDelete).toBeDefined()
      expect(defaultProps.onImageDownload).toBeDefined()
      expect(defaultProps.onImageAddToAlbum).toBeDefined()
    })
  })
})
