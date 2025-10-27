import type { ImageCacheEntry } from '../schemas/cache.js'

/**
 * Image cache utility using Cache API and data URLs
 */
export class ImageCache {
  private cacheName = 'image-cache'
  private maxAge = 24 * 60 * 60 * 1000 // 24 hours default
  private maxSize = 50 * 1024 * 1024 // 50MB default

  constructor(
    options: {
      cacheName?: string
      maxAge?: number
      maxSize?: number
    } = {},
  ) {
    this.cacheName = options.cacheName || this.cacheName
    this.maxAge = options.maxAge || this.maxAge
    this.maxSize = options.maxSize || this.maxSize
  }

  /**
   * Cache an image from URL
   */
  async cacheImage(url: string): Promise<string> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return url // Fallback to original URL
    }

    try {
      const cache = await caches.open(this.cacheName)

      // Check if already cached
      const cachedResponse = await cache.match(url)
      if (cachedResponse) {
        return url
      }

      // Fetch and cache the image
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      // Clone the response before caching
      const responseToCache = response.clone()
      await cache.put(url, responseToCache)

      return url
    } catch (error) {
      console.warn('Failed to cache image:', error)
      return url // Fallback to original URL
    }
  }

  /**
   * Get cached image as data URL
   */
  async getImageAsDataURL(url: string): Promise<string | null> {
    if (typeof window === 'undefined' || !('caches' in window)) {
      return null
    }

    try {
      const cache = await caches.open(this.cacheName)
      const response = await cache.match(url)

      if (!response) {
        return null
      }

      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.warn('Failed to get cached image as data URL:', error)
      return null
    }
  }

  /**
   * Cache image as data URL in localStorage
   */
  async cacheImageAsDataURL(url: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      // Check if already cached in localStorage
      const cached = localStorage.getItem(`image_cache_${this.hashUrl(url)}`)
      if (cached) {
        const entry: ImageCacheEntry = JSON.parse(cached)
        if (entry.expiresAt && Date.now() < entry.expiresAt) {
          return entry.dataUrl
        }
      }

      // Fetch the image
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()
      const dataUrl = await this.blobToDataURL(blob)

      // Create cache entry
      const entry: ImageCacheEntry = {
        url,
        dataUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.maxAge,
        size: blob.size,
      }

      // Store in localStorage
      localStorage.setItem(`image_cache_${this.hashUrl(url)}`, JSON.stringify(entry))

      return dataUrl
    } catch (error) {
      console.warn('Failed to cache image as data URL:', error)
      return null
    }
  }

  /**
   * Get cached image from localStorage
   */
  getCachedImage(url: string): string | null {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const cached = localStorage.getItem(`image_cache_${this.hashUrl(url)}`)
      if (!cached) return null

      const entry: ImageCacheEntry = JSON.parse(cached)

      // Check if expired
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        localStorage.removeItem(`image_cache_${this.hashUrl(url)}`)
        return null
      }

      return entry.dataUrl
    } catch (error) {
      console.warn('Failed to get cached image:', error)
      return null
    }
  }

  /**
   * Preload multiple images
   */
  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.cacheImage(url))
    await Promise.allSettled(promises)
  }

  /**
   * Clear all cached images
   */
  async clearCache(): Promise<void> {
    if (typeof window === 'undefined') return

    // Clear Cache API
    if ('caches' in window) {
      try {
        await caches.delete(this.cacheName)
      } catch (error) {
        console.warn('Failed to clear Cache API:', error)
      }
    }

    // Clear localStorage
    const keys = Object.keys(localStorage)
    const imageKeys = keys.filter(key => key.startsWith('image_cache_'))
    imageKeys.forEach(key => localStorage.removeItem(key))
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    cacheApiSize: number
    localStorageSize: number
    totalEntries: number
  }> {
    if (typeof window === 'undefined') {
      return { cacheApiSize: 0, localStorageSize: 0, totalEntries: 0 }
    }

    let cacheApiSize = 0
    let localStorageSize = 0
    let totalEntries = 0

    // Count Cache API entries
    if ('caches' in window) {
      try {
        const cache = await caches.open(this.cacheName)
        const keys = await cache.keys()
        cacheApiSize = keys.length
      } catch (error) {
        console.warn('Failed to get Cache API stats:', error)
      }
    }

    // Count localStorage entries
    const keys = Object.keys(localStorage)
    const imageKeys = keys.filter(key => key.startsWith('image_cache_'))
    localStorageSize = imageKeys.length

    totalEntries = cacheApiSize + localStorageSize

    return { cacheApiSize, localStorageSize, totalEntries }
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Simple hash function for URLs
   */
  private hashUrl(url: string): string {
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
}

/**
 * React hook for image caching
 */
export function useImageCache() {
  const imageCache = new ImageCache()

  const cacheImage = async (url: string) => {
    return imageCache.cacheImage(url)
  }

  const getCachedImage = (url: string) => {
    return imageCache.getCachedImage(url)
  }

  const preloadImages = async (urls: string[]) => {
    return imageCache.preloadImages(urls)
  }

  const clearCache = async () => {
    return imageCache.clearCache()
  }

  const getStats = async () => {
    return imageCache.getCacheStats()
  }

  return {
    cacheImage,
    getCachedImage,
    preloadImages,
    clearCache,
    getStats,
  }
}
