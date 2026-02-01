/**
 * CDN Module Exports
 *
 * WISH-2018: CDN Integration for Image Performance Optimization
 */

export {
  getCloudFrontDomain,
  isCloudFrontEnabled,
  s3KeyToCloudFrontUrl,
  isS3Url,
  isCloudFrontUrl,
  extractS3KeyFromUrl,
  s3UrlToCloudFrontUrl,
  toCloudFrontUrl,
  buildImageUrlFromKey,
} from './cloudfront.js'
