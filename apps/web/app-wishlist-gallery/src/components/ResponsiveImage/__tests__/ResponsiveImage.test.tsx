/**
 * ResponsiveImage Component Tests
 *
 * Tests for responsive image display with WebP/JPEG fallback.
 *
 * Story: WISH-2016 - Image Optimization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  ResponsiveImage,
  getBestImageUrl,
  areVariantsReady,
} from '../index.js'
import type { ImageVariants } from '@repo/api-client/schemas/wishlist'

// Mock console.warn for testing legacy item warnings
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('ResponsiveImage', () => {
  beforeEach(() => {
    consoleWarnSpy.mockClear()
  })

  const mockVariants: ImageVariants = {
    original: {
      url: 'https://bucket.s3.amazonaws.com/original.jpg',
      width: 4032,
      height: 3024,
      sizeBytes: 10485760,
      format: 'jpeg',
    },
    thumbnail: {
      url: 'https://bucket.s3.amazonaws.com/thumbnail.webp',
      width: 200,
      height: 150,
      sizeBytes: 18432,
      format: 'webp',
    },
    medium: {
      url: 'https://bucket.s3.amazonaws.com/medium.webp',
      width: 800,
      height: 600,
      sizeBytes: 102400,
      format: 'webp',
    },
    large: {
      url: 'https://bucket.s3.amazonaws.com/large.webp',
      width: 1600,
      height: 1200,
      sizeBytes: 307200,
      format: 'webp',
      watermarked: true,
    },
    processingStatus: 'completed',
    processedAt: '2026-01-31T12:00:00Z',
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Basic Rendering Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Basic Rendering', () => {
    it('should render picture element with WebP source', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const picture = screen.getByTestId('responsive-image-picture')
      expect(picture).toBeInTheDocument()

      const source = picture.querySelector('source[type="image/webp"]')
      expect(source).toBeInTheDocument()
      expect(source).toHaveAttribute('srcset', mockVariants.thumbnail?.url)
    })

    it('should render img with correct alt text', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="LEGO Technic Bugatti"
          size="medium"
          loading="lazy"
        />,
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('alt', 'LEGO Technic Bugatti')
    })

    it('should apply lazy loading by default', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('loading', 'lazy')
    })

    it('should apply eager loading when specified', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="large"
          loading="eager"
        />,
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('loading', 'eager')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Size Variant Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Size Variants', () => {
    it('should use thumbnail variant for thumbnail size', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const source = screen.getByTestId('responsive-image-picture').querySelector('source')
      expect(source).toHaveAttribute('srcset', mockVariants.thumbnail?.url)
    })

    it('should use medium variant for medium size', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="medium"
          loading="lazy"
        />,
      )

      const source = screen.getByTestId('responsive-image-picture').querySelector('source')
      expect(source).toHaveAttribute('srcset', mockVariants.medium?.url)
    })

    it('should use large variant for large size', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="large"
          loading="lazy"
        />,
      )

      const source = screen.getByTestId('responsive-image-picture').querySelector('source')
      expect(source).toHaveAttribute('srcset', mockVariants.large?.url)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Fallback Tests (AC10)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Fallback for Legacy Items (AC10)', () => {
    it('should fall back to original URL for legacy items', () => {
      render(
        <ResponsiveImage
          variants={null}
          fallbackUrl="https://example.com/legacy-image.jpg"
          alt="Legacy item"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const img = screen.getByTestId('responsive-image-fallback')
      expect(img).toHaveAttribute('src', 'https://example.com/legacy-image.jpg')
    })

    it('should show placeholder when no image available', () => {
      render(
        <ResponsiveImage
          variants={null}
          fallbackUrl={null}
          alt="No image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const img = screen.getByTestId('responsive-image-placeholder')
      expect(img).toHaveAttribute('src', '/images/placeholder-lego.png')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Processing Status Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Processing Status', () => {
    it('should show processing indicator when status is pending', () => {
      const pendingVariants: ImageVariants = {
        ...mockVariants,
        processingStatus: 'pending',
      }

      render(
        <ResponsiveImage
          variants={pendingVariants}
          fallbackUrl="https://example.com/original.jpg"
          alt="Processing image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const processingImg = screen.getByTestId('responsive-image-processing')
      expect(processingImg).toBeInTheDocument()
      expect(screen.getByText('Optimizing...')).toBeInTheDocument()
    })

    it('should show original image when processing failed', () => {
      const failedVariants: ImageVariants = {
        ...mockVariants,
        processingStatus: 'failed',
        error: 'Sharp processing error',
      }

      render(
        <ResponsiveImage
          variants={failedVariants}
          fallbackUrl="https://example.com/original.jpg"
          alt="Failed image"
          size="thumbnail"
          loading="lazy"
        />,
      )

      const img = screen.getByTestId('responsive-image-failed')
      expect(img).toBeInTheDocument()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // CSS Class Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('CSS Classes', () => {
    it('should apply custom className', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="thumbnail"
          loading="lazy"
          className="custom-class"
        />,
      )

      const img = screen.getByRole('img')
      expect(img).toHaveClass('custom-class')
    })

    it('should apply aspect ratio class', () => {
      render(
        <ResponsiveImage
          variants={mockVariants}
          fallbackUrl={null}
          alt="Test image"
          size="thumbnail"
          loading="lazy"
          aspectRatio="aspect-4/3"
        />,
      )

      const img = screen.getByRole('img')
      expect(img).toHaveClass('aspect-4/3')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Utility Function Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('getBestImageUrl', () => {
  const mockVariants: ImageVariants = {
    original: {
      url: 'https://bucket.s3.amazonaws.com/original.jpg',
      width: 4032,
      height: 3024,
      sizeBytes: 10485760,
      format: 'jpeg',
    },
    thumbnail: {
      url: 'https://bucket.s3.amazonaws.com/thumbnail.webp',
      width: 200,
      height: 150,
      sizeBytes: 18432,
      format: 'webp',
    },
    medium: {
      url: 'https://bucket.s3.amazonaws.com/medium.webp',
      width: 800,
      height: 600,
      sizeBytes: 102400,
      format: 'webp',
    },
    processingStatus: 'completed',
  }

  it('should return preferred size URL when available', () => {
    expect(getBestImageUrl(mockVariants, 'thumbnail')).toBe(mockVariants.thumbnail?.url)
    expect(getBestImageUrl(mockVariants, 'medium')).toBe(mockVariants.medium?.url)
  })

  it('should fall back to other sizes when preferred not available', () => {
    const partialVariants: ImageVariants = {
      medium: mockVariants.medium,
      processingStatus: 'completed',
    }

    expect(getBestImageUrl(partialVariants, 'thumbnail')).toBe(mockVariants.medium?.url)
  })

  it('should return fallback URL when no variants available', () => {
    expect(getBestImageUrl(null, 'thumbnail', 'https://fallback.com/image.jpg')).toBe(
      'https://fallback.com/image.jpg',
    )
  })

  it('should return placeholder when no variants and no fallback', () => {
    expect(getBestImageUrl(null, 'thumbnail')).toBe('/images/placeholder-lego.png')
  })
})

describe('areVariantsReady', () => {
  it('should return true when processing is completed', () => {
    expect(areVariantsReady({ processingStatus: 'completed' })).toBe(true)
  })

  it('should return false when processing is pending', () => {
    expect(areVariantsReady({ processingStatus: 'pending' })).toBe(false)
  })

  it('should return false when variants is null', () => {
    expect(areVariantsReady(null)).toBe(false)
  })

  it('should return false when variants is undefined', () => {
    expect(areVariantsReady(undefined)).toBe(false)
  })
})
