import { randomUUID } from 'crypto';
import { getPresignedUploadUrl, deleteFromS3, copyS3Object, ok, err } from '@repo/api-core';
import { logger } from '@repo/logger';
/**
 * Allowed image extensions for wishlist uploads
 *
 * WISH-2013: Security hardening - removed gif, restricted to jpeg/png/webp
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
/**
 * Allowed MIME types for wishlist uploads
 *
 * WISH-2013: Security hardening - whitelist only image/jpeg, image/png, image/webp
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Minimum file size in bytes (1 byte)
 * Zero-byte files are rejected
 */
export const MIN_FILE_SIZE = 1;
/**
 * Presigned URL expiration in seconds (15 minutes)
 *
 * WISH-2013 AC6: Short TTL to minimize exposure window
 */
const PRESIGN_EXPIRATION_SECONDS = 900;
/**
 * Create a WishlistImageStorage implementation using S3
 */
export function createWishlistImageStorage() {
    return {
        async generateUploadUrl(userId, fileName, mimeType, fileSize) {
            // WISH-2013 AC3: Validate file size (server-side)
            if (fileSize !== undefined) {
                if (fileSize < MIN_FILE_SIZE) {
                    logger.warn('File upload rejected: file too small', {
                        userId,
                        fileName,
                        fileSize,
                        minSize: MIN_FILE_SIZE,
                        namespace: 'security',
                    });
                    return err('FILE_TOO_SMALL');
                }
                if (fileSize > MAX_FILE_SIZE) {
                    logger.warn('File upload rejected: file too large', {
                        userId,
                        fileName,
                        fileSize,
                        maxSize: MAX_FILE_SIZE,
                        namespace: 'security',
                    });
                    return err('FILE_TOO_LARGE');
                }
            }
            // Validate extension
            const extension = fileName.split('.').pop()?.toLowerCase();
            if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
                logger.warn('File upload rejected: invalid extension', {
                    userId,
                    fileName,
                    extension,
                    allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
                    namespace: 'security',
                });
                return err('INVALID_EXTENSION');
            }
            // WISH-2013 AC1: Validate MIME type against whitelist (server-side)
            if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
                logger.warn('File upload rejected: invalid MIME type', {
                    userId,
                    fileName,
                    mimeType,
                    allowedTypes: ALLOWED_MIME_TYPES,
                    namespace: 'security',
                });
                return err('INVALID_MIME_TYPE');
            }
            // Generate unique key for S3
            const imageId = randomUUID();
            const key = `wishlist/${userId}/${imageId}.${extension}`;
            try {
                const presignedUrl = await getPresignedUploadUrl(key, mimeType, PRESIGN_EXPIRATION_SECONDS);
                logger.info('Presigned URL generated', {
                    userId,
                    key,
                    mimeType,
                    expiresIn: PRESIGN_EXPIRATION_SECONDS,
                });
                return ok({
                    presignedUrl,
                    key,
                    expiresIn: PRESIGN_EXPIRATION_SECONDS,
                });
            }
            catch (error) {
                logger.error('Failed to generate presigned URL', {
                    userId,
                    fileName,
                    error: error instanceof Error ? error.message : String(error),
                });
                return err('PRESIGN_FAILED');
            }
        },
        /**
         * Build the S3 URL from a key
         */
        buildImageUrl(key) {
            const bucket = process.env.S3_BUCKET;
            if (!bucket) {
                throw new Error('S3_BUCKET environment variable is required');
            }
            return `https://${bucket}.s3.amazonaws.com/${key}`;
        },
        /**
         * Copy an image from one S3 key to another
         * Used for cross-domain image transfer (e.g., wishlist to sets)
         */
        async copyImage(sourceKey, destKey) {
            return copyS3Object(sourceKey, destKey);
        },
        /**
         * Delete an image from S3
         */
        async deleteImage(key) {
            const result = await deleteFromS3(key);
            if (!result.ok) {
                // Treat delete failures gracefully (file might not exist)
                logger.warn('Failed to delete S3 object', { key });
                return ok(undefined);
            }
            return ok(undefined);
        },
        /**
         * Extract S3 key from a full URL
         */
        extractKeyFromUrl(url) {
            const bucket = process.env.S3_BUCKET;
            if (!bucket)
                return null;
            // URL format: https://{bucket}.s3.amazonaws.com/{key}
            // or: https://{bucket}.s3.{region}.amazonaws.com/{key}
            const patterns = [
                new RegExp(`https://${bucket}\\.s3\\.amazonaws\\.com/(.+)`),
                new RegExp(`https://${bucket}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`),
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match?.[1]) {
                    return match[1];
                }
            }
            return null;
        },
    };
}
