import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImageCache } from '../utils/imageCache.js'

// Mock fetch
global.fetch = vi.fn()

// Get the cache mock from setup.ts
const mockCache = (global as any).__cacheMock

// Mock FileReader for blob to data URL conversion
const mockFileReader = {
  onload: null as any,
  onerror: null as any,
  result: null as any,
  readAsDataURL: vi.fn().mockImplementation(function(this: any, blob: Blob) {
    // Simulate successful read
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-base64-data'
      if (this.onload) {
        this.onload({} as any)
      }
    }, 0)
  })
}

// Mock FileReader globally
global.FileReader = vi.fn().mockImplementation(() => mockFileReader) as any

describe('ImageCache', () => {
  let imageCache: ImageCache

  beforeEach(() => {
    imageCache = new ImageCache()
    vi.clearAllMocks()
    
    // Reset mock cache
    mockCache.match.mockReset()
    mockCache.put.mockReset()
    mockCache.delete.mockReset()
    mockCache.keys.mockReset()
    
    // Reset localStorage mocks
    vi.mocked(localStorage.getItem).mockReset()
    vi.mocked(localStorage.setItem).mockReset()
    vi.mocked(localStorage.removeItem).mockReset()
    
    // Reset fetch mock
    vi.mocked(global.fetch).mockReset()
  })

  describe('cacheImage', () => {
    it('should cache image using Cache API', async () => {
      const mockResponse = new Response('image-data', { status: 200 })
      const mockResponseClone = new Response('image-data', { status: 200 })
      
      // Mock the clone method
      mockResponse.clone = vi.fn().mockReturnValue(mockResponseClone)
      
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      mockCache.match.mockResolvedValue(null) // Not cached yet

      const result = await imageCache.cacheImage('https://example.com/image.jpg')
      
      expect(result).toBe('https://example.com/image.jpg')
      expect(window.caches.open).toHaveBeenCalledWith('image-cache')
      expect(mockCache.put).toHaveBeenCalledWith('https://example.com/image.jpg', mockResponseClone)
    })

    it('should return URL if image is already cached', async () => {
      const mockCachedResponse = new Response('cached-image-data', { status: 200 })
      mockCache.match.mockResolvedValue(mockCachedResponse)

      const result = await imageCache.cacheImage('https://example.com/image.jpg')
      
      expect(result).toBe('https://example.com/image.jpg')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))
      mockCache.match.mockResolvedValue(null)

      const result = await imageCache.cacheImage('https://example.com/image.jpg')
      
      expect(result).toBe('https://example.com/image.jpg') // Fallback to original URL
    })

    it('should handle non-OK responses', async () => {
      const mockResponse = new Response('Not Found', { status: 404 })
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      mockCache.match.mockResolvedValue(null)

      const result = await imageCache.cacheImage('https://example.com/image.jpg')
      
      expect(result).toBe('https://example.com/image.jpg') // Fallback to original URL
    })
  })

  describe('getImageAsDataURL', () => {
    it('should return data URL from cached image', async () => {
      const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' })
      const mockResponse = new Response(mockBlob, { status: 200 })
      mockCache.match.mockResolvedValue(mockResponse)

      // Reset FileReader mock for this test
      mockFileReader.result = null
      mockFileReader.onload = null

      const result = await imageCache.getImageAsDataURL('https://example.com/image.jpg')
      
      // Wait for the FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(result).toMatch(/^data:image\/jpeg;base64,/)
    })

    it('should return null if image is not cached', async () => {
      mockCache.match.mockResolvedValue(null)

      const result = await imageCache.getImageAsDataURL('https://example.com/image.jpg')
      
      expect(result).toBeNull()
    })
  })

  describe('cacheImageAsDataURL', () => {
    it('should cache image as data URL in localStorage', async () => {
      // Mock a proper Blob-like object
      const mockBlob = {
        size: 100,
        type: 'image/jpeg',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        text: vi.fn().mockResolvedValue('image-data'),
        stream: vi.fn(),
        slice: vi.fn(),
      } as any
      
      const mockResponse = new Response(mockBlob, { status: 200 })
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await imageCache.cacheImageAsDataURL('https://example.com/image.jpg')
      
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(result).toMatch(/^data:image\/jpeg;base64,/) // Should return data URL
      expect(localStorage.setItem).toHaveBeenCalled()
    })

    it('should return cached data URL if available and not expired', async () => {
      const mockEntry = {
        url: 'https://example.com/image.jpg',
        dataUrl: 'data:image/jpeg;base64,cached-data',
        timestamp: Date.now(),
        expiresAt: Date.now() + 1000, // Not expired
        size: 100,
      }
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockEntry))

      const result = await imageCache.cacheImageAsDataURL('https://example.com/image.jpg')
      
      expect(result).toBe('data:image/jpeg;base64,cached-data')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should fetch new image if cached entry is expired', async () => {
      const mockEntry = {
        url: 'https://example.com/image.jpg',
        dataUrl: 'data:image/jpeg;base64,expired-data',
        timestamp: Date.now() - 2000,
        expiresAt: Date.now() - 1000, // Expired
        size: 100,
      }
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockEntry))

      // Mock a proper Blob-like object
      const mockBlob = {
        size: 100,
        type: 'image/jpeg',
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        text: vi.fn().mockResolvedValue('new-image-data'),
        stream: vi.fn(),
        slice: vi.fn(),
      } as any
      
      const mockResponse = new Response(mockBlob, { status: 200 })
      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await imageCache.cacheImageAsDataURL('https://example.com/image.jpg')
      
      // Wait for FileReader to complete
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(result).toMatch(/^data:image\/jpeg;base64,/) // Should return new data URL
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg')
    })
  })

  describe('getCachedImage', () => {
    it('should return cached data URL if available and not expired', () => {
      const mockEntry = {
        url: 'https://example.com/image.jpg',
        dataUrl: 'data:image/jpeg;base64,cached-data',
        timestamp: Date.now(),
        expiresAt: Date.now() + 1000,
        size: 100,
      }
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockEntry))

      const result = imageCache.getCachedImage('https://example.com/image.jpg')
      
      expect(result).toBe('data:image/jpeg;base64,cached-data')
    })

    it('should return null if image is not cached', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null)

      const result = imageCache.getCachedImage('https://example.com/image.jpg')
      
      expect(result).toBeNull()
    })

    it('should return null and remove expired entry', () => {
      const mockEntry = {
        url: 'https://example.com/image.jpg',
        dataUrl: 'data:image/jpeg;base64,expired-data',
        timestamp: Date.now() - 2000,
        expiresAt: Date.now() - 1000, // Expired
        size: 100,
      }
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockEntry))

      const result = imageCache.getCachedImage('https://example.com/image.jpg')
      
      expect(result).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalled()
    })
  })

  describe('preloadImages', () => {
    it('should preload multiple images', async () => {
      const mockResponse = new Response('image-data', { status: 200 })
      const mockResponseClone = new Response('image-data', { status: 200 })
      mockResponse.clone = vi.fn().mockReturnValue(mockResponseClone)
      
      ;(global.fetch as any).mockResolvedValue(mockResponse)
      mockCache.match.mockResolvedValue(null) // Not cached yet

      await imageCache.preloadImages([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ])
      
      // Each image should trigger a cache.put call
      expect(mockCache.put).toHaveBeenCalledTimes(2)
      expect(mockCache.put).toHaveBeenCalledWith('https://example.com/image1.jpg', mockResponseClone)
      expect(mockCache.put).toHaveBeenCalledWith('https://example.com/image2.jpg', mockResponseClone)
    })
  })

  describe('clearCache', () => {
    it('should clear both Cache API and localStorage', async () => {
      // Mock Object.keys for localStorage
      const originalKeys = Object.keys
      Object.keys = vi.fn().mockReturnValue(['image_cache_abc123', 'other_key'])

      await imageCache.clearCache()
      
      expect(window.caches.delete).toHaveBeenCalledWith('image-cache')
      expect(localStorage.removeItem).toHaveBeenCalledWith('image_cache_abc123')
      
      // Restore original
      Object.keys = originalKeys
    })
  })

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      mockCache.keys.mockResolvedValue(['url1', 'url2'])
      
      // Mock Object.keys for localStorage
      const originalKeys = Object.keys
      Object.keys = vi.fn().mockReturnValue(['image_cache_abc123'])

      const stats = await imageCache.getCacheStats()
      
      expect(stats.cacheApiSize).toBe(2)
      expect(stats.localStorageSize).toBe(1)
      expect(stats.totalEntries).toBe(3)
      
      // Restore original
      Object.keys = originalKeys
    })
  })
}) 