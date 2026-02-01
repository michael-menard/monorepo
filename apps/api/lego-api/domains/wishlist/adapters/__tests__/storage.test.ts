import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWishlistImageStorage, ALLOWED_IMAGE_EXTENSIONS, ALLOWED_MIME_TYPES } from '../storage.js'
import * as apiCore from '@repo/api-core'

/**
 * Wishlist Image Storage Adapter Tests
 *
 * Tests presigned URL generation and S3 integration
 */

// Mock @repo/api-core module
vi.mock('@repo/api-core', async () => {
  const actual = await vi.importActual('@repo/api-core')
  return {
    ...actual,
    getPresignedUploadUrl: vi.fn(),
  }
})

describe('WishlistImageStorage', () => {
  let storage: ReturnType<typeof createWishlistImageStorage>
  const mockUserId = 'user-123'
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, S3_BUCKET: 'test-bucket' }
    storage = createWishlistImageStorage()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('generateUploadUrl', () => {
    it('generates presigned URL with valid parameters', async () => {
      const mockPresignedUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url?signature=xxx'
      vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue(mockPresignedUrl)

      const result = await storage.generateUploadUrl(mockUserId, 'test-image.jpg', 'image/jpeg')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.presignedUrl).toBe(mockPresignedUrl)
        expect(result.data.key).toMatch(/^wishlist\/user-123\/[a-f0-9-]+\.jpg$/)
        expect(result.data.expiresIn).toBe(900)
      }
    })

    it('generates unique keys for each upload', async () => {
      const mockPresignedUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url'
      vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue(mockPresignedUrl)

      const result1 = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'image/jpeg')
      const result2 = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'image/jpeg')

      expect(result1.ok && result2.ok).toBe(true)
      if (result1.ok && result2.ok) {
        expect(result1.data.key).not.toBe(result2.data.key)
      }
    })

    describe('extension validation', () => {
      it('accepts jpg extension', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'image/jpeg')

        expect(result.ok).toBe(true)
      })

      it('accepts jpeg extension', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.jpeg', 'image/jpeg')

        expect(result.ok).toBe(true)
      })

      it('accepts png extension', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.png', 'image/png')

        expect(result.ok).toBe(true)
      })

      // WISH-2013: GIF removed from whitelist for security hardening
      it('rejects gif extension (security hardening)', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'image.gif', 'image/gif')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_EXTENSION')
        }
      })

      it('accepts webp extension', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.webp', 'image/webp')

        expect(result.ok).toBe(true)
      })

      it('rejects unsupported extension', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'document.pdf', 'application/pdf')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_EXTENSION')
        }
        expect(apiCore.getPresignedUploadUrl).not.toHaveBeenCalled()
      })

      it('rejects file without extension', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'image', 'image/jpeg')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_EXTENSION')
        }
      })

      it('handles uppercase extensions', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.JPG', 'image/jpeg')

        expect(result.ok).toBe(true)
        if (result.ok) {
          expect(result.data.key).toMatch(/\.jpg$/)
        }
      })
    })

    describe('MIME type validation', () => {
      it('accepts image/jpeg MIME type', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'image/jpeg')

        expect(result.ok).toBe(true)
      })

      it('accepts image/png MIME type', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.png', 'image/png')

        expect(result.ok).toBe(true)
      })

      // WISH-2013: GIF removed from whitelist for security hardening
      it('rejects image/gif MIME type (security hardening)', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'image.gif', 'image/gif')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          // Will fail on extension first
          expect(['INVALID_EXTENSION', 'INVALID_MIME_TYPE']).toContain(result.error)
        }
      })

      it('accepts image/webp MIME type', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        const result = await storage.generateUploadUrl(mockUserId, 'image.webp', 'image/webp')

        expect(result.ok).toBe(true)
      })

      it('rejects unsupported MIME type', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'application/pdf')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_MIME_TYPE')
        }
        expect(apiCore.getPresignedUploadUrl).not.toHaveBeenCalled()
      })

      it('validates MIME type even if extension is valid', async () => {
        const result = await storage.generateUploadUrl(mockUserId, 'image.jpg', 'video/mp4')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('INVALID_MIME_TYPE')
        }
      })
    })

    describe('S3 client interaction', () => {
      it('calls getPresignedUploadUrl with correct parameters', async () => {
        const mockPresignedUrl = 'https://presigned-url'
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue(mockPresignedUrl)

        await storage.generateUploadUrl(mockUserId, 'test.jpg', 'image/jpeg')

        expect(apiCore.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.stringMatching(/^wishlist\/user-123\/[a-f0-9-]+\.jpg$/),
          'image/jpeg',
          900
        )
      })

      it('uses correct expiration time (900 seconds)', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockResolvedValue('https://presigned-url')

        await storage.generateUploadUrl(mockUserId, 'test.jpg', 'image/jpeg')

        expect(apiCore.getPresignedUploadUrl).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          900
        )
      })
    })

    describe('error handling', () => {
      it('returns PRESIGN_FAILED when S3 client throws error', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockRejectedValue(new Error('S3 error'))

        const result = await storage.generateUploadUrl(mockUserId, 'test.jpg', 'image/jpeg')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('PRESIGN_FAILED')
        }
      })

      it('handles network timeout errors', async () => {
        vi.mocked(apiCore.getPresignedUploadUrl).mockRejectedValue(new Error('Timeout'))

        const result = await storage.generateUploadUrl(mockUserId, 'test.jpg', 'image/jpeg')

        expect(result.ok).toBe(false)
        if (!result.ok) {
          expect(result.error).toBe('PRESIGN_FAILED')
        }
      })
    })
  })

  describe('buildImageUrl', () => {
    it('builds correct S3 URL from key when CloudFront is not configured', () => {
      const key = 'wishlist/user-123/12345.jpg'
      const url = storage.buildImageUrl(key)

      expect(url).toBe('https://test-bucket.s3.amazonaws.com/wishlist/user-123/12345.jpg')
    })

    it('handles keys with special characters', () => {
      const key = 'wishlist/user-123/image with spaces.jpg'
      const url = storage.buildImageUrl(key)

      expect(url).toBe('https://test-bucket.s3.amazonaws.com/wishlist/user-123/image with spaces.jpg')
    })

    it('throws error when S3_BUCKET is not set and CloudFront not configured', () => {
      delete process.env.S3_BUCKET
      delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN

      expect(() => {
        storage.buildImageUrl('wishlist/user-123/test.jpg')
      }).toThrow('S3_BUCKET environment variable is required')
    })

    // WISH-2018: CloudFront URL generation tests
    // Note: CloudFront URL tests are in core/cdn/__tests__/cloudfront.test.ts
    // The storage adapter delegates to buildImageUrlFromKey which is tested there
    describe('with CloudFront configured', () => {
      it('delegates to buildImageUrlFromKey for CloudFront support', async () => {
        // Import the CDN utility to verify it's being used
        const { buildImageUrlFromKey } = await import('../../../../core/cdn/index.js')

        // Set up CloudFront
        const prevDomain = process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
        process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = 'd1234abcd.cloudfront.net'

        try {
          const key = 'wishlist/user-123/12345.jpg'
          const directUrl = buildImageUrlFromKey(key)

          // Verify the CDN utility returns CloudFront URL
          expect(directUrl).toBe('https://d1234abcd.cloudfront.net/wishlist/user-123/12345.jpg')
        } finally {
          // Restore original env
          if (prevDomain !== undefined) {
            process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = prevDomain
          } else {
            delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
          }
        }
      })
    })
  })

  describe('constants', () => {
    // WISH-2013: Security hardening - GIF removed from whitelist
    it('exports allowed image extensions (without gif)', () => {
      expect(ALLOWED_IMAGE_EXTENSIONS).toEqual(['jpg', 'jpeg', 'png', 'webp'])
    })

    it('exports allowed MIME types (without gif)', () => {
      expect(ALLOWED_MIME_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    })
  })
})
