/**
 * Image cache utility using Cache API and data URLs
 */
export declare class ImageCache {
  private cacheName
  private maxAge
  private maxSize
  constructor(options?: { cacheName?: string; maxAge?: number; maxSize?: number })
  /**
   * Cache an image from URL
   */
  cacheImage(url: string): Promise<string>
  /**
   * Get cached image as data URL
   */
  getImageAsDataURL(url: string): Promise<string | null>
  /**
   * Cache image as data URL in localStorage
   */
  cacheImageAsDataURL(url: string): Promise<string | null>
  /**
   * Get cached image from localStorage
   */
  getCachedImage(url: string): string | null
  /**
   * Preload multiple images
   */
  preloadImages(urls: string[]): Promise<void>
  /**
   * Clear all cached images
   */
  clearCache(): Promise<void>
  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<{
    cacheApiSize: number
    localStorageSize: number
    totalEntries: number
  }>
  /**
   * Convert blob to data URL
   */
  private blobToDataURL
  /**
   * Simple hash function for URLs
   */
  private hashUrl
}
/**
 * React hook for image caching
 */
export declare function useImageCache(): {
  cacheImage: (url: string) => Promise<string>
  getCachedImage: (url: string) => string | null
  preloadImages: (urls: string[]) => Promise<void>
  clearCache: () => Promise<void>
  getStats: () => Promise<{
    cacheApiSize: number
    localStorageSize: number
    totalEntries: number
  }>
}
//# sourceMappingURL=imageCache.d.ts.map
