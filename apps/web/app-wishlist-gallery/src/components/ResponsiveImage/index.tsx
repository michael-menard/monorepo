/**
 * ResponsiveImage Component
 *
 * Displays optimized images using picture element with WebP and JPEG fallback.
 * Supports different size variants (thumbnail, medium, large) for responsive display.
 *
 * Story: WISH-2016 - Image Optimization
 *
 * AC8: Frontend responsive image display (gallery card)
 * AC9: Frontend optimized image display (detail page)
 * AC10: Fallback for legacy items (no image_variants)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ImageVariants } from '@repo/api-client/schemas/wishlist'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Available image sizes for responsive display
 */
export const ImageSizeSchema = z.enum(['thumbnail', 'medium', 'large'])
export type ImageSizeType = z.infer<typeof ImageSizeSchema>

/**
 * Props schema for ResponsiveImage component
 */
export const ResponsiveImagePropsSchema = z.object({
  /** Image variants from API response (WISH-2016) */
  variants: z.custom<ImageVariants | null | undefined>(),
  /** Fallback URL for legacy items without variants */
  fallbackUrl: z.string().url().nullable().optional(),
  /** Alt text for accessibility */
  alt: z.string(),
  /** Which size variant to display */
  size: ImageSizeSchema.default('medium'),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Loading strategy */
  loading: z.enum(['lazy', 'eager']).default('lazy'),
  /** Optional aspect ratio class (e.g., 'aspect-4/3') */
  aspectRatio: z.string().optional(),
})

export type ResponsiveImageProps = z.infer<typeof ResponsiveImagePropsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ResponsiveImage Component
 *
 * Renders optimized images using picture element for WebP with JPEG fallback.
 * Gracefully falls back to original image URL for legacy items.
 *
 * @example
 * ```tsx
 * <ResponsiveImage
 *   variants={item.imageVariants}
 *   fallbackUrl={item.imageUrl}
 *   alt={item.title}
 *   size="thumbnail"
 *   loading="lazy"
 * />
 * ```
 */
export function ResponsiveImage({
  variants,
  fallbackUrl,
  alt,
  size = 'medium',
  className = '',
  loading = 'lazy',
  aspectRatio,
}: ResponsiveImageProps) {
  // Get variant data for requested size
  const variantData = variants?.[size]
  const webpUrl = variantData?.url
  const jpegUrl = variants?.original?.url || fallbackUrl

  // Build container classes
  const containerClasses = [className, aspectRatio].filter(Boolean).join(' ')

  // AC10: Fallback for legacy items without image_variants
  if (!variants && fallbackUrl) {
    // Warning in development only
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Image variants not available, using fallback URL')
    }
    return (
      <img
        src={fallbackUrl}
        alt={alt}
        className={containerClasses}
        loading={loading}
        data-testid="responsive-image-fallback"
      />
    )
  }

  // No image available - show placeholder
  if (!webpUrl && !jpegUrl) {
    return (
      <img
        src="/images/placeholder-lego.png"
        alt={alt}
        className={containerClasses}
        loading={loading}
        data-testid="responsive-image-placeholder"
      />
    )
  }

  // Processing not complete - show original or placeholder
  if (variants?.processingStatus === 'pending' || variants?.processingStatus === 'processing') {
    const pendingUrl = jpegUrl || '/images/placeholder-lego.png'
    return (
      <div className={`relative ${containerClasses}`}>
        <img
          src={pendingUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading={loading}
          data-testid="responsive-image-processing"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">Optimizing...</span>
        </div>
      </div>
    )
  }

  // Processing failed - show original
  if (variants?.processingStatus === 'failed') {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Image optimization failed', { error: variants.error })
    }
    return (
      <img
        src={jpegUrl || '/images/placeholder-lego.png'}
        alt={alt}
        className={containerClasses}
        loading={loading}
        data-testid="responsive-image-failed"
      />
    )
  }

  // AC8, AC9: Use picture element for WebP with JPEG fallback
  return (
    <picture data-testid="responsive-image-picture">
      {webpUrl ? <source type="image/webp" srcSet={webpUrl} /> : null}
      <img
        src={jpegUrl || webpUrl || '/images/placeholder-lego.png'}
        alt={alt}
        className={containerClasses}
        loading={loading}
        width={variantData?.width}
        height={variantData?.height}
        data-testid="responsive-image"
      />
    </picture>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the best available image URL from variants
 *
 * @param variants - Image variants object
 * @param preferredSize - Preferred size to use
 * @param fallbackUrl - Fallback URL if no variants available
 * @returns Best available image URL
 */
export function getBestImageUrl(
  variants: ImageVariants | null | undefined,
  preferredSize: ImageSizeType = 'medium',
  fallbackUrl?: string | null,
): string {
  // Try preferred size first
  if (variants?.[preferredSize]?.url) {
    return variants[preferredSize]!.url
  }

  // Fall back to other sizes in order of preference
  const fallbackOrder: ImageSizeType[] =
    preferredSize === 'thumbnail'
      ? ['medium', 'large']
      : preferredSize === 'medium'
        ? ['thumbnail', 'large']
        : ['medium', 'thumbnail']

  for (const size of fallbackOrder) {
    if (variants?.[size]?.url) {
      return variants[size]!.url
    }
  }

  // Fall back to original
  if (variants?.original?.url) {
    return variants.original.url
  }

  // Final fallback
  return fallbackUrl || '/images/placeholder-lego.png'
}

/**
 * Check if image variants are ready to use
 */
export function areVariantsReady(variants: ImageVariants | null | undefined): boolean {
  if (!variants) return false
  return variants.processingStatus === 'completed'
}
