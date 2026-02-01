/**
 * CloudFront URL Utilities Tests
 *
 * WISH-2018: CDN Integration for Image Performance Optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getCloudFrontDomain,
  isCloudFrontEnabled,
  s3KeyToCloudFrontUrl,
  isS3Url,
  isCloudFrontUrl,
  extractS3KeyFromUrl,
  s3UrlToCloudFrontUrl,
  toCloudFrontUrl,
  buildImageUrlFromKey,
} from '../cloudfront.js'

describe('CloudFront URL Utilities', () => {
  const MOCK_CLOUDFRONT_DOMAIN = 'd1234abcd.cloudfront.net'
  const MOCK_S3_BUCKET = 'lego-moc-wishlist-uploads'

  beforeEach(() => {
    // Clear environment
    delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
    delete process.env.S3_BUCKET
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getCloudFrontDomain
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCloudFrontDomain', () => {
    it('returns domain when configured', () => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
      expect(getCloudFrontDomain()).toBe(MOCK_CLOUDFRONT_DOMAIN)
    })

    it('returns null when not configured', () => {
      expect(getCloudFrontDomain()).toBeNull()
    })

    it('returns null for empty string', () => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = ''
      expect(getCloudFrontDomain()).toBeNull()
    })

    it('trims whitespace from domain', () => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = '  d1234abcd.cloudfront.net  '
      expect(getCloudFrontDomain()).toBe('d1234abcd.cloudfront.net')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // isCloudFrontEnabled
  // ─────────────────────────────────────────────────────────────────────────

  describe('isCloudFrontEnabled', () => {
    it('returns true when CloudFront is configured', () => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
      expect(isCloudFrontEnabled()).toBe(true)
    })

    it('returns false when CloudFront is not configured', () => {
      expect(isCloudFrontEnabled()).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // s3KeyToCloudFrontUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('s3KeyToCloudFrontUrl', () => {
    beforeEach(() => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
    })

    it('converts S3 key to CloudFront URL', () => {
      const key = 'wishlist/user-123/abc123.jpg'
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc123.jpg`
      expect(s3KeyToCloudFrontUrl(key)).toBe(expected)
    })

    it('handles key with leading slash', () => {
      const key = '/wishlist/user-123/abc123.jpg'
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc123.jpg`
      expect(s3KeyToCloudFrontUrl(key)).toBe(expected)
    })

    it('handles deeply nested paths', () => {
      const key = 'uploads/wishlist/user-123/2026/01/abc123.jpg'
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/uploads/wishlist/user-123/2026/01/abc123.jpg`
      expect(s3KeyToCloudFrontUrl(key)).toBe(expected)
    })

    it('returns null when CloudFront is not configured', () => {
      delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
      expect(s3KeyToCloudFrontUrl('wishlist/user-123/abc.jpg')).toBeNull()
    })

    it('handles keys with special characters', () => {
      const key = 'wishlist/user-123/my%20image.jpg'
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/my%20image.jpg`
      expect(s3KeyToCloudFrontUrl(key)).toBe(expected)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // isS3Url
  // ─────────────────────────────────────────────────────────────────────────

  describe('isS3Url', () => {
    beforeEach(() => {
      process.env.S3_BUCKET = MOCK_S3_BUCKET
    })

    it('returns true for standard S3 URL', () => {
      const url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(isS3Url(url)).toBe(true)
    })

    it('returns true for regional S3 URL', () => {
      const url = `https://${MOCK_S3_BUCKET}.s3.us-east-1.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(isS3Url(url)).toBe(true)
    })

    it('returns false for CloudFront URL', () => {
      const url = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(isS3Url(url)).toBe(false)
    })

    it('returns false for other URLs', () => {
      expect(isS3Url('https://example.com/image.jpg')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isS3Url('')).toBe(false)
    })

    it('returns false when S3_BUCKET not configured', () => {
      delete process.env.S3_BUCKET
      expect(isS3Url(`https://some-bucket.s3.amazonaws.com/key`)).toBe(false)
    })

    it('returns false for different bucket', () => {
      const url = 'https://other-bucket.s3.amazonaws.com/key'
      expect(isS3Url(url)).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // isCloudFrontUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('isCloudFrontUrl', () => {
    it('returns true for CloudFront URL', () => {
      const url = 'https://d1234abcd.cloudfront.net/wishlist/user-123/abc.jpg'
      expect(isCloudFrontUrl(url)).toBe(true)
    })

    it('returns false for S3 URL', () => {
      const url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(isCloudFrontUrl(url)).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isCloudFrontUrl('')).toBe(false)
    })

    it('returns false for other URLs', () => {
      expect(isCloudFrontUrl('https://example.com/image.jpg')).toBe(false)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // extractS3KeyFromUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractS3KeyFromUrl', () => {
    beforeEach(() => {
      process.env.S3_BUCKET = MOCK_S3_BUCKET
    })

    it('extracts key from standard S3 URL', () => {
      const url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(extractS3KeyFromUrl(url)).toBe('wishlist/user-123/abc.jpg')
    })

    it('extracts key from regional S3 URL', () => {
      const url = `https://${MOCK_S3_BUCKET}.s3.us-east-1.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(extractS3KeyFromUrl(url)).toBe('wishlist/user-123/abc.jpg')
    })

    it('returns null for non-S3 URL', () => {
      expect(extractS3KeyFromUrl('https://example.com/image.jpg')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(extractS3KeyFromUrl('')).toBeNull()
    })

    it('returns null when S3_BUCKET not configured', () => {
      delete process.env.S3_BUCKET
      expect(extractS3KeyFromUrl(`https://bucket.s3.amazonaws.com/key`)).toBeNull()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // s3UrlToCloudFrontUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('s3UrlToCloudFrontUrl', () => {
    beforeEach(() => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
      process.env.S3_BUCKET = MOCK_S3_BUCKET
    })

    it('converts standard S3 URL to CloudFront URL', () => {
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(s3UrlToCloudFrontUrl(s3Url)).toBe(expected)
    })

    it('converts regional S3 URL to CloudFront URL', () => {
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.us-east-1.amazonaws.com/wishlist/user-123/abc.jpg`
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(s3UrlToCloudFrontUrl(s3Url)).toBe(expected)
    })

    it('returns null when CloudFront not configured', () => {
      delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(s3UrlToCloudFrontUrl(s3Url)).toBeNull()
    })

    it('returns null for non-S3 URL', () => {
      expect(s3UrlToCloudFrontUrl('https://example.com/image.jpg')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(s3UrlToCloudFrontUrl('')).toBeNull()
    })

    it('preserves URL path with query parameters', () => {
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg?v=1234`
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg?v=1234`
      expect(s3UrlToCloudFrontUrl(s3Url)).toBe(expected)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // toCloudFrontUrl
  // ─────────────────────────────────────────────────────────────────────────

  describe('toCloudFrontUrl', () => {
    beforeEach(() => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
      process.env.S3_BUCKET = MOCK_S3_BUCKET
    })

    it('converts S3 URL to CloudFront URL', () => {
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(toCloudFrontUrl(s3Url)).toBe(expected)
    })

    it('returns CloudFront URL as-is', () => {
      const cloudFrontUrl = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(toCloudFrontUrl(cloudFrontUrl)).toBe(cloudFrontUrl)
    })

    it('returns external URL as-is', () => {
      const externalUrl = 'https://example.com/image.jpg'
      expect(toCloudFrontUrl(externalUrl)).toBe(externalUrl)
    })

    it('returns null for null input', () => {
      expect(toCloudFrontUrl(null)).toBeNull()
    })

    it('returns null for undefined input', () => {
      expect(toCloudFrontUrl(undefined)).toBeNull()
    })

    it('returns S3 URL when CloudFront not configured', () => {
      delete process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
      const s3Url = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(toCloudFrontUrl(s3Url)).toBe(s3Url)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // buildImageUrlFromKey
  // ─────────────────────────────────────────────────────────────────────────

  describe('buildImageUrlFromKey', () => {
    it('returns CloudFront URL when configured', () => {
      process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN = MOCK_CLOUDFRONT_DOMAIN
      process.env.S3_BUCKET = MOCK_S3_BUCKET

      const key = 'wishlist/user-123/abc.jpg'
      const expected = `https://${MOCK_CLOUDFRONT_DOMAIN}/wishlist/user-123/abc.jpg`
      expect(buildImageUrlFromKey(key)).toBe(expected)
    })

    it('falls back to S3 URL when CloudFront not configured', () => {
      process.env.S3_BUCKET = MOCK_S3_BUCKET

      const key = 'wishlist/user-123/abc.jpg'
      const expected = `https://${MOCK_S3_BUCKET}.s3.amazonaws.com/wishlist/user-123/abc.jpg`
      expect(buildImageUrlFromKey(key)).toBe(expected)
    })

    it('throws error when S3_BUCKET not configured and CloudFront not configured', () => {
      expect(() => buildImageUrlFromKey('wishlist/user-123/abc.jpg')).toThrow(
        'S3_BUCKET environment variable is required',
      )
    })
  })
})
