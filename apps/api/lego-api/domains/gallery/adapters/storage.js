import { uploadToS3, deleteFromS3 } from '@repo/api-core';
import { ok } from '@repo/api-core';
/**
 * Create an ImageStorage implementation using S3
 */
export function createImageStorage() {
    const bucket = process.env.S3_BUCKET;
    return {
        async upload(key, buffer, contentType) {
            return uploadToS3(key, buffer, contentType);
        },
        async delete(key) {
            const result = await deleteFromS3(key);
            if (!result.ok) {
                // Treat delete failures gracefully (file might not exist)
                console.warn(`Failed to delete S3 object: ${key}`);
                return ok(undefined);
            }
            return ok(undefined);
        },
        extractKeyFromUrl(url) {
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
/**
 * Generate S3 key for an image
 */
export function generateImageKey(userId, imageId) {
    return `images/${userId}/${imageId}.webp`;
}
/**
 * Generate S3 key for a thumbnail
 */
export function generateThumbnailKey(userId, imageId) {
    return `images/${userId}/thumbnails/${imageId}.webp`;
}
