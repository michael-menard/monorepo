import React, { useEffect, useRef, useState } from 'react'

// Fallback responsive breakpoints if shared-image-utils is not available
const RESPONSIVE_BREAKPOINTS = {
  mobile: { width: 480 },
  tablet: { width: 768 },
  desktop: { width: 1024 },
  large: { width: 1200 }
}

// Fallback preset configurations
const getPreset = (preset: string) => {
  const presets = {
    avatar: { maxWidth: 200, quality: 90, format: 'webp' },
    thumbnail: { maxWidth: 400, quality: 85, format: 'webp' },
    gallery: { maxWidth: 800, quality: 80, format: 'webp' },
    hero: { maxWidth: 1200, quality: 85, format: 'webp' },
    background: { maxWidth: 1600, quality: 75, format: 'webp' }
  }
  return presets[preset as keyof typeof presets] || presets.gallery
}

// Fallback createResponsiveVariants function
const createResponsiveVariants = (baseConfig: any, breakpoints: Array<any>) => {
  return breakpoints.map(breakpoint => ({
    config: {
      ...baseConfig,
      maxWidth: breakpoint.width
    }
  }))
}

interface OptimizedImageProps {
  src: string
  alt: string
  className?: string
  preset?: 'avatar' | 'thumbnail' | 'gallery' | 'hero' | 'background'
  width?: number
  height?: number
  lazy?: boolean
  priority?: boolean
  sizes?: string
  onLoad?: () => void
  onError?: (error: string) => void
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

// Generate srcset for responsive images  
const generateSrcSet = (src: string, preset: string) => {
  const baseConfig = getPreset(preset)
  const variants = createResponsiveVariants(baseConfig, Object.values(RESPONSIVE_BREAKPOINTS))
  
  return variants.map((variant: any) => {
    // In a real implementation, these would be pre-generated URLs
    // For now, we'll use query parameters to indicate the desired size
    const url = `${src}?w=${variant.config.maxWidth}&q=${variant.config.quality}`
    return `${url} ${variant.config.maxWidth}w`
  }).join(', ')
}

// Generate sizes attribute based on breakpoints
const generateSizes = (customSizes?: string) => {
  if (customSizes) return customSizes
  
  return [
    `(max-width: ${RESPONSIVE_BREAKPOINTS.mobile.width}px) ${RESPONSIVE_BREAKPOINTS.mobile.width}px`,
    `(max-width: ${RESPONSIVE_BREAKPOINTS.tablet.width}px) ${RESPONSIVE_BREAKPOINTS.tablet.width}px`,
    `(max-width: ${RESPONSIVE_BREAKPOINTS.desktop.width}px) ${RESPONSIVE_BREAKPOINTS.desktop.width}px`,
    `${RESPONSIVE_BREAKPOINTS.large.width}px`
  ].join(', ')
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  preset = 'gallery',
  width,
  height,
  lazy = true,
  priority = false,
  sizes: customSizes,
  onLoad,
  onError,
  placeholder = 'empty',
  blurDataURL
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [isInView, setIsInView] = useState(!lazy || priority)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before the image comes into view
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, priority, isInView])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = (_e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsError(true)
    const errorMessage = `Failed to load image: ${src}`
    console.error(errorMessage)
    onError?.(errorMessage)
  }

  const baseConfig = getPreset(preset)
  const srcSet = generateSrcSet(src, preset)
  const sizesAttr = generateSizes(customSizes)

  // Optimized src with query parameters
  const optimizedSrc = `${src}?w=${baseConfig.maxWidth}&q=${baseConfig.quality}&f=${baseConfig.format}`

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {placeholder === 'blur' && blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110"
              aria-hidden="true"
            />
          ) : (
            <div className="animate-pulse bg-gray-200 w-full h-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-500">
            <svg 
              className="w-8 h-8 mx-auto mb-2 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizesAttr}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      )}
    </div>
  )
}

// Gallery-specific image component with preset configurations
export const GalleryImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  <OptimizedImage {...props} preset="gallery" />
)

// Thumbnail image component
export const ThumbnailImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  <OptimizedImage {...props} preset="thumbnail" />
)

// Hero image component with priority loading
export const HeroImage: React.FC<Omit<OptimizedImageProps, 'preset' | 'priority'>> = (props) => (
  <OptimizedImage {...props} preset="hero" priority={true} />
)

// Avatar image component
export const AvatarImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  <OptimizedImage {...props} preset="avatar" />
)
