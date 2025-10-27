import React, { useEffect, useState } from 'react'
import { useImageCache } from '../utils/imageCache.js'

interface CachedImageProps {
  src: string
  alt?: string
  className?: string
  fallback?: string
  preload?: boolean
  onLoad?: () => void
  onError?: () => void
  width?: number | string
  height?: number | string
  loading?: 'lazy' | 'eager'
}

/**
 * CachedImage component that automatically caches images and provides fallbacks
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt = '',
  className = '',
  fallback = '/placeholder-image.jpg',
  preload = false,
  onLoad,
  onError,
  width,
  height,
  loading = 'lazy',
}) => {
  const [imageSrc, setImageSrc] = useState<string>(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const { cacheImage, getCachedImage } = useImageCache()

  useEffect(() => {
    let isMounted = true

    const loadImage = async () => {
      try {
        setIsLoading(true)
        setHasError(false)

        // Check if image is already cached
        const cachedImage = getCachedImage(src)
        if (cachedImage) {
          if (isMounted) {
            setImageSrc(cachedImage)
            setIsLoading(false)
            onLoad?.()
          }
          return
        }

        // Cache the image
        const cachedUrl = await cacheImage(src)
        if (isMounted) {
          setImageSrc(cachedUrl)
          setIsLoading(false)
          onLoad?.()
        }
      } catch (error) {
        console.warn('Failed to load cached image:', error)
        if (isMounted) {
          setHasError(true)
          setImageSrc(fallback)
          setIsLoading(false)
          onError?.()
        }
      }
    }

    loadImage()

    return () => {
      isMounted = false
    }
  }, [src, fallback, onLoad, onError, cacheImage, getCachedImage])

  // Preload image if requested
  useEffect(() => {
    if (preload) {
      cacheImage(src).catch(console.warn)
    }
  }, [src, preload, cacheImage])

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoading ? 'opacity-50' : ''} ${hasError ? 'opacity-75' : ''}`}
      width={width}
      height={height}
      loading={loading}
      onError={() => {
        if (!hasError) {
          setHasError(true)
          setImageSrc(fallback)
          onError?.()
        }
      }}
    />
  )
}

/**
 * ImageGallery component for displaying multiple cached images
 */
interface ImageGalleryProps {
  images: Array<{
    src: string
    alt?: string
    id: string
  }>
  className?: string
  onImageLoad?: (id: string) => void
  onImageError?: (id: string) => void
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className = '',
  onImageLoad,
  onImageError,
}) => {
  const { preloadImages } = useImageCache()

  // Preload all images when component mounts
  useEffect(() => {
    const imageUrls = images.map(img => img.src)
    preloadImages(imageUrls).catch(console.warn)
  }, [images, preloadImages])

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {images.map(image => (
        <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg">
          <CachedImage
            src={image.src}
            alt={image.alt || ''}
            className="w-full h-full object-cover"
            onLoad={() => onImageLoad?.(image.id)}
            onError={() => onImageError?.(image.id)}
            preload={false} // Already preloaded in parent
          />
        </div>
      ))}
    </div>
  )
}

/**
 * CacheStatus component for displaying cache statistics
 */
export const CacheStatus: React.FC = () => {
  const [stats, setStats] = useState<{
    cacheApiSize: number
    localStorageSize: number
    totalEntries: number
  } | null>(null)
  const { getStats, clearCache } = useImageCache()

  useEffect(() => {
    const loadStats = async () => {
      const cacheStats = await getStats()
      setStats(cacheStats)
    }
    loadStats()
  }, [getStats])

  const handleClearCache = async () => {
    await clearCache()
    const newStats = await getStats()
    setStats(newStats)
  }

  if (!stats) {
    return <div>Loading cache statistics...</div>
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Image Cache Status</h3>
      <div className="space-y-1 text-sm">
        <div>Cache API entries: {stats.cacheApiSize}</div>
        <div>localStorage entries: {stats.localStorageSize}</div>
        <div>Total entries: {stats.totalEntries}</div>
      </div>
      <button
        onClick={handleClearCache}
        className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
      >
        Clear Cache
      </button>
    </div>
  )
}
