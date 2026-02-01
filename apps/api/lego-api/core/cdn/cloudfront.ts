/**
 * CloudFront CDN URL Utilities
 *
 * WISH-2018: CDN Integration for Image Performance Optimization
 *
 * Provides utilities to convert S3 keys and URLs to CloudFront URLs
 * for serving images from edge locations worldwide.
 *
 * Environment Variables:
 * - CLOUDFRONT_DISTRIBUTION_DOMAIN: CloudFront domain (e.g., d1234abcd.cloudfront.net)
 * - S3_BUCKET: S3 bucket name for fallback URL detection
 */

import { logger } from '@repo/logger'

/**
 * Get the CloudFront distribution domain from environment
 *
 * @returns The CloudFront domain or null if not configured
 */
export function getCloudFrontDomain(): string | null {
  const domain = process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN
  return domain?.trim() || null
}

/**
 * Check if CloudFront is configured and available
 *
 * @returns true if CloudFront domain is set in environment
 */
export function isCloudFrontEnabled(): boolean {
  return getCloudFrontDomain() !== null
}

/**
 * Convert an S3 key to a CloudFront URL
 *
 * @param s3Key - The S3 object key (e.g., "wishlist/user-123/abc123.jpg")
 * @returns The CloudFront URL or null if CloudFront is not configured
 *
 * @example
 * s3KeyToCloudFrontUrl("wishlist/user-123/abc123.jpg")
 * // => "https://d1234abcd.cloudfront.net/wishlist/user-123/abc123.jpg"
 */
export function s3KeyToCloudFrontUrl(s3Key: string): string | null {
  const domain = getCloudFrontDomain()
  if (!domain) {
    return null
  }

  // Remove leading slash if present
  const normalizedKey = s3Key.startsWith('/') ? s3Key.slice(1) : s3Key

  return `https://${domain}/${normalizedKey}`
}

/**
 * Check if a URL is an S3 URL for our bucket
 *
 * Supports both URL patterns:
 * - https://{bucket}.s3.amazonaws.com/{key}
 * - https://{bucket}.s3.{region}.amazonaws.com/{key}
 *
 * @param url - The URL to check
 * @returns true if the URL is an S3 URL for our bucket
 */
export function isS3Url(url: string): boolean {
  if (!url) return false

  const bucket = process.env.S3_BUCKET
  if (!bucket) return false

  // Match both S3 URL patterns
  const patterns = [
    new RegExp(`^https://${bucket}\\.s3\\.amazonaws\\.com/`),
    new RegExp(`^https://${bucket}\\.s3\\.[a-z0-9-]+\\.amazonaws\\.com/`),
  ]

  return patterns.some(pattern => pattern.test(url))
}

/**
 * Check if a URL is a CloudFront URL
 *
 * @param url - The URL to check
 * @returns true if the URL is a CloudFront URL
 */
export function isCloudFrontUrl(url: string): boolean {
  if (!url) return false
  return url.includes('.cloudfront.net/')
}

/**
 * Extract S3 key from an S3 URL
 *
 * @param s3Url - The S3 URL
 * @returns The S3 key or null if not a valid S3 URL
 *
 * @example
 * extractS3KeyFromUrl("https://my-bucket.s3.amazonaws.com/wishlist/user-123/abc.jpg")
 * // => "wishlist/user-123/abc.jpg"
 */
export function extractS3KeyFromUrl(s3Url: string): string | null {
  const bucket = process.env.S3_BUCKET
  if (!bucket || !s3Url) return null

  // Match both S3 URL patterns
  const patterns = [
    new RegExp(`^https://${bucket}\\.s3\\.amazonaws\\.com/(.+)$`),
    new RegExp(`^https://${bucket}\\.s3\\.[a-z0-9-]+\\.amazonaws\\.com/(.+)$`),
  ]

  for (const pattern of patterns) {
    const match = s3Url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

/**
 * Convert an S3 URL to a CloudFront URL
 *
 * This function handles backward compatibility for existing S3 URLs
 * stored in the database, converting them to CloudFront URLs on-the-fly.
 *
 * @param s3Url - The S3 URL to convert
 * @returns The CloudFront URL, or null if conversion is not possible
 *
 * @example
 * s3UrlToCloudFrontUrl("https://my-bucket.s3.amazonaws.com/wishlist/user-123/abc.jpg")
 * // => "https://d1234abcd.cloudfront.net/wishlist/user-123/abc.jpg"
 */
export function s3UrlToCloudFrontUrl(s3Url: string): string | null {
  // Validate input
  if (!s3Url) {
    return null
  }

  // Check if CloudFront is configured
  const domain = getCloudFrontDomain()
  if (!domain) {
    return null
  }

  // Check if this is actually an S3 URL
  if (!isS3Url(s3Url)) {
    logger.debug('URL is not an S3 URL, returning null', { url: s3Url })
    return null
  }

  // Extract the key from the S3 URL
  const key = extractS3KeyFromUrl(s3Url)
  if (!key) {
    logger.warn('Failed to extract S3 key from URL', { url: s3Url })
    return null
  }

  // Build CloudFront URL
  return `https://${domain}/${key}`
}

/**
 * Convert any URL to CloudFront URL if applicable
 *
 * This is the main function to use for converting image URLs.
 * It handles:
 * - S3 URLs: Converts to CloudFront
 * - CloudFront URLs: Returns as-is
 * - Other URLs: Returns as-is
 * - Null/undefined: Returns null
 *
 * @param url - The URL to convert (S3, CloudFront, or other)
 * @returns CloudFront URL if convertible, otherwise the original URL
 */
export function toCloudFrontUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null
  }

  // Already a CloudFront URL
  if (isCloudFrontUrl(url)) {
    return url
  }

  // S3 URL - convert to CloudFront
  if (isS3Url(url)) {
    const cloudFrontUrl = s3UrlToCloudFrontUrl(url)
    if (cloudFrontUrl) {
      return cloudFrontUrl
    }
    // If conversion fails, return original
    return url
  }

  // Other URL (external CDN, etc.) - return as-is
  return url
}

/**
 * Build a CloudFront URL from an S3 key, with S3 fallback
 *
 * This is the primary function for building image URLs from S3 keys.
 * Uses CloudFront if configured, otherwise falls back to S3.
 *
 * @param s3Key - The S3 object key
 * @returns The CloudFront URL if configured, otherwise the S3 URL
 */
export function buildImageUrlFromKey(s3Key: string): string {
  // Try CloudFront first
  const cloudFrontUrl = s3KeyToCloudFrontUrl(s3Key)
  if (cloudFrontUrl) {
    return cloudFrontUrl
  }

  // Fallback to S3 URL
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required')
  }

  return `https://${bucket}.s3.amazonaws.com/${s3Key}`
}
